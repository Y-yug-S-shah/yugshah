export async function onRequest({ request, env }: { request: Request; env: Record<string, unknown> }) {
  if (request.method !== 'GET') {
    return Response.json({ success: false, error: 'Method not allowed.' }, { status: 405 });
  }

  const fallback = {
    totalVisits: 7138,
    questsCompleted: 3,
    petsFed: 28,
    unlockedSkins: 1,
    service: 'local-fallback'
  };

  try {
    const db = env.DB as { prepare?: (query: string) => { first?: () => Promise<Record<string, unknown> | null>; all?: () => Promise<unknown[]> } } | undefined;
    if (db && typeof db.prepare === 'function') {
      const result = await db.prepare('SELECT 1').first?.();
      if (result) {
        return Response.json({ success: true, fallback: false, stats: { ...fallback, service: 'd1' } });
      }
    }
  } catch {
    // Fallback to the static values when D1 is not configured or the binding is unavailable.
  }

  return Response.json({ success: true, fallback: true, stats: fallback });
}
