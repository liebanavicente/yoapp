import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { consumeResetToken, updatePassword, getUserByEmail, ensureTable } from '@/lib/db';
import { createSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { token, password } = await req.json() as { token: string; password: string };
  if (!token || !password) return NextResponse.json({ error: 'Faltan campos' }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ error: 'Mínimo 6 caracteres' }, { status: 400 });

  await ensureTable();
  const row = await consumeResetToken(token);
  if (!row) return NextResponse.json({ error: 'Enlace inválido o caducado' }, { status: 400 });

  const hash = await bcrypt.hash(password, 10);
  await updatePassword(row.email, hash);

  const user = await getUserByEmail(row.email);
  if (user) await createSession({ id: user.id, email: user.email, name: user.name });

  return NextResponse.json({ ok: true });
}
