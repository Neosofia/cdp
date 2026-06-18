import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type UiThemeMode = 'spawn' | 'corporate';

const STORAGE_KEY = 'cdp-ui-theme';

const UiThemeContext = createContext<{
  mode: UiThemeMode;
  isCorporate: boolean;
  isSpawn: boolean;
  setMode: (mode: UiThemeMode) => void;
  toggleMode: () => void;
} | null>(null);

function readStoredMode(): UiThemeMode {
  if (typeof window === 'undefined') {
    return 'corporate';
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'spawn' || stored === 'corporate') {
    return stored;
  }
  return 'corporate';
}

function applyDocumentTheme(mode: UiThemeMode) {
  const root = document.documentElement;
  root.dataset.uiTheme = mode;
  root.classList.toggle('dark', mode === 'spawn');
  document.title =
    mode === 'corporate'
      ? 'Post Discharge Care Platform'
      : 'SPAWN 2 — Clinical Data Platform';
}

export function UiThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<UiThemeMode>(() => readStoredMode());

  const setMode = useCallback((next: UiThemeMode) => {
    setModeState(next);
    localStorage.setItem(STORAGE_KEY, next);
    applyDocumentTheme(next);
  }, []);

  const toggleMode = useCallback(() => {
    setMode(mode === 'spawn' ? 'corporate' : 'spawn');
  }, [mode, setMode]);

  useEffect(() => {
    applyDocumentTheme(mode);
  }, [mode]);

  const value = useMemo(
    () => ({
      mode,
      isCorporate: mode === 'corporate',
      isSpawn: mode === 'spawn',
      setMode,
      toggleMode,
    }),
    [mode, setMode, toggleMode],
  );

  return <UiThemeContext.Provider value={value}>{children}</UiThemeContext.Provider>;
}

export function useUiTheme() {
  const context = useContext(UiThemeContext);
  if (!context) {
    throw new Error('useUiTheme must be used within UiThemeProvider');
  }
  return context;
}

export const PLATFORM_TITLE = {
  spawn: 'SPAWN',
  corporate: 'Post Discharge Care Platform',
} as const;

export const PLATFORM_FOOTER = {
  spawn: '© 2026 SPAWN 2 Clinical Data Platform',
  corporate: '© 2026 PD Care',
} as const;
