import { useCallback, useEffect, useRef, useState } from 'react';

type Point = { x: number; y: number };

const width = 6;
const height = 5;
const start: Point = { x: 0, y: 2 };
const landmarks = [
  { id: 'spring', name: 'The quiet spring', x: 1, y: 0 },
  { id: 'oak', name: 'The old oak', x: 4, y: 1 },
  { id: 'fern', name: 'The fern hollow', x: 4, y: 4 }
];

function FoxSprite({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 78" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="fox-coat" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e99a4d" />
          <stop offset="1" stopColor="#a94f2b" />
        </linearGradient>
      </defs>
      <ellipse cx="57" cy="70" rx="35" ry="5" fill="#101c14" opacity=".32" />
      <g className="fox-tail">
        <path d="M87 47c19-17 30-9 23 5-5 10-17 14-28 11" fill="url(#fox-coat)" />
        <path d="M105 46c8-5 10 1 6 7-3 4-7 6-11 7 5-5 7-9 5-14Z" fill="#f1e5d2" />
      </g>
      <g className="fox-body">
        <path d="M28 48c7-17 22-25 43-22 14 2 22 11 23 23l-7 15H39L27 57Z" fill="url(#fox-coat)" />
        <path d="M57 48c9 4 19 4 30 0l7 15H42c4-8 8-13 15-15Z" fill="#eee0ca" />
        <path d="m31 37-4-20 17 11M67 28 76 9l8 23" fill="#b96035" />
        <path d="m31 30-1-8 8 6M72 28l5-11 3 12" fill="#3b2920" />
        <path d="M36 38c8-10 22-12 35-7 9 4 14 11 14 20-13 4-30 2-49-3Z" fill="#dc8741" />
        <path d="M76 43c13-5 20-2 20 6 0 7-9 12-23 10 6-4 9-8 3-16Z" fill="#f4e9da" />
        <circle cx="75" cy="40" r="1.7" fill="#201c19" />
        <path d="m94 46 5 2-5 3" fill="#211b18" />
        <path className="fox-front-leg" d="m51 57-4 11m18-10 3 10" fill="none" stroke="#8f4328" strokeLinecap="round" strokeWidth="6" />
        <path className="fox-back-leg" d="m36 57-3 10m33-9 4 10" fill="none" stroke="#6e3929" strokeLinecap="round" strokeWidth="6" />
      </g>
    </svg>
  );
}

