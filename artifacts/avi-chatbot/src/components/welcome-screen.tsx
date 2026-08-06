import aviLogo from "@assets/avi_logo_gradient_refined.jpg_1777827450516.jpg";
import { Bot, Calculator, BookOpen, Laugh, Plane, Target, Globe, Dices, BookMarked, Sparkles, Trophy, Terminal } from "lucide-react";
import { ThemeId } from "@/lib/themes";
import { ReactNode } from "react";

interface WelcomeScreenProps {
  onSelectAction: (action: string) => void;
  themeId?: ThemeId | null;
}

interface FeatureDef {
  title: string;
  description: string;
  action: string;
  defaultIcon: ReactNode;
  bg: string;
  border: string;
  iconBg: string;
  iconColor: string;
  themedIcons: Record<ThemeId, string>;
}

const features: FeatureDef[] = [
  {
    defaultIcon: <Bot className="w-5 h-5" />,
    title: "Tech & Programming",
    description: "Ask anything about tech!",
    action: "Tell me a fun fact about programming!",
    bg: "bg-purple-50", border: "border-purple-200", iconBg: "bg-purple-100", iconColor: "text-purple-600",
    themedIcons: { magic: "🔮", space: "🤖", monster: "⚡", silly: "🤓", jungle: "🐋", ocean: "🐙" },
  },
  {
    defaultIcon: <Calculator className="w-5 h-5" />,
    title: "Math Problems",
    description: "Solve any math step by step",
    action: "Can you help me solve a math problem?",
    bg: "bg-pink-50", border: "border-pink-200", iconBg: "bg-pink-100", iconColor: "text-pink-600",
    themedIcons: { magic: "⭐", space: "🪐", monster: "🔢", silly: "🍌", jungle: "🦒", ocean: "🦑" },
  },
  {
    defaultIcon: <BookOpen className="w-5 h-5" />,
    title: "Coding Terms",
    description: "Learn what coding words mean",
    action: "Define 'algorithm' for me.",
    bg: "bg-orange-50", border: "border-orange-200", iconBg: "bg-orange-100", iconColor: "text-orange-600",
    themedIcons: { magic: "📜", space: "🛸", monster: "💎", silly: "🤪", jungle: "🦎", ocean: "🐠" },
  },
  {
    defaultIcon: <Laugh className="w-5 h-5" />,
    title: "Tell a Joke",
    description: "Need a good laugh?",
    action: "Tell me a joke!",
    bg: "bg-amber-50", border: "border-amber-200", iconBg: "bg-amber-100", iconColor: "text-amber-600",
    themedIcons: { magic: "🃏", space: "👽", monster: "🎭", silly: "😂", jungle: "🐒", ocean: "🐡" },
  },
  {
    defaultIcon: <Sparkles className="w-5 h-5" />,
    title: "Fun Facts",
    description: "Wow-worthy facts about anything!",
    action: "Tell me an amazing fun fact!",
    bg: "bg-fuchsia-50", border: "border-fuchsia-200", iconBg: "bg-fuchsia-100", iconColor: "text-fuchsia-600",
    themedIcons: { magic: "🌟", space: "🌌", monster: "💥", silly: "🤯", jungle: "🦓", ocean: "🐋" },
  },
  {
    defaultIcon: <Plane className="w-5 h-5" />,
    title: "Vacation Ideas",
    description: "Where should we go next?",
    action: "Give me some cool vacation ideas for families!",
    bg: "bg-sky-50", border: "border-sky-200", iconBg: "bg-sky-100", iconColor: "text-sky-600",
    themedIcons: { magic: "🌙", space: "🚀", monster: "🗺️", silly: "🏖️", jungle: "🦁", ocean: "🌊" },
  },
  {
    defaultIcon: <Target className="w-5 h-5" />,
    title: "Trivia Game",
    description: "Test your knowledge!",
    action: "Let's play a trivia game!",
    bg: "bg-green-50", border: "border-green-200", iconBg: "bg-green-100", iconColor: "text-green-600",
    themedIcons: { magic: "🎩", space: "☄️", monster: "🏆", silly: "🎉", jungle: "🦅", ocean: "🦀" },
  },
  {
    defaultIcon: <Globe className="w-5 h-5" />,
    title: "Wikipedia Search",
    description: "Search any topic",
    action: "wikipedia",
    bg: "bg-indigo-50", border: "border-indigo-200", iconBg: "bg-indigo-100", iconColor: "text-indigo-600",
    themedIcons: { magic: "🔭", space: "📡", monster: "🔍", silly: "🔎", jungle: "🐘", ocean: "🔭" },
  },
  {
    defaultIcon: <Dices className="w-5 h-5" />,
    title: "Random Article",
    description: "Discover something new!",
    action: "random_wikipedia",
    bg: "bg-teal-50", border: "border-teal-200", iconBg: "bg-teal-100", iconColor: "text-teal-600",
    themedIcons: { magic: "✨", space: "🌠", monster: "🎲", silly: "🎲", jungle: "🦋", ocean: "🐚" },
  },
  {
    defaultIcon: <BookMarked className="w-5 h-5" />,
    title: "Book Suggestions",
    description: "Find your next great read",
    action: "Can you recommend a good book for a kid?",
    bg: "bg-rose-50", border: "border-rose-200", iconBg: "bg-rose-100", iconColor: "text-rose-600",
    themedIcons: { magic: "📚", space: "🛰️", monster: "📖", silly: "📚", jungle: "🦉", ocean: "🐬" },
  },
  {
    defaultIcon: <Trophy className="w-5 h-5" />,
    title: "GoalGuess 2026",
    description: "Guess the mystery World Cup team!",
    action: "goalguess",
    bg: "bg-lime-50", border: "border-lime-200", iconBg: "bg-lime-100", iconColor: "text-lime-600",
    themedIcons: { magic: "⚽", space: "⚽", monster: "⚽", silly: "⚽", jungle: "⚽", ocean: "⚽" },
  },
];

