import { useEffect } from 'react';
import {
  beginLogin,
  consumePendingRelogin,
  clearAuthCallbackQuery,
  hasLoggedOutLocally,
  isAuthCallbackLanding,
} from '@/shared/auth/auth';

interface UseSessionInitializationOptions {
  fetchSessionData: () => Promise<string | null>;
  setInitializing: (value: boolean) => void;
}

export function useSessionInitialization({
  fetchSessionData,
  setInitializing,
}: UseSessionInitializationOptions) {
  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      const fromAuthCallback = isAuthCallbackLanding();
      if (fromAuthCallback) {
        clearAuthCallbackQuery();
      }

      if (consumePendingRelogin()) {
        beginLogin();
        return;
      }

      if (fromAuthCallback || !hasLoggedOutLocally()) {
        await fetchSessionData();
      }

      if (!cancelled) {
        setInitializing(false);
      }
    };

    void initialize();
    return () => {
      cancelled = true;
    };
  }, [fetchSessionData, setInitializing]);

  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted && !hasLoggedOutLocally()) {
        void fetchSessionData();
      }
    };
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, [fetchSessionData]);
}
