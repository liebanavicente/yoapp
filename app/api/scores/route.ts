import { NextResponse } from 'next/server';
import { getScores, ensureTable } from '@/lib/db';

export async function GET() {
  await ensureTable();
  const scores = await getScores();
  return NextResponse.json(scores);
}
