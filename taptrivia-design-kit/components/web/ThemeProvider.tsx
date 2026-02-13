/**
 * ═══════════════════════════════════════════════════════════════
 *  TAP TRIVIA — ThemeProvider
 *  Wraps the app and provides theme context.
 *  Detects TV mode and applies correct token set.
 * ═══════════════════════════════════════════════════════════════
 */

import React, { createContext, useContext, useMemo } from 'react';
import { theme as baseTheme, TapTriviaTheme } from '../../tokens/tokens';
import tvTheme, { TapTriviaTVTheme } from '../../tokens/tokens.tv';

type Surface = 'mobile' | 'tv';

interface ThemeContextValue {
  theme: TapTriviaTheme;
  tv: TapTriviaTVTheme;
  surface: Surface;
  isTv: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: baseTheme,
  tv: tvTheme,
  surface: 'mobile',
  isTv: false,
});

export const useTheme = () => useContext(ThemeContext);
export const useIsTv = () => useContext(ThemeContext).isTv;

interface ThemeProviderProps {
  surface?: Surface;
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  surface = 'mobile',
  children,
}) => {
  const value = useMemo(
    () => ({
      theme: baseTheme,
      tv: tvTheme,
      surface,
      isTv: surface === 'tv',
    }),
    [surface]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
