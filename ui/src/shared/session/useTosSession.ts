import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LOGOUT_FLAG } from '@/shared/auth/auth';
import { homePath } from '@/shared/app/appRoutes';
import { acceptSessionTermsOfService } from '@/shared/session/userProfileSession';
import { persistSessionSelection } from '@/shared/session/localSessionStorage';
import type { TokenInfo } from '@/shared/session/types';
import type { UserProfile } from '@/shared/core/appTypes';
import { toUserFacingError } from '@/shared/core/userFacingError';

interface UseTosSessionOptions {
  profile: UserProfile | null;
  tokenInfo: TokenInfo | null;
  activeActor: string;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  clearCoreSession: () => void;
}

export function useTosSession({
  profile,
  tokenInfo,
  activeActor,
  setProfile,
  clearCoreSession,
}: UseTosSessionOptions) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [tosAccepting, setTosAccepting] = useState(false);
  const [tosError, setTosError] = useState<string | null>(null);

  const needsTosAcceptance = Boolean(profile && !profile.tos_accepted);

  const navigateHome = useCallback(() => {
    navigate(homePath(), { replace: true });
  }, [navigate]);

  const resetTosState = useCallback(() => {
    setTosAccepting(false);
    setTosError(null);
  }, []);

  const handleDeclineTos = useCallback(() => {
    resetTosState();
    clearCoreSession();
    localStorage.setItem(LOGOUT_FLAG, '1');
  }, [clearCoreSession, resetTosState]);

  const handleAcceptTos = useCallback(async () => {
    const userId = profile?.uuid || String(tokenInfo?.decoded?.sub ?? '');
    const jwtActors = tokenInfo?.decoded?.['neosofia:actors'] ?? [];
    const actorForPatch =
      activeActor || profile?.actors?.[0] || (jwtActors.length ? jwtActors[0] : '');

    if (!tokenInfo?.raw || !userId || !actorForPatch) {
      setTosError('Session is not ready. Try signing in again.');
      return;
    }
    setTosAccepting(true);
    setTosError(null);
    try {
      const updated = await acceptSessionTermsOfService(tokenInfo.raw, actorForPatch, userId);
      const nextProfile: UserProfile = {
        ...(profile ?? {
          uuid: userId,
          first_name: '',
          last_name: '',
          email: '',
          display_code: null,
          tenant_uuid: '',
          tenant_name: '',
          roles: [],
          actors: jwtActors,
          tos_accepted: false,
        }),
        tos_accepted: updated.tos_accepted === true,
      };
      setProfile(nextProfile);
      persistSessionSelection({ profile: nextProfile });
      navigateHome();
    } catch (err) {
      setTosError(toUserFacingError(err, 'Could not record acceptance'));
    } finally {
      setTosAccepting(false);
    }
  }, [activeActor, navigateHome, profile, tokenInfo, setProfile]);

  useEffect(() => {
    if (!needsTosAcceptance) {
      return;
    }
    if (pathname !== homePath()) {
      navigateHome();
    }
  }, [needsTosAcceptance, pathname, navigateHome]);

  return {
    tosAccepting,
    tosError,
    needsTosAcceptance,
    resetTosState,
    handleDeclineTos,
    handleAcceptTos,
  };
}
