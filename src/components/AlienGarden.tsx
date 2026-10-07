import { useCallback, useEffect, useRef, useState } from 'react';
import { readGardenVisits, type GardenVisits } from '../lib/gardenState';

type Point = { x: number; y: number };

const initialPlayer: Point = { x: 0, y: 3 };
const mapSize = 5;
const discoveries: Array<{
  id: string;
  name: string;
  x: number;
  y: number;
  requires: 'blog' | 'project' | 'both';
  glyph: string;
}> = [
  { id: 'mosslight', name: 'Mosslight seed', x: 2, y: 3, requires: 'blog', glyph: '✦' },
  { id: 'signal-crystal', name: 'Signal crystal', x: 4, y: 1, requires: 'project', glyph: '⬡' },
  { id: 'moon-orchid', name: 'Moon orchid', x: 4, y: 4, requires: 'both', glyph: '✿' }
];

function canReach(requires: 'blog' | 'project' | 'both', visits: GardenVisits) {
  if (requires === 'blog') return visits.blog.length > 0;
  if (requires === 'project') return visits.project.length > 0;
  return visits.blog.length > 0 && visits.project.length > 0;
}

function AlienSprite() {
  return (
    <svg viewBox="0 0 90 100" className="garden-alien" aria-hidden="true">
      <ellipse cx="45" cy="93" rx="20" ry="4" fill="#091a20" opacity=".2" />
      <path d="M34 25 26 9M56 25l8-16" fill="none" stroke="#176957" strokeLinecap="round" strokeWidth="5" />
      <circle cx="25" cy="8" r="5" fill="#c8f16a" />
      <circle cx="65" cy="8" r="5" fill="#c8f16a" />
      <path d="M45 17c-18 0-28 13-28 31v12c0 19 12 30 28 30s28-11 28-30V48c0-18-10-31-28-31Z" fill="#83c887" stroke="#176957" strokeWidth="3" />
      <path d="M25 43c3-12 10-18 20-18s17 6 20 18v10H25V43Z" fill="#c7f5dc" stroke="#176957" strokeWidth="2.5" />
      <ellipse cx="36" cy="42" rx="3" ry="5" fill="#153b3b" />
      <ellipse cx="54" cy="42" rx="3" ry="5" fill="#153b3b" />
      <path d="M39 50c4 3 8 3 12 0" fill="none" stroke="#176957" strokeLinecap="round" strokeWidth="2" />
      <path d="M27 66c-8 0-12 5-14 11M63 66c8 0 12 5 14 11" fill="none" stroke="#176957" strokeLinecap="round" strokeWidth="5" />
      <path d="M35 88v5M55 88v5" stroke="#176957" strokeLinecap="round" strokeWidth="5" />
      <path d="M33 68h24" stroke="#d7f4a1" strokeLinecap="round" strokeWidth="3" />
    </svg>
  );
}