export default function FoxTrail() {
  const [position, setPosition] = useState(start);
  const positionRef = useRef(start);
  const [found, setFound] = useState<string[]>([]);
  const foundRef = useRef<string[]>([]);
  const [steps, setSteps] = useState(0);
  const [message, setMessage] = useState('A fox has wandered into the woods. Follow the quiet trail and see what you find.');

  const move = useCallback((dx: number, dy: number) => {
    const current = positionRef.current;
    const next = {
      x: Math.max(0, Math.min(width - 1, current.x + dx)),
      y: Math.max(0, Math.min(height - 1, current.y + dy))
    };
    if (next.x === current.x && next.y === current.y) return;

    positionRef.current = next;
    setPosition(next);
    setSteps((count) => count + 1);
    const landmark = landmarks.find((item) => item.x === next.x && item.y === next.y);
    if (!landmark) {
      setMessage('The leaves stir as the fox pads along.');
      return;
    }
    if (foundRef.current.includes(landmark.id)) {
      setMessage(`${landmark.name} — a familiar little place.`);
      return;
    }

    const nextFound = [...foundRef.current, landmark.id];
    foundRef.current = nextFound;
    setFound(nextFound);
    setMessage(nextFound.length === landmarks.length
      ? 'Every quiet corner found. The fox curls up beneath the old oak.'
      : `${landmark.name} found. The fox pauses to take it all in.`);
  }, []);

  const moveToward = useCallback((x: number, y: number) => {
    const current = positionRef.current;
    const dx = x - current.x;
    const dy = y - current.y;
    if (Math.abs(dx) >= Math.abs(dy) && dx !== 0) {
      move(Math.sign(dx), 0);
    } else if (dy !== 0) {
      move(0, Math.sign(dy));
    } else if (dx !== 0) {
      move(Math.sign(dx), 0);
    }
  }, [move]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return;
      const direction = ({
        ArrowUp: [0, -1], w: [0, -1],
        ArrowDown: [0, 1], s: [0, 1],
        ArrowLeft: [-1, 0], a: [-1, 0],
        ArrowRight: [1, 0], d: [1, 0]
      } as Record<string, [number, number]>)[event.key];
      if (!direction) return;
      event.preventDefault();
      move(direction[0], direction[1]);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [move]);

  const restart = () => {
    positionRef.current = start;
    foundRef.current = [];
    setPosition(start);
    setFound([]);
    setSteps(0);
    setMessage('A fox has wandered into the woods. Follow the quiet trail and see what you find.');
  };

  return (
    <section className="trail-game" aria-labelledby="trail-title">
      <header className="trail-heading">
        <div>
          <p className="trail-eyebrow">A little woodland interlude</p>
          <h2 id="trail-title">The fox takes the long way home.</h2>
          <p>Wander through a quiet patch of forest. There is no timer and nothing to unlock — just three small places worth finding.</p>
        </div>
        <p className="trail-count" aria-label={`${found.length} of ${landmarks.length} places found`}>
          <span>{found.length}</span><span> / {landmarks.length}<small> places</small></span>
        </p>
      </header>

      <div className="trail-layout">
        <div className="trail-scene" aria-label="A woodland trail game">
          <img className="trail-photo" src="/media/woodland-path-optimized.jpg" alt="A sunlit path winding through green woodland" loading="lazy" />
          <div className="trail-photo-shade" />
          <div className="trail-map" role="group" aria-label="Woodland trail. Move one patch at a time.">
            {Array.from({ length: width * height }, (_, index) => {
              const x = index % width;
              const y = Math.floor(index / width);
              const landmark = landmarks.find((item) => item.x === x && item.y === y);
              const occupied = position.x === x && position.y === y;
              const isFound = landmark ? found.includes(landmark.id) : false;
              return (
                <button
                  key={`${x}-${y}`}
                  type="button"
                  className={`trail-patch${occupied ? ' is-home' : ''}${landmark ? ' has-landmark' : ''}${isFound ? ' is-found' : ''}`}
                  aria-label={landmark ? `${landmark.name}${isFound ? ', found' : ''}${occupied ? ', fox is here' : ''}` : `Forest path, row ${y + 1}, column ${x + 1}${occupied ? ', fox is here' : ''}`}
                  onClick={() => moveToward(x, y)}
                >
                  {landmark && <span className="trail-marker" aria-hidden="true" />}
                  {occupied && <FoxSprite className="trail-fox" />}
                </button>
              );
            })}
          </div>
          <div className="trail-caption">
            <span>WOODLAND WALK</span>
            <a href="https://commons.wikimedia.org/wiki/File:Woodland_Path,_Summerseat_Island_-_geograph.org.uk_-_6192898.jpg" target="_blank" rel="noreferrer">Photo: David Dixon / Geograph · CC BY-SA 2.0</a>
          </div>
        </div>

        <aside className="trail-journal">
          <div className="trail-journal-topline"><span>FOX NOTES</span><span>STEP {steps}</span></div>
          <p className="trail-message" aria-live="polite">{message}</p>
          <div className="trail-controls" aria-label="Fox movement controls">
            <button type="button" aria-label="Move north" onClick={() => move(0, -1)}>↑</button>
            <div>
              <button type="button" aria-label="Move west" onClick={() => move(-1, 0)}>←</button>
              <button type="button" aria-label="Move south" onClick={() => move(0, 1)}>↓</button>
              <button type="button" aria-label="Move east" onClick={() => move(1, 0)}>→</button>
            </div>
          </div>
          <p className="trail-hint">Use the arrow keys, WASD, or tap a nearby patch.</p>
          <ul className="trail-places">
            {landmarks.map((landmark) => (
              <li key={landmark.id} className={found.includes(landmark.id) ? 'is-found' : ''}>
                <span aria-hidden="true">{found.includes(landmark.id) ? '✓' : '·'}</span>{landmark.name}
              </li>
            ))}
          </ul>
          <button type="button" className="trail-restart" onClick={restart}>Start a fresh walk</button>
        </aside>
      </div>
    </section>
  );
}
