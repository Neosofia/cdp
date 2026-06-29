export const DEMO_TIER2_ROLES = ['patient.self', 'site.clinical'] as const;

const DEMO_ACTOR = 'demo';

export function sessionHasDemoActor(sessionActors: string[]): boolean {
  return sessionActors.includes(DEMO_ACTOR);
}

export function profileHasDemoRoles(roles: string[] | undefined): boolean {
  if (!roles?.length) {
    return false;
  }
  return DEMO_TIER2_ROLES.every((role) => roles.includes(role));
}

/** Add demo tier-2 roles without removing existing slugs (e.g. platform.admin). */
export function mergeDemoTier2Roles(currentRoles: string[] | undefined): string[] {
  const merged = new Set(currentRoles ?? []);
  for (const role of DEMO_TIER2_ROLES) {
    merged.add(role);
  }
  return [...merged];
}
