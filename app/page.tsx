'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Scores, AudioMessage } from '@/lib/db';
import { t, LANG_LABELS, LANG_KEY, DEFAULT_LANG, type Lang } from '@/lib/i18n';

const MEDALS = ['🥇', '🥈', '🥉'];

type Tab = 'month' | 'global';
type AuthMode = 'login' | 'register';
type FloatItem = { id: number; text: string; x: number; y: number };
type SessionUser = { id: number; email: string; name: string };

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function LangPicker({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div className="flex gap-1">
      {(Object.keys(LANG_LABELS) as Lang[]).map(l => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${
            lang === l ? 'bg-zinc-900 text-white' : 'text-zinc-400 hover:text-zinc-600'
          }`}
        >
          {LANG_LABELS[l]}
        </button>
      ))}
    </div>
  );
}

export default function Home() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  function setLang(l: Lang) {
    setLangState(l);
    localStorage.setItem(LANG_KEY, l);
  }

  const tr = t[lang];

  // auth form
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // scores
  const [global, setGlobal] = useState<Scores>({});
  const [monthly, setMonthly] = useState<Scores>({});
  const [tab, setTab] = useState<Tab>('month');

  // ui
  const [target, setTarget] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [pressing, setPressing] = useState(false);
  const [popBtn, setPopBtn] = useState<'yo' | 'emoji' | null>(null);
  const [floats, setFloats] = useState<FloatItem[]>([]);
  const floatId = useRef(0);

  // audio
  const [audios, setAudios] = useState<AudioMessage[]>([]);
  const [recording, setRecording] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [uploading, setUploading] = useState(false);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── boot ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem(LANG_KEY) as Lang | null;
    if (saved && saved in LANG_LABELS) setLangState(saved);
    fetch('/api/auth/me')
      .then(r => r.json())
      .then((u: SessionUser | null) => { setUser(u); setReady(true); });
  }, []);

  function sanitize(raw: unknown): Scores {
    if (!raw || typeof raw !== 'object') return {};
    const out: Scores = {};
    for (const [n, v] of Object.entries(raw as Record<string, unknown>)) {
      const s = v as Record<string, unknown>;
      out[n] = {
        name: n,
        yo_sent:        Number(s?.yo_sent)        || 0,
        yo_received:    Number(s?.yo_received)    || 0,
        emoji_sent:     Number(s?.emoji_sent)     || 0,
        emoji_received: Number(s?.emoji_received) || 0,
      };
    }
    return out;
  }

  const fetchAll = useCallback(async () => {
    const [scoresRes, audioRes] = await Promise.all([fetch('/api/scores'), fetch('/api/audio')]);
    const scores = await scoresRes.json();
    setGlobal(sanitize(scores.global));
    setMonthly(sanitize(scores.monthly));
    setAudios(await audioRes.json());
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchAll();
    const id = setInterval(fetchAll, 8_000);
    return () => clearInterval(id);
  }, [user, fetchAll]);

  // ── auth ────────────────────────────────────────────────────────────────
  async function handleAuth() {
    setAuthError('');
    setAuthLoading(true);
    try {
      const body = authMode === 'login' ? { email, password } : { email, name, password };
      const res = await fetch(`/api/auth/${authMode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setAuthError(data.error); return; }
      setUser(data);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null); setGlobal({}); setMonthly({}); setAudios([]); setTarget(null);
  }

  // ── press ────────────────────────────────────────────────────────────────
  function spawnFloat(text: string, el: HTMLElement | null) {
    const rect = el?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top : window.innerHeight / 2;
    const item: FloatItem = { id: floatId.current++, text, x, y };
    setFloats(f => [...f, item]);
    setTimeout(() => setFloats(f => f.filter(i => i.id !== item.id)), 700);
  }

  async function pressBtn(type: 'yo' | 'emoji', el: HTMLElement | null) {
    if (!user || pressing) return;
    setPressing(true); setPopBtn(type);
    spawnFloat(type === 'yo' ? 'Yo' : '☝️🙄', el);
    setTimeout(() => setPopBtn(null), 350);
    try {
      const res = await fetch('/api/press', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: user.name, type, to: target ?? undefined }),
      });
      const data = await res.json();
      setGlobal(sanitize(data.global));
      setMonthly(sanitize(data.monthly));
    } finally { setPressing(false); }
  }

  // ── audio ────────────────────────────────────────────────────────────────
  function getSupportedMime() {
    const types = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'];
    return types.find(t => MediaRecorder.isTypeSupported(t)) ?? '';
  }

  async function startRecording() {
    if (recording || uploading) return;
    let stream: MediaStream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
    catch { alert('Microphone permission needed'); return; }
    const mimeType = getSupportedMime();
    const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    mediaRecRef.current = mr; chunksRef.current = [];
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      uploadAudio(new Blob(chunksRef.current, { type: mr.mimeType || mimeType }), mr.mimeType || mimeType);
    };
    mr.start(100); setRecording(true); setCountdown(5);
    let c = 5;
    timerRef.current = setInterval(() => { c--; setCountdown(c); if (c <= 0) stopRecording(); }, 1000);
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecRef.current?.state === 'recording') mediaRecRef.current.stop();
    setRecording(false); setCountdown(5);
  }

  async function uploadAudio(blob: Blob, mimeType: string) {
    if (!user) return;
    setUploading(true);
    try {
      const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm';
      const fd = new FormData();
      fd.append('audio', blob, `audio.${ext}`);
      fd.append('mimeType', mimeType);
      if (target) fd.append('to', target);
      const res = await fetch('/api/audio', { method: 'POST', body: fd });
      if (res.ok) setAudios(await res.json());
    } finally { setUploading(false); }
  }

  async function deleteAudio(id: number) {
    const res = await fetch('/api/audio', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (res.ok) setAudios(await res.json());
  }

  // ── derived ──────────────────────────────────────────────────────────────
  const scores = tab === 'month' ? monthly : global;
  const allNames = Array.from(new Set([...Object.keys(global), ...Object.keys(monthly)]));
  const ranking = allNames
    .map(n => {
      const s = scores[n] ?? { name: n, yo_sent: 0, yo_received: 0, emoji_sent: 0, emoji_received: 0 };
      return { ...s, total: s.yo_sent + s.emoji_sent + s.yo_received + s.emoji_received };
    })
    .sort((a, b) => b.total - a.total);

  const others = allNames.filter(n => n !== user?.name);
  const monthLabel = tr.month_names[new Date().getMonth()];
  const me = user ? scores[user.name] : null;

  if (!ready) return null;

  // ── LANDING ──────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="yo-bg min-h-screen flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-xs flex flex-col gap-6">
          <div className="text-center select-none mb-2">
            <p className="font-black leading-none tracking-tighter text-zinc-900" style={{ fontSize: 'clamp(5rem, 25vw, 9rem)' }}>Yo</p>
            <p className="leading-none" style={{ fontSize: 'clamp(2.5rem, 12vw, 4rem)' }}>☝️🙄</p>
          </div>

          <div className="flex justify-center">
            <LangPicker lang={lang} setLang={setLang} />
          </div>

          <div className="flex bg-zinc-100 rounded-2xl p-1">
            <button onClick={() => { setAuthMode('login'); setAuthError(''); }}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${authMode === 'login' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400'}`}>
              {tr.login}
            </button>
            <button onClick={() => { setAuthMode('register'); setAuthError(''); }}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${authMode === 'register' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400'}`}>
              {tr.register}
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {authMode === 'register' && (
              <input className="w-full rounded-2xl px-4 py-3.5 text-base bg-white text-zinc-900 placeholder-zinc-400 border border-zinc-200 outline-none focus:border-zinc-400 shadow-sm"
                placeholder={tr.your_name} value={name} onChange={e => setName(e.target.value)} autoComplete="name" />
            )}
            <input className="w-full rounded-2xl px-4 py-3.5 text-base bg-white text-zinc-900 placeholder-zinc-400 border border-zinc-200 outline-none focus:border-zinc-400 shadow-sm"
              placeholder={tr.email} type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
            <input className="w-full rounded-2xl px-4 py-3.5 text-base bg-white text-zinc-900 placeholder-zinc-400 border border-zinc-200 outline-none focus:border-zinc-400 shadow-sm"
              placeholder={tr.password} type="password" value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAuth()}
              autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} />
            {authError && <p className="text-red-500 text-sm text-center">{authError}</p>}
            <button onClick={handleAuth} disabled={authLoading}
              className="w-full rounded-2xl py-3.5 text-base font-bold bg-zinc-900 text-white hover:bg-zinc-700 active:scale-95 transition-all shadow-sm disabled:opacity-60">
              {authLoading ? '…' : authMode === 'login' ? tr.login : tr.create_account}
            </button>
            {authMode === 'login' && (
              <a href="/forgot" className="text-center text-xs text-zinc-400 hover:text-zinc-600 transition-colors">
                {tr.forgot_password}
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── MAIN ─────────────────────────────────────────────────────────────────
  return (
    <div className="yo-bg min-h-screen text-zinc-900 flex flex-col">
      {floats.map(f => (
        <span key={f.id} className="fixed pointer-events-none font-black animate-float z-50 select-none text-zinc-800"
          style={{ left: f.x, top: f.y, transform: 'translateX(-50%)', fontSize: '2.5rem' }}>
          {f.text}
        </span>
      ))}

      {/* header */}
      <header className="flex items-center justify-between px-5 pt-5 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-bold text-zinc-600">
            {user.name[0].toUpperCase()}
          </div>
          <span className="text-zinc-500 text-sm">{user.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <LangPicker lang={lang} setLang={setLang} />
          <button onClick={handleLogout} className="text-zinc-300 text-xs hover:text-zinc-500 transition-colors">
            {tr.logout}
          </button>
        </div>
      </header>

      {/* target selector */}
      {others.length > 0 && (
        <div className="px-5 pt-3">
          <div className="flex items-center gap-2">
            {/* search toggle */}
            <button
              onClick={() => {
                setSearchOpen(o => {
                  if (o) { setSearch(''); }
                  else { setTimeout(() => searchRef.current?.focus(), 50); }
                  return !o;
                });
              }}
              className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all ${searchOpen ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}
            >
              🔍
            </button>

            {searchOpen ? (
              <input
                ref={searchRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={tr.search_placeholder}
                className="flex-1 rounded-full px-4 py-2 text-sm bg-zinc-100 text-zinc-800 placeholder-zinc-400 outline-none border border-zinc-200 focus:border-zinc-400 animate-slide"
              />
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-0.5 flex-1">
                <button onClick={() => setTarget(null)}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${target === null ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}>
                  {tr.all}
                </button>
                {others.map(n => (
                  <button key={n} onClick={() => setTarget(t => t === n ? null : n)}
                    className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${target === n ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}>
                    {n}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* search results */}
          {searchOpen && (
            <div className="mt-2 flex flex-col gap-1 max-h-48 overflow-y-auto animate-slide">
              {others
                .filter(n => n.toLowerCase().includes(search.toLowerCase()))
                .map(n => (
                  <button key={n}
                    onClick={() => { setTarget(n); setSearch(''); setSearchOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      target === n ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                    }`}>
                    {n}
                  </button>
                ))}
              {others.filter(n => n.toLowerCase().includes(search.toLowerCase())).length === 0 && (
                <p className="text-zinc-400 text-sm px-4 py-2">{tr.no_results}</p>
              )}
            </div>
          )}

          {target && (
            <p className="text-zinc-400 text-xs mt-2 pl-1 animate-slide">
              {tr.sending_to} <span className="text-zinc-700 font-medium">{target}</span>
              <button onClick={() => setTarget(null)} className="ml-2 text-zinc-300 hover:text-zinc-500">✕</button>
            </p>
          )}
        </div>
      )}

      {/* main buttons */}
      <div className="flex flex-col items-center gap-4 flex-1 justify-center py-6 px-6">
        <button onClick={e => pressBtn('yo', e.currentTarget)} disabled={pressing}
          className={`relative w-full max-w-xs rounded-[2rem] bg-zinc-900 text-white font-black shadow-lg transition-transform active:scale-95 disabled:opacity-60 ${popBtn === 'yo' ? 'animate-pop' : ''}`}
          style={{ fontSize: 'clamp(3.5rem, 20vw, 6rem)', padding: '0.35em 0.5em' }}>
          Yo
          {popBtn === 'yo' && <span className="absolute inset-0 rounded-[2rem] border-2 border-zinc-900 animate-ring pointer-events-none" />}
        </button>

        <button onClick={e => pressBtn('emoji', e.currentTarget)} disabled={pressing}
          className={`relative w-full max-w-xs rounded-[2rem] bg-white border border-zinc-200 text-center shadow-sm transition-transform active:scale-95 disabled:opacity-60 ${popBtn === 'emoji' ? 'animate-pop' : ''}`}
          style={{ fontSize: 'clamp(2.5rem, 14vw, 4.5rem)', padding: '0.35em 0.5em' }}>
          ☝️🙄
          {popBtn === 'emoji' && <span className="absolute inset-0 rounded-[2rem] border-2 border-zinc-400 animate-ring pointer-events-none" />}
        </button>

        <button onClick={recording ? stopRecording : startRecording} disabled={uploading}
          className={`relative flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm transition-all active:scale-95 shadow-sm ${
            recording ? 'bg-red-500 text-white' : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
          } disabled:opacity-50`}>
          {uploading ? (
            <span className="text-zinc-400">{tr.sending}</span>
          ) : recording ? (
            <><span className="w-2 h-2 rounded-full bg-white animate-pulse" /><span>{tr.recording} · {countdown}s</span></>
          ) : (
            <><span>🎙️</span><span>{target ? tr.audio_to(target) : tr.audio_group}</span></>
          )}
        </button>

        {me && (
          <div className="flex gap-4">
            <span className="text-zinc-400 text-xs">{tr.sent} <span className="text-zinc-600">{me.yo_sent + me.emoji_sent}</span></span>
            <span className="text-zinc-300">·</span>
            <span className="text-zinc-400 text-xs">{tr.received} <span className="text-zinc-700 font-semibold">{me.yo_received + me.emoji_received}</span></span>
          </div>
        )}
      </div>

      {/* ranking */}
      <div className="px-5 pb-4">
        <div className="flex bg-zinc-100 rounded-2xl p-1 mb-3">
          <button onClick={() => setTab('month')}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${tab === 'month' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400'}`}>
            {monthLabel}
          </button>
          <button onClick={() => setTab('global')}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${tab === 'global' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400'}`}>
            {tr.global}
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {ranking.map((entry, i) => {
            const isMe = entry.name === user.name;
            const sent = entry.yo_sent + entry.emoji_sent;
            const received = entry.yo_received + entry.emoji_received;
            return (
              <div key={entry.name}
                onClick={() => !isMe && setTarget(t => t === entry.name ? null : entry.name)}
                className={`flex items-center justify-between rounded-2xl px-4 py-3 transition-all cursor-pointer select-none ${
                  isMe ? 'bg-white border border-zinc-200 shadow-sm'
                  : target === entry.name ? 'bg-zinc-900 text-white border border-transparent'
                  : 'bg-white/60 hover:bg-white border border-zinc-100'
                }`}>
                <div className="flex items-center gap-3">
                  <span className="text-lg w-6 text-center">
                    {i < 3 ? MEDALS[i] : <span className="text-zinc-300 text-sm">{i + 1}</span>}
                  </span>
                  <div>
                    <p className={`font-semibold text-sm ${target === entry.name && !isMe ? 'text-white' : 'text-zinc-800'}`}>
                      {entry.name}
                      {isMe && <span className="text-zinc-400 font-normal text-xs ml-1.5">{tr.you}</span>}
                    </p>
                    <p className="text-xs mt-0.5 text-zinc-400">
                      {sent} {tr.tapped} · {received} {tr.received}
                    </p>
                  </div>
                </div>
                <span className={`font-bold text-lg tabular-nums ${target === entry.name && !isMe ? 'text-white' : 'text-zinc-800'}`}>
                  {sent + received}
                </span>
              </div>
            );
          })}
          {ranking.length === 0 && <p className="text-zinc-400 text-sm text-center py-4">{tr.nobody}</p>}
        </div>
      </div>

      {/* audio feed */}
      {audios.length > 0 && (
        <div className="px-5 pb-8">
          <p className="text-zinc-400 text-xs uppercase tracking-widest mb-3">{tr.audios}</p>
          <div className="flex flex-col gap-2">
            {audios.map(a => (
              <div key={a.id} className="bg-white border border-zinc-100 rounded-2xl px-4 py-3 shadow-sm">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm font-medium text-zinc-800">
                    {a.from_name}
                    {a.to_name && <span className="text-zinc-400 font-normal"> → {a.to_name}</span>}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-300 text-xs">{timeAgo(a.created_at)}</span>
                    {a.from_name === user.name && (
                      <button onClick={() => deleteAudio(a.id)}
                        className="text-zinc-300 hover:text-red-400 transition-colors text-xs"
                        title={tr.delete}>✕</button>
                    )}
                  </div>
                </div>
                <audio controls className="w-full" style={{ height: '36px' }}>
                  <source src={a.blob_url} type={a.mime_type} />
                  <source src={a.blob_url} type="audio/mp4" />
                  <source src={a.blob_url} type="audio/webm" />
                </audio>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
