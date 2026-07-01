import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getUserByEmail, ensureTable } from '@/lib/db';
import { createSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json() as { email: string; password: string };
  if (!email || !password) {
    return NextResponse.json({ error: 'Faltan campos' }, { status: 400 });
  }
  await ensureTable();
  const user = await getUserByEmail(email.toLowerCase());
  if (!user) {
    return NextResponse.json({ error: 'Email o contraseña incorrectos' }, { status: 401 });
  }
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    return NextResponse.json({ error: 'Email o contraseña incorrectos' }, { status: 401 });
  }
  await createSession({ id: user.id, email: user.email, name: user.name });
  return NextResponse.json({ id: user.id, email: user.email, name: user.name });
}
