import { neon } from '@neondatabase/serverless';

function getSql() {
  return neon(process.env.DATABASE_URL!);
}

export function currentMonth(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
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
  await sql`
    CREATE TABLE IF NOT EXISTS scores_monthly (
      name           TEXT NOT NULL,
      month          TEXT NOT NULL,
      yo_sent        INTEGER NOT NULL DEFAULT 0,
      yo_received    INTEGER NOT NULL DEFAULT 0,
      emoji_sent     INTEGER NOT NULL DEFAULT 0,
      emoji_received INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (name, month)
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

function rowToScore(row: Record<string, unknown>): UserScore {
  return {
    name: row.name as string,
    yo_sent: Number(row.yo_sent),
    yo_received: Number(row.yo_received),
    emoji_sent: Number(row.emoji_sent),
    emoji_received: Number(row.emoji_received),
  };
}

export async function getScores(): Promise<{ global: Scores; monthly: Scores }> {
  const sql = getSql();
  const month = currentMonth();
  const [globalRows, monthlyRows] = await Promise.all([
    sql`SELECT * FROM scores`,
    sql`SELECT * FROM scores_monthly WHERE month = ${month}`,
  ]);
  const global: Scores = {};
  for (const row of globalRows) global[row.name as string] = rowToScore(row);
  const monthly: Scores = {};
  for (const row of monthlyRows) monthly[row.name as string] = rowToScore(row);
  return { global, monthly };
}

async function upsertGlobal(name: string) {
  const sql = getSql();
  await sql`INSERT INTO scores (name) VALUES (${name}) ON CONFLICT (name) DO NOTHING`;
}

async function upsertMonthly(name: string, month: string) {
  const sql = getSql();
  await sql`
    INSERT INTO scores_monthly (name, month) VALUES (${name}, ${month})
    ON CONFLICT (name, month) DO NOTHING
  `;
}

export async function press(from: string, type: 'yo' | 'emoji', to?: string): Promise<void> {
  const sql = getSql();
  const month = currentMonth();
  await Promise.all([upsertGlobal(from), upsertMonthly(from, month)]);
  if (to && to !== from) {
    await Promise.all([upsertGlobal(to), upsertMonthly(to, month)]);
    if (type === 'yo') {
      await Promise.all([
        sql`UPDATE scores         SET yo_sent     = yo_sent     + 1 WHERE name = ${from}`,
        sql`UPDATE scores         SET yo_received = yo_received + 1 WHERE name = ${to}`,
        sql`UPDATE scores_monthly SET yo_sent     = yo_sent     + 1 WHERE name = ${from} AND month = ${month}`,
        sql`UPDATE scores_monthly SET yo_received = yo_received + 1 WHERE name = ${to}   AND month = ${month}`,
      ]);
    } else {
      await Promise.all([
        sql`UPDATE scores         SET emoji_sent     = emoji_sent     + 1 WHERE name = ${from}`,
        sql`UPDATE scores         SET emoji_received = emoji_received + 1 WHERE name = ${to}`,
        sql`UPDATE scores_monthly SET emoji_sent     = emoji_sent     + 1 WHERE name = ${from} AND month = ${month}`,
        sql`UPDATE scores_monthly SET emoji_received = emoji_received + 1 WHERE name = ${to}   AND month = ${month}`,
      ]);
    }
  } else {
    if (type === 'yo') {
      await Promise.all([
        sql`UPDATE scores         SET yo_sent = yo_sent + 1 WHERE name = ${from}`,
        sql`UPDATE scores_monthly SET yo_sent = yo_sent + 1 WHERE name = ${from} AND month = ${month}`,
      ]);
    } else {
      await Promise.all([
        sql`UPDATE scores         SET emoji_sent = emoji_sent + 1 WHERE name = ${from}`,
        sql`UPDATE scores_monthly SET emoji_sent = emoji_sent + 1 WHERE name = ${from} AND month = ${month}`,
      ]);
    }
  }
}
