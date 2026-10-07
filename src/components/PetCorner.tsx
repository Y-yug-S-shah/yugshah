import React, { useMemo, useState } from 'react';
import { defaultState, feedPet, getGameState, subscribe, type PetName } from '../lib/gameState';

const pets: Array<{ id: PetName; label: string; emoji: string; feedItem: string; accent: string }> = [
  { id: 'dog', label: 'Dog', emoji: '🐶', feedItem: '🍪', accent: 'from-amber-300 to-orange-400' },
  { id: 'cow', label: 'Cow', emoji: '🐄', feedItem: '🌾', accent: 'from-emerald-300 to-lime-400' },
  { id: 'duck', label: 'Duck', emoji: '🦆', feedItem: '🥕', accent: 'from-cyan-300 to-sky-400' }
];

const itemMap = {
  dog: '🍪',
  cow: '🌾',
  duck: '🥕'
} as const;

export default function PetCorner() {
  const [game, setGame] = useState(defaultState);
  const [lastAction, setLastAction] = useState('');

  React.useEffect(() => {
    setGame(getGameState());
    return subscribe(setGame);
  }, []);

  const tasks = useMemo(
    () =>
      pets.map((pet) => ({
        ...pet,
        count: game.pets[pet.id]
      })),
    [game.pets]
  );

  const handleDrop = (petId: PetName, item: string) => {
    if (itemMap[petId] !== item) {
      setLastAction('That snack does not match the animal.');
      return;
    }

    const next = feedPet(petId);
    setGame(next);
    setLastAction(`${petId[0].toUpperCase()}${petId.slice(1)} enjoyed the snack and earned XP.`);
  };

  return (
    <div className="rounded-[32px] border border-[var(--border)] bg-[var(--panel)] p-6 shadow-[0_30px_60px_rgba(15,23,42,0.08)]">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted)]">Pet corner</p>
          <h3 className="mt-2 text-2xl font-bold text-[var(--text)]">Friendly field critters</h3>
        </div>
        <span className="rounded-full border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">
          {game.petsFedGlobal} fed
        </span>
      </div>

      <div className="mb-5 grid gap-4 md:grid-cols-3">
        {tasks.map((pet) => (
          <button
            key={pet.id}
            type="button"
            className="game-card group rounded-[24px] border border-[var(--border)] bg-[var(--bg-soft)] p-4 text-left focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            aria-label={`Feed the ${pet.label} with ${pet.feedItem}`}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleDrop(pet.id, pet.feedItem);
              }
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const item = event.dataTransfer.getData('text/plain');
              handleDrop(pet.id, item || pet.feedItem);
            }}
          >
            <div             className={`mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${pet.accent} text-3xl shadow-[0_8px_0_rgba(15,23,42,0.12)] transition-transform duration-300 group-hover:-translate-y-1`}>
              {pet.emoji}
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-lg font-semibold text-[var(--text)]">{pet.label}</span>
              <span className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{pet.count}x</span>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-[var(--muted)]">
              <span aria-hidden="true">{pet.feedItem}</span>
              <span>Drop or press enter</span>
            </div>
          </button>
        ))}
      </div>

      <div className="rounded-[24px] border border-dashed border-[var(--border)] bg-[var(--bg-soft)] p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">Snack tray</p>
        <div className="flex flex-wrap gap-3">
          {Object.entries(itemMap).map(([petId, food]) => (
            <div
              key={petId}
              draggable
              onDragStart={(event) => event.dataTransfer.setData('text/plain', food)}
              className="game-card flex h-14 w-14 cursor-grab items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--panel)] text-3xl shadow-sm active:cursor-grabbing"
              aria-label={`Drag ${food} to the ${petId} pet`}
            >
              {food}
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-[var(--muted)]">{lastAction || 'Drag a snack onto a pet to earn a small XP boost.'}</p>
      </div>
    </div>
  );
}
