'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { t, LANG_LABELS, LANG_KEY, DEFAULT_LANG, type Lang } from '@/lib/i18n';

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token') ?? '';
  const [lang, setLang] = useState<Lang>(DEFAULT_LANG);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(LANG_KEY) as Lang | null;
    if (saved && saved in LANG_LABELS) setLang(saved);
  }, []);

  const tr = t[lang];

  async function handleSubmit() {
    setError('');
    if (password !== confirm) { setError(tr.passwords_no_match); return; }
    if (password.length < 6) { setError(tr.min_6); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setDone(true);
      setTimeout(() => router.push('/'), 2000);
    } finally { setLoading(false); }
  }

  return (
    <div className="yo-bg min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-xs flex flex-col gap-6">
        <div className="text-center">
          <p className="font-black leading-none tracking-tighter text-zinc-900" style={{ fontSize: '5rem' }}>Yo</p>
          <p className="text-zinc-500 text-sm mt-2">{tr.new_password}</p>
        </div>

        {done ? (
          <p className="text-center text-zinc-600 bg-white rounded-2xl p-4 border border-zinc-100">{tr.password_updated}</p>
        ) : (
          <div className="flex flex-col gap-3">
            <input className="w-full rounded-2xl px-4 py-3.5 text-base bg-white text-zinc-900 placeholder-zinc-400 border border-zinc-200 outline-none focus:border-zinc-400 shadow-sm"
              placeholder={tr.new_password} type="password" value={password}
              onChange={e => setPassword(e.target.value)} autoFocus />
            <input className="w-full rounded-2xl px-4 py-3.5 text-base bg-white text-zinc-900 placeholder-zinc-400 border border-zinc-200 outline-none focus:border-zinc-400 shadow-sm"
              placeholder={tr.repeat_password} type="password" value={confirm}
              onChange={e => setConfirm(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button onClick={handleSubmit} disabled={loading}
              className="w-full rounded-2xl py-3.5 text-base font-bold bg-zinc-900 text-white hover:bg-zinc-700 active:scale-95 transition-all shadow-sm disabled:opacity-60">
              {loading ? '…' : tr.change_password}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResetPage() {
  return <Suspense><ResetForm /></Suspense>;
}
