import { NextRequest, NextResponse } from 'next/server';
import { put, del } from '@vercel/blob';
import { getSession } from '@/lib/auth';
import { ensureTable, insertAudioMessage, getAudioMessages, deleteAudioMessage } from '@/lib/db';

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
  const mimeType = (form.get('mimeType') as string | null) || 'audio/webm';

  if (!file) return NextResponse.json({ error: 'Sin audio' }, { status: 400 });

  const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm';
  const { url } = await put(`audio/${Date.now()}-${user.name}.${ext}`, file, {
    access: 'public',
    contentType: mimeType,
  });

  await ensureTable();
  await insertAudioMessage(user.name, to, url, mimeType);
  const messages = await getAudioMessages();
  return NextResponse.json(messages);
}

export async function DELETE(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await req.json() as { id: number };
  await ensureTable();
  const blobUrl = await deleteAudioMessage(id, user.name);
  if (!blobUrl) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  await del(blobUrl);
  const messages = await getAudioMessages();
  return NextResponse.json(messages);
}
