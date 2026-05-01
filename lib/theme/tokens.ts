// Fixed palette tokens used by tinted backgrounds (gradient/danger CTAs)
// where surface text colors must remain white regardless of light or dark mode.
export const palette = {
  white: '#ffffff',
  black: '#000000',
} as const;

// Brand accents are identical across light and dark themes.
export const accent = {
  primary: '#6366f1',
  skills: '#f97316',
  social: '#a855f7',
  partner: '#0d9488',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#22d3ee',
} as const;

export const gradient = {
  primary: ['#6366f1', '#8b5cf6'] as const,
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const type = {
  display: {
    font: 'Sora_700Bold',
    size: 32,
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  title: {
    font: 'Sora_700Bold',
    size: 22,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  heading: {
    font: 'Outfit_600SemiBold',
    size: 18,
    lineHeight: 24,
    letterSpacing: -0.1,
  },
  body: {
    font: 'Outfit_400Regular',
    size: 15,
    lineHeight: 22,
  },
  bodyMed: {
    font: 'Outfit_500Medium',
    size: 15,
    lineHeight: 22,
  },
  caption: {
    font: 'Outfit_500Medium',
    size: 13,
    lineHeight: 18,
  },
  mono: {
    font: 'JetBrainsMono_500Medium',
    size: 12,
    lineHeight: 16,
    letterSpacing: 0.04,
    textTransform: 'uppercase' as const,
  },
  monoLarge: {
    font: 'JetBrainsMono_500Medium',
    size: 14,
    lineHeight: 18,
  },
} as const;

export type Palette = typeof palette;
export type Accent = typeof accent;
export type Gradient = typeof gradient;
export type Spacing = typeof spacing;
export type Radius = typeof radius;
export type TypeScale = typeof type;
export type TypeVariant = keyof TypeScale;
