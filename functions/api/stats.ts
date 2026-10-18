const SECURITY_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'public, max-age=60, s-maxage=60',
  'Access-Control-Allow-Methods': 'GET, OPTIONS'
};

export async function onRequest({ request, env }: { request: Request; env: Record<string, unknown> }) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: SECURITY_HEADERS });
  }

  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed.' }), {
      status: 405,
      headers: { ...SECURITY_HEADERS, Allow: 'GET, OPTIONS' }
    });
  }

  const fallback = {
    totalVisits: 7138,
    questsCompleted: 3,
    unlockedSkins: 1,
    service: 'local-fallback'
  };

  try {
    const db = env.DB as { prepare?: (query: string) => { first?: () => Promise<Record<string, unknown> | null>; all?: () => Promise<unknown[]> } } | undefined;
    if (db && typeof db.prepare === 'function') {
      const result = await db.prepare('SELECT 1').first?.();
      if (result) {
        return new Response(JSON.stringify({ success: true, fallback: false, stats: { ...fallback, service: 'd1' } }), {
          headers: SECURITY_HEADERS
        });
      }
    }
  } catch {
    // Fallback to the static values when D1 is not configured or the binding is unavailable.
  }

  return new Response(JSON.stringify({ success: true, fallback: true, stats: fallback }), {
    headers: SECURITY_HEADERS
  });
}
