import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const COOKIE = 'yo_session';
const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? 'dev-secret-change-me');

export type SessionUser = { id: number; email: string; name: string };

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({ id: user.id, email: user.email, name: user.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(secret);

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  });
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const jar = await cookies();
    const token = jar.get(COOKIE)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}
