import { createContext, useContext, type ReactNode } from 'react';
import type { DebugTestResult } from '@/components/DebugApiPanel';
import type { PostCareEnrollmentInput, PostCareEnrollmentResult } from '@/features/clinician/lib/postCareEnrollment';
import type { useAppNavigation } from '@/shared/app/useAppNavigation';
import type { useAuthSession } from '@/shared/session/useAuthSession';

type AuthSession = ReturnType<typeof useAuthSession>;
type AppNavigation = ReturnType<typeof useAppNavigation>;

export interface AuthenticatedSessionContextValue {
  session: AuthSession;
  rosterRevision: number;
  bumpRoster: () => void;
  enrollInPostCare: (input: PostCareEnrollmentInput) => Promise<PostCareEnrollmentResult>;
  navigation: AppNavigation;
  testResult: DebugTestResult | null;
  runDebugTest: (label: string, url: string) => Promise<void>;
  isCorporate: boolean;
}

const AuthenticatedSessionContext = createContext<AuthenticatedSessionContextValue | null>(null);

export function AuthenticatedSessionProvider({
  value,
  children,
}: {
  value: AuthenticatedSessionContextValue;
  children: ReactNode;
}) {
  return (
    <AuthenticatedSessionContext.Provider value={value}>{children}</AuthenticatedSessionContext.Provider>
  );
}

export function useAuthenticatedSession(): AuthenticatedSessionContextValue {
  const context = useContext(AuthenticatedSessionContext);
  if (!context) {
    throw new Error('useAuthenticatedSession must be used within AuthenticatedSessionProvider');
  }
  return context;
}
