'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    setError('');
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return; }
    if (password.length < 6) { setError('Mínimo 6 caracteres'); return; }
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
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="yo-bg min-h-screen flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-xs flex flex-col gap-6">
        <div className="text-center">
          <p className="font-black leading-none tracking-tighter text-zinc-900" style={{ fontSize: '5rem' }}>Yo</p>
          <p className="text-zinc-500 text-sm mt-2">Nueva contraseña</p>
        </div>

        {done ? (
          <p className="text-center text-zinc-600 bg-white rounded-2xl p-4 border border-zinc-100">
            ✅ Contraseña actualizada. Redirigiendo…
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <input
              className="w-full rounded-2xl px-4 py-3.5 text-base bg-white text-zinc-900 placeholder-zinc-400 border border-zinc-200 outline-none focus:border-zinc-400 shadow-sm"
              placeholder="nueva contraseña"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
            />
            <input
              className="w-full rounded-2xl px-4 py-3.5 text-base bg-white text-zinc-900 placeholder-zinc-400 border border-zinc-200 outline-none focus:border-zinc-400 shadow-sm"
              placeholder="repite la contraseña"
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full rounded-2xl py-3.5 text-base font-bold bg-zinc-900 text-white hover:bg-zinc-700 active:scale-95 transition-all shadow-sm disabled:opacity-60"
            >
              {loading ? '…' : 'Cambiar contraseña'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResetPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
