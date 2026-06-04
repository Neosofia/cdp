import { useCallback, useSyncExternalStore } from 'react';
import {
  pushAppRoute,
  readAppRoute,
  replaceAppRoute,
  subscribeToAppLocation,
  type AppRoute,
} from '@/lib/appNavigation';

let cachedPath = '';
let cachedRoute: AppRoute | null = null;

function currentPath(): string {
  return `${window.location.pathname}${window.location.search}`;
}

/** Stable snapshot for useSyncExternalStore (must not return a new object every call). */
function getRouteSnapshot(): AppRoute {
  const path = currentPath();
  if (cachedRoute && path === cachedPath) {
    return cachedRoute;
  }
  cachedPath = path;
  cachedRoute = readAppRoute();
  return cachedRoute;
}

function invalidateRouteSnapshot(): void {
  cachedPath = '';
  cachedRoute = null;
}

function subscribe(listener: () => void): () => void {
  return subscribeToAppLocation(() => {
    invalidateRouteSnapshot();
    listener();
  });
}

export function useAppRoute() {
  const route = useSyncExternalStore(subscribe, getRouteSnapshot, getRouteSnapshot);

  const navigate = useCallback((next: AppRoute, mode: 'push' | 'replace' = 'push') => {
    if (mode === 'replace') {
      replaceAppRoute(next);
    } else {
      pushAppRoute(next);
    }
  }, []);

  return { route, navigate };
}
