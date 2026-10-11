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
}

declare global {
  var __leaderboardRateLimit: Map<string, { count: number; resetAt: number }> | undefined;
}

const scoreSchema = z.object({
  nickname: z.string().trim().min(1).max(20).regex(/^[\p{L}\p{N}_ -]+$/u),
  score: z.number().int().min(0).max(1_000_000)
});
const WINDOW_MS = 60_000;
const MAX_SUBMISSIONS = 5;

function getRateLimits() {
  globalThis.__leaderboardRateLimit ??= new Map();
  return globalThis.__leaderboardRateLimit;
}

async function readTopScores(db: D1Database) {
  const result = await db.prepare(
    'SELECT nickname, score FROM ai_mission_scores ORDER BY score DESC, created_at ASC, id ASC LIMIT 10'
  ).all<ScoreRow>();
  return result.results ?? [];
}

export async function onRequest({ request, env }: { request: Request; env: LeaderboardEnvironment }) {
  if (request.method !== 'GET' && request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed.' }, { status: 405, headers: { Allow: 'GET, POST' } });
  }

  if (!env.DB) {
    return Response.json({ error: 'Scores are temporarily unavailable.' }, { status: 503 });
  }

  if (request.method === 'GET') {
    const entries = await readTopScores(env.DB);
    return Response.json({ entries }, { headers: { 'Cache-Control': 'public, max-age=30, s-maxage=30' } });
  }

  const ip = request.headers.get('CF-Connecting-IP');
  if (ip) {
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

  await env.DB.prepare(
    'INSERT INTO ai_mission_scores (nickname, score) VALUES (?, ?)'
  ).bind(parsed.data.nickname, parsed.data.score).run();
  await env.DB.prepare(
    'DELETE FROM ai_mission_scores WHERE id NOT IN (SELECT id FROM ai_mission_scores ORDER BY score DESC, created_at ASC, id ASC LIMIT 100)'
  ).run();

  const entries = await readTopScores(env.DB);
  return Response.json({ success: true, entries }, { status: 201 });
}
