import { useEffect, useState } from 'react';
import AppBrandHeader from '@/components/AppBrandHeader';
import AppFooter from '@/components/AppFooter';
import TermsOfServiceCrawl from '@/components/TermsOfServiceCrawl';
import TermsOfServiceReview from '@/components/TermsOfServiceReview';
import StarField from '@/components/StarField';
import { Button } from '@/components/ui/button';
import { TOS_VERSION } from '@/lib/termsOfServiceContent';
import { useUiTheme } from '@/lib/uiTheme';
import { cn } from '@/lib/utils';

interface TermsOfServiceGateProps {
  displayName: string;
  className?: string;
  /** Dev crawl preview: no checkbox or accept/decline controls. */
  preview?: boolean;
  accepting?: boolean;
  errorMessage?: string | null;
  onAccept?: () => void;
  onDecline?: () => void;
}

export default function TermsOfServiceGate({
  displayName,
  className,
  preview = false,
  accepting = false,
  errorMessage = null,
  onAccept,
  onDecline,
}: TermsOfServiceGateProps) {
  const { isCorporate } = useUiTheme();
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    if (preview) {
      return;
    }
    const resetForm = () => setAgreed(false);
    window.addEventListener('pageshow', resetForm);
    return () => window.removeEventListener('pageshow', resetForm);
  }, [preview]);

  if (isCorporate) {
    return (
      <div
        className={cn(
          'flex min-h-dvh flex-col bg-slate-100 text-slate-900',
          preview ? 'flex-1 min-h-0' : undefined,
          className,
        )}
      >
        <AppBrandHeader />

        <main className="relative z-10 flex flex-1 flex-col pt-4 pb-8">
          {!preview ? (
            <p className="mb-3 shrink-0 text-center text-sm text-slate-600 px-4">
              Welcome, {displayName}. Please review and accept the Terms of Service to continue.
            </p>
          ) : (
            <p className="mb-3 shrink-0 text-center text-sm text-slate-600 px-4">
              Preview · Version {TOS_VERSION}
            </p>
          )}

          <TermsOfServiceReview />

          {!preview ? (
            <div className="relative z-20 mx-auto mt-8 w-full max-w-3xl shrink-0 rounded-lg border border-slate-300 bg-white px-4 py-4 shadow-sm sm:px-5">
              <label className="flex cursor-pointer items-start gap-2.5 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-400 text-slate-900 focus:ring-slate-400/40"
                />
                <span>
                  I have read and agree to the Terms of Service. I understand that acceptance is
                  recorded on my user profile and that declining will return me to the sign-in page.
                </span>
              </label>

              {errorMessage ? (
                <p className="mt-2 text-sm text-red-700" role="alert">
                  {errorMessage}
                </p>
              ) : null}

              <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-slate-300 text-slate-700 hover:bg-slate-50"
                  disabled={accepting}
                  onClick={onDecline}
                >
                  Decline
                </Button>
                <Button
                  type="button"
                  variant="default"
                  size="default"
                  disabled={!agreed || accepting}
                  className={cn(
                    'min-w-[11rem] bg-slate-900 text-white hover:bg-slate-800',
                    !agreed && 'opacity-50',
                  )}
                  onClick={onAccept}
                >
                  {accepting ? 'Recording acceptance…' : 'I Agree — Continue'}
                </Button>
              </div>
            </div>
          ) : null}
        </main>

        <AppFooter className="relative z-10 shrink-0 py-2" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden',
        preview ? 'flex-1 min-h-0' : 'h-dvh',
        className,
      )}
      style={{ background: '#05050f', fontFamily: "'Inter', sans-serif" }}
    >
      <AppBrandHeader className="shrink-0" />

      <div className="fixed inset-0 pointer-events-none z-0">
        <StarField />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 100% 55% at 50% 100%, rgba(124,58,237,0.2) 0%, transparent 70%)',
          }}
        />
      </div>

      <main className="relative z-10 flex flex-1 flex-col min-h-0 w-full pt-2 pb-2">
        <p className="shrink-0 text-center text-[10px] uppercase tracking-[0.18em] text-slate-500 mb-1 px-4">
          {preview ? 'Preview' : `Welcome, ${displayName}`} · v{TOS_VERSION}
        </p>

        <TermsOfServiceCrawl />

        {!preview ? (
          <div
            className="relative z-20 shrink-0 mt-2 mx-auto w-full max-w-3xl rounded-xl border border-cyan-500/15 px-4 sm:px-5 py-3 space-y-2.5"
            style={{ background: 'rgba(5,5,15,0.92)' }}
          >
            <label className="flex items-start gap-2.5 cursor-pointer text-xs sm:text-sm text-slate-300">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-600 bg-slate-900 text-cyan-500 focus:ring-cyan-500/40"
              />
              <span>
                I have read and agree to these Terms of Service. Declining returns me to the splash
                page (not the movie); acceptance is recorded on my user profile.
              </span>
            </label>

            {errorMessage ? (
              <p className="text-sm text-rose-400" role="alert">
                {errorMessage}
              </p>
            ) : null}

            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-slate-200"
                disabled={accepting}
                onClick={onDecline}
              >
                Decline — return to splash (page, not the movie)
              </Button>
              <Button
                type="button"
                variant="default"
                size="default"
                disabled={!agreed || accepting}
                className={cn(
                  'min-w-[11rem] font-bold uppercase tracking-wider shadow-[0_0_18px_rgba(155,3,3,0.35)]',
                  !agreed && 'opacity-50',
                )}
                onClick={onAccept}
              >
                {accepting ? 'Recording acceptance…' : 'I Agree — enter dashboard'}
              </Button>
            </div>
          </div>
        ) : null}
      </main>

      <AppFooter className="relative z-10 shrink-0 py-2" />
    </div>
  );
}
