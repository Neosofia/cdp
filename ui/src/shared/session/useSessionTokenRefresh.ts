import { useEffect, useRef } from 'react';
import { registerTokenRefreshHandler } from '@/shared/auth/auth';
import {
  TOKEN_REFRESH_INTERVAL_MS,
  accessTokenNeedsRefresh,
} from '@/shared/session/authSessionRefresh';
import type { TokenInfo } from '@/shared/session/types';

interface UseSessionTokenRefreshOptions {
  tokenInfo: TokenInfo | null;
  fetchSessionData: () => Promise<string | null>;
  onClearRefreshTimer?: () => void;
}

export function useSessionTokenRefresh({
  tokenInfo,
  fetchSessionData,
  onClearRefreshTimer,
}: UseSessionTokenRefreshOptions) {
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearRefreshTimer = () => {
    if (refreshTimerRef.current) {
      window.clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    onClearRefreshTimer?.();
  };

  useEffect(() => {
    registerTokenRefreshHandler(() => fetchSessionData());
    return () => registerTokenRefreshHandler(null);
  }, [fetchSessionData]);

  useEffect(() => {
    if (!tokenInfo?.decoded?.exp) {
      return;
    }

    const refreshIfStale = () => {
      const exp = tokenInfo.decoded?.exp;
      if (exp && accessTokenNeedsRefresh(exp)) {
        void fetchSessionData();
      }
    };

    refreshTimerRef.current = window.setInterval(() => {
      void fetchSessionData();
    }, TOKEN_REFRESH_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshIfStale();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearRefreshTimer();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [tokenInfo, fetchSessionData]);

  return { clearRefreshTimer };
}
