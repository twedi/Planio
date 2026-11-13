import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { darkTheme, lightTheme, Theme } from './theme';
import { setSetting } from './db/repo';

export type ThemeMode = 'light' | 'dark' | 'system';

type Ctx = {
  theme: Theme;
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  /** Yalnızca görünümü değiştirir, veritabanına yazmaz (yedek geri yüklenince kullanılır) */
  applyMode: (m: ThemeMode) => void;
};

const ThemeCtx = createContext<Ctx>({ theme: lightTheme, mode: 'system', setMode: () => {}, applyMode: () => {} });

/**
 * initialMode: kök düzen ayarı açılış ekranı kapanmadan okuyup verir; böylece kayıtlı tema
 * sistem temasından farklıysa ilk karede yanlış tema görünmez.
 */
export function ThemeProvider({ children, initialMode = 'system' }: { children: React.ReactNode; initialMode?: ThemeMode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>(initialMode);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    setSetting('theme', m);
  }, []);

  const theme = useMemo(() => {
    const dark = mode === 'system' ? system === 'dark' : mode === 'dark';
    return dark ? darkTheme : lightTheme;
  }, [mode, system]);

  const value = useMemo(() => ({ theme, mode, setMode, applyMode: setModeState }), [theme, mode, setMode]);
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);
