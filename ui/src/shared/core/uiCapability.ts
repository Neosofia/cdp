/** Cedar entity id for a UI capability — matches capabilities API response keys. */
export function uiResource(entityType: string, uid: string): string {
  return `ui::${entityType}::"${uid}"`;
}
