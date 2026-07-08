export interface FifaTeam {
  name: string;
  flag: string;
}

export const FIFA_TEAMS: FifaTeam[] = [
  { name: "Brazil", flag: "🇧🇷" },
  { name: "Argentina", flag: "🇦🇷" },
  { name: "France", flag: "🇫🇷" },
  { name: "Germany", flag: "🇩🇪" },
  { name: "Spain", flag: "🇪🇸" },
  { name: "England", flag: "🇬🇧" },
  { name: "Portugal", flag: "🇵🇹" },
  { name: "Netherlands", flag: "🇳🇱" },
  { name: "Italy", flag: "🇮🇹" },
  { name: "Belgium", flag: "🇧🇪" },
  { name: "Croatia", flag: "🇭🇷" },
  { name: "Uruguay", flag: "🇺🇾" },
  { name: "Mexico", flag: "🇲🇽" },
  { name: "USA", flag: "🇺🇸" },
  { name: "Canada", flag: "🇨🇦" },
  { name: "Japan", flag: "🇯🇵" },
  { name: "South Korea", flag: "🇰🇷" },
  { name: "Morocco", flag: "🇲🇦" },
  { name: "Senegal", flag: "🇸🇳" },
  { name: "Nigeria", flag: "🇳🇬" },
  { name: "Ghana", flag: "🇬🇭" },
  { name: "Australia", flag: "🇦🇺" },
  { name: "Switzerland", flag: "🇨🇭" },
  { name: "Denmark", flag: "🇩🇰" },
  { name: "Poland", flag: "🇵🇱" },
  { name: "Colombia", flag: "🇨🇴" },
  { name: "Chile", flag: "🇨🇱" },
  { name: "Sweden", flag: "🇸🇪" },
  { name: "Serbia", flag: "🇷🇸" },
  { name: "Ecuador", flag: "🇪🇨" },
  { name: "Qatar", flag: "🇶🇦" },
  { name: "Saudi Arabia", flag: "🇸🇦" },
];

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
