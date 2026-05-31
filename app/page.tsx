'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Scores } from '@/lib/db';

const USER_KEY = 'yo_user';
const MEDALS = ['🥇', '🥈', '🥉'];

type FloatItem = { id: number; text: string; x: number; y: number };

export default function Home() {
  const [user, setUser] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [scores, setScores] = useState<Scores>({});
  const [loginOpen, setLoginOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [pressing, setPressing] = useState(false);
  const [floats, setFloats] = useState<FloatItem[]>([]);
  const [target, setTarget] = useState<string | null>(null);
  const [popBtn, setPopBtn] = useState<'yo' | 'emoji' | null>(null);
  const floatId = useRef(0);

  const fetchScores = useCallback(async () => {
    try {
      const res = await fetch('/api/scores');
      setScores(await res.json());
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
      setScores(await res.json());
    } finally {
      setPressing(false);
    }
  }

  const ranking = Object.values(scores).sort(
    (a, b) => (b.yo_received + b.emoji_received) - (a.yo_received + a.emoji_received),
  );

  const others = ranking.filter(s => s.name !== user);

  if (!ready) return null;

  // ── LANDING ──────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-10 p-6 relative overflow-hidden">
        {/* decorative blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-white/[0.03] rounded-full blur-3xl" />
        </div>

        <div
          className="text-center cursor-pointer select-none relative z-10"
          onClick={() => setLoginOpen(v => !v)}
        >
          <p
            className="font-black leading-none tracking-tighter text-white"
            style={{ fontSize: 'clamp(7rem, 35vw, 16rem)' }}
          >
            Yo
          </p>
          <p className="leading-none mt-2" style={{ fontSize: 'clamp(3rem, 16vw, 7rem)' }}>
            ☝️🙄
          </p>
          {!loginOpen && (
            <p className="mt-6 text-white/30 text-sm tracking-widest uppercase animate-slide">
              toca para entrar
            </p>
          )}
        </div>

        {loginOpen && (
          <div className="flex flex-col items-center gap-3 w-full max-w-xs relative z-10 animate-slide">
            <input
              className="w-full rounded-2xl px-5 py-4 text-lg bg-white/8 text-white placeholder-white/30 border border-white/15 outline-none focus:border-white/40 text-center tracking-wide"
              placeholder="¿cómo te llamas?"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              autoFocus
            />
            <button
              onClick={handleLogin}
              className="w-full rounded-2xl py-4 text-lg font-bold bg-white text-black hover:bg-zinc-100 active:scale-95 transition-all"
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
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      {/* floating emoji animations */}
      {floats.map(f => (
        <span
          key={f.id}
          className="fixed pointer-events-none font-black animate-float z-50 select-none"
          style={{
            left: f.x,
            top: f.y,
            transform: 'translateX(-50%)',
            fontSize: '2.5rem',
          }}
        >
          {f.text}
        </span>
      ))}

      {/* ── header ── */}
      <header className="flex items-center justify-between px-5 pt-5 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center text-xs font-bold">
            {user[0].toUpperCase()}
          </div>
          <span className="text-white/50 text-sm">{user}</span>
        </div>
        <button onClick={handleLogout} className="text-white/25 text-xs hover:text-white/50 transition-colors">
          salir
        </button>
      </header>

      {/* ── target selector ── */}
      {others.length > 0 && (
        <div className="px-5 pt-3">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setTarget(null)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                target === null
                  ? 'bg-white text-black'
                  : 'bg-white/8 text-white/50 hover:bg-white/12'
              }`}
            >
              todos
            </button>
            {others.map(s => (
              <button
                key={s.name}
                onClick={() => setTarget(t => t === s.name ? null : s.name)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  target === s.name
                    ? 'bg-white text-black'
                    : 'bg-white/8 text-white/50 hover:bg-white/12'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
          {target && (
            <p className="text-white/30 text-xs mt-2 pl-1 animate-slide">
              enviando a <span className="text-white/60 font-medium">{target}</span>
            </p>
          )}
        </div>
      )}

      {/* ── buttons ── */}
      <div className="flex flex-col items-center gap-5 flex-1 justify-center py-8 px-6">
        <button
          ref={el => { if (el && popBtn === 'yo') el.classList.add('animate-pop'); }}
          onClick={e => pressBtn('yo', e.currentTarget)}
          disabled={pressing}
          className={`relative w-full max-w-xs rounded-[2rem] bg-white text-black font-black shadow-[0_0_60px_rgba(255,255,255,0.15)] transition-transform active:scale-95 disabled:opacity-60 ${popBtn === 'yo' ? 'animate-pop' : ''}`}
          style={{ fontSize: 'clamp(3.5rem, 20vw, 6rem)', padding: '0.35em 0.5em' }}
        >
          Yo
          {/* ring on press */}
          {popBtn === 'yo' && (
            <span className="absolute inset-0 rounded-[2rem] border-2 border-white animate-ring pointer-events-none" />
          )}
        </button>

        <button
          onClick={e => pressBtn('emoji', e.currentTarget)}
          disabled={pressing}
          className={`relative w-full max-w-xs rounded-[2rem] bg-white/8 border border-white/15 text-center shadow-lg transition-transform active:scale-95 disabled:opacity-60 ${popBtn === 'emoji' ? 'animate-pop' : ''}`}
          style={{ fontSize: 'clamp(2.5rem, 14vw, 4.5rem)', padding: '0.35em 0.5em' }}
        >
          ☝️🙄
          {popBtn === 'emoji' && (
            <span className="absolute inset-0 rounded-[2rem] border-2 border-white/40 animate-ring pointer-events-none" />
          )}
        </button>

        {/* my mini stats */}
        {me && (
          <div className="flex gap-4 mt-1">
            <span className="text-white/25 text-xs">
              enviados <span className="text-white/50">{me.yo_sent + me.emoji_sent}</span>
            </span>
            <span className="text-white/15">·</span>
            <span className="text-white/25 text-xs">
              recibidos <span className="text-white/70 font-semibold">{me.yo_received + me.emoji_received}</span>
            </span>
          </div>
        )}
      </div>

      {/* ── ranking ── */}
      <div className="px-5 pb-8">
        <p className="text-white/20 text-xs uppercase tracking-[0.2em] mb-3 pl-1">Ranking</p>
        <div className="flex flex-col gap-2">
          {ranking.map((entry, i) => {
            const isMe = entry.name === user;
            const received = entry.yo_received + entry.emoji_received;
            const sent = entry.yo_sent + entry.emoji_sent;
            return (
              <div
                key={entry.name}
                onClick={() => !isMe && setTarget(t => t === entry.name ? null : entry.name)}
                className={`flex items-center justify-between rounded-2xl px-4 py-3.5 transition-all cursor-pointer select-none ${
                  isMe
                    ? 'bg-white/10 border border-white/20'
                    : target === entry.name
                    ? 'bg-white/12 border border-white/30'
                    : 'bg-white/[0.04] hover:bg-white/8 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg w-6 text-center">
                    {i < 3 ? MEDALS[i] : <span className="text-white/20 text-sm">{i + 1}</span>}
                  </span>
                  <div>
                    <p className={`font-semibold text-sm ${isMe ? 'text-white' : 'text-white/80'}`}>
                      {entry.name}
                      {isMe && <span className="text-white/30 font-normal text-xs ml-1.5">tú</span>}
                    </p>
                    <p className="text-white/30 text-xs mt-0.5">
                      {entry.yo_received} yo · {entry.emoji_received} ☝️🙄 recibidos
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <span className="text-white font-bold text-lg tabular-nums">{received}</span>
                  <span className="text-white/25 text-xs tabular-nums">{sent} env.</span>
                </div>
              </div>
            );
          })}
          {ranking.length === 0 && (
            <p className="text-white/20 text-sm text-center py-4">nadie ha dicho nada todavía</p>
          )}
        </div>
      </div>
    </div>
  );
}
