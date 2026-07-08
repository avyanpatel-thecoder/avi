import { REAL_MATCHES } from "@/lib/world-cup-matches";

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

const TEAM_BY_CODE = new Map(FIFA_TEAMS.map((t) => [t.code.toLowerCase(), t]));

function teamForCode(code: string): FifaTeam {
  const team = TEAM_BY_CODE.get(code.toLowerCase());
  if (!team) throw new Error(`Unknown World Cup team code: ${code}`);
  return team;
}

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
  round: string;
}

/**
 * Builds a GoalGuess question from a real FIFA World Cup 2026 match result.
 * Returns `null` if `forcedTeam` never actually played in the tournament
 * (e.g. a country that didn't qualify) — the caller should handle that case.
 */
export function generateGoalGuessQuestion(
  pool: FifaTeam[] = FIFA_TEAMS,
  forcedTeam?: FifaTeam
): GoalGuessQuestion | null {
  const poolCodes = new Set(pool.map((t) => t.code.toLowerCase()));

  let candidates = forcedTeam
    ? REAL_MATCHES.filter(
        (m) =>
          m.homeCode.toLowerCase() === forcedTeam.code.toLowerCase() ||
          m.awayCode.toLowerCase() === forcedTeam.code.toLowerCase()
      )
    : REAL_MATCHES.filter((m) => poolCodes.has(m.homeCode) && poolCodes.has(m.awayCode));

  if (forcedTeam && candidates.length === 0) {
    // The requested country never played a real match in this tournament.
    return null;
  }

  if (!forcedTeam && candidates.length === 0) {
    // Fallback: the easy pool's teams never matched each other directly;
    // widen to any real match so the game still has data to show.
    candidates = REAL_MATCHES;
  }

  const match = candidates[Math.floor(Math.random() * candidates.length)];

  let revealedTeam: FifaTeam;
  let revealedScore: number;
  let correctAnswer: FifaTeam;
  let mysteryScore: number;

  const homeTeam = teamForCode(match.homeCode);
  const awayTeam = teamForCode(match.awayCode);

  const revealHome = forcedTeam
    ? forcedTeam.code.toLowerCase() === match.homeCode.toLowerCase()
    : Math.random() < 0.5;

  if (revealHome) {
    revealedTeam = homeTeam;
    revealedScore = match.homeScore;
    correctAnswer = awayTeam;
    mysteryScore = match.awayScore;
  } else {
    revealedTeam = awayTeam;
    revealedScore = match.awayScore;
    correctAnswer = homeTeam;
    mysteryScore = match.homeScore;
  }

  const distractorsPool = shuffle(
    pool.filter(
      (t) =>
        t.code.toLowerCase() !== revealedTeam.code.toLowerCase() &&
        t.code.toLowerCase() !== correctAnswer.code.toLowerCase()
    )
  );
  const distractors = distractorsPool.slice(0, 3);
  const options = shuffle([correctAnswer, ...distractors]);

  return { revealedTeam, revealedScore, mysteryScore, correctAnswer, options, round: match.round };
}
