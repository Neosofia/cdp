import { jwtDecode } from 'jwt-decode';
import { hasLoggedOutLocally, LOCAL_AUTH_KEY } from '@/shared/auth/auth';
import { AUTH_API } from '@/shared/platform/apiBases';
import { fetchAuthTenant } from '@/shared/auth/authenticationApi';
import {
  formatTenantLabel,
  jwtTier1Roles,
  resolveActiveActor,
  resolveActiveOrgRole,
  type EntitlementsMap,
  type JwtTokenData,
  type LocalOauthToken,
  type UserProfile,
} from '@/shared/core/appTypes';
import { prefetchEntitlementsInBackground } from '@/shared/session/entitlements';
import { fetchRoleCatalog, roleCatalogForUi } from '@/shared/user-registry/roleCatalogApi';
import { swallowOptionalEnrichmentError } from '@/shared/core/userFacingError';
import {
  buildSessionRoleChoices,
  resolveStoredSessionRoleChoice,
} from '@/shared/session/sessionRoles';
import { fetchSessionRegistryUser } from '@/shared/session/userProfileSession';
import type { SessionSnapshot } from '@/shared/session/types';

export interface LoadSessionSnapshotOptions {
  retries?: number;
  onRoleEntitlementsCached?: (role: string, data: EntitlementsMap) => void;
}

export async function loadSessionSnapshot(
  options: LoadSessionSnapshotOptions = {},
): Promise<SessionSnapshot | null> {
  const { retries = 2, onRoleEntitlementsCached } = options;

  if (hasLoggedOutLocally()) {
    return null;
  }

  const prefetchedRoles = new Set<string>();

  const startPrefetch = (token: string, rolesToLoad: string[]) => {
    if (!onRoleEntitlementsCached) {
      return;
    }
    const pending = rolesToLoad.filter((role) => !prefetchedRoles.has(role));
    if (pending.length === 0) {
      return;
    }
    for (const role of pending) {
      prefetchedRoles.add(role);
    }
    prefetchEntitlementsInBackground(token, pending, onRoleEntitlementsCached);
  };

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }

      const tokenRes = await fetch(`${AUTH_API}/api/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=session',
        credentials: 'include',
      });

      if (!tokenRes.ok) {
        if (tokenRes.status === 401) {
          throw Object.assign(new Error('Unauthenticated'), { isAuthError: true });
        }
        throw new Error(`Token fetch failed: ${tokenRes.status}`);
      }

      const tokenData: LocalOauthToken = await tokenRes.json();
      if (!tokenData.access_token) {
        throw new Error('No access token in response');
      }

      const decoded = jwtDecode<JwtTokenData>(tokenData.access_token);
      const tokenInfo = { raw: tokenData.access_token, decoded };
      const jwtActors = decoded?.['neosofia:actors'] || [];
      const resolvedActor = resolveActiveActor(jwtActors);

      startPrefetch(tokenData.access_token, jwtActors);

      const profileId = String(decoded.sub ?? '');
      if (!profileId) {
        throw new Error('Access token missing user subject');
      }

      let tenantName = 'Unknown organization';
      let registry;
      try {
        registry = await fetchSessionRegistryUser(tokenData.access_token, resolvedActor, profileId);
      } catch (error) {
        throw Object.assign(
          new Error(error instanceof Error ? error.message : 'User profile fetch failed'),
          { isAuthError: true },
        );
      }

      if (registry.tenant_uuid) {
        try {
          const tenant = await fetchAuthTenant(
            tokenData.access_token,
            resolvedActor,
            registry.tenant_uuid,
          );
          if (tenant.name) {
            tenantName = formatTenantLabel(tenant.name, tenant.display_code);
          }
        } catch (error) {
          swallowOptionalEnrichmentError(error);
        }
      }

      const fetchedSessionActors = jwtTier1Roles(null, decoded);
      const orgRoles = registry.roles ?? [];
      const profile: UserProfile = {
        uuid: registry.uuid,
        first_name: registry.first_name ?? '',
        last_name: registry.last_name ?? '',
        email: registry.email ?? '',
        display_code: registry.display_code ?? null,
        tenant_uuid: registry.tenant_uuid,
        tenant_name: tenantName,
        roles: orgRoles,
        actors: fetchedSessionActors,
        tos_accepted: registry.tos_accepted === true,
      };

      let remoteCatalog = null;
      try {
        remoteCatalog = await fetchRoleCatalog(tokenData.access_token, resolvedActor);
      } catch (error) {
        swallowOptionalEnrichmentError(error);
      }
      const roleCatalog = roleCatalogForUi(remoteCatalog);

      const roleChoices = buildSessionRoleChoices(fetchedSessionActors, orgRoles, roleCatalog);
      const storedChoice = resolveStoredSessionRoleChoice(roleChoices, LOCAL_AUTH_KEY);
      const finalActor =
        storedChoice?.actor ??
        resolveActiveActor(fetchedSessionActors.length ? fetchedSessionActors : jwtActors);
      const finalOrgRole = storedChoice?.orgRole ?? resolveActiveOrgRole(orgRoles);
      const finalPersonaId = storedChoice?.id;

      const prefetchRoles = [
        ...new Set([
          ...(fetchedSessionActors.length ? fetchedSessionActors : jwtActors),
          ...roleChoices.map((choice) => choice.actor),
        ]),
      ];
      startPrefetch(tokenData.access_token, prefetchRoles);

      return {
        accessToken: tokenData.access_token,
        tokenInfo,
        profile,
        roleCatalog,
        activeActor: finalActor,
        activeOrgRole: finalOrgRole,
        activePersonaId: finalPersonaId,
        prefetchRoles,
      };
    } catch (err) {
      if (err && typeof err === 'object' && 'isAuthError' in err) {
        break;
      }
    }
  }

  return null;
}
