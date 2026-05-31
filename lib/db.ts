import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS scores (
      name TEXT PRIMARY KEY,
      yo   INTEGER NOT NULL DEFAULT 0,
      emoji INTEGER NOT NULL DEFAULT 0
    )
  `;
}

export type Counts = Record<string, { yo: number; emoji: number }>;

export async function getCounts(): Promise<Counts> {
  const rows = await sql`SELECT name, yo, emoji FROM scores`;
  const result: Counts = {};
  for (const row of rows) {
    result[row.name] = { yo: row.yo, emoji: row.emoji };
  }
  return result;
}

export async function increment(name: string, type: 'yo' | 'emoji'): Promise<void> {
  if (type === 'yo') {
    await sql`
      INSERT INTO scores (name, yo, emoji) VALUES (${name}, 1, 0)
      ON CONFLICT (name) DO UPDATE SET yo = scores.yo + 1
    `;
  } else {
    await sql`
      INSERT INTO scores (name, yo, emoji) VALUES (${name}, 0, 1)
      ON CONFLICT (name) DO UPDATE SET emoji = scores.emoji + 1
    `;
  }
}
