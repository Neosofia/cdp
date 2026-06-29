import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

interface AppShellTrailingContextValue {
  trailing: ReactNode;
  setTrailing: (node: ReactNode | null) => void;
}

const AppShellTrailingContext = createContext<AppShellTrailingContextValue | null>(null);

/** Wraps the authenticated app shell so route content can inject header trailing UI once. */
export function AppShellTrailingProvider({ children }: { children: ReactNode }) {
  const [trailing, setTrailingState] = useState<ReactNode>(null);
  const setTrailing = useCallback((node: ReactNode | null) => {
    setTrailingState(node);
  }, []);

  const value = useMemo(
    () => ({ trailing, setTrailing }),
    [trailing, setTrailing],
  );

  return (
    <AppShellTrailingContext.Provider value={value}>
      {children}
    </AppShellTrailingContext.Provider>
  );
}

export function useAppShellTrailingSlot(): AppShellTrailingContextValue {
  const context = useContext(AppShellTrailingContext);
  if (!context) {
    throw new Error('useAppShellTrailingSlot must be used within AppShellTrailingProvider');
  }
  return context;
}

/** Mount trailing header content (e.g. clinician session toolbar) for the current route. */
export function useAppShellTrailingContent(content: ReactNode | null): void {
  const { setTrailing } = useAppShellTrailingSlot();

  useEffect(() => {
    setTrailing(content);
    return () => setTrailing(null);
  }, [content, setTrailing]);
}

/** Read trailing header content inside AppShell. */
export function useAppShellTrailing(): ReactNode {
  return useAppShellTrailingSlot().trailing;
}
