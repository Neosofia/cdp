/** Full-page route for the Star Wars TOS crawl (no auth). */
export const TOS_PREVIEW_PATH = '/tos-preview';

export function isTosPreviewPath(pathname = window.location.pathname): boolean {
  return pathname === TOS_PREVIEW_PATH;
}
