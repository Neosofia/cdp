import AppFooter from '@/components/AppFooter';
import SplashPageHeader, { SplashLoginButton } from '@/components/SplashPageHeader';
import StarField from '@/components/StarField';
import { beginLogin } from '@/lib/auth';
import { useUiTheme } from '@/lib/uiTheme';

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

function CorporateSplashPage() {
  return (
    <div className="flex h-dvh min-h-0 w-full flex-col bg-slate-50 text-slate-900">
      <SplashPageHeader trailing={<SplashLoginButton isCorporate />} />

      <main className="flex w-full flex-1 flex-col items-center justify-center px-6 py-12 text-center md:px-10">
        <p className="mb-4 text-sm font-medium uppercase tracking-widest text-slate-500">
          Post-operative care, simplified
        </p>
        <h1 className="max-w-3xl text-4xl font-semibold leading-tight text-slate-900 md:text-5xl">
          Neosofia Clinical Care Platform
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-600 md:text-lg">
          Patients recover at home with clear guidance when symptoms change. Clinicians start each
          shift with who needs attention first—not another inbox to dig through.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <SplashLoginButton isCorporate />
          <span className="text-xs uppercase tracking-widest text-slate-500">
            Authorized users only
          </span>
        </div>

        <div className="mt-14 grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            {
              title: 'For patients',
              body: 'Ask questions, get practical next steps, and know when to call your care team—tied to your procedure, not a generic chatbot.',
            },
            {
              title: 'For clinicians',
              body: 'Your active panel ranked by risk and open sessions, so the chart that matters is one click away.',
            },
            {
              title: 'One workspace',
              body: 'Conversation, records, and risk summaries side by side—no tab-hopping to understand what happened.',
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-lg border border-slate-200 bg-white px-4 py-5 text-left shadow-sm"
            >
              <h2 className="text-sm font-semibold text-slate-900">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.body}</p>
            </div>
          ))}
        </div>
      </main>

      <AppFooter className="border-t border-slate-200 bg-white" fullWidth />
    </div>
  );
}

function SpawnSplashPage() {
  const tickerText = (TICKER_ITEMS.join('  ') + '  ').repeat(4);

  return (
    <div
      className="flex h-dvh min-h-0 w-full flex-col overflow-hidden"
      style={{ background: '#05050f', fontFamily: "'Inter', sans-serif" }}
    >
      <div className="fixed inset-0 pointer-events-none z-0">
        <StarField />
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(124,58,237,0.18) 0%, rgba(6,182,212,0.08) 50%, transparent 80%)',
          }}
        />
      </div>

      <SplashPageHeader trailing={<SplashLoginButton isCorporate={false} />} />

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-8 text-center md:px-10 md:py-12">
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

        <p
          className="text-base md:text-lg font-semibold tracking-widest uppercase mb-4"
          style={{ color: '#94a3b8' }}
        >
          They said it couldn&apos;t be done. We disagreed.
        </p>

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

        <p className="mt-6 max-w-xl text-base md:text-lg text-slate-400 leading-relaxed">
          Born from hellspawn. Cleared by the IRB. Clinical data management so good it came back from
          the dead — and passed FDA approval.
        </p>

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

        <div className="mt-12 flex flex-col sm:flex-row items-center gap-4">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              beginLogin();
            }}
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

      <AppFooter className="relative z-10" tagline="All protocols confirmed" fullWidth />

      <style>{`
        @keyframes ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

export default function SplashPage() {
  const { isCorporate } = useUiTheme();
  return isCorporate ? <CorporateSplashPage /> : <SpawnSplashPage />;
}
