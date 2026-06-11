/**
 * CalVer UI release id (YYYY.MM.DD) — bump this on each UI release.
 * Shown in the app footer; single source of truth for the CDP UI build.
 */
export const UI_RELEASE_VERSION = '2026.06.11';

export function getUiVersion(): string {
  return UI_RELEASE_VERSION;
}
