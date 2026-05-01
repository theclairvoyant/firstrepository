import { accent } from './tokens';
import type { Surface } from './light';

export const dark: Surface = {
  bg: '#09090b',
  bgElevated: '#131316',
  bgCard: '#18181b',
  bgInput: '#1f1f23',
  bgOverlay: 'rgba(0,0,0,0.6)',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.14)',
  borderFocus: accent.primary,
  textPrimary: '#f4f4f5',
  textSecondary: '#a1a1aa',
  textMuted: '#71717a',
  textInverse: '#09090b',
};

export type DarkSurface = Surface;
