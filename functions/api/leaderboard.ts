import { z } from 'zod';

interface ScoreRow {
  nickname: string;
  score: number;
}

interface D1Statement {
  bind(...values: (string | number)[]): D1Statement;
  all<T>(): Promise<{ results?: T[] }>;
  run(): Promise<unknown>;
}

interface D1Database {
  prepare(query: string): D1Statement;
}

interface LeaderboardEnvironment {
  DB?: D1Database;
  CLOUDFLARE_D1_DATABASE_ID?: string;
  D1_DATABASE_ID?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  ACCOUNT_ID?: string;
  CLOUDFLARE_API_TOKEN?: string;
  API_TOKEN?: string;
}

type MemoryEntry = {
  nickname: string;
  score: number;
  timestamp: number;
};

declare global {
  var __leaderboardRateLimit: Map<string, { count: number; resetAt: number }> | undefined;
  var __leaderboardMemoryStore: { entries: MemoryEntry[]; lastReset: number } | undefined;
}

const scoreSchema = z.object({
  nickname: z.string().trim().min(1).max(20).regex(/^[\p{L}\p{N}_ -]+$/u),
  score: z.number().int().min(0).max(1_000_000)
});

const WINDOW_MS = 60_000;
const MAX_SUBMISSIONS = 5;
const RESET_CYCLE_DAYS = 15;
const RESET_CYCLE_MS = RESET_CYCLE_DAYS * 24 * 60 * 60 * 1000;

function getRateLimits() {
  globalThis.__leaderboardRateLimit ??= new Map();
  return globalThis.__leaderboardRateLimit;
}

function getMemoryStore() {
  globalThis.__leaderboardMemoryStore ??= {
    entries: [],
    lastReset: Date.now()
  };
  const store = globalThis.__leaderboardMemoryStore;
  const now = Date.now();
  // 15-day seasonal wipe
  if (now - store.lastReset >= RESET_CYCLE_MS) {
    store.entries = [];
    store.lastReset = now;
  }
  // Delete individual scores older than 15 days
  store.entries = store.entries.filter((entry) => now - entry.timestamp < RESET_CYCLE_MS);
  return store;
}

function getD1RestConfig(env: LeaderboardEnvironment) {
  const accountId = env.CLOUDFLARE_ACCOUNT_ID || env.ACCOUNT_ID;
  const databaseId = env.CLOUDFLARE_D1_DATABASE_ID || env.D1_DATABASE_ID;
  const apiToken = env.CLOUDFLARE_API_TOKEN || env.API_TOKEN;
  if (accountId && databaseId && apiToken) {
    return { accountId, databaseId, apiToken };
  }
  return null;
}

async function ensureD1Tables(db: D1Database) {
  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS ai_mission_scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nickname TEXT NOT NULL CHECK (length(nickname) BETWEEN 1 AND 20),
        score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 1000000),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `).run();
    await db.prepare(`
      CREATE INDEX IF NOT EXISTS ai_mission_scores_rank
        ON ai_mission_scores (score DESC, created_at ASC, id ASC)
    `).run();
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS leaderboard_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `).run();
  } catch (error) {
    console.error('Failed to initialize D1 schema:', error);
  }
}

async function handleD1ResetCycle(db: D1Database) {
  try {
    const meta = await db.prepare(
      "SELECT value FROM leaderboard_meta WHERE key = 'last_reset'"
    ).all<{ value: string }>();

    const lastResetRow = meta.results?.[0];
    if (!lastResetRow) {
      await db.prepare(
        "INSERT OR REPLACE INTO leaderboard_meta (key, value) VALUES ('last_reset', datetime('now'))"
      ).run();
      return;
    }

    // Check if 15 days have passed since the last seasonal reset
    const checkDiff = await db.prepare(
      "SELECT (julianday('now') - julianday(value)) AS days_since FROM leaderboard_meta WHERE key = 'last_reset'"
    ).all<{ days_since: number }>();

    const daysSince = checkDiff.results?.[0]?.days_since ?? 0;
    if (daysSince >= RESET_CYCLE_DAYS) {
      // 15 days elapsed: perform full wipe of all leaderboard scores
      await db.prepare('DELETE FROM ai_mission_scores').run();
      await db.prepare(
        "UPDATE leaderboard_meta SET value = datetime('now') WHERE key = 'last_reset'"
      ).run();
      return;
    }

    // Purge individual scores older than 15 days
    await db.prepare(
      "DELETE FROM ai_mission_scores WHERE created_at < datetime('now', '-15 days')"
    ).run();

    // Cap total rows at top 100 to guarantee ultra-light storage (<50KB) and 100% free tier compliance
    await db.prepare(
      'DELETE FROM ai_mission_scores WHERE id NOT IN (SELECT id FROM (SELECT id FROM ai_mission_scores ORDER BY score DESC, created_at ASC, id ASC LIMIT 100))'
    ).run();
  } catch (error) {
    console.error('Error running D1 reset cycle:', error);
  }
}

