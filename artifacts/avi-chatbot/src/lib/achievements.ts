// ─── Achievement definitions & localStorage persistence ───────────────────────

export interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  /** Tailwind gradient classes for the badge card */
  gradient: string;
  /** Tailwind text colour */
  textColor: string;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_chat",
    title: "First Chat!",
    description: "Start your very first conversation with AVI",
    emoji: "🌟",
    gradient: "from-yellow-300 to-amber-400",
    textColor: "text-amber-900",
  },
  {
    id: "curious_mind",
    title: "Curious Mind",
    description: "Have 10 conversations with AVI",
    emoji: "🧠",
    gradient: "from-purple-400 to-violet-500",
    textColor: "text-violet-950",
  },
  {
    id: "jokester",
    title: "Jokester",
    description: "Ask AVI to tell you a joke",
    emoji: "😂",
    gradient: "from-yellow-200 to-yellow-400",
    textColor: "text-yellow-900",
  },
  {
    id: "bookworm",
    title: "Bookworm",
    description: "Ask for a book recommendation",
    emoji: "📚",
    gradient: "from-rose-300 to-pink-400",
    textColor: "text-rose-950",
  },
  {
    id: "globetrotter",
    title: "Globetrotter",
    description: "Explore vacation ideas with AVI",
    emoji: "✈️",
    gradient: "from-sky-300 to-blue-400",
    textColor: "text-blue-950",
  },
  {
    id: "wiki_explorer",
    title: "Wiki Explorer",
    description: "Search a topic on Wikipedia",
    emoji: "🌐",
    gradient: "from-indigo-300 to-indigo-500",
    textColor: "text-indigo-950",
  },
  {
    id: "random_ranger",
    title: "Random Ranger",
    description: "Discover a random Wikipedia article",
    emoji: "🎲",
    gradient: "from-teal-300 to-emerald-400",
    textColor: "text-emerald-950",
  },
  {
    id: "trivia_star",
    title: "Trivia Star",
    description: "Play your first trivia game with AVI",
    emoji: "🏅",
    gradient: "from-green-300 to-green-500",
    textColor: "text-green-950",
  },
  {
    id: "code_apprentice",
    title: "Code Apprentice",
    description: "Enter Coding Mode for the first time",
    emoji: "💻",
    gradient: "from-green-800 to-emerald-900",
    textColor: "text-green-200",
  },
  {
    id: "goalguess_hero",
    title: "GoalGuess Hero",
    description: "Complete your first GoalGuess game",
    emoji: "⚽",
    gradient: "from-lime-300 to-green-400",
    textColor: "text-green-950",
  },
  {
    id: "goalguess_champion",
    title: "GoalGuess Champion",
    description: "Score 5 or more correct guesses in one GoalGuess game",
    emoji: "🏆",
    gradient: "from-amber-300 to-yellow-500",
    textColor: "text-amber-950",
  },
  {
    id: "goalguess_streak",
    title: "GoalGuess Streak",
    description: "Get 3 correct guesses in a row in GoalGuess",
    emoji: "🔥",
    gradient: "from-orange-400 to-red-500",
    textColor: "text-red-950",
  },
  {
    id: "collector",
    title: "Badge Collector",
    description: "Earn 5 different achievements",
    emoji: "🎉",
    gradient: "from-fuchsia-300 to-pink-400",
    textColor: "text-fuchsia-950",
  },
];

// ─── Storage ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = "avi_achievements_v1";

export interface AchievementState {
  unlockedIds: string[];
  /** general-purpose integer counters (conversations, etc.) */
  counters: Record<string, number>;
}

function defaultState(): AchievementState {
  return { unlockedIds: [], counters: {} };
}

export function loadAchievements(): AchievementState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return JSON.parse(raw) as AchievementState;
  } catch {
    return defaultState();
  }
}

export function saveAchievements(state: AchievementState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(
      new CustomEvent<AchievementState>("avi-achievements-changed", {
        detail: state,
      }),
    );
  } catch {
    /* ignore storage errors */
  }
}

/** Returns the newly unlocked achievement ids (may be empty). */
export function unlockAchievements(
  state: AchievementState,
  ids: string[]
): { state: AchievementState; newlyUnlocked: string[] } {
  const alreadyUnlocked = new Set(state.unlockedIds);
  const newlyUnlocked = ids.filter((id) => !alreadyUnlocked.has(id));
  if (newlyUnlocked.length === 0) return { state, newlyUnlocked: [] };

  const nextUnlockedIds = [...state.unlockedIds, ...newlyUnlocked];

  // Check "Badge Collector" — 5 total
  if (
    nextUnlockedIds.length >= 5 &&
    !alreadyUnlocked.has("collector") &&
    !newlyUnlocked.includes("collector")
  ) {
    newlyUnlocked.push("collector");
    nextUnlockedIds.push("collector");
  }

  const nextState: AchievementState = { ...state, unlockedIds: nextUnlockedIds };
  saveAchievements(nextState);
  return { state: nextState, newlyUnlocked };
}

/** Increment a named counter. Returns the new value. */
export function incrementCounter(
  state: AchievementState,
  key: string
): { state: AchievementState; value: number } {
  const value = (state.counters[key] ?? 0) + 1;
  const nextState: AchievementState = {
    ...state,
    counters: { ...state.counters, [key]: value },
  };
  saveAchievements(nextState);
  return { state: nextState, value };
}

export function getAchievement(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
