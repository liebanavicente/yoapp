import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { getSession } from '@/lib/auth';
import { ensureTable, insertAudioMessage, getAudioMessages } from '@/lib/db';

export async function GET() {
  await ensureTable();
  const messages = await getAudioMessages();
  return NextResponse.json(messages);
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const form = await req.formData();
  const file = form.get('audio') as File | null;
  const to = (form.get('to') as string | null) || null;

  if (!file) return NextResponse.json({ error: 'Sin audio' }, { status: 400 });

  const { url } = await put(`audio/${Date.now()}-${user.name}.webm`, file, {
    access: 'public',
    contentType: 'audio/webm',
  });

  await ensureTable();
  await insertAudioMessage(user.name, to, url);
  const messages = await getAudioMessages();
  return NextResponse.json(messages);
}
