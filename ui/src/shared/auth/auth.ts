import { notifyRouterLocationChanged } from '@/shared/app/appRoutes';

export const AUTH_BASE = import.meta.env.VITE_AUTH_BASE_URL ?? 'http://localhost:8014';
export const LOGOUT_FLAG = 'cdp-ui-just-logged-out';
export const LOCAL_AUTH_KEY = 'cdp-ui-auth';
const PENDING_RELOGIN_KEY = 'cdp-ui-pending-relogin';

/** True until the user explicitly starts login (survives reloads). */
export function hasLoggedOutLocally(): boolean {
  return localStorage.getItem(LOGOUT_FLAG) === '1';
}

export function beginLogin() {
  localStorage.removeItem(LOGOUT_FLAG);
  window.location.href = `${AUTH_BASE}/login`;
}

/** Revoke IdP session, then start a fresh login so JWT roles reprovision from the user registry. */
export function beginReLogin() {
  localStorage.removeItem(LOCAL_AUTH_KEY);
  localStorage.removeItem(LOGOUT_FLAG);
  sessionStorage.setItem(PENDING_RELOGIN_KEY, '1');
  window.location.href = `${AUTH_BASE}/logout`;
}

/** After logout redirect, auto-chain to /login once. */
export function consumePendingRelogin(): boolean {
  if (sessionStorage.getItem(PENDING_RELOGIN_KEY) !== '1') {
    return false;
  }
  sessionStorage.removeItem(PENDING_RELOGIN_KEY);
  return true;
}

export function isAuthCallbackLanding(): boolean {
  return new URLSearchParams(window.location.search).get('auth') === 'callback';
}

export function clearAuthCallbackQuery(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has('auth')) {
    return;
  }
  url.searchParams.delete('auth');
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, '', next);
  notifyRouterLocationChanged();
}

let tokenRefreshHandler: (() => Promise<string | null>) | null = null;

export function registerTokenRefreshHandler(handler: (() => Promise<string | null>) | null): void {
  tokenRefreshHandler = handler;
}

/** Re-mint the access token from the HttpOnly IdP session (used after 401 or on tab focus). */
export async function refreshAccessTokenIfPossible(): Promise<string | null> {
  if (!tokenRefreshHandler) {
    return null;
  }
  return tokenRefreshHandler();
}
