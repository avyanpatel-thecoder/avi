import { useState, useCallback } from "react";
import {
  loadAchievements,
  unlockAchievements,
  incrementCounter,
  getAchievement,
  AchievementState,
  Achievement,
} from "@/lib/achievements";

export interface AchievementToast {
  achievement: Achievement;
  id: number; // unique key per toast
}

export function useAchievements() {
  const [state, setState] = useState<AchievementState>(() => loadAchievements());
  const [toasts, setToasts] = useState<AchievementToast[]>([]);

  const popToast = useCallback((toastId: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== toastId));
  }, []);

  /** Unlock one or more achievements by id and show toasts for new ones. */
  const unlock = useCallback(
    (ids: string | string[]) => {
      const idList = Array.isArray(ids) ? ids : [ids];
      setState((prev) => {
        const { state: next, newlyUnlocked } = unlockAchievements(prev, idList);
        if (newlyUnlocked.length > 0) {
          const newToasts: AchievementToast[] = newlyUnlocked
            .map((aid) => getAchievement(aid))
            .filter(Boolean)
            .map((a, i) => ({ achievement: a!, id: Date.now() + i }));
          // stagger if multiple
          setTimeout(() => {
            setToasts((prev) => [...prev, ...newToasts]);
          }, 0);
        }
        return next;
      });
    },
    []
  );

  /**
   * Increment a counter and optionally unlock an achievement when a threshold is met.
   * Returns the new counter value.
   */
  const increment = useCallback(
    (
      key: string,
      options?: { unlockAt?: number; achievementId?: string }
    ): number => {
      let newValue = 0;
      setState((prev) => {
        const { state: next, value } = incrementCounter(prev, key);
        newValue = value;
        if (
          options?.unlockAt &&
          options?.achievementId &&
          value >= options.unlockAt
        ) {
          const { state: final, newlyUnlocked } = unlockAchievements(next, [
            options.achievementId,
          ]);
          if (newlyUnlocked.length > 0) {
            const a = getAchievement(options.achievementId);
            if (a) {
              setTimeout(() => {
                setToasts((prev) => [
                  ...prev,
                  { achievement: a, id: Date.now() },
                ]);
              }, 0);
            }
          }
          return final;
        }
        return next;
      });
      return newValue;
    },
    []
  );

  return { state, unlock, increment, toasts, popToast };
}
