import StarField from '@/components/StarField';

const AUTH_BASE = import.meta.env.VITE_AUTH_BASE_URL ?? 'http://localhost:8014';

const TICKER_ITEMS = [
  '◆ PHASE III COMPLETE',
  '◆ IRB APPROVED',
  '◆ 0 PROTOCOL DEVIATIONS',
  '◆ 100% PATIENT RETENTION',
  '◆ FDA CLEARED',
  '◆ VAPORIZING CYBER CRIMINALS SINCE 2024',
  '◆ ZERO DROPOUTS',
  '◆ VANDALIZING BIG TECH, ONE OSS PROJECT AT A TIME',
  '◆ ADVERSE EVENTS: NONE',
  '◆ VIOLATING EVERY EXPECTATION SET BEFORE US',
  '◆ DATA LOCK ACHIEVED',
  '◆ VINDICATING EVERY TRIAL PARTICIPANT WHO BELIEVED',
  '◆ AUDIT TRAIL IMMACULATE',
  '◆ VACILLATING BETWEEN GENIUS AND CHAOS (MOSTLY GENIUS)',
  '◆ CDISC COMPLIANT',
  '◆ GDPR RESPECTED (MOSTLY)',
  '◆ SPAWN 2: NOW IN PRODUCTION',
];

const STATS = [
  { value: '100%', label: 'RETENTION RATE' },
  { value: '0', label: 'PROTOCOL DEVIATIONS' },
  { value: '∞', label: 'PLOT ARMOR' },
  { value: '2X', label: 'THE ORIGINAL' },
];

export default function SplashPage({ verifying = false }: { verifying?: boolean }) {
  const tickerText = (TICKER_ITEMS.join('  ') + '  ').repeat(4);

  return (
    <div
      className="min-h-screen flex flex-col overflow-hidden"
      style={{ background: '#05050f', fontFamily: "'Inter', sans-serif" }}
      aria-busy={verifying}
    >
      {/* Star background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <StarField />
        {/* Radial glow */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(124,58,237,0.18) 0%, rgba(6,182,212,0.08) 50%, transparent 80%)',
          }}
        />
      </div>

      {/* ── Header ── */}
      <header className="relative z-10 flex items-center justify-between px-6 md:px-10 py-4 border-b border-white/6">
        <div className="flex items-center gap-3">
          <img src="/favicon.svg?v=2" alt="" className="w-7 h-7" aria-hidden="true" />
          <span
            className="text-xl font-black tracking-wider uppercase"
            style={{
              fontFamily: "'Orbitron', monospace",
              background: 'linear-gradient(135deg, #22d3ee 0%, #a855f7 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            SPAWN
          </span>
          <span className="text-sm font-semibold text-slate-400 tracking-widest uppercase border border-slate-600 rounded px-1.5 py-0.5">
            v2
          </span>

          <span className="hidden sm:block text-xs text-slate-600 tracking-widest uppercase ml-1">
            Clinical Data Platform
          </span>
        </div>

        {verifying ? (
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Checking session…
          </span>
        ) : (
          <a
            href={`${AUTH_BASE}/login`}
            className="relative group inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold uppercase tracking-wider text-white transition-all duration-200 hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #22d3ee 0%, #a855f7 100%)',
              boxShadow: '0 0 20px rgba(168,85,247,0.4)',
            }}
          >
            <span>⚡</span> Login
          </a>
        )}
      </header>

      {/* ── Hero ── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 py-8 md:py-12">
        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8 text-xs font-semibold uppercase tracking-widest border"
          style={{
            borderColor: 'rgba(34,211,238,0.35)',
            background: 'rgba(34,211,238,0.07)',
            color: '#67e8f9',
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full animate-pulse"
            style={{ background: '#22d3ee' }}
          />
          Clinical Data Platform
        </div>

        {/* Tagline */}
        <p
          className="text-base md:text-lg font-semibold tracking-widest uppercase mb-4"
          style={{ color: '#94a3b8' }}
        >
          They said it couldn't be done. We disagreed.
        </p>

        {/* Main headline */}
        <h1
          className="text-7xl md:text-9xl font-black uppercase leading-none mb-2 select-none"
          style={{
            fontFamily: "'Orbitron', monospace",
            background: 'linear-gradient(135deg, #22d3ee 10%, #818cf8 55%, #a855f7 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 0 40px rgba(168,85,247,0.5))',
          }}
        >
          SPAWN v2
        </h1>

        {/* Subtitle */}
        <p className="mt-6 max-w-xl text-base md:text-lg text-slate-400 leading-relaxed">
          Born from hellspawn. Cleared by the IRB. Clinical data management so
          good it came back from the dead — and passed FDA approval.
        </p>

        {/* Stats row */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-8 md:gap-14">
          {STATS.map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-1">
              <span
                className="text-3xl md:text-4xl font-black"
                style={{
                  fontFamily: "'Orbitron', monospace",
                  color: '#4ade80',
                }}
              >
                {s.value}
              </span>
              <span className="text-xs font-semibold tracking-widest uppercase text-slate-500">
                {s.label}
              </span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 flex flex-col sm:flex-row items-center gap-4">
          <a
            href={`${AUTH_BASE}/login`}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-black uppercase tracking-wider text-white transition-all duration-200 hover:scale-105 hover:brightness-110"
            style={{
              background: 'linear-gradient(135deg, #22d3ee 0%, #a855f7 100%)',
              boxShadow: '0 0 40px rgba(168,85,247,0.45), 0 0 80px rgba(34,211,238,0.15)',
              fontFamily: "'Orbitron', monospace",
            }}
          >
            ⚡ SPAWN YOUR SESSION
          </a>
          <span className="text-xs text-slate-600 uppercase tracking-widest">
            No adverse events reported
          </span>
        </div>
      </main>

      {/* ── Scrolling ticker ── */}
      <div
        className="relative z-10 overflow-hidden border-t border-b border-white/6 py-3"
        style={{ background: 'rgba(255,255,255,0.02)' }}
        aria-hidden="true"
      >
        <div
          className="whitespace-nowrap inline-block animate-[ticker_30s_linear_infinite]"
          style={{
            color: '#22d3ee',
            fontSize: '0.7rem',
            fontWeight: 700,
            letterSpacing: '0.1em',
          }}
        >
          {tickerText}
        </div>
      </div>

      {/* ── Footer ── */}
      <footer
        className="relative z-10 text-center py-4 text-xs tracking-widest uppercase"
        style={{ color: '#334155' }}
      >
        © 2026 SPAWN 2 Clinical Data Platform &nbsp;·&nbsp; All protocols confirmed
      </footer>

      {/* Ticker keyframe */}
      <style>{`
        @keyframes ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
