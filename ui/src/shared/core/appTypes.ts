import { LOCAL_AUTH_KEY } from '@/shared/auth/auth';

export interface LocalOauthToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  id_token?: string;
}

export interface UserRegistryRecord {
  uuid: string;
  tenant_uuid: string;
  display_code: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  roles: string[];
  tos_accepted?: boolean;
}

export interface UserProfile {
  uuid: string;
  first_name: string;
  last_name: string;
  email: string;
  display_code: string | null;
  tenant_uuid: string;
  tenant_name: string;
  tenant_display_code?: string | null;
  /** Tier-2 organization roles from the User registry. */
  roles: string[];
  /** Tier-1 actor classes from the platform JWT. */
  actors: string[];
  tos_accepted: boolean;
}

export interface JwtTokenData {
  exp?: number;
  'neosofia:actors'?: string[];
  'neosofia:roles'?: string[];
  [key: string]: unknown;
}

export type EntitlementsMap = Record<string, boolean>;
export type EntitlementsByRole = Record<string, EntitlementsMap>;

export function formatTenantLabel(name: string, displayCode?: string | null): string {
  const code = displayCode?.trim();
  return code ? `${name} (${code})` : name;
}

export function jwtTier1Roles(
  profile: UserProfile | null,
  decoded: JwtTokenData,
  catalogActorClasses?: Set<string>,
): string[] {
  const raw = profile?.actors?.length ? profile.actors : decoded['neosofia:actors'] ?? [];
  const allowed =
    catalogActorClasses ??
    new Set(['operator', 'study', 'clinician', 'patient', 'demo']);
  const seen = new Set<string>();
  const tier1: string[] = [];
  for (const role of raw) {
    if (allowed.has(role) && !seen.has(role)) {
      seen.add(role);
      tier1.push(role);
    }
  }
  return tier1;
}

export function resolveActiveActor(actors: string[]): string {
  if (actors.length === 0) return '';

  const stored = localStorage.getItem(LOCAL_AUTH_KEY);
  if (stored) {
    try {
      const { activeActor } = JSON.parse(stored) as { activeActor?: string };
      if (activeActor && actors.includes(activeActor)) {
        return activeActor;
      }
    } catch {
      // ignore corrupt local storage
    }
  }

  return actors[0];
}

export function resolveActiveOrgRole(roles: string[]): string {
  if (roles.length === 0) return '';

  const stored = localStorage.getItem(LOCAL_AUTH_KEY);
  if (stored) {
    try {
      const { activeOrgRole } = JSON.parse(stored) as { activeOrgRole?: string };
      if (activeOrgRole && roles.includes(activeOrgRole)) {
        return activeOrgRole;
      }
    } catch {
      // ignore corrupt local storage
    }
  }

  return roles[0];
}