export default function AlienGarden() {
  const [visits, setVisits] = useState<GardenVisits>({ blog: [], project: [] });
  const [position, setPosition] = useState(initialPlayer);
  const positionRef = useRef(initialPlayer);
  const [collected, setCollected] = useState<string[]>([]);
  const [message, setMessage] = useState('A quiet little planet. Wander, and see what has grown.');
  const [moves, setMoves] = useState(0);

  useEffect(() => {
    setVisits(readGardenVisits());
    try {
      const saved = window.localStorage.getItem('portfolio-garden-collected-v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setCollected(parsed);
      }
    } catch {
      setMessage('The garden is fresh again. Explore a post to uncover its first seed.');
    }

    const updateVisits = (event: Event) => {
      const next = (event as CustomEvent<GardenVisits>).detail;
      if (next) setVisits(next);
    };
    window.addEventListener('portfolio:garden-discovery', updateVisits);
    window.addEventListener('storage', updateVisits);
    return () => {
      window.removeEventListener('portfolio:garden-discovery', updateVisits);
      window.removeEventListener('storage', updateVisits);
    };
  }, []);

  const move = useCallback((dx: number, dy: number) => {
    const current = positionRef.current;
    const next = {
      x: Math.max(0, Math.min(mapSize - 1, current.x + dx)),
      y: Math.max(0, Math.min(mapSize - 1, current.y + dy))
    };
    if (next.x === current.x && next.y === current.y) return;

    positionRef.current = next;
    setPosition(next);
    setMoves((count) => count + 1);
    const target = discoveries.find((item) => item.x === next.x && item.y === next.y);
    if (target && collected.includes(target.id)) {
      setMessage(`${target.name} is already resting in your collection.`);
    } else if (target && canReach(target.requires, visits)) {
      const nextCollected = [...collected, target.id];
      setCollected(nextCollected);
      window.localStorage.setItem('portfolio-garden-collected-v1', JSON.stringify(nextCollected));
      setMessage(`${target.name} found. Thanks for taking the long way around.`);
      window.dispatchEvent(new CustomEvent('portfolio:garden-sound', { detail: 'discovery' }));
    } else if (target) {
      setMessage(target.requires === 'blog'
        ? 'This seed is sleeping. Read a field note to wake it.'
        : target.requires === 'project'
          ? 'A crystal is waiting. Explore a project to reveal its signal.'
          : 'The orchid opens after a field note and a project visit.');
    } else {
      setMessage('The garden shifts softly beneath your feet.');
    }
  }, [collected, visits]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return;
      const direction = ({
        ArrowUp: [0, -1],
        w: [0, -1],
        ArrowDown: [0, 1],
        s: [0, 1],
        ArrowLeft: [-1, 0],
        a: [-1, 0],
        ArrowRight: [1, 0],
        d: [1, 0]
      } as Record<string, [number, number]>)[event.key];
      if (direction) {
        event.preventDefault();
        move(direction[0], direction[1]);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [move]);

  const hasBlogVisit = visits.blog.length > 0;
  const hasProjectVisit = visits.project.length > 0;

  return (
    <section className="garden-section" aria-labelledby="garden-title">
      <div className="garden-heading">
        <div>
          <p className="garden-kicker">A small world between pages</p>
          <h2 id="garden-title">Somewhere, something is growing.</h2>
          <p>Guide a little Martian through the garden. New discoveries bloom when you read a field note or explore a project.</p>
        </div>
        <div className="garden-progress" aria-label={`${collected.length} of ${discoveries.length} discoveries`}>
          <span>{collected.length}<small>/{discoveries.length}</small></span>
          <span>found</span>
        </div>
      </div>

      <div className="garden-layout">
        <div className="garden-scene" aria-label="Interactive isometric alien garden">
          <div className="garden-sky" />
          <div className="garden-orbit garden-orbit-one" />
          <div className="garden-orbit garden-orbit-two" />
          <div className="garden-ground">
            {Array.from({ length: mapSize * mapSize }, (_, index) => {
              const x = index % mapSize;
              const y = Math.floor(index / mapSize);
              const item = discoveries.find((discovery) => discovery.x === x && discovery.y === y);
              const unlocked = item ? canReach(item.requires, visits) : false;
              const found = item ? collected.includes(item.id) : false;
              const occupied = position.x === x && position.y === y;
              return (
                <button
                  key={`${x}-${y}`}
                  type="button"
                  className={`garden-tile${occupied ? ' is-occupied' : ''}${item ? ' has-discovery' : ''}${item && !unlocked ? ' is-sleeping' : ''}`}
                  style={{ '--tile-x': x, '--tile-y': y } as import('react').CSSProperties}
                  aria-label={item ? `${item.name}${found ? ', collected' : unlocked ? ', ready to collect' : ', locked'}` : `Garden path, row ${y + 1}, column ${x + 1}`}
                  onClick={() => {
                    const dx = Math.sign(x - position.x);
                    const dy = Math.sign(y - position.y);
                    if (dx && dy) {
                      move(dx, 0);
                      window.setTimeout(() => move(0, dy), 90);
                    } else {
                      move(dx, dy);
                    }
                  }}
                >
                  {item && <span className={`garden-discovery${found ? ' is-found' : unlocked ? ' is-awake' : ''}`} aria-hidden="true">{found ? '✓' : item.glyph}</span>}
                  {!item && (x * 3 + y * 7) % 6 === 0 && <span className="garden-flower" aria-hidden="true">✿</span>}
                  {occupied && <AlienSprite />}
                </button>
              );
            })}
          </div>
          <div className="garden-caption"><span>GREENHOUSE / SECTOR 03</span><span>LOW GRAVITY · SOFT WEATHER</span></div>
        </div>

        <aside className="garden-journal">
          <div className="journal-topline"><span>FIELD JOURNAL</span><span>DAY {Math.max(1, moves + 1)}</span></div>
          <p className="garden-message" aria-live="polite">{message}</p>
          <div className="garden-controls" aria-label="Garden movement controls">
            <button type="button" aria-label="Move north" onClick={() => move(0, -1)}>↑</button>
            <div>
              <button type="button" aria-label="Move west" onClick={() => move(-1, 0)}>←</button>
              <button type="button" aria-label="Move south" onClick={() => move(0, 1)}>↓</button>
              <button type="button" aria-label="Move east" onClick={() => move(1, 0)}>→</button>
            </div>
          </div>
          <p className="garden-hint">Use WASD, arrow keys, or tap a nearby patch.</p>
          <ul className="garden-unlocks">
            <li className={hasBlogVisit ? 'is-ready' : ''}><span>{hasBlogVisit ? '✦' : '○'}</span> Read a field note</li>
            <li className={hasProjectVisit ? 'is-ready' : ''}><span>{hasProjectVisit ? '✦' : '○'}</span> Explore a project</li>
          </ul>
          <div className="garden-links">
            {!hasBlogVisit && <a href="/blog">Find a field note <span>↗</span></a>}
            {!hasProjectVisit && <a href="/projects">Wander through projects <span>↗</span></a>}
          </div>
        </aside>
      </div>
      <p className="garden-footnote">A tiny browser game. Progress stays on this device.</p>
    </section>
  );
}
