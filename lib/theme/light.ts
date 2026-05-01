import { accent } from './tokens';

export interface Surface {
  bg: string;
  bgElevated: string;
  bgCard: string;
  bgInput: string;
  bgOverlay: string;
  border: string;
  borderStrong: string;
  borderFocus: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
}

export const light: Surface = {
  bg: '#ffffff',
  bgElevated: '#fafafa',
  bgCard: '#ffffff',
  bgInput: '#f4f4f5',
  bgOverlay: 'rgba(0,0,0,0.4)',
  border: 'rgba(0,0,0,0.08)',
  borderStrong: 'rgba(0,0,0,0.14)',
  borderFocus: accent.primary,
  textPrimary: '#09090b',
  textSecondary: '#52525b',
  textMuted: '#71717a',
  textInverse: '#fafafa',
};

export type LightSurface = Surface;
