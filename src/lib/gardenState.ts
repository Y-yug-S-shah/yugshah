export type GardenVisitKind = 'blog' | 'project';

export type GardenVisits = {
  blog: string[];
  project: string[];
};

export const GARDEN_VISITS_KEY = 'portfolio-garden-visits-v1';

export function readGardenVisits(): GardenVisits {
  if (typeof window === 'undefined') return { blog: [], project: [] };

  try {
    const saved = window.localStorage.getItem(GARDEN_VISITS_KEY);
    if (!saved) return { blog: [], project: [] };
    const parsed = JSON.parse(saved) as Partial<GardenVisits>;
    return {
      blog: Array.isArray(parsed.blog) ? parsed.blog : [],
      project: Array.isArray(parsed.project) ? parsed.project : []
    };
  } catch {
    return { blog: [], project: [] };
  }
}

export function recordGardenVisit(kind: GardenVisitKind, slug: string) {
  const visits = readGardenVisits();
  const next = {
    ...visits,
    [kind]: Array.from(new Set([...visits[kind], slug]))
  };

  window.localStorage.setItem(GARDEN_VISITS_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('portfolio:garden-discovery', { detail: next }));
}
