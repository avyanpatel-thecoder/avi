import { useEffect, useState } from "react";
import { useLocation, Link, Redirect } from "wouter";
import { Show, useClerk } from "@clerk/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Save, UserCircle, LogOut, ArrowLeft, Shield, Sparkles, MessageSquare, Award, GraduationCap, BookOpen, ClipboardList, Brain, Mic, Gamepad2, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";

import {
  useGetAviAccount,
  useUpdateAviProfile,
  useUpdateAviSettings,
  getGetAviAccountQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const profileSchema = z.object({
  aviName: z.string().min(1, "Name is required").max(30),
  avatar: z.string().min(1, "Avatar is required").max(12),
  profileBio: z.string().max(160).optional(),
});

const settingsSchema = z.object({
  parentModeEnabled: z.boolean(),
  dailyLimit: z.number().min(20).max(500),
  parentPin: z.string().regex(/^\d{4}$/, "Enter a 4-digit PIN"),
});

type ArcadeCell = "X" | "O" | null;
const winningLines = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function getGameResult(board: ArcadeCell[]): ArcadeCell | "draw" {
  for (const [a, b, c] of winningLines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  return board.every(Boolean) ? "draw" : null;
}

function minimax(board: ArcadeCell[], maximizing: boolean): number {
  const result = getGameResult(board);
  if (result === "O") return 10;
  if (result === "X") return -10;
  if (result === "draw") return 0;

  const scores = board
    .map((cell, index) => {
      if (cell) return null;
      const next = [...board];
      next[index] = maximizing ? "O" : "X";
      return minimax(next, !maximizing);
    })
    .filter((score): score is number => score !== null);

  return maximizing ? Math.max(...scores) : Math.min(...scores);
}

function getBestComputerMove(board: ArcadeCell[]): number {
  let bestScore = -Infinity;
  let bestIndex = board.findIndex((cell) => !cell);
  board.forEach((cell, index) => {
    if (cell) return;
    const next = [...board];
    next[index] = "O";
    const score = minimax(next, false);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });
  return bestIndex;
}

function TicTacToeGame({ difficulty }: { difficulty: "easy" | "smart" }) {
  const [board, setBoard] = useState<ArcadeCell[]>(Array(9).fill(null));
  const [result, setResult] = useState<ArcadeCell | "draw">(null);

  const reset = () => {
    setBoard(Array(9).fill(null));
    setResult(null);
  };

  const play = (index: number) => {
    if (board[index] || result) return;
    const playerBoard = [...board];
    playerBoard[index] = "X";
    const playerResult = getGameResult(playerBoard);
    if (playerResult) {
      setBoard(playerBoard);
      setResult(playerResult);
      return;
    }

    const openCells = playerBoard
      .map((cell, cellIndex) => (cell ? -1 : cellIndex))
      .filter((cellIndex) => cellIndex >= 0);
    const computerIndex =
      difficulty === "smart"
        ? getBestComputerMove(playerBoard)
        : openCells[Math.floor(Math.random() * openCells.length)];
    if (computerIndex !== undefined) playerBoard[computerIndex] = "O";
    setBoard(playerBoard);
    setResult(getGameResult(playerBoard));
  };

  return (
    <Card className="overflow-hidden border-purple-200 bg-gradient-to-br from-purple-50 via-white to-orange-50 shadow-sm">
      <CardHeader className="border-b border-purple-100">
        <CardTitle className="flex items-center gap-2 text-purple-900">
          <Gamepad2 className="h-5 w-5 text-purple-600" />
          AVI Arcade
        </CardTitle>
        <CardDescription>Play Tic-Tac-Toe against AVI</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4 pt-6">
        <div className="grid grid-cols-3 gap-2" aria-label="Tic-Tac-Toe board">
          {board.map((cell, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Square ${index + 1}${cell ? `: ${cell}` : ""}`}
              onClick={() => play(index)}
              className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-purple-200 bg-white text-2xl font-black text-purple-700 shadow-sm transition hover:border-purple-400 hover:bg-purple-50 disabled:cursor-default"
              disabled={Boolean(cell) || Boolean(result)}
            >
              {cell}
            </button>
          ))}
        </div>
        <p className="text-sm font-medium text-gray-600">
          {result === "X" ? "You win!" : result === "O" ? "AVI wins!" : result === "draw" ? "It's a draw!" : "Your turn — you are X"}
        </p>
        <Button type="button" variant="outline" size="sm" onClick={reset} className="gap-2 border-purple-200 text-purple-700">
          <RotateCcw className="h-4 w-4" />
          New Game
        </Button>
      </CardContent>
    </Card>
  );
}

function GuessTheNumberGame() {
  const [secret, setSecret] = useState(() => Math.floor(Math.random() * 20) + 1);
  const [guess, setGuess] = useState("");
  const [message, setMessage] = useState("AVI picked a number from 1 to 20.");

  const submitGuess = (event: React.FormEvent) => {
    event.preventDefault();
    const value = Number(guess);
    if (!Number.isInteger(value) || value < 1 || value > 20) {
      setMessage("Pick a whole number from 1 to 20.");
      return;
    }
    if (value === secret) {
      setMessage("You got it! AVI picked a new number.");
      setSecret(Math.floor(Math.random() * 20) + 1);
    } else {
      setMessage(value < secret ? "Go higher!" : "Go lower!");
    }
    setGuess("");
  };

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-4">
      <p className="text-center text-sm font-medium text-gray-600">{message}</p>
      <form onSubmit={submitGuess} className="flex w-full items-center gap-2">
        <Input
          type="number"
          min={1}
          max={20}
          value={guess}
          onChange={(event) => setGuess(event.target.value)}
          placeholder="Your guess"
          aria-label="Your guess from 1 to 20"
        />
        <Button type="submit" className="bg-purple-600 text-white hover:bg-purple-700">
          Guess
        </Button>
      </form>
    </div>
  );
}

function DiceDuelGame() {
  const [playerRoll, setPlayerRoll] = useState<number | null>(null);
  const [aviRoll, setAviRoll] = useState<number | null>(null);
  const [result, setResult] = useState("Roll the dice!");
  const diceFaces = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

  const rollDice = () => {
    const player = Math.floor(Math.random() * 6) + 1;
    const avi = Math.floor(Math.random() * 6) + 1;
    setPlayerRoll(player);
    setAviRoll(avi);
    setResult(player === avi ? "It's a draw!" : player > avi ? "You win!" : "AVI wins!");
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-8 text-center">
        <div>
          <p className="mb-1 text-xs font-semibold text-gray-500">You</p>
          <span className="text-5xl">{playerRoll ? diceFaces[playerRoll - 1] : "🎲"}</span>
        </div>
        <span className="text-sm font-bold text-gray-400">VS</span>
        <div>
          <p className="mb-1 text-xs font-semibold text-gray-500">AVI</p>
          <span className="text-5xl">{aviRoll ? diceFaces[aviRoll - 1] : "🎲"}</span>
        </div>
      </div>
      <p className="text-sm font-bold text-purple-700">{result}</p>
      <Button type="button" onClick={rollDice} className="gap-2 bg-purple-600 text-white hover:bg-purple-700">
        <RotateCcw className="h-4 w-4" />
        Roll Dice
      </Button>
    </div>
  );
}

const hangmanWords = ["rainbow", "penguin", "rocket", "pancake", "dragon", "unicorn", " popcorn"];

function HangmanGame() {
  const newWord = () => hangmanWords[Math.floor(Math.random() * hangmanWords.length)].trim();
  const [word, setWord] = useState(newWord);
  const [guessed, setGuessed] = useState<string[]>([]);
  const wrongGuesses = guessed.filter((letter) => !word.includes(letter)).length;
  const won = word.split("").every((letter) => guessed.includes(letter));
  const lost = wrongGuesses >= 6;
  const finished = won || lost;
  const alphabet = "abcdefghijklmnopqrstuvwxyz".split("");

  const guessLetter = (letter: string) => {
    if (!finished && !guessed.includes(letter)) setGuessed((current) => [...current, letter]);
  };

  const reset = () => {
    setWord(newWord());
    setGuessed([]);
  };

  return (
    <div className="flex w-full max-w-lg flex-col items-center gap-4">
      <p className="text-sm font-medium text-gray-600">
        {won ? "You saved the word!" : lost ? `AVI's word was ${word}.` : `${6 - wrongGuesses} guesses left`}
      </p>
      <div className="flex gap-2 text-2xl font-black tracking-[0.35em] text-purple-700">
        {word.split("").map((letter, index) => (
          <span key={`${letter}-${index}`} className="min-w-5 border-b-2 border-purple-300 text-center">
            {guessed.includes(letter) || lost ? letter.toUpperCase() : ""}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-1.5">
        {alphabet.map((letter) => (
          <Button
            key={letter}
            type="button"
            variant="outline"
            size="sm"
            disabled={guessed.includes(letter) || finished}
            onClick={() => guessLetter(letter)}
            className="h-9 w-9 p-0 uppercase text-purple-700"
          >
            {letter}
          </Button>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={reset} className="gap-2 border-purple-200 text-purple-700">
        <RotateCcw className="h-4 w-4" />
        New Word
      </Button>
    </div>
  );
}

function JotformWidgetGame() {
  const widgetId = "JFWebsiteWidget-01a0649fcb4870008df5159fe75d655be64c";
  const scriptSrc = "https://www.jotform.com/website-widgets/embed/01a0649fcb4870008df5159fe75d655be64c";

  useEffect(() => {
    const container = document.getElementById(widgetId);
    if (!container) return;

    const script = document.createElement("script");
    script.src = scriptSrc;
    script.async = true;
    container.after(script);

    return () => {
      script.remove();
      container.innerHTML = "";
    };
  }, []);

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 p-3">
      <div id={widgetId} className="min-h-40 w-full" />
      <p className="mt-3 text-center text-xs text-gray-500">Featured AVI Arcade game</p>
    </div>
  );
}

type RpsChoice = "rock" | "paper" | "scissors";
const rpsChoices: RpsChoice[] = ["rock", "paper", "scissors"];
const rpsEmoji: Record<RpsChoice, string> = { rock: "🪨", paper: "📄", scissors: "✂️" };

function RockPaperScissorsGame() {
  const [playerChoice, setPlayerChoice] = useState<RpsChoice | null>(null);
  const [aviChoice, setAviChoice] = useState<RpsChoice | null>(null);
  const [result, setResult] = useState("");

  const play = (choice: RpsChoice) => {
    const computerChoice = rpsChoices[Math.floor(Math.random() * rpsChoices.length)];
    setPlayerChoice(choice);
    setAviChoice(computerChoice);
    setResult(
      choice === computerChoice
        ? "It's a draw!"
        : (choice === "rock" && computerChoice === "scissors") ||
            (choice === "paper" && computerChoice === "rock") ||
            (choice === "scissors" && computerChoice === "paper")
          ? "You win!"
          : "AVI wins!",
    );
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm font-medium text-gray-600">Choose your move</p>
      <div className="flex flex-wrap justify-center gap-2">
        {rpsChoices.map((choice) => (
          <Button
            key={choice}
            type="button"
            variant="outline"
            onClick={() => play(choice)}
            className="h-auto gap-2 border-purple-200 px-4 py-3 text-purple-800"
          >
            <span className="text-xl">{rpsEmoji[choice]}</span>
            <span className="capitalize">{choice}</span>
          </Button>
        ))}
      </div>
      {playerChoice && aviChoice && (
        <div className="text-center text-sm text-gray-600">
          <p>You {rpsEmoji[playerChoice]} vs AVI {rpsEmoji[aviChoice]}</p>
          <p className="mt-1 font-bold text-purple-700">{result}</p>
        </div>
      )}
    </div>
  );
}

type ArcadeTheme = "cosmic" | "sunset" | "ocean";
const arcadeThemes: Record<
  ArcadeTheme,
  { label: string; panel: string; border: string; accent: string; soft: string }
> = {
  cosmic: {
    label: "Cosmic",
    panel: "from-slate-950 via-purple-950 to-indigo-950",
    border: "border-indigo-300/40",
    accent: "bg-indigo-500",
    soft: "bg-indigo-400/15",
  },
  sunset: {
    label: "Sunset",
    panel: "from-rose-950 via-orange-900 to-amber-800",
    border: "border-orange-300/40",
    accent: "bg-orange-500",
    soft: "bg-orange-300/15",
  },
  ocean: {
    label: "Ocean",
    panel: "from-sky-950 via-cyan-900 to-teal-900",
    border: "border-cyan-300/40",
    accent: "bg-cyan-500",
    soft: "bg-cyan-300/15",
  },
};

function ArcadeSection() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<"tic-tac-toe" | "rock-paper-scissors" | "guess-the-number" | "dice-duel" | "hangman" | "jotform" | null>(null);
  const [arcadeTheme, setArcadeTheme] = useState<ArcadeTheme>(() => {
    const saved = localStorage.getItem("avi_arcade_theme");
    return saved === "sunset" || saved === "ocean" ? saved : "cosmic";
  });
  const [ticTacToeDifficulty, setTicTacToeDifficulty] = useState<"easy" | "smart">("smart");
  const theme = arcadeThemes[arcadeTheme];

  useEffect(() => {
    localStorage.setItem("avi_arcade_theme", arcadeTheme);
  }, [arcadeTheme]);

  return (
    <section>
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen((open) => !open)}
        className="h-auto w-full justify-between rounded-2xl border-purple-300 bg-gradient-to-r from-purple-50 to-pink-50 p-5 text-left hover:from-purple-100 hover:to-pink-100"
        aria-expanded={isOpen}
      >
        <span className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-600 text-white shadow-sm">
            <Gamepad2 className="h-6 w-6" />
          </span>
          <span>
            <span className="block text-lg font-bold text-gray-900">AVI Arcade</span>
            <span className="block text-sm font-normal text-gray-600">Play fun games with AVI</span>
          </span>
        </span>
        {isOpen ? <ChevronUp className="h-5 w-5 text-purple-600" /> : <ChevronDown className="h-5 w-5 text-purple-600" />}
      </Button>

      {isOpen && (
        <div className={`mt-4 rounded-3xl bg-gradient-to-br p-4 shadow-inner ${theme.panel}`}>
          <div className="mb-4 flex flex-col gap-3 rounded-2xl bg-white/10 p-4 text-white backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold">Make Arcade yours</p>
              <p className="text-xs text-white/70">Choose a look and how clever AVI plays.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(arcadeThemes) as ArcadeTheme[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setArcadeTheme(option)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                    arcadeTheme === option
                      ? "border-white bg-white text-gray-900"
                      : "border-white/30 text-white/80 hover:border-white/70 hover:text-white"
                  }`}
                >
                  {arcadeThemes[option].label}
                </button>
              ))}
            </div>
          </div>
          {selectedGame === null ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedGame("tic-tac-toe")}
                className={`h-auto min-h-28 justify-start gap-3 rounded-2xl border p-5 text-left text-white shadow-lg transition hover:-translate-y-0.5 ${theme.border} ${theme.soft}`}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-2xl">⭕</span>
                <span>
                  <span className="block font-bold">Tic-Tac-Toe</span>
                  <span className="block text-xs font-normal text-white/70">Beat AVI's best moves</span>
                </span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedGame("rock-paper-scissors")}
                className={`h-auto min-h-28 justify-start gap-3 rounded-2xl border p-5 text-left text-white shadow-lg transition hover:-translate-y-0.5 ${theme.border} ${theme.soft}`}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-2xl">✂️</span>
                <span>
                  <span className="block font-bold">Rock Paper Scissors</span>
                  <span className="block text-xs font-normal text-white/70">Outsmart AVI</span>
                </span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedGame("guess-the-number")}
                className={`h-auto min-h-28 justify-start gap-3 rounded-2xl border p-5 text-left text-white shadow-lg transition hover:-translate-y-0.5 ${theme.border} ${theme.soft}`}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-2xl">🎯</span>
                <span>
                  <span className="block font-bold">Guess the Number</span>
                  <span className="block text-xs font-normal text-white/70">Can you outguess AVI?</span>
                </span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedGame("dice-duel")}
                className={`h-auto min-h-28 justify-start gap-3 rounded-2xl border p-5 text-left text-white shadow-lg transition hover:-translate-y-0.5 ${theme.border} ${theme.soft}`}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-2xl">🎲</span>
                <span>
                  <span className="block font-bold">Dice Duel</span>
                  <span className="block text-xs font-normal text-white/70">Roll against AVI</span>
                </span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedGame("hangman")}
                className={`h-auto min-h-28 justify-start gap-3 rounded-2xl border p-5 text-left text-white shadow-lg transition hover:-translate-y-0.5 ${theme.border} ${theme.soft}`}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-2xl">🔤</span>
                <span>
                  <span className="block font-bold">Hangman</span>
                  <span className="block text-xs font-normal text-white/70">Guess AVI's hidden word</span>
                </span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedGame("jotform")}
                className={`h-auto min-h-28 justify-start gap-3 rounded-2xl border p-5 text-left text-white shadow-lg transition hover:-translate-y-0.5 ${theme.border} ${theme.soft}`}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-2xl">🕹️</span>
                <span>
                  <span className="block font-bold">Featured Game</span>
                  <span className="block text-xs font-normal text-white/70">Play the new AVI widget</span>
                </span>
              </Button>
            </div>
          ) : (
            <Card className="overflow-hidden border-white/20 bg-white shadow-2xl">
              <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100">
                <CardTitle className="text-gray-900">
                  {selectedGame === "tic-tac-toe"
                    ? "Tic-Tac-Toe"
                    : selectedGame === "rock-paper-scissors"
                      ? "Rock Paper Scissors"
                      : selectedGame === "guess-the-number"
                        ? "Guess the Number"
                        : selectedGame === "dice-duel"
                          ? "Dice Duel"
                          : selectedGame === "hangman"
                            ? "Hangman"
                            : "Featured Game"}
                </CardTitle>
                <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedGame(null)} className="text-purple-700">
                  Back to games
                </Button>
              </CardHeader>
              <CardContent className="pt-6">
                {selectedGame === "tic-tac-toe" && (
                  <div className="mb-4 flex items-center justify-center gap-2">
                    <span className="text-xs font-semibold text-gray-500">AVI level:</span>
                    {(["easy", "smart"] as const).map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setTicTacToeDifficulty(level)}
                        className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${
                          ticTacToeDifficulty === level ? `${theme.accent} text-white` : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                )}
                {selectedGame === "tic-tac-toe" ? (
                  <TicTacToeGame difficulty={ticTacToeDifficulty} />
                ) : selectedGame === "rock-paper-scissors" ? (
                  <RockPaperScissorsGame />
                ) : selectedGame === "guess-the-number" ? (
                  <GuessTheNumberGame />
                ) : selectedGame === "dice-duel" ? (
                  <DiceDuelGame />
                ) : selectedGame === "hangman" ? (
                  <HangmanGame />
                ) : (
                  <JotformWidgetGame />
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </section>
  );
}

function PlusDashboard() {
  const { data: account, isLoading, error } = useGetAviAccount();
  const updateProfile = useUpdateAviProfile();
  const updateSettings = useUpdateAviSettings();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { signOut } = useClerk();
  const [, setLocation] = useLocation();

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      aviName: "",
      avatar: "AVI",
      profileBio: "",
    },
  });

  const settingsForm = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      parentModeEnabled: false,
      dailyLimit: 100,
      parentPin: "",
    },
  });

  useEffect(() => {
    if (account) {
      profileForm.reset({
        aviName: account.aviName || "",
        avatar: account.avatar || "AVI",
        profileBio: account.profileBio || "",
      });
      settingsForm.reset({
        parentModeEnabled: !!account.parentModeEnabled,
        dailyLimit: account.dailyLimit || 100,
        parentPin: "",
      });
    }
  }, [account, profileForm, settingsForm]);

  const onProfileSubmit = (values: z.infer<typeof profileSchema>) => {
    updateProfile.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          queryClient.setQueryData(getGetAviAccountQueryKey(), data);
          toast({ title: "Profile updated successfully" });
        },
        onError: () => {
          toast({ title: "Failed to update profile", variant: "destructive" });
        },
      }
    );
  };

  const onSettingsSubmit = (values: z.infer<typeof settingsSchema>) => {
    updateSettings.mutate(
      { data: values },
      {
        onSuccess: (data) => {
          queryClient.setQueryData(getGetAviAccountQueryKey(), data);
          toast({ title: "Settings updated successfully" });
        },
        onError: () => {
          toast({ title: "Failed to update settings", variant: "destructive" });
        },
      }
    );
  };

  const launchActivity = (prompt: string) => {
    sessionStorage.setItem("avi_plus_launch", prompt);
    setLocation("/");
  };

  const launchVoiceChat = () => {
    sessionStorage.setItem("avi_voice_mode", "true");
    setLocation("/");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] bg-gray-50 p-4">
        <Card className="w-full max-w-md shadow-lg border-red-100">
          <CardHeader className="bg-red-50 text-center rounded-t-xl border-b border-red-100">
            <CardTitle className="text-red-700">Error Loading Account</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="text-gray-600 text-center mb-6">There was a problem loading your AVI Plus account.</p>
            <Button onClick={() => window.location.reload()} className="w-full">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const unlCount = account.achievementState?.unlockedIds?.length || 0;

  return (
    <div className="min-h-[100dvh] bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-400 hover:text-gray-700 transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="font-bold text-lg flex items-center gap-2">
              <span className="bg-gradient-to-r from-purple-600 via-red-500 to-orange-400 text-transparent bg-clip-text">
                AVI Plus
              </span>
              {account.isPlus && (
                <span className="bg-gradient-to-r from-purple-100 to-red-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-full border border-purple-200">
                  ACTIVE
                </span>
              )}
            </h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
            onClick={() => signOut({ redirectUrl: "/" })}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 flex flex-col gap-8">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-purple-100 to-orange-100 flex items-center justify-center flex-shrink-0 border-4 border-white shadow-md">
            <span className="text-xl font-black text-purple-700">{account.avatar}</span>
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">
              Welcome back, {account.aviName || "Explorer"}!
            </h2>
            <p className="text-gray-500 mt-1">
              Customize your learning companion and manage your progress.
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-sm border-purple-100 bg-purple-50/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-purple-800 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Total Chats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-900">{account.stats?.conversationCount || 0}</div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-orange-100 bg-orange-50/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-orange-800 flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> Messages Sent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-900">{account.stats?.messageCount || 0}</div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-blue-100 bg-blue-50/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-800 flex items-center gap-2">
                <Award className="h-4 w-4" /> Badges Earned
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-900">{unlCount}</div>
            </CardContent>
          </Card>
        </div>

        <ArcadeSection />

        <section aria-labelledby="plus-activities-heading">
          <Button
            variant="outline"
            className="mb-5 h-auto w-full justify-start gap-4 rounded-2xl border-purple-300 bg-gradient-to-r from-purple-50 to-indigo-50 p-5 text-left hover:from-purple-100 hover:to-indigo-100"
            onClick={launchVoiceChat}
          >
            <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-purple-600 text-white shadow-sm">
              <Mic className="h-6 w-6" />
            </span>
            <span>
              <span className="block text-lg font-bold text-gray-900">Talk To AVI</span>
              <span className="block text-sm font-normal text-gray-600">Speak naturally and hear AVI talk back</span>
            </span>
          </Button>
          <div className="mb-4">
            <h2 id="plus-activities-heading" className="text-xl font-bold text-gray-900">
              Plus-Only Learning Activities
            </h2>
            <p className="text-sm text-gray-500">
              Extra guided tools included with your free AVI Plus account.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              variant="outline"
              className="h-auto min-h-28 justify-start gap-3 p-4 border-purple-200 bg-purple-50/60 hover:bg-purple-100/70"
              onClick={() => launchActivity("AVI Plus Study Coach: Help me choose a subject, set a small goal, and learn it step by step without giving away answers too quickly.")}
            >
              <GraduationCap className="h-6 w-6 text-purple-700" />
              <span className="text-left">
                <span className="block font-bold text-gray-900">Study Coach</span>
                <span className="block text-xs font-normal text-gray-600">Learn with guided hints</span>
              </span>
            </Button>
            <Button
              variant="outline"
              className="h-auto min-h-28 justify-start gap-3 p-4 border-orange-200 bg-orange-50/60 hover:bg-orange-100/70"
              onClick={() => launchActivity("AVI Plus Story Studio: Help me create an original, age-appropriate story by asking me one creative question at a time.")}
            >
              <BookOpen className="h-6 w-6 text-orange-700" />
              <span className="text-left">
                <span className="block font-bold text-gray-900">Story Studio</span>
                <span className="block text-xs font-normal text-gray-600">Build a story together</span>
              </span>
            </Button>
            <Button
              variant="outline"
              className="h-auto min-h-28 justify-start gap-3 p-4 border-blue-200 bg-blue-50/60 hover:bg-blue-100/70"
              onClick={() => launchActivity("AVI Plus Personal Study Plan: Ask me what I want to learn, then create a short personalized study plan with small steps and encouraging check-ins.")}
            >
              <ClipboardList className="h-6 w-6 text-blue-700" />
              <span className="text-left">
                <span className="block font-bold text-gray-900">Personal Study Plan</span>
                <span className="block text-xs font-normal text-gray-600">Make a plan that fits you</span>
              </span>
            </Button>
            <Button
              variant="outline"
              className="h-auto min-h-28 justify-start gap-3 p-4 border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100/70"
              onClick={() => launchActivity("AVI Plus Quiz Builder: Ask me for a topic and age level, then build a fun quiz one question at a time with hints and a score at the end.")}
            >
              <Brain className="h-6 w-6 text-indigo-700" />
              <span className="text-left">
                <span className="block font-bold text-gray-900">Quiz Builder</span>
                <span className="block text-xs font-normal text-gray-600">Create a quiz just for you</span>
              </span>
            </Button>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Profile Customization */}
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="border-b bg-gray-50/50 rounded-t-xl">
              <CardTitle className="flex items-center gap-2">
                <UserCircle className="h-5 w-5 text-purple-600" />
                Companion Profile
              </CardTitle>
              <CardDescription>How AVI knows you</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                  <FormField
                    control={profileForm.control}
                    name="aviName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your Nickname</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. CodeMaster" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                     control={profileForm.control}
                     name="avatar"
                     render={({ field }) => (
                       <FormItem>
                         <FormLabel>Avatar Mark</FormLabel>
                         <FormControl>
                           <Input placeholder="AVI" maxLength={12} {...field} />
                         </FormControl>
                         <FormDescription>
                           Use short initials or a symbol that represents you.
                         </FormDescription>
                         <FormMessage />
                       </FormItem>
                     )}
                   />
                  <FormField
                    control={profileForm.control}
                    name="profileBio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>About You</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="I like spaceships and dinosaurs..." 
                            className="resize-none" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Help AVI understand what you are interested in.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    disabled={updateProfile.isPending}
                  >
                    {updateProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Save Profile
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Parent Controls */}
          <Card className="shadow-sm border-gray-200">
            <CardHeader className="border-b bg-gray-50/50 rounded-t-xl">
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-emerald-600" />
                Parent Controls
              </CardTitle>
              <CardDescription>Manage daily usage and access</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Form {...settingsForm}>
                <form onSubmit={settingsForm.handleSubmit(onSettingsSubmit)} className="space-y-6">
                  <FormField
                    control={settingsForm.control}
                    name="parentModeEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Parent Mode</FormLabel>
                          <FormDescription>
                            Enable stricter content filtering
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={settingsForm.control}
                    name="dailyLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Daily Message Limit</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-4">
                            <Input 
                              type="number" 
                              {...field} 
                               onChange={(event) =>
                                 field.onChange(
                                   event.target.value === ""
                                     ? settingsForm.getValues("dailyLimit")
                                     : Number(event.target.value),
                                 )
                               }
                              className="w-24"
                            />
                            <span className="text-sm text-gray-500">messages / day</span>
                          </div>
                        </FormControl>
                        <FormDescription>
                          Currently used: {account.dailyMessageCount} today
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={settingsForm.control}
                    name="parentPin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{account.parentPinSet ? "Parent PIN" : "Create Parent PIN"}</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            inputMode="numeric"
                            maxLength={4}
                            placeholder="4 digits"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Required to change Parent Mode or the daily limit.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={updateSettings.isPending}
                  >
                    {updateSettings.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Save Settings
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

export default function PlusPage() {
  return (
    <>
      <Show when="signed-in">
        <PlusDashboard />
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-up" />
      </Show>
    </>
  );
}
