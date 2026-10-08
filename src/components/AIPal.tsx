import { useEffect, useRef, useState, type FormEventHandler } from 'react';

type PalState = {
  name: string;
  bond: number;
  energy: number;
  memories: number;
  lessons: string[];
};

const STORAGE_KEY = 'mori-garden-v1';
const INITIAL_STATE: PalState = { name: 'Mori', bond: 16, energy: 78, memories: 0, lessons: [] };
const THOUGHT_SEEDS = [
  { id: 'curiosity', label: 'curiosity', left: '13%', top: '22%' },
  { id: 'kindness', label: 'kindness', left: '76%', top: '19%' },
  { id: 'wonder', label: 'wonder', left: '84%', top: '61%' },
  { id: 'patience', label: 'patience', left: '18%', top: '68%' },
  { id: 'play', label: 'play', left: '53%', top: '10%' }
];
const LESSONS = [
  { id: 'permission', title: 'Ask before using a tool', note: 'A thoughtful agent checks before taking action.' },
  { id: 'privacy', title: 'Keep private things private', note: 'A good friend knows some things are not theirs to share.' }
];

function readSavedState(): PalState {
  if (typeof window === 'undefined') return INITIAL_STATE;
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (typeof saved !== 'object' || saved === null) return INITIAL_STATE;
    const value = saved as Partial<PalState>;
    if (
      typeof value.name !== 'string' ||
      typeof value.bond !== 'number' ||
      typeof value.energy !== 'number' ||
      typeof value.memories !== 'number' ||
      !Array.isArray(value.lessons) ||
      value.lessons.some((lesson) => typeof lesson !== 'string')
    ) {
      return INITIAL_STATE;
    }
    return {
      name: value.name.slice(0, 12) || INITIAL_STATE.name,
      bond: Math.max(0, Math.min(100, value.bond)),
      energy: Math.max(0, Math.min(100, value.energy)),
      memories: Math.max(0, value.memories),
      lessons: value.lessons.filter((lesson) => LESSONS.some((item) => item.id === lesson))
    };
  } catch (error) {
    console.error('Could not load the saved AI garden from this browser.', error);
    return INITIAL_STATE;
  }
}

