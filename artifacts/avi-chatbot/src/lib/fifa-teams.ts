export interface FifaTeam {
  name: string;
  code: string;
  recent?: boolean;
}

export const FIFA_TEAMS: FifaTeam[] = [
  { name: "Brazil", code: "br", recent: true },
  { name: "Argentina", code: "ar", recent: true },
  { name: "France", code: "fr", recent: true },
  { name: "Germany", code: "de", recent: true },
  { name: "Spain", code: "es", recent: true },
  { name: "England", code: "gb-eng", recent: true },
  { name: "Portugal", code: "pt", recent: true },
  { name: "Netherlands", code: "nl", recent: true },
  { name: "Italy", code: "it", recent: true },
  { name: "Belgium", code: "be", recent: true },
  { name: "Croatia", code: "hr", recent: true },
  { name: "Uruguay", code: "uy", recent: true },
  { name: "Mexico", code: "mx", recent: true },
  { name: "USA", code: "us", recent: true },
  { name: "Japan", code: "jp", recent: true },
  { name: "Morocco", code: "ma", recent: true },
  { name: "Canada", code: "ca" },
  { name: "South Korea", code: "kr" },
  { name: "Senegal", code: "sn" },
  { name: "Nigeria", code: "ng" },
  { name: "Ghana", code: "gh" },
  { name: "Australia", code: "au" },
  { name: "Switzerland", code: "ch" },
  { name: "Denmark", code: "dk" },
  { name: "Poland", code: "pl" },
  { name: "Colombia", code: "co" },
  { name: "Chile", code: "cl" },
  { name: "Sweden", code: "se" },
  { name: "Serbia", code: "rs" },
  { name: "Ecuador", code: "ec" },
  { name: "Qatar", code: "qa" },
  { name: "Saudi Arabia", code: "sa" },
];

export const EASY_TEAMS = FIFA_TEAMS.filter((t) => t.recent);

export function flagUrl(code: string, width: 40 | 80 | 160 = 80): string {
  return `https://flagcdn.com/w${width}/${code}.png`;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export interface GoalGuessQuestion {
  revealedTeam: FifaTeam;
  revealedScore: number;
  mysteryScore: number;
  correctAnswer: FifaTeam;
  options: FifaTeam[];
}

export function generateGoalGuessQuestion(
  pool: FifaTeam[] = FIFA_TEAMS,
  forcedTeam?: FifaTeam
): GoalGuessQuestion {
  let revealedTeam: FifaTeam;
  let correctAnswer: FifaTeam;
  let distractorsPool: FifaTeam[];

  if (forcedTeam) {
    // In patriot mode, the user's own country is always the one revealed —
    // it must never appear as a guessable option.
    const opponentPool = shuffle(
      pool.filter((t) => t.code.toLowerCase() !== forcedTeam.code.toLowerCase())
    );
    revealedTeam = forcedTeam;
    correctAnswer = opponentPool[0];
    distractorsPool = opponentPool.slice(1);
  } else {
    const shuffled = shuffle(pool);
    const [teamA, teamB] = shuffled;
    distractorsPool = shuffled.slice(2);
    const revealFirst = Math.random() < 0.5;
    revealedTeam = revealFirst ? teamA : teamB;
    correctAnswer = revealFirst ? teamB : teamA;
  }

  const revealedScore = Math.floor(Math.random() * 5);
  let mysteryScore = Math.floor(Math.random() * 5);
  // avoid a plain draw so the "reveal" feels meaningful most of the time
  if (mysteryScore === revealedScore && Math.random() < 0.7) {
    mysteryScore = (mysteryScore + 1 + Math.floor(Math.random() * 3)) % 5;
  }

  const distractors = shuffle(distractorsPool).slice(0, 3);
  const options = shuffle([correctAnswer, ...distractors]);

  return { revealedTeam, revealedScore, mysteryScore, correctAnswer, options };
}
