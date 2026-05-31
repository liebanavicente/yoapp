import { NextResponse } from 'next/server';
import { getCounts, ensureTable } from '@/lib/db';

export async function GET() {
  await ensureTable();
  const counts = await getCounts();
  return NextResponse.json(counts);
}
