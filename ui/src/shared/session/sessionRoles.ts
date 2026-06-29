import type { RoleCatalogSnapshot } from '@/shared/user-registry/roleCatalogApi';

/** Tier-1 actor sent as X-Active-Actor on API calls. */
export type Tier1Actor = 'operator' | 'study' | 'clinician' | 'patient' | 'demo';

/** One assigned tier-2 org role in the session menu. */
export interface SessionRoleChoice {
  /** Org role slug (e.g. sponsor.clinical-ops). */
  id: string;
  label: string;
  orgRole: string;
  actor: Tier1Actor;
}

const TIER1_ACTORS = new Set<Tier1Actor>(['operator', 'study', 'clinician', 'patient', 'demo']);

/** Session menu excludes bootstrap-only demo actor. */
const SESSION_MENU_ACTORS = new Set<Tier1Actor>(['operator', 'study', 'clinician', 'patient']);

const LEGACY_PERSONA_ACTOR: Record<string, Tier1Actor> = {
  'platform-admin': 'operator',
};

function isTier1Actor(value: string): value is Tier1Actor {
  return TIER1_ACTORS.has(value as Tier1Actor);
}

/** Map a tier-2 slug to tier-1 actor from registry namespace (matches Cedar actor classes). */
export function tier1ActorForOrgRole(orgRole: string): Tier1Actor | null {
  if (orgRole.startsWith('patient.')) {
    return 'patient';
  }
  if (orgRole.startsWith('site.')) {
    return 'clinician';
  }
  if (orgRole.startsWith('platform.')) {
    return 'operator';
  }
  if (
    orgRole.startsWith('cro.') ||
    orgRole.startsWith('sponsor.') ||
    orgRole.startsWith('smo.')
  ) {
    return 'study';
  }
  return null;
}

/**
 * Build session menu rows from assigned org roles.
 * One row per assigned tier-2 role; tier-1 actor is derived from the slug namespace.
 */
export function buildSessionRoleChoices(
  jwtActors: string[],
  assignedOrgRoles: string[],
  catalog: RoleCatalogSnapshot | null,
): SessionRoleChoice[] {
  if (!catalog?.role_definitions?.length) {
    return [];
  }

  const labelById = new Map(catalog.role_definitions.map((def) => [def.id, def.label]));
  const orderIndex = new Map(catalog.role_definitions.map((def, index) => [def.id, index]));
  const uniqueAssigned = [...new Set(assignedOrgRoles)];

  const choices: SessionRoleChoice[] = [];
  for (const orgRole of uniqueAssigned) {
    const label = labelById.get(orgRole);
    if (!label) {
      continue;
    }
    const actor = tier1ActorForOrgRole(orgRole);
    if (!actor || !jwtActors.includes(actor) || !SESSION_MENU_ACTORS.has(actor)) {
      continue;
    }
    choices.push({ id: orgRole, label, orgRole, actor });
  }

  choices.sort(
    (a, b) => (orderIndex.get(a.orgRole) ?? 999) - (orderIndex.get(b.orgRole) ?? 999),
  );
  return choices;
}

export function findSessionRoleChoice(
  choices: SessionRoleChoice[],
  actor: string,
  orgRole: string,
): SessionRoleChoice | undefined {
  if (orgRole) {
    const exact = choices.find((choice) => choice.orgRole === orgRole);
    if (exact) {
      return exact;
    }
  }
  if (!actor) {
    return undefined;
  }
  return choices.find((choice) => choice.actor === actor);
}

export function resolveStoredSessionRoleChoice(
  choices: SessionRoleChoice[],
  authStorageKey: string,
): SessionRoleChoice | null {
  if (choices.length === 0) {
    return null;
  }

  try {
    const raw = localStorage.getItem(authStorageKey);
    if (raw) {
      const stored = JSON.parse(raw) as {
        activePersonaId?: string;
        activeActor?: string;
        activeOrgRole?: string;
      };

      if (stored.activeOrgRole) {
        const byOrgRole = choices.find((c) => c.orgRole === stored.activeOrgRole);
        if (byOrgRole) {
          return byOrgRole;
        }
      }

      if (stored.activePersonaId) {
        const byId = choices.find((c) => c.id === stored.activePersonaId);
        if (byId) {
          return byId;
        }
        const legacyActor = LEGACY_PERSONA_ACTOR[stored.activePersonaId];
        if (legacyActor) {
          const byLegacy = choices.find((c) => c.actor === legacyActor);
          if (byLegacy) {
            return byLegacy;
          }
        }
        if (isTier1Actor(stored.activePersonaId)) {
          const byActor = choices.find((c) => c.actor === stored.activePersonaId);
          if (byActor) {
            return byActor;
          }
        }
      }

      const legacy = findSessionRoleChoice(
        choices,
        stored.activeActor ?? '',
        stored.activeOrgRole ?? '',
      );
      if (legacy) {
        return legacy;
      }
    }
  } catch {
    // ignore corrupt local storage
  }

  return choices[0];
}
