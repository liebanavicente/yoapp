import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createUser, getUserByEmail, ensureTable } from '@/lib/db';
import { createSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { email, name, password } = await req.json() as {
    email: string; name: string; password: string;
  };
  if (!email || !name || !password) {
    return NextResponse.json({ error: 'Faltan campos' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
  }
  await ensureTable();
  const existing = await getUserByEmail(email.toLowerCase());
  if (existing) {
    return NextResponse.json({ error: 'Ese email ya está registrado' }, { status: 409 });
  }
  const password_hash = await bcrypt.hash(password, 10);
  const user = await createUser(email.toLowerCase(), name.trim(), password_hash);
  await createSession(user);
  return NextResponse.json({ id: user.id, email: user.email, name: user.name });
}
