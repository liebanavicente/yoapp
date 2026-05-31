import { NextRequest, NextResponse } from 'next/server';
import { increment, getCounts, ensureTable } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { name, type } = await req.json() as { name: string; type: 'yo' | 'emoji' };
  if (!name || (type !== 'yo' && type !== 'emoji')) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }
  await ensureTable();
  await increment(name, type);
  const counts = await getCounts();
  return NextResponse.json(counts);
}
