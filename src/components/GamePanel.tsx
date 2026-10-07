import React, { useEffect, useMemo, useState } from 'react';
import {
  achievementCatalog,
  completeQuest,
  getGameState,
  getLevel,
  getProgressToNextLevel,
  questCatalog,
  subscribe,
  type GameState
} from '../lib/gameState';

const unlockableLabels: Record<string, string> = {
  'field-logs': 'Field logs unlocked',
  'pet-skin': 'Pet skin unlocked',
  default: 'New unlock'
};

export default function GamePanel() {
  const [game, setGame] = useState<GameState>(() => getGameState());
  const [toasts, setToasts] = useState<Array<{ id: string; text: string }>>([]);

  useEffect(() => subscribe(setGame), []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ text: string }>;
      if (customEvent.detail?.text) {
        const id = `${Date.now()}-${Math.random()}`;
        setToasts((current) => [...current, { id, text: customEvent.detail.text }]);
        window.setTimeout(() => {
          setToasts((current) => current.filter((toast) => toast.id !== id));
        }, 2600);
      }
    };

    window.addEventListener('portfolio:toast', handler);
    return () => window.removeEventListener('portfolio:toast', handler);
  }, []);

  const quests = useMemo(
    () =>
      questCatalog.map((quest) => ({
        ...quest,
        done: game.questIds.includes(quest.id)
      })),
    [game.questIds]
  );

  const level = getLevel(game.xp);
  const progress = getProgressToNextLevel(game.xp);
  const achievements = achievementCatalog.filter((achievement) => game.achievements.includes(achievement.id));

  const triggerToast = (text: string) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('portfolio:toast', { detail: { text } }));
    }
  };

  const handleQuestComplete = (questId: string) => {
    const next = completeQuest(questId);
    setGame(next);
    const quest = questCatalog.find((entry) => entry.id === questId);
    if (quest) {
      triggerToast(`${quest.title} completed (+${quest.reward} XP)`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-[var(--border)] bg-[var(--panel)] p-6 shadow-[0_30px_60px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">Player profile</p>
            <h3 className="mt-2 text-3xl font-black tracking-tight text-[var(--text)]">Signal Ranger</h3>
          </div>
          <div className="rounded-full border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">
            Level {level}
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-sm text-[var(--muted)]">
            <span>XP</span>
            <span>{game.xp} / {progress.nextGoal}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-[var(--bg-soft)]">
            <div className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] via-[var(--accent-strong)] to-[#8b5cf6]" style={{ width: `${progress.progress}%` }} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[32px] border border-[var(--border)] bg-[var(--panel)] p-6">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-xl font-bold text-[var(--text)]">Quest log</h4>
            <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{game.questIds.length}/{questCatalog.length} done</span>
          </div>

          <div className="space-y-3">
            {quests.map((quest) => (
              <div key={quest.id} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-soft)] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--text)]">{quest.title}</p>
                    <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">+{quest.reward} XP</p>
                  </div>
                  {quest.done ? (
                    <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-600">Complete</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleQuestComplete(quest.id)}
                      className="rounded-full bg-[var(--accent)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-950"
                    >
                      Claim
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[32px] border border-[var(--border)] bg-[var(--panel)] p-6">
          <h4 className="text-xl font-bold text-[var(--text)]">Trophies</h4>
          <div className="mt-4 space-y-3">
            {achievementCatalog.map((achievement) => {
              const unlocked = game.achievements.includes(achievement.id);
              return (
                <div key={achievement.id} className={`rounded-2xl border p-3 ${unlocked ? 'border-emerald-500/40 bg-emerald-500/8' : 'border-[var(--border)] bg-[var(--bg-soft)]'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[var(--text)]">{achievement.title}</p>
                      <p className="text-xs text-[var(--muted)]">{achievement.description}</p>
                    </div>
                    <span className="text-2xl">{unlocked ? '🏆' : '🔒'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-[32px] border border-[var(--border)] bg-[var(--panel)] p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h4 className="text-xl font-bold text-[var(--text)]">Unlocks</h4>
          <span className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">{game.unlocks.length} active</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {game.unlocks.length === 0 ? (
            <span className="text-sm text-[var(--muted)]">No unlocks yet — complete a quest or feed a pet.</span>
          ) : (
            game.unlocks.map((unlock) => (
              <span key={unlock} className="rounded-full border border-[var(--border)] bg-[var(--bg-soft)] px-3 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-[var(--text)]">
                {unlockableLabels[unlock] ?? unlock}
              </span>
            ))
          )}
        </div>
      </div>

      {toasts.length > 0 && (
        <div className="pointer-events-none fixed right-5 top-20 z-[60] flex max-w-xs flex-col gap-2">
          {toasts.map((toast) => (
            <div key={toast.id} className="rounded-xl border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--text)] shadow-lg backdrop-blur">
              {toast.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