export default function WelcomeScreen({ onSelectAction, themeId }: WelcomeScreenProps) {
  return (
    <div className="flex flex-col items-center py-4 animate-in fade-in slide-in-from-bottom-4 duration-700 w-full">
      <img src={aviLogo} alt="AVI - Artificial Virtual Intelligence" className="h-28 w-auto mb-3 object-contain" />

      <p className="text-sm text-gray-500 text-center sm:whitespace-nowrap mb-5">
        Your super smart, always fun AI best friend. What do you want to explore today?
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 w-full">
        {features.map((feature, idx) => {
          const themedEmoji = themeId ? feature.themedIcons[themeId] : null;

          return (
            <div
              key={idx}
              className={`p-3 flex flex-col gap-2 cursor-pointer rounded-xl border-2 ${feature.bg} ${feature.border} hover:shadow-md hover:scale-[1.02] transition-all duration-200`}
              onClick={() => onSelectAction(feature.action)}
              data-testid={`card-feature-${idx}`}
            >
              <div className={`w-8 h-8 rounded-lg ${feature.iconBg} ${feature.iconColor} flex items-center justify-center flex-shrink-0`}>
                {themedEmoji ? (
                  <span className="text-lg leading-none">{themedEmoji}</span>
                ) : (
                  feature.defaultIcon
                )}
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-xs leading-tight mb-0.5">{feature.title}</h3>
                <p className="text-xs text-gray-500 line-clamp-2 leading-tight">{feature.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Coding Mode — separate from adventure themes */}
      <div
        className="mt-3 w-full cursor-pointer rounded-xl border-2 border-green-800/40 bg-gray-950 hover:border-green-500/60 hover:shadow-lg hover:shadow-green-900/20 transition-all duration-200 overflow-hidden group"
        onClick={() => onSelectAction("coding_mode")}
      >
        <div className="flex items-center gap-4 px-5 py-4">
          <div className="w-10 h-10 rounded-lg bg-green-900/60 border border-green-700/50 flex items-center justify-center flex-shrink-0 group-hover:bg-green-800/70 transition-colors">
            <Terminal className="w-5 h-5 text-green-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-bold text-green-400 text-sm leading-tight">Coding Mode</h3>
              <span className="text-[10px] font-mono bg-green-900/50 text-green-500 border border-green-800/50 px-1.5 py-0.5 rounded">
                {'</>'}
              </span>
            </div>
            <p className="text-xs text-gray-400 leading-tight">
              Activate a coding-focused session with a Matrix-style background. Get help with Python, JavaScript, HTML, and more.
            </p>
          </div>
          <div className="font-mono text-green-600 text-xs hidden sm:block opacity-60 group-hover:opacity-100 transition-opacity">
            <span className="animate-pulse">█</span>
          </div>
        </div>
        <div className="px-5 pb-3 font-mono text-[10px] text-green-800 group-hover:text-green-700 transition-colors truncate">
          {'> initializing coding assistant... ready to compile!'}
        </div>
      </div>
    </div>
  );
}
