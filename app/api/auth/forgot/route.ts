import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { Resend } from 'resend';
import { getUserByEmail, createResetToken, ensureTable } from '@/lib/db';

const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export async function POST(req: NextRequest) {
  const { email } = await req.json() as { email: string };
  if (!email) return NextResponse.json({ error: 'Falta el email' }, { status: 400 });

  await ensureTable();
  const user = await getUserByEmail(email.toLowerCase());

  // Always return OK to avoid user enumeration
  if (!user) return NextResponse.json({ ok: true });

  const token = randomBytes(32).toString('hex');
  await createResetToken(user.email, token);

  const link = `${APP_URL}/reset?token=${token}`;

  await resend.emails.send({
    from: 'Yo App <no-reply@yoapp-official.app>',
    to: user.email,
    subject: 'Recupera tu contraseña',
    html: `
      <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:32px">
        <h1 style="font-size:2rem;font-weight:900;margin:0">Yo</h1>
        <p style="color:#555;margin-top:16px">Haz clic en el enlace para cambiar tu contraseña. Caduca en 30 minutos.</p>
        <a href="${link}" style="display:inline-block;margin-top:24px;padding:14px 28px;background:#18181b;color:#fff;text-decoration:none;border-radius:16px;font-weight:600">
          Cambiar contraseña
        </a>
        <p style="color:#aaa;font-size:12px;margin-top:24px">Si no lo pediste, ignora este email.</p>
      </div>
    `,
  });

  return NextResponse.json({ ok: true });
}
