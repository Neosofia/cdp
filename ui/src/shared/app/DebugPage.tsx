import { lazy, Suspense } from 'react';
import { Navigate } from 'react-router-dom';
import RouteLoadingFallback from '@/shared/app/RouteLoadingFallback';
import { useAuthenticatedSession } from '@/shared/session/AuthenticatedSessionContext';

const DebugApiPanel = lazy(() => import('@/components/DebugApiPanel'));

export default function DebugPage() {
  const { session, testResult, runDebugTest, isCorporate } = useAuthenticatedSession();
  const { tokenInfo } = session;

  if (!tokenInfo) {
    return null;
  }

  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <DebugApiPanel
        tokenInfo={tokenInfo}
        testResult={testResult}
        onRunTest={(label, url) => void runDebugTest(label, url)}
        isCorporate={isCorporate}
      />
    </Suspense>
  );
}

export function UnknownRouteRedirect() {
  return <Navigate to="/" replace />;
}
