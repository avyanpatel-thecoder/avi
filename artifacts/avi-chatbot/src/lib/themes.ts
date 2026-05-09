export type ThemeId = 'magic' | 'space' | 'monster' | 'silly' | 'jungle' | 'ocean';

export interface Theme {
  id: ThemeId;
  name: string;
  emoji: string;
  tagline: string;
  headerGradient: string;
  cardBorder: string;
  cardBg: string;
  particleEmojis: string[];
  pageBg: string;
  aiInstruction: string;
}

export const THEMES: Theme[] = [
  {
    id: 'magic',
    name: 'Magic Academy',
    emoji: '🪄',
    tagline: 'Cast spells & learn with wizards!',
    headerGradient: 'linear-gradient(135deg, #4c1d95, #6d28d9, #7c3aed)',
    cardBorder: 'border-purple-400',
    cardBg: 'from-purple-50 to-violet-100',
    particleEmojis: ['⭐', '✨', '🌟', '🪄', '💫', '🔮', '🌙'],
    pageBg: 'from-purple-50 via-violet-50 to-indigo-50',
    aiInstruction: "THEME MODE - MAGIC ACADEMY: Respond like a friendly, wise wizard mentor! Use magical expressions like 'Splendid spell!' or 'By the stars!', reference potions, spells, and magical creatures. Make every answer feel enchanted and wondrous!",
  },
  {
    id: 'space',
    name: 'Space Explorer',
    emoji: '🚀',
    tagline: 'Blast off on a cosmic adventure!',
    headerGradient: 'linear-gradient(135deg, #1e3a5f, #1e40af, #1d4ed8)',
    cardBorder: 'border-blue-400',
    cardBg: 'from-blue-50 to-indigo-100',
    particleEmojis: ['🌟', '⭐', '🪐', '🚀', '🌙', '☄️', '💫'],
    pageBg: 'from-slate-50 via-blue-50 to-indigo-50',
    aiInstruction: "THEME MODE - SPACE EXPLORER: Respond like a friendly astronaut and space explorer! Use mission language like 'Mission accomplished!' or 'Houston, we have an answer!', reference planets, galaxies, and cosmic adventures. Make everything feel like a thrilling space mission!",
  },
  {
    id: 'monster',
    name: 'Monster Trainer',
    emoji: '⚡',
    tagline: 'Train creatures & go on epic quests!',
    headerGradient: 'linear-gradient(135deg, #dc2626, #f97316, #eab308)',
    cardBorder: 'border-red-400',
    cardBg: 'from-red-50 to-orange-100',
    particleEmojis: ['⚡', '💥', '🌀', '✨', '🏆', '💎', '🔥'],
    pageBg: 'from-red-50 via-orange-50 to-yellow-50',
    aiInstruction: "THEME MODE - MONSTER TRAINER: Respond like an enthusiastic creature trainer on epic quests! Use trainer language like 'Level up!' or 'Critical hit of knowledge!', reference training, evolution, and legendary adventures. Make everything feel like an epic battle for wisdom!",
  },
  {
    id: 'silly',
    name: 'Silly Helpers',
    emoji: '🍌',
    tagline: 'Super silly & totally bananas fun!',
    headerGradient: 'linear-gradient(135deg, #ca8a04, #eab308, #3b82f6)',
    cardBorder: 'border-yellow-400',
    cardBg: 'from-yellow-50 to-blue-100',
    particleEmojis: ['🍌', '😂', '🤪', '💛', '🎉', '🤩', '😜'],
    pageBg: 'from-yellow-50 via-amber-50 to-blue-50',
    aiInstruction: "THEME MODE - SILLY HELPERS: Be super goofy, hilarious and fun! Use silly sounds like 'Whaaat?!' or 'BELLO!', love bananas, use funny words, and be the most entertaining helper ever! Make kids laugh while they learn!",
  },
  {
    id: 'jungle',
    name: 'Jungle Explorer',
    emoji: '🦁',
    tagline: 'Roar through wild jungles & savannahs!',
    headerGradient: 'linear-gradient(135deg, #15803d, #059669, #0d9488)',
    cardBorder: 'border-green-400',
    cardBg: 'from-green-50 to-emerald-100',
    particleEmojis: ['🌿', '🦁', '🌺', '🦜', '🍃', '🌴', '🐾'],
    pageBg: 'from-green-50 via-emerald-50 to-teal-50',
    aiInstruction: "THEME MODE - JUNGLE EXPLORER: Respond like an adventurous wildlife explorer on safari! Use nature expressions like 'Extraordinary find!' or 'In the wild...', reference animals, ecosystems, and jungle adventures. Make every answer feel like discovering a hidden treasure in the wild!",
  },
  {
    id: 'ocean',
    name: 'Ocean Adventure',
    emoji: '🌊',
    tagline: 'Dive deep into underwater wonders!',
    headerGradient: 'linear-gradient(135deg, #0891b2, #2563eb, #0d9488)',
    cardBorder: 'border-cyan-400',
    cardBg: 'from-cyan-50 to-blue-100',
    particleEmojis: ['🌊', '🐠', '🐙', '🦈', '🐡', '💧', '🐬'],
    pageBg: 'from-cyan-50 via-blue-50 to-teal-50',
    aiInstruction: "THEME MODE - OCEAN ADVENTURE: Respond like a friendly marine biologist on an underwater expedition! Use ocean expressions like 'Deep-sea discovery!' or 'Dive deeper into this!', reference sea creatures, coral reefs, and oceanic wonders. Make everything feel like exploring the magical deep sea!",
  },
];

export function getTheme(id: ThemeId | null | undefined): Theme | null {
  if (!id) return null;
  return THEMES.find(t => t.id === id) ?? null;
}

const STORAGE_KEY_PREFIX = 'avi_theme_conv_';

export function saveConvTheme(convId: number, themeId: ThemeId): void {
  try { localStorage.setItem(`${STORAGE_KEY_PREFIX}${convId}`, themeId); } catch { /* ignore */ }
}

export function loadConvTheme(convId: number): ThemeId | null {
  try { return (localStorage.getItem(`${STORAGE_KEY_PREFIX}${convId}`) as ThemeId) || null; } catch { return null; }
}
