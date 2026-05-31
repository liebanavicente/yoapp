import { neon } from '@neondatabase/serverless';

function getSql() {
  return neon(process.env.DATABASE_URL!);
}

export async function ensureTable() {
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS scores (
      name           TEXT PRIMARY KEY,
      yo_sent        INTEGER NOT NULL DEFAULT 0,
      yo_received    INTEGER NOT NULL DEFAULT 0,
      emoji_sent     INTEGER NOT NULL DEFAULT 0,
      emoji_received INTEGER NOT NULL DEFAULT 0
    )
  `;
}

export type UserScore = {
  name: string;
  yo_sent: number;
  yo_received: number;
  emoji_sent: number;
  emoji_received: number;
};

export type Scores = Record<string, UserScore>;

export async function getScores(): Promise<Scores> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM scores ORDER BY (yo_received + emoji_received) DESC`;
  const result: Scores = {};
  for (const row of rows) {
    result[row.name] = {
      name: row.name,
      yo_sent: row.yo_sent,
      yo_received: row.yo_received,
      emoji_sent: row.emoji_sent,
      emoji_received: row.emoji_received,
    };
  }
  return result;
}

async function upsert(name: string) {
  const sql = getSql();
  await sql`
    INSERT INTO scores (name) VALUES (${name})
    ON CONFLICT (name) DO NOTHING
  `;
}

export async function press(from: string, type: 'yo' | 'emoji', to?: string): Promise<void> {
  const sql = getSql();
  await upsert(from);
  if (to && to !== from) {
    await upsert(to);
    if (type === 'yo') {
      await sql`UPDATE scores SET yo_sent     = yo_sent     + 1 WHERE name = ${from}`;
      await sql`UPDATE scores SET yo_received = yo_received + 1 WHERE name = ${to}`;
    } else {
      await sql`UPDATE scores SET emoji_sent     = emoji_sent     + 1 WHERE name = ${from}`;
      await sql`UPDATE scores SET emoji_received = emoji_received + 1 WHERE name = ${to}`;
    }
  } else {
    if (type === 'yo') {
      await sql`UPDATE scores SET yo_sent = yo_sent + 1 WHERE name = ${from}`;
    } else {
      await sql`UPDATE scores SET emoji_sent = emoji_sent + 1 WHERE name = ${from}`;
    }
  }
}
