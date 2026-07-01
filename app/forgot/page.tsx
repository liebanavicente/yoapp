'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { t, LANG_LABELS, LANG_KEY, DEFAULT_LANG, type Lang } from '@/lib/i18n';

export default function ForgotPage() {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>(DEFAULT_LANG);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(LANG_KEY) as Lang | null;
    if (saved && saved in LANG_LABELS) setLang(saved);
  }, []);

  const tr = t[lang];

  async function handleSubmit() {
    if (!email) return;
    setLoading(true);
    try {
      await fetch('/api/auth/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } finally { setLoading(false); }
  }

  return (
    <div className="yo-bg min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-xs flex flex-col gap-6">
        <div className="text-center">
          <p className="font-black leading-none tracking-tighter text-zinc-900" style={{ fontSize: '5rem' }}>Yo</p>
          <p className="text-zinc-500 text-sm mt-2">{tr.forgot_title}</p>
        </div>

        {sent ? (
          <div className="bg-white rounded-2xl p-5 border border-zinc-100 shadow-sm text-center flex flex-col gap-3">
            <p className="text-2xl">📬</p>
            <p className="text-zinc-700 text-sm">{tr.forgot_sent}</p>
            <button onClick={() => router.push('/')} className="text-xs text-zinc-400 hover:text-zinc-600 mt-1">
              {tr.back_home}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <input
              className="w-full rounded-2xl px-4 py-3.5 text-base bg-white text-zinc-900 placeholder-zinc-400 border border-zinc-200 outline-none focus:border-zinc-400 shadow-sm"
              placeholder={tr.email} type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()} autoFocus />
            <button onClick={handleSubmit} disabled={loading}
              className="w-full rounded-2xl py-3.5 text-base font-bold bg-zinc-900 text-white hover:bg-zinc-700 active:scale-95 transition-all shadow-sm disabled:opacity-60">
              {loading ? '…' : tr.send_link}
            </button>
            <button onClick={() => router.push('/')} className="text-center text-xs text-zinc-400 hover:text-zinc-600 transition-colors">
              {tr.back}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
