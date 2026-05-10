import { motion } from "framer-motion";
import { THEMES, ThemeId } from "@/lib/themes";
import aviLogo from "@assets/avi_logo_gradient_refined.jpg_1777827450516.jpg";

interface ThemePickerProps {
  onSelect: (themeId: ThemeId) => void;
  onSkip?: () => void;
  selectedTheme?: ThemeId | null;
}

export default function ThemePicker({ onSelect, onSkip, selectedTheme }: ThemePickerProps) {
  return (
    <motion.div
      className="flex flex-col items-center py-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <img
        src={aviLogo}
        alt="AVI"
        className="h-20 w-auto mb-3 object-contain"
      />

      <motion.h2
        className="text-xl font-black text-gray-800 text-center mb-1"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
      >
        Pick your adventure theme!
      </motion.h2>
      <motion.p
        className="text-sm text-gray-500 text-center mb-5 max-w-xs"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        Choose a theme and AVI will match your style for the whole chat!
      </motion.p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-xl">
        {THEMES.map((theme, i) => {
          const isSelected = selectedTheme === theme.id;
          return (
            <motion.button
              key={theme.id}
              initial={{ opacity: 0, y: 28, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                delay: i * 0.08,
                type: "spring" as const,
                stiffness: 260,
                damping: 22,
              }}
              whileHover={{ scale: 1.06, y: -3 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelect(theme.id)}
              className={`
                relative flex flex-col items-center gap-2 p-4 rounded-2xl
                bg-gradient-to-br ${theme.cardBg}
                shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer text-center
                ${isSelected
                  ? `border-4 ${theme.cardBorder} ring-2 ring-offset-1 ring-current shadow-lg`
                  : `border-2 ${theme.cardBorder}`
                }
              `}
            >
              {isSelected && (
                <span className="absolute top-1.5 right-2 text-[10px] font-black text-gray-600 uppercase tracking-wide">
                  ✓ Active
                </span>
              )}
              <span className="text-4xl drop-shadow">{theme.emoji}</span>
              <div>
                <div className="font-black text-gray-800 text-sm leading-tight">
                  {theme.name}
                </div>
                <div className="text-[11px] text-gray-500 mt-0.5 leading-tight">
                  {theme.tagline}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {onSkip && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.3 }}
          onClick={onSkip}
          className="mt-5 text-sm text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors"
        >
          Skip — continue without a theme
        </motion.button>
      )}
    </motion.div>
  );
}
