import { NextResponse } from 'next/server';
import { getCounts } from '@/lib/redis';

export async function GET() {
  const counts = await getCounts();
  return NextResponse.json(counts);
}
