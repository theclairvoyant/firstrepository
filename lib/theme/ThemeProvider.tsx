import React, { createContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Appearance } from 'react-native';
import { light } from './light';
import type { Surface } from './light';
import { dark } from './dark';
import { palette, accent, gradient, spacing, radius, type } from './tokens';
import type {
  Palette,
  Accent,
  Gradient,
  Spacing,
  Radius,
  TypeScale,
} from './tokens';
import { useThemeStore } from './themeStore';
import type { ThemeMode } from './themeStore';

export type ColorScheme = 'light' | 'dark';

export type { Surface } from './light';

export interface ThemeContextValue {
  mode: ThemeMode;
  scheme: ColorScheme;
  isDark: boolean;
  colors: Surface;
  palette: Palette;
  accent: Accent;
  gradient: Gradient;
  spacing: Spacing;
  radius: Radius;
  type: TypeScale;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(
  undefined,
);

interface ThemeProviderProps {
  children: ReactNode;
  forcedScheme?: ColorScheme;
}

function resolveScheme(
  mode: ThemeMode,
  systemScheme: ColorScheme,
): ColorScheme {
  if (mode === 'system') return systemScheme;
  return mode;
}

export function ThemeProvider({
  children,
  forcedScheme,
}: ThemeProviderProps): React.ReactElement {
  const mode = useThemeStore((s) => s.mode);
  const initialSystem: ColorScheme =
    Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
  const [systemScheme, setSystemScheme] = useState<ColorScheme>(initialSystem);

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme === 'dark' ? 'dark' : 'light');
    });
    return () => sub.remove();
  }, []);

  const value = useMemo<ThemeContextValue>(() => {
    const scheme: ColorScheme =
      forcedScheme ?? resolveScheme(mode, systemScheme);
    const colors: Surface = scheme === 'dark' ? dark : light;
    return {
      mode,
      scheme,
      isDark: scheme === 'dark',
      colors,
      palette,
      accent,
      gradient,
      spacing,
      radius,
      type,
    };
  }, [mode, systemScheme, forcedScheme]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
