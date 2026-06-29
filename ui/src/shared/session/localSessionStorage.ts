import { LOCAL_AUTH_KEY } from '@/shared/auth/auth';
import type { UserProfile } from '@/shared/core/appTypes';
import type { SessionSelectionPatch } from '@/shared/session/types';

interface StoredSessionAuth {
  profile?: UserProfile | null;
  activeActor?: string;
  activeOrgRole?: string;
  activePersonaId?: string;
}

export function persistSessionSelection(patch: SessionSelectionPatch): void {
  const stored = localStorage.getItem(LOCAL_AUTH_KEY);
  if (!stored) {
    return;
  }

  try {
    const parsed = JSON.parse(stored) as StoredSessionAuth;
    localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify({ ...parsed, ...patch }));
  } catch {
    // ignore corrupt local storage
  }
}

export function writeSessionAuth(payload: StoredSessionAuth): void {
  localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(payload));
}

export function clearSessionAuthStorage(): void {
  localStorage.removeItem(LOCAL_AUTH_KEY);
  sessionStorage.clear();
}
