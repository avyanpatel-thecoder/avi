import { useState } from "react";
import { ACHIEVEMENTS, Achievement } from "@/lib/achievements";
import { Trophy } from "lucide-react";

interface BadgeShelfProps {
  unlockedIds: string[];
}

function BadgeCard({ achievement, unlocked }: { achievement: Achievement; unlocked: boolean }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative flex flex-col items-center gap-1 cursor-default"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Badge circle */}
      <div
        className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-sm border-2 transition-all duration-200 ${
          unlocked
            ? `bg-gradient-to-br ${achievement.gradient} border-white/60 scale-100 hover:scale-110`
            : "bg-gray-100 border-gray-200 opacity-40 grayscale"
        }`}
      >
        <span role="img" aria-label={achievement.title}>
          {achievement.emoji}
        </span>
      </div>

      {/* Label */}
      <span
        className={`text-[9px] font-semibold text-center leading-tight max-w-[52px] ${
          unlocked ? "text-gray-700" : "text-gray-400"
        }`}
      >
        {achievement.title}
      </span>

      {/* Tooltip */}
      {hovered && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 w-44 pointer-events-none">
          <div className="bg-gray-900 text-white text-[10px] rounded-xl px-3 py-2 shadow-xl text-center leading-snug">
            <p className="font-bold mb-0.5">{achievement.emoji} {achievement.title}</p>
            <p className="text-gray-300">{achievement.description}</p>
            {!unlocked && (
              <p className="text-gray-500 mt-1 italic">Not yet earned</p>
            )}
          </div>
          {/* Arrow */}
          <div className="w-2 h-2 bg-gray-900 rotate-45 mx-auto -mt-1" />
        </div>
      )}
    </div>
  );
}

export default function BadgeShelf({ unlockedIds }: BadgeShelfProps) {
  const [expanded, setExpanded] = useState(false);
  const unlockedSet = new Set(unlockedIds);
  const earnedCount = unlockedIds.length;

  return (
    <div className="w-full mt-4">
      {/* Header row */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex items-center gap-2 w-full group"
      >
        <div className="flex items-center gap-1.5 text-sm font-bold text-gray-700 group-hover:text-purple-700 transition-colors">
          <Trophy className="w-4 h-4 text-amber-500" />
          My Badges
          <span className="ml-1 bg-amber-100 text-amber-700 text-[10px] font-black px-1.5 py-0.5 rounded-full">
            {earnedCount}/{ACHIEVEMENTS.length}
          </span>
        </div>
        <div className="flex-1 h-px bg-gray-200 group-hover:bg-purple-200 transition-colors" />
        <span className="text-[10px] text-gray-400 group-hover:text-purple-500 transition-colors">
          {expanded ? "▲ hide" : "▼ show all"}
        </span>
      </button>

      {/* Badge grid — always show unlocked ones; expanded shows all */}
      {(earnedCount > 0 || expanded) && (
        <div className="mt-3 flex flex-wrap gap-3 justify-start">
          {ACHIEVEMENTS.filter((a) => expanded || unlockedSet.has(a.id)).map((a) => (
            <BadgeCard
              key={a.id}
              achievement={a}
              unlocked={unlockedSet.has(a.id)}
            />
          ))}
        </div>
      )}

      {earnedCount === 0 && !expanded && (
        <p className="mt-2 text-xs text-gray-400 text-center">
          Start chatting, play GoalGuess, or try Coding Mode to earn your first badge! 🏅
        </p>
      )}
    </div>
  );
}
