'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Scores } from '@/lib/db';

const USER_KEY = 'yo_user';
const MEDALS = ['🥇', '🥈', '🥉'];

type FloatItem = { id: number; text: string; x: number; y: number };
type Tab = 'month' | 'global';

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export default function Home() {
  const [user, setUser] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [global, setGlobal] = useState<Scores>({});
  const [monthly, setMonthly] = useState<Scores>({});
  const [tab, setTab] = useState<Tab>('month');
  const [loginOpen, setLoginOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [pressing, setPressing] = useState(false);
  const [floats, setFloats] = useState<FloatItem[]>([]);
  const [target, setTarget] = useState<string | null>(null);
  const [popBtn, setPopBtn] = useState<'yo' | 'emoji' | null>(null);
  const floatId = useRef(0);

  function sanitize(raw: unknown): Scores {
    if (!raw || typeof raw !== 'object') return {};
    const out: Scores = {};
    for (const [name, v] of Object.entries(raw as Record<string, unknown>)) {
      const s = v as Record<string, unknown>;
      out[name] = {
        name,
        yo_sent:        Number(s?.yo_sent)        || 0,
        yo_received:    Number(s?.yo_received)    || 0,
        emoji_sent:     Number(s?.emoji_sent)     || 0,
        emoji_received: Number(s?.emoji_received) || 0,
      };
    }
    return out;
  }

  const fetchScores = useCallback(async () => {
    try {
      const res = await fetch('/api/scores');
      const data = await res.json();
      setGlobal(sanitize(data.global));
      setMonthly(sanitize(data.monthly));
    } catch {}
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(USER_KEY);
    setUser(saved);
    fetchScores().then(() => setReady(true));
  }, [fetchScores]);

  useEffect(() => {
    const id = setInterval(fetchScores, 8_000);
    return () => clearInterval(id);
  }, [fetchScores]);

  function spawnFloat(text: string, el: HTMLElement | null) {
    const rect = el?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top : window.innerHeight / 2;
    const item: FloatItem = { id: floatId.current++, text, x, y };
    setFloats(f => [...f, item]);
    setTimeout(() => setFloats(f => f.filter(i => i.id !== item.id)), 700);
  }

  function handleLogin() {
    const name = nameInput.trim();
    if (!name) return;
    localStorage.setItem(USER_KEY, name);
    setUser(name);
    setLoginOpen(false);
  }

  function handleLogout() {
    localStorage.removeItem(USER_KEY);
    setUser(null);
    setTarget(null);
  }

  async function pressBtn(type: 'yo' | 'emoji', el: HTMLElement | null) {
    if (!user || pressing) return;
    setPressing(true);
    setPopBtn(type);
    spawnFloat(type === 'yo' ? 'Yo' : '☝️🙄', el);
    setTimeout(() => setPopBtn(null), 350);
    try {
      const res = await fetch('/api/press', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: user, type, to: target ?? undefined }),
      });
      const data = await res.json();
      setGlobal(sanitize(data.global));
      setMonthly(sanitize(data.monthly));
    } finally {
      setPressing(false);
    }
  }

  const scores = tab === 'month' ? monthly : global;
  const allNames = Array.from(new Set([...Object.keys(global), ...Object.keys(monthly)]));
  const ranking = allNames
    .map(name => {
      const s = scores[name] ?? { name, yo_sent: 0, yo_received: 0, emoji_sent: 0, emoji_received: 0 };
      return { ...s, total: s.yo_sent + s.emoji_sent + s.yo_received + s.emoji_received };
    })
    .sort((a, b) => b.total - a.total);

  const others = allNames.filter(n => n !== user);
  const monthLabel = MONTH_NAMES[new Date().getMonth()];

  if (!ready) return null;

  // ── LANDING ──────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="yo-bg min-h-screen flex flex-col items-center justify-center gap-10 p-6">
        <div
          className="text-center cursor-pointer select-none"
          onClick={() => setLoginOpen(v => !v)}
        >
          <p className="font-black leading-none tracking-tighter text-zinc-900" style={{ fontSize: 'clamp(7rem, 35vw, 16rem)' }}>
            Yo
          </p>
          <p className="leading-none mt-2" style={{ fontSize: 'clamp(3rem, 16vw, 7rem)' }}>
            ☝️🙄
          </p>
          {!loginOpen && (
            <p className="mt-6 text-zinc-400 text-sm tracking-widest uppercase animate-slide">
              toca para entrar
            </p>
          )}
        </div>
        {loginOpen && (
          <div className="flex flex-col items-center gap-3 w-full max-w-xs animate-slide">
            <input
              className="w-full rounded-2xl px-5 py-4 text-lg bg-white text-zinc-900 placeholder-zinc-400 border border-zinc-200 outline-none focus:border-zinc-400 text-center tracking-wide shadow-sm"
              placeholder="¿cómo te llamas?"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              autoFocus
            />
            <button
              onClick={handleLogin}
              className="w-full rounded-2xl py-4 text-lg font-bold bg-zinc-900 text-white hover:bg-zinc-700 active:scale-95 transition-all shadow-sm"
            >
              Entrar
            </button>
          </div>
        )}
      </div>
    );
  }

  const me = scores[user];

  // ── MAIN ─────────────────────────────────────────────────────────────────
  return (
    <div className="yo-bg min-h-screen text-zinc-900 flex flex-col">
      {floats.map(f => (
        <span
          key={f.id}
          className="fixed pointer-events-none font-black animate-float z-50 select-none text-zinc-800"
          style={{ left: f.x, top: f.y, transform: 'translateX(-50%)', fontSize: '2.5rem' }}
        >
          {f.text}
        </span>
      ))}

      {/* header */}
      <header className="flex items-center justify-between px-5 pt-5 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-bold text-zinc-600">
            {user[0].toUpperCase()}
          </div>
          <span className="text-zinc-400 text-sm">{user}</span>
        </div>
        <button onClick={handleLogout} className="text-zinc-300 text-xs hover:text-zinc-500 transition-colors">
          salir
        </button>
      </header>

      {/* target chips */}
      {others.length > 0 && (
        <div className="px-5 pt-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setTarget(null)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${target === null ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}
            >
              todos
            </button>
            {others.map(name => (
              <button
                key={name}
                onClick={() => setTarget(t => t === name ? null : name)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${target === name ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}
              >
                {name}
              </button>
            ))}
          </div>
          {target && (
            <p className="text-zinc-400 text-xs mt-2 pl-1 animate-slide">
              enviando a <span className="text-zinc-700 font-medium">{target}</span>
            </p>
          )}
        </div>
      )}

      {/* buttons */}
      <div className="flex flex-col items-center gap-5 flex-1 justify-center py-8 px-6">
        <button
          onClick={e => pressBtn('yo', e.currentTarget)}
          disabled={pressing}
          className={`relative w-full max-w-xs rounded-[2rem] bg-zinc-900 text-white font-black shadow-lg transition-transform active:scale-95 disabled:opacity-60 ${popBtn === 'yo' ? 'animate-pop' : ''}`}
          style={{ fontSize: 'clamp(3.5rem, 20vw, 6rem)', padding: '0.35em 0.5em' }}
        >
          Yo
          {popBtn === 'yo' && <span className="absolute inset-0 rounded-[2rem] border-2 border-zinc-900 animate-ring pointer-events-none" />}
        </button>
        <button
          onClick={e => pressBtn('emoji', e.currentTarget)}
          disabled={pressing}
          className={`relative w-full max-w-xs rounded-[2rem] bg-white border border-zinc-200 text-center shadow-sm transition-transform active:scale-95 disabled:opacity-60 ${popBtn === 'emoji' ? 'animate-pop' : ''}`}
          style={{ fontSize: 'clamp(2.5rem, 14vw, 4.5rem)', padding: '0.35em 0.5em' }}
        >
          ☝️🙄
          {popBtn === 'emoji' && <span className="absolute inset-0 rounded-[2rem] border-2 border-zinc-400 animate-ring pointer-events-none" />}
        </button>
        {me && (
          <div className="flex gap-4 mt-1">
            <span className="text-zinc-400 text-xs">
              enviados <span className="text-zinc-600">{me.yo_sent + me.emoji_sent}</span>
            </span>
            <span className="text-zinc-300">·</span>
            <span className="text-zinc-400 text-xs">
              recibidos <span className="text-zinc-700 font-semibold">{me.yo_received + me.emoji_received}</span>
            </span>
          </div>
        )}
      </div>

      {/* ranking */}
      <div className="px-5 pb-8">
        {/* tab switcher */}
        <div className="flex bg-zinc-100 rounded-2xl p-1 mb-4">
          <button
            onClick={() => setTab('month')}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${tab === 'month' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
          >
            {monthLabel}
          </button>
          <button
            onClick={() => setTab('global')}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${tab === 'global' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
          >
            Global
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {ranking.map((entry, i) => {
            const isMe = entry.name === user;
            const sent = entry.yo_sent + entry.emoji_sent;
            const received = entry.yo_received + entry.emoji_received;
            return (
              <div
                key={entry.name}
                onClick={() => !isMe && setTarget(t => t === entry.name ? null : entry.name)}
                className={`flex items-center justify-between rounded-2xl px-4 py-3.5 transition-all cursor-pointer select-none ${
                  isMe ? 'bg-white border border-zinc-200 shadow-sm'
                  : target === entry.name ? 'bg-zinc-900 text-white border border-transparent'
                  : 'bg-white/60 hover:bg-white border border-zinc-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg w-6 text-center">
                    {i < 3 ? MEDALS[i] : <span className="text-zinc-300 text-sm">{i + 1}</span>}
                  </span>
                  <div>
                    <p className={`font-semibold text-sm ${target === entry.name && !isMe ? 'text-white' : isMe ? 'text-zinc-900' : 'text-zinc-700'}`}>
                      {entry.name}
                      {isMe && <span className="text-zinc-400 font-normal text-xs ml-1.5">tú</span>}
                    </p>
                    <p className={`text-xs mt-0.5 ${target === entry.name && !isMe ? 'text-zinc-400' : 'text-zinc-400'}`}>
                      {sent} tocados · {received} recibidos
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className={`font-bold text-lg tabular-nums ${target === entry.name && !isMe ? 'text-white' : 'text-zinc-800'}`}>
                    {sent + received}
                  </span>
                </div>
              </div>
            );
          })}
          {ranking.length === 0 && (
            <p className="text-zinc-400 text-sm text-center py-4">nadie ha dicho nada todavía</p>
          )}
        </div>
      </div>
    </div>
  );
}
