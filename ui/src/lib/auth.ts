export const AUTH_BASE = import.meta.env.VITE_AUTH_BASE_URL ?? 'http://localhost:8014';
export const LOGOUT_FLAG = 'cdp-ui-just-logged-out';

/** True until the user explicitly starts login (survives reloads). */
export function hasLoggedOutLocally(): boolean {
  return localStorage.getItem(LOGOUT_FLAG) === '1';
}

export function beginLogin() {
  localStorage.removeItem(LOGOUT_FLAG);
  window.location.href = `${AUTH_BASE}/login`;
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
}