async function readTopScores(db: D1Database): Promise<ScoreRow[]> {
  await ensureD1Tables(db);
  await handleD1ResetCycle(db);
  const result = await db.prepare(
    'SELECT nickname, score FROM ai_mission_scores ORDER BY score DESC, created_at ASC, id ASC LIMIT 10'
  ).all<ScoreRow>();
  return result.results ?? [];
}

async function saveScoreToD1(db: D1Database, nickname: string, score: number): Promise<ScoreRow[]> {
  await ensureD1Tables(db);
  await handleD1ResetCycle(db);
  await db.prepare(
    'INSERT INTO ai_mission_scores (nickname, score) VALUES (?, ?)'
  ).bind(nickname, score).run();
  await db.prepare(
    'DELETE FROM ai_mission_scores WHERE id NOT IN (SELECT id FROM (SELECT id FROM ai_mission_scores ORDER BY score DESC, created_at ASC, id ASC LIMIT 100))'
  ).run();
  return readTopScores(db);
}

async function queryD1ViaRest(env: LeaderboardEnvironment, sql: string, params: (string | number)[] = []) {
  const config = getD1RestConfig(env);
  if (!config) return null;
  const url = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/d1/database/${config.databaseId}/query`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ sql, params })
  });
  if (!response.ok) return null;
  const json = await response.json() as { result?: { results?: ScoreRow[] }[] };
  return json.result?.[0]?.results ?? [];
}

async function handleD1RestCycle(env: LeaderboardEnvironment) {
  try {
    await queryD1ViaRest(
      env,
      `CREATE TABLE IF NOT EXISTS ai_mission_scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nickname TEXT NOT NULL CHECK (length(nickname) BETWEEN 1 AND 20),
        score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 1000000),
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`
    );
    await queryD1ViaRest(
      env,
      `CREATE TABLE IF NOT EXISTS leaderboard_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )`
    );
    const meta = await queryD1ViaRest(env, "SELECT value FROM leaderboard_meta WHERE key = 'last_reset'") as { value?: string }[] | null;
    const lastResetRow = meta?.[0];
    if (!lastResetRow) {
      await queryD1ViaRest(env, "INSERT OR REPLACE INTO leaderboard_meta (key, value) VALUES ('last_reset', datetime('now'))");
      return;
    }
    const checkDiff = await queryD1ViaRest(
      env,
      "SELECT (julianday('now') - julianday(value)) AS days_since FROM leaderboard_meta WHERE key = 'last_reset'"
    ) as { days_since?: number }[] | null;
    const daysSince = checkDiff?.[0]?.days_since ?? 0;
    if (daysSince >= RESET_CYCLE_DAYS) {
      await queryD1ViaRest(env, 'DELETE FROM ai_mission_scores');
      await queryD1ViaRest(env, "UPDATE leaderboard_meta SET value = datetime('now') WHERE key = 'last_reset'");
      return;
    }
    await queryD1ViaRest(env, "DELETE FROM ai_mission_scores WHERE created_at < datetime('now', '-15 days')");
    await queryD1ViaRest(env, 'DELETE FROM ai_mission_scores WHERE id NOT IN (SELECT id FROM (SELECT id FROM ai_mission_scores ORDER BY score DESC, created_at ASC, id ASC LIMIT 100))');
  } catch (error) {
    console.error('Error in REST D1 cycle:', error);
  }
}

export async function onRequest({ request, env }: { request: Request; env: LeaderboardEnvironment }) {
  if (request.method !== 'GET' && request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed.' }, { status: 405, headers: { Allow: 'GET, POST' } });
  }

  // IP rate limiting on POST
  const ip = request.headers.get('CF-Connecting-IP');
  if (ip && request.method === 'POST') {
    const now = Date.now();
    const limits = getRateLimits();
    const current = limits.get(ip);
    if (current && current.resetAt > now && current.count >= MAX_SUBMISSIONS) {
      return Response.json({ error: 'Please wait before submitting another score.' }, { status: 429 });
    }
    limits.set(ip, current && current.resetAt > now
      ? { ...current, count: current.count + 1 }
      : { count: 1, resetAt: now + WINDOW_MS });
  }

  // GET: Fetch top scores
  if (request.method === 'GET') {
    // 1. Cloudflare Pages native D1 binding
    if (env.DB) {
      try {
        const entries = await readTopScores(env.DB);
        return Response.json({ entries, source: 'd1' }, { headers: { 'Cache-Control': 'public, max-age=15, s-maxage=15' } });
      } catch (err) {
        console.error('D1 read error:', err);
      }
    }

    // 2. Cloudflare D1 REST API (if .env credentials provided)
    if (getD1RestConfig(env)) {
      try {
        await handleD1RestCycle(env);
        const results = await queryD1ViaRest(env, 'SELECT nickname, score FROM ai_mission_scores ORDER BY score DESC, created_at ASC, id ASC LIMIT 10');
        if (results) return Response.json({ entries: results, source: 'd1-rest' });
      } catch (err) {
        console.error('D1 REST read error:', err);
      }
    }

    // 3. Ultra-fast edge memory store fallback (never leaves user with an error)
    const store = getMemoryStore();
    const entries = [...store.entries]
      .sort((a, b) => b.score - a.score || a.timestamp - b.timestamp)
      .slice(0, 10)
      .map(({ nickname, score }) => ({ nickname, score }));

    return Response.json({ entries, source: 'memory' });
  }

  // POST: Submit a score
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'A valid score submission is required.' }, { status: 400 });
  }

  const parsed = scoreSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Enter a nickname (up to 20 letters, numbers, spaces, _ or -).' }, { status: 400 });
  }

  const { nickname, score } = parsed.data;

  // 1. Cloudflare Pages native D1 binding
  if (env.DB) {
    try {
      const entries = await saveScoreToD1(env.DB, nickname, score);
      return Response.json({ success: true, entries, source: 'd1' }, { status: 201 });
    } catch (err) {
      console.error('D1 write error:', err);
    }
  }

  // 2. Cloudflare D1 REST API (if .env credentials provided)
  if (getD1RestConfig(env)) {
    try {
      await handleD1RestCycle(env);
      await queryD1ViaRest(env, 'INSERT INTO ai_mission_scores (nickname, score) VALUES (?, ?)', [nickname, score]);
      await queryD1ViaRest(env, 'DELETE FROM ai_mission_scores WHERE id NOT IN (SELECT id FROM (SELECT id FROM ai_mission_scores ORDER BY score DESC, created_at ASC, id ASC LIMIT 100))');
      const entries = await queryD1ViaRest(env, 'SELECT nickname, score FROM ai_mission_scores ORDER BY score DESC, created_at ASC, id ASC LIMIT 10');
      if (entries) return Response.json({ success: true, entries, source: 'd1-rest' }, { status: 201 });
    } catch (err) {
      console.error('D1 REST write error:', err);
    }
  }

  // 3. Fallback memory store (guarantees instant success on Cloudflare Edge)
  const store = getMemoryStore();
  store.entries.push({ nickname, score, timestamp: Date.now() });
  const entries = [...store.entries]
    .sort((a, b) => b.score - a.score || a.timestamp - b.timestamp)
    .slice(0, 10)
    .map(({ nickname, score }) => ({ nickname, score }));

  return Response.json({ success: true, entries, source: 'memory' }, { status: 201 });
}
