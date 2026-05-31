import { NextRequest, NextResponse } from 'next/server';
import { press, getScores, ensureTable } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { from, type, to } = await req.json() as {
    from: string;
    type: 'yo' | 'emoji';
    to?: string;
  };
  if (!from || (type !== 'yo' && type !== 'emoji')) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }
  await ensureTable();
  await press(from, type, to);
  const scores = await getScores();
  return NextResponse.json(scores);
}
