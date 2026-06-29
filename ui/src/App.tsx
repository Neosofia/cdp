import { useRef } from 'react';
import { setupTracing } from './otel';
import SplashPage from '@/components/SplashPage';
import TermsOfServiceGate from '@/components/TermsOfServiceGate';
import BrandBackground from '@/components/BrandBackground';
import AuthenticatedApp from '@/shared/app/AuthenticatedApp';
import { isTosPreviewPath } from '@/shared/auth/tosPreview';
import { useUiTheme } from '@/shared/core/uiTheme';
import { cn } from '@/shared/core/utils';
import { useAuthSession } from '@/shared/session/useAuthSession';

try {
  setupTracing();
} catch (error) {
  console.warn('OpenTelemetry setup skipped', error);
}

export default function App() {
  const { isCorporate } = useUiTheme();
  const clearTestResultRef = useRef<() => void>(() => {});

  const session = useAuthSession({
    onBeforeNavigate: () => clearTestResultRef.current(),
  });

  const {
    tokenInfo,
    profile,
    initializing,
    tosAccepting,
    tosError,
    handleDeclineTos,
    handleAcceptTos,
    needsTosAcceptance,
  } = session;

  if (isTosPreviewPath()) {
    return (
      <div
        className={cn(
          'h-dvh flex flex-col overflow-hidden font-sans',
          isCorporate ? 'bg-slate-100' : undefined,
        )}
        style={isCorporate ? undefined : { background: '#05050f' }}
      >
        <TermsOfServiceGate preview displayName="Preview" className="flex-1 min-h-0" />
      </div>
    );
  }

  if (!tokenInfo || !profile) {
    if (initializing) {
      return <BrandBackground />;
    }
    return <SplashPage />;
  }

  if (needsTosAcceptance) {
    const displayName =
      [profile.first_name, profile.last_name].filter(Boolean).join(' ') ||
      profile.email ||
      'there';
    return (
      <TermsOfServiceGate
        displayName={displayName}
        accepting={tosAccepting}
        errorMessage={tosError}
        onAccept={() => void handleAcceptTos()}
        onDecline={handleDeclineTos}
      />
    );
  }

  return <AuthenticatedApp session={session} clearTestResultRef={clearTestResultRef} />;
}
