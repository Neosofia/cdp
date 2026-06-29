import { useState, useCallback } from 'react';
import type { DebugTestResult } from '@/components/DebugApiPanel';
import { platformApiFetch } from '@/shared/platform/platformApiFetch';

interface UseDebugApiTestOptions {
  token: string | undefined;
  activeActor: string;
  fetchSessionData: () => Promise<string | null>;
  goToDebugApi: () => void;
}

export function useDebugApiTest({
  token,
  activeActor,
  fetchSessionData,
  goToDebugApi,
}: UseDebugApiTestOptions) {
  const [testResult, setTestResult] = useState<DebugTestResult | null>(null);

  const clearTestResult = useCallback(() => {
    setTestResult(null);
  }, []);

  const pingApi = useCallback(
    async (url: string, label?: string, bearerToken?: string) => {
      const accessToken = bearerToken ?? token;
      if (!accessToken) {
        return;
      }
      try {
        const res = await platformApiFetch(url, accessToken, activeActor);
        if (res.status === 401) {
          fetchSessionData();
        }
        const data = await res.json();
        setTestResult({ api: label ?? url, data, status: res.status });
      } catch (e: unknown) {
        setTestResult({
          api: label ?? url,
          data: e instanceof Error ? e.message : 'Unknown error',
          status: 500,
        });
      }
    },
    [token, activeActor, fetchSessionData],
  );

  const runDebugTest = useCallback(
    async (label: string, url: string) => {
      goToDebugApi();
      const accessToken = token ?? (await fetchSessionData());
      if (!accessToken) {
        return;
      }
      pingApi(url, label, accessToken);
    },
    [goToDebugApi, token, fetchSessionData, pingApi],
  );

  return { testResult, clearTestResult, runDebugTest };
}
