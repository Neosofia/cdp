import type { JwtTokenData, UserProfile } from '@/shared/core/appTypes';
import type { RoleCatalogSnapshot } from '@/shared/user-registry/roleCatalogApi';

export interface TokenInfo {
  raw: string;
  decoded: JwtTokenData;
}

export interface SessionSelectionPatch {
  activeActor?: string;
  activeOrgRole?: string;
  activePersonaId?: string;
  profile?: UserProfile | null;
}

export interface SessionSnapshot {
  accessToken: string;
  tokenInfo: TokenInfo;
  profile: UserProfile;
  roleCatalog: RoleCatalogSnapshot;
  activeActor: string;
  activeOrgRole: string;
  activePersonaId?: string;
  prefetchRoles: string[];
}
