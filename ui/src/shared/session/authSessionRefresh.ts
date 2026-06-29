/** Platform access token lifetime — keep in sync with authentication `ACCESS_TOKEN_TTL_SECS`. */
export const ACCESS_TOKEN_TTL_MS = 30 * 60 * 1000;

/** Proactive refresh interval — half the access token lifetime. */
export const TOKEN_REFRESH_INTERVAL_MS = 15 * 60 * 1000;

/** True when the token should be refreshed before the next API call. */
export function accessTokenNeedsRefresh(expUnixSec: number, nowMs = Date.now()): boolean {
  return expUnixSec * 1000 - nowMs <= TOKEN_REFRESH_INTERVAL_MS;
}
