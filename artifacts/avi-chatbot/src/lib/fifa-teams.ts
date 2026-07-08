export interface FifaTeam {
  name: string;
  code: string;
  recent?: boolean;
}

// The confirmed 48-team lineup for the FIFA World Cup 2026 (hosts + qualifiers,
// no qualifier-stage-only teams). Hosts USA, Mexico, and Canada are automatic
// qualifiers and do play in the tournament.
export const FIFA_TEAMS: FifaTeam[] = [
  // Hosts
  { name: "Canada", code: "ca" },
  { name: "Mexico", code: "mx", recent: true },
  { name: "USA", code: "us", recent: true },

  // CAF — Africa
  { name: "Algeria", code: "dz" },
  { name: "Cabo Verde", code: "cv" },
  { name: "Congo DR", code: "cd" },
  { name: "Ivory Coast", code: "ci" },
  { name: "Egypt", code: "eg" },
  { name: "Ghana", code: "gh" },
  { name: "Morocco", code: "ma", recent: true },
  { name: "Senegal", code: "sn" },
  { name: "South Africa", code: "za" },
  { name: "Tunisia", code: "tn" },

  // AFC — Asia
  { name: "Australia", code: "au" },
  { name: "Iraq", code: "iq" },
  { name: "Iran", code: "ir" },
  { name: "Japan", code: "jp", recent: true },
  { name: "Jordan", code: "jo" },
  { name: "South Korea", code: "kr" },
  { name: "Qatar", code: "qa" },
  { name: "Saudi Arabia", code: "sa" },
  { name: "Uzbekistan", code: "uz" },

  // CONCACAF — non-host
  { name: "Curacao", code: "cw" },
  { name: "Haiti", code: "ht" },
  { name: "Panama", code: "pa" },

  // CONMEBOL — South America
  { name: "Argentina", code: "ar", recent: true },
  { name: "Brazil", code: "br", recent: true },
  { name: "Colombia", code: "co" },
  { name: "Ecuador", code: "ec" },
  { name: "Paraguay", code: "py" },
  { name: "Uruguay", code: "uy", recent: true },

  // OFC — Oceania
  { name: "New Zealand", code: "nz" },

  // UEFA — Europe
  { name: "Austria", code: "at" },
  { name: "Belgium", code: "be", recent: true },
  { name: "Bosnia and Herzegovina", code: "ba" },
  { name: "Croatia", code: "hr", recent: true },
  { name: "Czechia", code: "cz" },
  { name: "England", code: "gb-eng", recent: true },
  { name: "France", code: "fr", recent: true },
  { name: "Germany", code: "de", recent: true },
  { name: "Netherlands", code: "nl", recent: true },
  { name: "Norway", code: "no" },
  { name: "Portugal", code: "pt", recent: true },
  { name: "Scotland", code: "gb-sct" },
  { name: "Spain", code: "es", recent: true },
  { name: "Sweden", code: "se" },
  { name: "Switzerland", code: "ch", recent: true },
  { name: "Turkey", code: "tr" },
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
