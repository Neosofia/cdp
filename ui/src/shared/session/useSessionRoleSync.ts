import { useEffect } from 'react';
import { LOCAL_AUTH_KEY } from '@/shared/auth/auth';
import {
  findSessionRoleChoice,
  resolveStoredSessionRoleChoice,
  type SessionRoleChoice,
} from '@/shared/session/sessionRoles';
import { persistSessionSelection } from '@/shared/session/localSessionStorage';
import type { TokenInfo } from '@/shared/session/types';

interface UseSessionRoleSyncOptions {
  tokenInfo: TokenInfo | null;
  activeActor: string;
  activeOrgRole: string;
  sessionRoleChoices: SessionRoleChoice[];
  setActiveActor: (actor: string) => void;
  setActiveOrgRole: (orgRole: string) => void;
}

export function useSessionRoleSync({
  tokenInfo,
  activeActor,
  activeOrgRole,
  sessionRoleChoices,
  setActiveActor,
  setActiveOrgRole,
}: UseSessionRoleSyncOptions) {
  useEffect(() => {
    if (!tokenInfo || sessionRoleChoices.length === 0) {
      return;
    }
    if (activeActor && findSessionRoleChoice(sessionRoleChoices, activeActor, activeOrgRole)) {
      return;
    }
    const choice = resolveStoredSessionRoleChoice(sessionRoleChoices, LOCAL_AUTH_KEY);
    if (!choice) {
      return;
    }
    setActiveActor(choice.actor);
    setActiveOrgRole(choice.orgRole);
    persistSessionSelection({
      activeActor: choice.actor,
      activeOrgRole: choice.orgRole,
      activePersonaId: choice.id,
    });
  }, [
    tokenInfo,
    activeActor,
    activeOrgRole,
    sessionRoleChoices,
    setActiveActor,
    setActiveOrgRole,
  ]);
}
