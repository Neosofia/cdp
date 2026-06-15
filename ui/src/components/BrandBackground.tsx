import { useUiTheme } from '@/lib/uiTheme';

/** Full-viewport brand backdrop — used while session is verified (no marketing splash). */
export default function BrandBackground() {
  const { isCorporate } = useUiTheme();

  if (isCorporate) {
    return (
      <div
        className="h-dvh min-h-0 w-full bg-slate-50"
        aria-busy="true"
        aria-label="Loading"
      />
    );
  }

  return (
    <div
      className="h-dvh min-h-0 w-full"
      style={{ background: '#05050f' }}
      aria-busy="true"
      aria-label="Loading"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(124,58,237,0.18) 0%, rgba(6,182,212,0.08) 50%, transparent 80%)',
        }}
      />
    </div>
  );
}