export default function AIPal() {
  const [pal, setPal] = useState<PalState>(INITIAL_STATE);
  const [isLoaded, setIsLoaded] = useState(false);
  const [notice, setNotice] = useState('A tiny garden, just for the two of you.');
  const [nickname, setNickname] = useState(pal.name);
  const [pickedSeeds, setPickedSeeds] = useState<string[]>([]);
  const [reaction, setReaction] = useState('calm');
  const toastTimer = useRef<number | undefined>(undefined);
  const seedTimers = useRef<number[]>([]);

  useEffect(() => {
    const saved = readSavedState();
    setPal(saved);
    setNickname(saved.name);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pal));
    } catch (error) {
      console.error('Could not save the AI garden in this browser.', error);
    }
  }, [isLoaded, pal]);

  useEffect(() => () => {
    if (toastTimer.current !== undefined) window.clearTimeout(toastTimer.current);
    seedTimers.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const say = (message: string, mood = 'happy') => {
    setNotice(message);
    setReaction(mood);
    if (toastTimer.current !== undefined) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setReaction('calm'), 1000);
  };

  const playTogether = () => {
    if (pal.energy < 8) {
      say(`${pal.name} is having a little rest. A quiet moment might feel nice.`, 'sleepy');
      return;
    }
    setPal((current) => ({
      ...current,
      bond: Math.min(100, current.bond + 5),
      energy: Math.max(0, current.energy - 8)
    }));
    say(`${pal.name} sends a very enthusiastic little wave.`, 'happy');
  };

  const shareKindness = () => {
    setPal((current) => ({ ...current, bond: Math.min(100, current.bond + 2) }));
    say(`${pal.name} is keeping that kind thought safe.`, 'happy');
  };

  const letRest = () => {
    setPal((current) => ({ ...current, energy: Math.min(100, current.energy + 16) }));
    say(`${pal.name} curls up for a quiet recharge.`, 'sleepy');
  };

  const teachLesson = (lessonId: string) => {
    const lesson = LESSONS.find((item) => item.id === lessonId);
    if (!lesson || pal.lessons.includes(lessonId)) return;
    setPal((current) => ({ ...current, lessons: [...current.lessons, lessonId] }));
    say(`${pal.name} learned: ${lesson.note}`, 'thoughtful');
  };

  const gatherSeed = (seedId: string, label: string) => {
    if (pickedSeeds.includes(seedId)) return;
    setPickedSeeds((current) => [...current, seedId]);
    setPal((current) => ({ ...current, memories: current.memories + 1 }));
    say(`A little ${label} memory, tucked away just for you.`, 'thoughtful');
    const timer = window.setTimeout(() => {
      setPickedSeeds((current) => current.filter((id) => id !== seedId));
      seedTimers.current = seedTimers.current.filter((id) => id !== timer);
    }, 1800);
    seedTimers.current.push(timer);
  };

  const saveName: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    const nextName = nickname.trim().slice(0, 12);
    if (!nextName) {
      say('Choose a name with at least one letter.', 'thoughtful');
      return;
    }
    setPal((current) => ({ ...current, name: nextName }));
    setNickname(nextName);
    say(`A new little chapter for ${nextName}.`, 'happy');
  };

  const level = Math.floor(pal.memories / 8) + 1;
  const memoryProgress = pal.memories % 8;
  const boundariesProgress = Math.round((pal.lessons.length / LESSONS.length) * 100);

  return (
    <section className="mori-game" aria-label="Mori's AI garden">
      <div className="mori-game-heading">
        <div>
          <p className="mori-eyebrow">A SMALL, SOFT PLACE ON THE INTERNET</p>
          <h2>Your friend, {pal.name}.</h2>
          <p>Collect tiny thoughts, play a little, or teach an AI companion what it means to be considerate.</p>
        </div>
        <div className="mori-level" aria-label={`Garden level ${level}`}>
          <span>GARDEN</span>
          <strong>Level {level}</strong>
        </div>
      </div>

      <div className="mori-game-grid">
        <div className="mori-garden-column">
          <div className={`mori-garden-scene mood-${reaction}`}>
            <div className="mori-garden-haze haze-one" />
            <div className="mori-garden-haze haze-two" />
            <span className="mori-scene-caption">A calm little corner</span>
            <span className="mori-cloud cloud-one" aria-hidden="true">✦</span>
            <span className="mori-cloud cloud-two" aria-hidden="true">✳</span>
            {THOUGHT_SEEDS.map((seed) => (
              <button
                aria-label={`Collect a ${seed.label} thought`}
                className={`mori-thought-seed${pickedSeeds.includes(seed.id) ? ' is-collected' : ''}`}
                key={seed.id}
                onClick={() => gatherSeed(seed.id, seed.label)}
                style={{ left: seed.left, top: seed.top }}
                type="button"
              >
                <span aria-hidden="true">✦</span>
              </button>
            ))}
            <div className="mori-pet-wrap" aria-label={`${pal.name} is ${reaction}`}>
              <div className="mori-pet">
                <span className="mori-ear ear-left" />
                <span className="mori-ear ear-right" />
                <span className="mori-cheek cheek-left" />
                <span className="mori-cheek cheek-right" />
                <span className={`mori-eye eye-left${reaction === 'sleepy' ? ' is-sleepy' : ''}`} />
                <span className={`mori-eye eye-right${reaction === 'sleepy' ? ' is-sleepy' : ''}`} />
                <span className="mori-mouth" />
                <span className="mori-pet-shine" />
              </div>
              <span className="mori-pet-shadow" />
              <span className="mori-pet-name">{pal.name}</span>
            </div>
            <p className="mori-notice" aria-live="polite">{notice}</p>
          </div>

          <div className="mori-meters" aria-label="Companion progress">
            <div className="mori-meter">
              <div><span>Friendship</span><span>{pal.bond}%</span></div>
              <progress max="100" value={pal.bond} aria-label="Friendship" />
            </div>
            <div className="mori-meter">
              <div><span>Quiet energy</span><span>{pal.energy}%</span></div>
              <progress max="100" value={pal.energy} aria-label="Quiet energy" />
            </div>
            <div className="mori-meter">
              <div><span>Good boundaries</span><span>{boundariesProgress}%</span></div>
              <progress max="100" value={boundariesProgress} aria-label="Good boundaries" />
            </div>
          </div>

          <div className="mori-actions" aria-label="Spend time with Mori">
            <button type="button" onClick={playTogether}>Play together <span aria-hidden="true">↗</span></button>
            <button type="button" onClick={shareKindness}>Share a kind thought <span aria-hidden="true">♡</span></button>
            <button type="button" onClick={letRest}>Quiet time <span aria-hidden="true">☾</span></button>
          </div>
        </div>

        <aside className="mori-journal">
          <div className="mori-journal-heading">
            <div><p className="mori-eyebrow">GROW AT YOUR OWN PACE</p><h3>Little things we learn</h3></div>
            <span className="mori-journal-flower" aria-hidden="true">✿</span>
          </div>
          <p className="mori-journal-intro">Good companions are curious and careful. Share a gentle boundary; there are no wrong answers and nothing to lose.</p>
          <div className="mori-lessons">
            {LESSONS.map((lesson) => {
              const learned = pal.lessons.includes(lesson.id);
              return (
                <button
                  aria-pressed={learned}
                  className={`mori-lesson${learned ? ' is-learned' : ''}`}
                  key={lesson.id}
                  onClick={() => teachLesson(lesson.id)}
                  type="button"
                >
                  <span className="mori-lesson-check" aria-hidden="true">{learned ? '✓' : '＋'}</span>
                  <span><strong>{lesson.title}</strong><small>{learned ? 'A lovely thing to remember.' : lesson.note}</small></span>
                </button>
              );
            })}
          </div>
          <div className="mori-memory-card">
            <div><span className="mori-eyebrow">THOUGHTS COLLECTED</span><strong>{pal.memories}</strong></div>
            <progress max="8" value={memoryProgress} aria-label={`${memoryProgress} of 8 thoughts toward the next garden level`} />
            <span className="mori-memory-caption">{8 - memoryProgress || 8} little {8 - memoryProgress === 1 ? 'thought' : 'thoughts'} until your next garden level</span>
          </div>
          <form className="mori-name-form" onSubmit={saveName}>
            <label htmlFor="mori-name">Give your companion a name</label>
            <div><input id="mori-name" maxLength={12} onChange={(event) => setNickname(event.target.value)} value={nickname} /><button type="submit">Save</button></div>
          </form>
        </aside>
      </div>
      <p className="mori-save-note">Your little garden stays on this device. No account, external service, timer, or reset penalty.</p>
    </section>
  );
}
