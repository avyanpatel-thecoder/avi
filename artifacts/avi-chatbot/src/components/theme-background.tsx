import { useMemo } from "react";
import { motion } from "framer-motion";
import { ThemeId, getTheme } from "@/lib/themes";

interface Particle {
  id: number;
  emoji: string;
  left: number;
  size: number;
  delay: number;
  duration: number;
  drift: number;
  spin: number;
}

interface ThemeBackgroundProps {
  themeId: ThemeId;
}

export default function ThemeBackground({ themeId }: ThemeBackgroundProps) {
  const theme = getTheme(themeId);

  const particles = useMemo<Particle[]>(() => {
    if (!theme) return [];
    return Array.from({ length: 18 }, (_, i) => ({
      id: i,
      emoji: theme.particleEmojis[i % theme.particleEmojis.length],
      left: 3 + (i * 5.5) % 94,
      size: 18 + (i * 7) % 20,
      delay: (i * 0.6) % 6,
      duration: 7 + (i * 1.1) % 6,
      drift: ((i % 5) - 2) * 30,
      spin: i % 2 === 0 ? 360 : -360,
    }));
  }, [theme]);

  if (!theme) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute select-none"
          style={{
            left: `${p.left}%`,
            bottom: "-60px",
            fontSize: p.size,
            lineHeight: 1,
          }}
          animate={{
            y: [0, "-110vh"],
            x: [0, p.drift],
            rotate: [0, p.spin],
            opacity: [0, 0.28, 0.28, 0.28, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "linear",
            times: [0, 0.1, 0.5, 0.9, 1],
          }}
        >
          {p.emoji}
        </motion.div>
      ))}
    </div>
  );
}
