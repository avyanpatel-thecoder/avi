export interface FifaTeam {
  name: string;
  code: string;
}

export const FIFA_TEAMS: FifaTeam[] = [
  { name: "Brazil", code: "br" },
  { name: "Argentina", code: "ar" },
  { name: "France", code: "fr" },
  { name: "Germany", code: "de" },
  { name: "Spain", code: "es" },
  { name: "England", code: "gb-eng" },
  { name: "Portugal", code: "pt" },
  { name: "Netherlands", code: "nl" },
  { name: "Italy", code: "it" },
  { name: "Belgium", code: "be" },
  { name: "Croatia", code: "hr" },
  { name: "Uruguay", code: "uy" },
  { name: "Mexico", code: "mx" },
  { name: "USA", code: "us" },
  { name: "Canada", code: "ca" },
  { name: "Japan", code: "jp" },
  { name: "South Korea", code: "kr" },
  { name: "Morocco", code: "ma" },
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

export function generateGoalGuessQuestion(): GoalGuessQuestion {
  const [teamA, teamB, ...distractorsPool] = shuffle(FIFA_TEAMS);
  const revealFirst = Math.random() < 0.5;
  const revealedTeam = revealFirst ? teamA : teamB;
  const correctAnswer = revealFirst ? teamB : teamA;

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
