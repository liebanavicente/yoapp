'use client';

import { useState, useEffect, useCallback } from 'react';

type Counts = Record<string, { yo: number; emoji: number }>;

const USER_KEY = 'yo_user';

export default function Home() {
  const [user, setUser] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [counts, setCounts] = useState<Counts>({});
  const [loginScreen, setLoginScreen] = useState(false);
  const [ready, setReady] = useState(false);
  const [pressing, setPressing] = useState(false);

  const fetchScores = useCallback(async () => {
    try {
      const res = await fetch('/api/scores');
      const data: Counts = await res.json();
      setCounts(data);
    } catch {}
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(USER_KEY);
    setUser(saved);
    fetchScores().then(() => setReady(true));
  }, [fetchScores]);

  // Poll every 10s for live updates
  useEffect(() => {
    const id = setInterval(fetchScores, 10_000);
    return () => clearInterval(id);
  }, [fetchScores]);

  function handleLogin() {
    const name = nameInput.trim();
    if (!name) return;
    localStorage.setItem(USER_KEY, name);
    setUser(name);
    setLoginScreen(false);
  }

  function handleLogout() {
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }

  async function press(type: 'yo' | 'emoji') {
    if (!user || pressing) return;
    setPressing(true);
    try {
      const res = await fetch('/api/press', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: user, type }),
      });
      const data: Counts = await res.json();
      setCounts(data);
    } finally {
      setPressing(false);
    }
  }

  const ranking = Object.entries(counts)
    .map(([name, c]) => ({ name, total: c.yo + c.emoji, yo: c.yo, emoji: c.emoji }))
    .sort((a, b) => b.total - a.total);

  if (!ready) return null;

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-8 p-6">
        <div
          className="text-center cursor-pointer select-none"
          onClick={() => setLoginScreen(v => !v)}
        >
          <p
            className="text-white font-black leading-none"
            style={{ fontSize: 'clamp(6rem, 30vw, 14rem)' }}
          >
            Yo
          </p>
          <p className="leading-none" style={{ fontSize: 'clamp(4rem, 20vw, 9rem)' }}>
            ☝️🙄
          </p>
        </div>

        {loginScreen && (
          <div className="flex flex-col items-center gap-3 w-full max-w-xs">
            <input
              className="w-full rounded-2xl px-4 py-3 text-lg bg-white/10 text-white placeholder-white/40 border border-white/20 outline-none focus:border-white/60 text-center"
              placeholder="tu nombre"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              autoFocus
            />
            <button
              onClick={handleLogin}
              className="w-full rounded-2xl py-3 text-lg font-bold bg-white text-black active:scale-95 transition-transform"
            >
              Entrar
            </button>
          </div>
        )}
      </div>
    );
  }

  const myCount = counts[user] ?? { yo: 0, emoji: 0 };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-between p-6 pb-10">
      <div className="w-full flex justify-between items-center">
        <span className="text-white/40 text-sm">{user}</span>
        <button onClick={handleLogout} className="text-white/30 text-xs hover:text-white/60">
          salir
        </button>
      </div>

      <div className="flex flex-col items-center gap-6 flex-1 justify-center">
        <button
          onClick={() => press('yo')}
          disabled={pressing}
          className="rounded-3xl bg-white text-black font-black active:scale-95 transition-transform shadow-2xl disabled:opacity-70"
          style={{
            fontSize: 'clamp(3rem, 18vw, 7rem)',
            width: 'clamp(10rem, 60vw, 22rem)',
            padding: '0.4em 0.6em',
          }}
        >
          Yo
        </button>
        <button
          onClick={() => press('emoji')}
          disabled={pressing}
          className="rounded-3xl bg-white/10 active:scale-95 transition-transform border border-white/20 text-center disabled:opacity-70"
          style={{
            fontSize: 'clamp(2.5rem, 14vw, 5rem)',
            width: 'clamp(10rem, 60vw, 22rem)',
            padding: '0.4em 0.6em',
          }}
        >
          ☝️🙄
        </button>
        <p className="text-white/40 text-sm mt-2">
          {myCount.yo} yo · {myCount.emoji} ☝️🙄
        </p>
      </div>

      <div className="w-full max-w-sm">
        <p className="text-white/30 text-xs uppercase tracking-widest mb-3 text-center">
          Ranking
        </p>
        <div className="flex flex-col gap-2">
          {ranking.map((entry, i) => (
            <div
              key={entry.name}
              className={`flex items-center justify-between rounded-2xl px-4 py-3 ${
                entry.name === user
                  ? 'bg-white/15 border border-white/20'
                  : 'bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-white/30 text-sm w-4">{i + 1}</span>
                <span className="text-white font-medium">{entry.name}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-white/60">
                <span>{entry.yo} yo</span>
                <span>{entry.emoji} ☝️🙄</span>
                <span className="text-white font-bold ml-1">{entry.total}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
