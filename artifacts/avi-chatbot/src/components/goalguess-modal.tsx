import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import {
  generateGoalGuessQuestion,
  GoalGuessQuestion,
  FifaTeam,
  flagUrl,
  FIFA_TEAMS,
  EASY_TEAMS,
} from "@/lib/fifa-teams";
import { findCountry } from "@/lib/countries";

interface GoalGuessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GAME_SECONDS = 60;

type GameMode = "easy" | "hard" | "patriot";
type GamePhase = "mode" | "patriot-setup" | "intro" | "playing" | "finished";
type AnswerState = { chosen: FifaTeam; correct: boolean } | null;

const MODE_INFO: Record<GameMode, { label: string; emoji: string; desc: string }> = {
  easy: { label: "Easy", emoji: "🌱", desc: "Recent World Cup favorites only" },
  hard: { label: "Hard", emoji: "🔥", desc: "All 48 World Cup 2026 teams" },
  patriot: { label: "Patriot", emoji: "🎌", desc: "Only your country's matches" },
};

export default function GoalGuessModal({ isOpen, onClose }: GoalGuessModalProps) {
  const [phase, setPhase] = useState<GamePhase>("mode");
  const [mode, setMode] = useState<GameMode | null>(null);
  const [countryInput, setCountryInput] = useState("");
  const [countryError, setCountryError] = useState<string | null>(null);
  const [patriotTeam, setPatriotTeam] = useState<FifaTeam | null>(null);

  const [question, setQuestion] = useState<GoalGuessQuestion | null>(null);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_SECONDS);
  const [answer, setAnswer] = useState<AnswerState>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poolRef = useRef<FifaTeam[]>(FIFA_TEAMS);
  const forcedTeamRef = useRef<FifaTeam | undefined>(undefined);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearTimer();
  }, []);

  useEffect(() => {
    if (!isOpen) {
      clearTimer();
      setPhase("mode");
      setMode(null);
      setCountryInput("");
      setCountryError(null);
      setPatriotTeam(null);
    }
  }, [isOpen]);

  const nextQuestion = (): GoalGuessQuestion => {
    // forcedTeamRef is only ever set once we've confirmed the team has real
    // matches (see confirmCountry), so this should always succeed. Fall back
    // to the full team pool defensively just in case.
    return (
      generateGoalGuessQuestion(poolRef.current, forcedTeamRef.current) ??
      generateGoalGuessQuestion(FIFA_TEAMS)!
    );
  };

  const runGame = () => {
    setScore(0);
    setAttempts(0);
    setTimeLeft(GAME_SECONDS);
    setAnswer(null);
    setQuestion(nextQuestion());
    setPhase("playing");

    clearTimer();
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearTimer();
          setPhase("finished");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const selectMode = (selected: GameMode) => {
    setMode(selected);
    if (selected === "patriot") {
      setPhase("patriot-setup");
      return;
    }
    poolRef.current = selected === "easy" ? EASY_TEAMS : FIFA_TEAMS;
    forcedTeamRef.current = undefined;
    setPhase("intro");
  };

  const confirmCountry = () => {
    const match = findCountry(countryInput);
    if (!match) {
      setCountryError("Hmm, we couldn't find that country. Try another spelling!");
      return;
    }
    const team: FifaTeam = { name: match.name, code: match.code };
    if (!generateGoalGuessQuestion(FIFA_TEAMS, team)) {
      setCountryError(
        `${match.name} didn't play in the FIFA World Cup 2026. Try a country that competed!`
      );
      return;
    }
    setPatriotTeam(team);
    poolRef.current = FIFA_TEAMS;
    forcedTeamRef.current = team;
    setCountryError(null);
    setPhase("intro");
  };

  const handleGuess = (team: FifaTeam) => {
    if (!question || answer || phase !== "playing") return;
    const correct = team.name === question.correctAnswer.name;
    setAnswer({ chosen: team, correct });
    setAttempts((a) => a + 1);
    if (correct) setScore((s) => s + 1);

    setTimeout(() => {
      if (timeLeft <= 0) return;
      setAnswer(null);
      setQuestion(nextQuestion());
    }, 800);
  };

  const backToModes = () => {
    clearTimer();
    setMode(null);
    setPatriotTeam(null);
    setCountryInput("");
    setCountryError(null);
    setPhase("mode");
  };

  const handleClose = () => {
    clearTimer();
    setPhase("mode");
    setMode(null);
    setPatriotTeam(null);
    setCountryInput("");
    setCountryError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden bg-gradient-to-b from-green-50 to-emerald-100 rounded-2xl border-0">
        <div
          className="p-5 text-white"
          style={{ background: "linear-gradient(135deg, #0d5c2b, #1a7a3c, #2e9e4f)" }}
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-white flex items-center gap-2">
              <span className="text-2xl">⚽</span> GoalGuess 2026
            </DialogTitle>
          </DialogHeader>
          <p className="text-white/80 text-xs mt-1">
            Guess the mystery team before the final whistle!
          </p>
        </div>

        <div className="p-6 relative min-h-[340px] flex flex-col">
          {/* soccer field pattern background */}
          <div
            className="absolute inset-0 opacity-[0.06] pointer-events-none"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, #16a34a 0, #16a34a 40px, transparent 40px, transparent 80px)",
            }}
          />

          {phase === "mode" && (
            <div className="relative flex flex-col items-center justify-center gap-4 flex-1 text-center py-2">
              <div className="text-5xl">⚽🏆</div>
              <h3 className="font-black text-gray-800 text-lg">Choose your mode</h3>
              <div className="flex flex-col gap-2.5 w-full max-w-xs">
                {(Object.keys(MODE_INFO) as GameMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => selectMode(m)}
                    data-testid={`button-mode-${m}`}
                    className="flex items-center gap-3 bg-white rounded-xl border-2 border-green-200 hover:border-green-500 hover:shadow-md transition-all px-4 py-3 text-left"
                  >
                    <span className="text-2xl">{MODE_INFO[m].emoji}</span>
                    <div>
                      <div className="font-black text-gray-800 text-sm">{MODE_INFO[m].label}</div>
                      <div className="text-xs text-gray-500">{MODE_INFO[m].desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {phase === "patriot-setup" && (
            <div className="relative flex flex-col items-center justify-center gap-4 flex-1 text-center py-4">
              <div className="text-5xl">🎌</div>
              <h3 className="font-black text-gray-800 text-lg">What's your country?</h3>
              <p className="text-sm text-gray-600 max-w-xs">
                We'll only show matches featuring your country!
              </p>
              <div className="flex gap-2 w-full max-w-xs">
                <Input
                  value={countryInput}
                  onChange={(e) => {
                    setCountryInput(e.target.value);
                    setCountryError(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && confirmCountry()}
                  placeholder="e.g. Brazil"
                  data-testid="input-patriot-country"
                  className="rounded-xl border-green-300"
                />
                <Button
                  onClick={confirmCountry}
                  className="rounded-xl font-bold text-white flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #16a34a, #22c55e)" }}
                  data-testid="button-confirm-country"
                >
                  Go
                </Button>
              </div>
              {countryError && <p className="text-xs text-red-500 font-medium">{countryError}</p>}
              <button
                onClick={backToModes}
                className="text-xs text-gray-500 underline hover:text-gray-700"
              >
                ← Back to modes
              </button>
            </div>
          )}

          {phase === "intro" && mode && (
            <div className="relative flex flex-col items-center justify-center gap-4 flex-1 text-center py-4">
              <div className="text-6xl">🏆⚽🥅</div>
              <div className="flex items-center gap-2 bg-white rounded-full px-3 py-1 border border-green-200 shadow-sm">
                <span>{MODE_INFO[mode].emoji}</span>
                <span className="font-bold text-sm text-gray-700">{MODE_INFO[mode].label} mode</span>
                {mode === "patriot" && patriotTeam && (
                  <>
                    <img
                      src={flagUrl(patriotTeam.code, 40)}
                      alt={`${patriotTeam.name} flag`}
                      className="w-5 h-3.5 object-cover rounded-sm border border-gray-200"
                    />
                    <span className="font-bold text-sm text-gray-700">{patriotTeam.name}</span>
                  </>
                )}
              </div>
              <h3 className="font-black text-gray-800 text-lg">How to play</h3>
              <p className="text-sm text-gray-600 max-w-xs leading-relaxed">
                We'll show you the real score from an actual FIFA World Cup 2026 match and reveal <b>one</b> team's flag.
                Guess who they're playing against before time runs out! You've got{" "}
                <b>{GAME_SECONDS} seconds</b> to score as many correct guesses as you can.
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={runGame}
                  className="mt-2 rounded-full px-8 h-11 font-bold text-white"
                  style={{ background: "linear-gradient(135deg, #16a34a, #22c55e)" }}
                  data-testid="button-start-goalguess"
                >
                  Kick Off! 🏁
                </Button>
              </div>
              <button
                onClick={backToModes}
                className="text-xs text-gray-500 underline hover:text-gray-700"
              >
                ← Change mode
              </button>
            </div>
          )}

          {phase === "playing" && question && (
            <div className="relative flex flex-col gap-4 flex-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 bg-white rounded-full px-3 py-1 shadow-sm border border-green-200">
                  <span className="text-sm">🏅</span>
                  <span className="font-black text-green-700 text-sm" data-testid="text-score">
                    Score: {score}
                  </span>
                </div>
                {mode && (
                  <div className="flex items-center gap-1 bg-white rounded-full px-2.5 py-1 shadow-sm border border-green-200 text-xs font-bold text-gray-600">
                    <span>{MODE_INFO[mode].emoji}</span>
                    {MODE_INFO[mode].label}
                  </div>
                )}
                <div
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 shadow-sm border font-black text-sm ${
                    timeLeft <= 10
                      ? "bg-red-50 border-red-300 text-red-600 animate-pulse"
                      : "bg-white border-green-200 text-green-700"
                  }`}
                  data-testid="text-timer"
                >
                  ⏱️ {timeLeft}s
                </div>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={`${question.revealedTeam.name}-${question.revealedScore}-${question.mysteryScore}`}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.25 }}
                  className="bg-white rounded-2xl p-4 shadow-md border-2 border-green-200"
                >
                  <div className="flex items-center justify-center gap-4">
                    <div className="flex flex-col items-center gap-1 flex-1">
                      <img
                        src={flagUrl(question.revealedTeam.code)}
                        alt={`${question.revealedTeam.name} flag`}
                        className="w-14 h-10 object-cover rounded-md shadow-sm border border-gray-200"
                      />
                      <span className="font-bold text-gray-800 text-xs text-center">
                        {question.revealedTeam.name}
                      </span>
                      <span className="text-2xl font-black text-green-700">
                        {question.revealedScore}
                      </span>
                    </div>
                    <div className="font-black text-gray-400 text-lg">VS</div>
                    <div className="flex flex-col items-center gap-1 flex-1">
                      <div className="w-14 h-10 rounded-md bg-gray-100 border border-gray-200 flex items-center justify-center text-2xl">
                        ❓
                      </div>
                      <span className="font-bold text-gray-400 text-xs">Mystery Team</span>
                      <span className="text-2xl font-black text-gray-500">
                        {question.mysteryScore}
                      </span>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              <p className="text-center text-sm font-semibold text-gray-700">
                Who did {question.revealedTeam.name} play against?
              </p>

              <div className="grid grid-cols-2 gap-2">
                {question.options.map((team) => {
                  const isChosen = answer?.chosen.name === team.name;
                  const showCorrect = answer && team.name === question.correctAnswer.name;
                  return (
                    <Button
                      key={team.name}
                      variant="outline"
                      onClick={() => handleGuess(team)}
                      disabled={!!answer}
                      data-testid={`button-guess-${team.name}`}
                      className={`h-auto py-2.5 rounded-xl border-2 flex items-center justify-center gap-2 font-bold text-sm transition-colors ${
                        showCorrect
                          ? "bg-green-100 border-green-500 text-green-800"
                          : isChosen && !answer?.correct
                          ? "bg-red-100 border-red-500 text-red-800"
                          : "bg-white border-green-200 text-gray-700 hover:bg-green-50 hover:border-green-400"
                      }`}
                    >
                      <img
                        src={flagUrl(team.code, 40)}
                        alt={`${team.name} flag`}
                        className="w-6 h-4 object-cover rounded-sm border border-gray-200"
                      />
                      {team.name}
                    </Button>
                  );
                })}
              </div>

              {answer && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`text-center text-sm font-bold ${
                    answer.correct ? "text-green-600" : "text-red-500"
                  }`}
                >
                  {answer.correct ? "GOAL! Correct! ⚽🎉" : `Offside! It was ${question.correctAnswer.name}`}
                </motion.p>
              )}
            </div>
          )}

          {phase === "finished" && (
            <div className="relative flex flex-col items-center justify-center gap-3 flex-1 text-center py-4">
              <div className="text-6xl">🏆</div>
              <h3 className="font-black text-gray-800 text-xl">Full Time!</h3>
              <p className="text-sm text-gray-600">
                You scored <b className="text-green-700">{score}</b> correct guess{score === 1 ? "" : "es"} out of {attempts} attempt{attempts === 1 ? "" : "s"}!
              </p>
              <div className="flex gap-2 mt-2">
                <Button
                  onClick={runGame}
                  className="rounded-full px-6 h-10 font-bold text-white"
                  style={{ background: "linear-gradient(135deg, #16a34a, #22c55e)" }}
                  data-testid="button-play-again"
                >
                  Play Again 🔁
                </Button>
                <Button
                  onClick={backToModes}
                  variant="outline"
                  className="rounded-full px-6 h-10 font-bold border-green-300 text-green-700"
                >
                  Change Mode
                </Button>
                <Button
                  onClick={handleClose}
                  variant="outline"
                  className="rounded-full px-6 h-10 font-bold border-green-300 text-green-700"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
