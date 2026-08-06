import { useEffect, useState } from "react";
import { Achievement } from "@/lib/achievements";
import { motion, AnimatePresence } from "framer-motion";

interface AchievementToastProps {
  achievement: Achievement;
  toastId: number;
  onDismiss: (id: number) => void;
}

export default function AchievementToast({
  achievement,
  toastId,
  onDismiss,
}: AchievementToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(toastId), 400);
    }, 3500);
    return () => clearTimeout(timer);
  }, [toastId, onDismiss]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 320, damping: 22 }}
          className="flex items-center gap-3 bg-white border border-amber-200 shadow-2xl rounded-2xl px-4 py-3 max-w-xs cursor-pointer"
          onClick={() => {
            setVisible(false);
            setTimeout(() => onDismiss(toastId), 400);
          }}
        >
          {/* Badge icon */}
          <div
            className={`w-11 h-11 rounded-full bg-gradient-to-br ${achievement.gradient} flex items-center justify-center text-xl shadow-md flex-shrink-0`}
          >
            {achievement.emoji}
          </div>

          {/* Text */}
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest leading-tight">
              🏅 Badge Unlocked!
            </p>
            <p className="font-black text-gray-900 text-sm leading-tight">
              {achievement.title}
            </p>
            <p className="text-[11px] text-gray-500 leading-tight line-clamp-2">
              {achievement.description}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Stack of achievement toasts anchored at the bottom-right of the screen */
interface ToastStackProps {
  toasts: { achievement: Achievement; id: number }[];
  onDismiss: (id: number) => void;
}

export function AchievementToastStack({ toasts, onDismiss }: ToastStackProps) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-24 right-4 z-[9999] flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <AchievementToast
            achievement={t.achievement}
            toastId={t.id}
            onDismiss={onDismiss}
          />
        </div>
      ))}
    </div>
  );
}
