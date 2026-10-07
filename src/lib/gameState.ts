export type PetName = 'dog' | 'cow' | 'duck';

export type Quest = {
  id: string;
  title: string;
  href: string;
  reward: number;
  done: boolean;
};

export type Achievement = {
  id: string;
  title: string;
  description: string;
  requiredXp: number;
};

export type GameState = {
  version: number;
  xp: number;
  achievements: string[];
  questIds: string[];
  pets: Record<PetName, number>;
  petsFedGlobal: number;
  unlocks: string[];
  lastUpdated: number;
};

export const STORAGE_KEY = 'portfolio-game-state-v1';

export const questCatalog: Quest[] = [
  { id: 'read-post', title: 'Read one field note', href: '/blog', reward: 25, done: false },
  { id: 'view-resume', title: 'Review the resume', href: '/resume', reward: 35, done: false },
  { id: 'send-message', title: 'Send a message', href: '/contact', reward: 40, done: false },
  { id: 'explore-projects', title: 'Explore the project map', href: '/projects', reward: 30, done: false }
];

export const achievementCatalog: Achievement[] = [
  { id: 'first-steps', title: 'First steps', description: 'Earn 25 XP', requiredXp: 25 },
  { id: 'night-owl', title: 'Night owl', description: 'Reach 60 XP', requiredXp: 60 },
  { id: 'animal-whisperer', title: 'Animal whisperer', description: 'Feed the pets 5 times', requiredXp: 60 },
  { id: 'security-ranger', title: 'Security ranger', description: 'Reach 120 XP', requiredXp: 120 }
];

export const defaultState: GameState = {
  version: 1,
  xp: 0,
  achievements: [],
  questIds: [],
  pets: { dog: 0, cow: 0, duck: 0 },
  petsFedGlobal: 0,
  unlocks: [],
  lastUpdated: Date.now()
};

const readFromStorage = (): GameState => {
  if (typeof window === 'undefined') {
    return defaultState;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw) as Partial<GameState>;
    return {
      ...defaultState,
      ...parsed,
      version: 1,
      pets: {
        ...defaultState.pets,
        ...(parsed.pets ?? {})
      },
      questIds: Array.isArray(parsed.questIds) ? parsed.questIds : [],
      achievements: Array.isArray(parsed.achievements) ? parsed.achievements : [],
      unlocks: Array.isArray(parsed.unlocks) ? parsed.unlocks : []
    };
  } catch {
    return defaultState;
  }
};

let state = readFromStorage();
const listeners = new Set<(next: GameState) => void>();

const persist = (next: GameState) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
};

const computeAchievements = (xp: number, petsFedGlobal: number) => {
  const unlocked = new Set<string>();
  if (xp >= 25) unlocked.add('first-steps');
  if (xp >= 60) unlocked.add('night-owl');
  if (petsFedGlobal >= 5) unlocked.add('animal-whisperer');
  if (xp >= 120) unlocked.add('security-ranger');
  return [...unlocked];
};

export function getGameState(): GameState {
  return state;
}

export function subscribe(listener: (next: GameState) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function updateGameState(mutator: (draft: GameState) => GameState) {
  const next = mutator({ ...state, pets: { ...state.pets } });
  const normalized: GameState = {
    ...defaultState,
    ...next,
    version: 1,
    achievements: computeAchievements(next.xp, next.petsFedGlobal),
    pets: {
      ...defaultState.pets,
      ...(next.pets ?? {})
    },
    questIds: Array.from(new Set(next.questIds ?? [])),
    unlocks: Array.from(new Set(next.unlocks ?? [])),
    lastUpdated: Date.now()
  };

  state = normalized;
  persist(normalized);
  listeners.forEach((listener) => listener(normalized));
  return normalized;
}

export function completeQuest(questId: string) {
  const target = questCatalog.find((quest) => quest.id === questId);
  if (!target) return state;

  return updateGameState((draft) => {
    if (draft.questIds.includes(questId)) {
      return draft;
    }

    const nextXP = draft.xp + target.reward;
    const nextUnlocks = draft.unlocks.includes('field-logs')
      ? draft.unlocks
      : nextXP >= 25
        ? [...draft.unlocks, 'field-logs']
        : draft.unlocks;

    return {
      ...draft,
      xp: nextXP,
      questIds: [...draft.questIds, questId],
      unlocks: nextUnlocks
    };
  });
}

export function feedPet(pet: PetName) {
  return updateGameState((draft) => {
    const nextCount = (draft.pets[pet] ?? 0) + 1;
    const gain = 15 + (nextCount > 2 ? 10 : 0);
    const nextUnlocks = draft.unlocks.includes('pet-skin')
      ? draft.unlocks
      : draft.petsFedGlobal + 1 >= 5
        ? [...draft.unlocks, 'pet-skin']
        : draft.unlocks;

    return {
      ...draft,
      xp: draft.xp + gain,
      pets: {
        ...draft.pets,
        [pet]: nextCount
      },
      petsFedGlobal: draft.petsFedGlobal + 1,
      unlocks: nextUnlocks
    };
  });
}

export function getLevel(xp: number) {
  return Math.max(1, Math.floor(xp / 40) + 1);
}

export function getProgressToNextLevel(xp: number) {
  const currentLevel = getLevel(xp);
  const start = (currentLevel - 1) * 40;
  const next = currentLevel * 40;
  const progress = ((xp - start) / (next - start)) * 100;
  return {
    currentLevel,
    progress: Math.min(Math.max(progress, 0), 100),
    nextGoal: next
  };
}
