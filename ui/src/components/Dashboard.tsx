import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ACTIVE_PATIENT_SESSIONS,
  activePatientBySessionId,
  PATIENT_ID_BY_DISPLAY_NAME,
} from '@/lib/clinicianDemoData';
import {
  UserGroupIcon,
  ClipboardDocumentListIcon,
  ChatBubbleLeftRightIcon,
  ExclamationTriangleIcon,
  ServerIcon,
  ShieldCheckIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  BellIcon,
  ArrowTrendingUpIcon,
  CpuChipIcon,
} from '@heroicons/react/24/outline';

interface DashboardProps {
  activeActor: string;
  firstName?: string;
  onPatientStartChat?: () => void;
  onPatientReviewRecords?: () => void;
  onClinicianOpenPatients?: (patientId?: string | null) => void;
}

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accent?: 'cyan' | 'purple' | 'green' | 'yellow' | 'red';
  onClick?: () => void;
}

const ACCENT: Record<NonNullable<StatCardProps['accent']>, { border: string; icon: string; glow: string }> = {
  cyan:   { border: 'rgba(34,211,238,0.25)',  icon: '#22d3ee', glow: 'rgba(34,211,238,0.06)' },
  purple: { border: 'rgba(168,85,247,0.25)',  icon: '#a855f7', glow: 'rgba(168,85,247,0.06)' },
  green:  { border: 'rgba(34,197,94,0.25)',   icon: '#22c55e', glow: 'rgba(34,197,94,0.06)'  },
  yellow: { border: 'rgba(234,179,8,0.25)',   icon: '#eab308', glow: 'rgba(234,179,8,0.06)'  },
  red:    { border: 'rgba(239,68,68,0.25)',   icon: '#ef4444', glow: 'rgba(239,68,68,0.06)'  },
};

function StatCard({ label, value, sub, icon: Icon, accent = 'cyan', onClick }: StatCardProps) {
  const a = ACCENT[accent];
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`rounded-xl p-4 flex items-start gap-4 w-full text-left ${onClick ? 'cursor-pointer transition-colors hover:brightness-110' : ''}`}
      style={{ background: a.glow, border: `1px solid ${a.border}` }}
    >
      <div
        className="rounded-lg p-2 shrink-0"
        style={{ background: `${a.glow}`, border: `1px solid ${a.border}` }}
      >
        <Icon className="h-5 w-5" style={{ color: a.icon }} />
      </div>
      <div>
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-sm text-slate-400">{label}</div>
        {sub && <div className="text-xs mt-0.5" style={{ color: a.icon }}>{sub}</div>}
      </div>
    </Tag>
  );
}

interface ListItemProps {
  primary: string;
  secondary: string;
  badge?: { label: string; color: 'green' | 'yellow' | 'red' | 'cyan' | 'purple' };
  meta?: string;
  onClick?: () => void;
}

const BADGE_STYLE: Record<NonNullable<ListItemProps['badge']>['color'], React.CSSProperties> = {
  green:  { borderColor: 'rgba(34,197,94,0.4)',  color: '#22c55e', background: 'rgba(34,197,94,0.08)'  },
  yellow: { borderColor: 'rgba(234,179,8,0.4)',  color: '#eab308', background: 'rgba(234,179,8,0.08)'  },
  red:    { borderColor: 'rgba(239,68,68,0.4)',  color: '#ef4444', background: 'rgba(239,68,68,0.08)'  },
  cyan:   { borderColor: 'rgba(34,211,238,0.4)', color: '#22d3ee', background: 'rgba(34,211,238,0.08)' },
  purple: { borderColor: 'rgba(168,85,247,0.4)', color: '#a855f7', background: 'rgba(168,85,247,0.08)' },
};

function ListItem({ primary, secondary, badge, meta, onClick }: ListItemProps) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`flex items-center justify-between py-3 px-4 rounded-lg w-full text-left ${onClick ? 'cursor-pointer hover:bg-cyan-500/5 transition-colors' : ''}`}
      style={{ borderBottom: '1px solid rgba(34,211,238,0.06)' }}
    >
      <div>
        <div className="text-sm font-medium text-slate-100">{primary}</div>
        <div className="text-xs text-slate-500 mt-0.5">{secondary}</div>
      </div>
      <div className="flex items-center gap-3">
        {meta && <span className="text-xs text-slate-500">{meta}</span>}
        {badge && (
          <Badge variant="outline" className="text-[10px] font-semibold" style={BADGE_STYLE[badge.color]}>
            {badge.label}
          </Badge>
        )}
      </div>
    </Tag>
  );
}

function SectionCard({
  title,
  icon: Icon,
  children,
  onTitleClick,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  onTitleClick?: () => void;
}) {
  return (
    <Card
      className="gap-0 py-0"
      style={{ background: 'rgba(5,5,15,0.7)', border: '1px solid rgba(34,211,238,0.14)', boxShadow: '0 0 30px rgba(34,211,238,0.04)' }}
    >
      <CardHeader
        className="py-3 px-4"
        style={{ borderBottom: '1px solid rgba(34,211,238,0.1)', background: 'rgba(34,211,238,0.02)' }}
      >
        <CardTitle className="text-sm font-semibold flex items-center gap-2 uppercase tracking-wider" style={{ color: 'rgba(34,211,238,0.7)' }}>
          <Icon className="h-4 w-4" />
          {onTitleClick ? (
            <button type="button" onClick={onTitleClick} className="hover:text-cyan-300 transition-colors">
              {title}
            </button>
          ) : (
            title
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Demo banner
// ---------------------------------------------------------------------------

function DemoBanner() {
  return (
    <div
      className="rounded-xl px-4 py-2.5 mb-6 flex items-center gap-2 text-sm"
      style={{ background: 'rgba(168,85,247,0.07)', border: '1px solid rgba(168,85,247,0.2)', color: 'rgba(168,85,247,0.85)' }}
    >
      <ExclamationTriangleIcon className="h-4 w-4 shrink-0" />
      <span>
        <strong>Demo mode</strong> — all data shown below is synthetic. Switch roles via the profile menu to explore different views.
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Clinician dashboard
// ---------------------------------------------------------------------------

function ClinicianDashboard({ onOpenPatients }: { onOpenPatients?: (patientId?: string | null) => void }) {
  const openList = () => onOpenPatients?.(null);
  const openPatient = (name: string) => {
    const id = PATIENT_ID_BY_DISPLAY_NAME[name];
    if (id) onOpenPatients?.(id);
  };

  const dashboardPatients = ACTIVE_PATIENT_SESSIONS.map(p => ({
    name: p.displayName,
    secondary: `${p.surgery} · Day ${p.daysPostOp} post-op`,
    meta: p.lastActivity,
    risk: p.featured ? 'High' as const : 'Medium' as const,
    riskColor: (p.featured ? 'red' : 'yellow') as 'red' | 'yellow',
  }));

  const sessions = [
    { id: 'S-7291', patient: 'Alice Hartley',  started: '09:14',  status: 'Active',   sc: 'cyan'   as const },
    { id: 'S-7288', patient: 'Marcus Delgado', started: '07:45',  status: 'Active',   sc: 'cyan'   as const },
    { id: 'S-7285', patient: 'Priya Nair',     started: '08:02',  status: 'Active',   sc: 'cyan'   as const },
    { id: 'S-7294', patient: 'Jordan Kim',     started: '07:10',  status: 'Active',   sc: 'cyan'   as const },
  ];

  return (
    <>
      <DemoBanner />

      {/* Stat row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Active patients" value={12} sub="+2 this week" icon={UserGroupIcon} accent="cyan" onClick={openList} />
        <StatCard label="Pending reviews" value={3} sub="Oldest: 6 hrs" icon={ClipboardDocumentListIcon} accent="yellow" />
        <StatCard label="Sessions today" value={7} sub="2 still open" icon={ChatBubbleLeftRightIcon} accent="purple" onClick={openList} />
        <StatCard label="High-risk alerts" value={1} sub="Immediate review" icon={ExclamationTriangleIcon} accent="red" onClick={() => openPatient('Alice Hartley')} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <SectionCard title="Active patients" icon={UserGroupIcon} onTitleClick={openList}>
          {dashboardPatients.map(p => (
            <ListItem
              key={p.name}
              primary={p.name}
              secondary={p.secondary}
              badge={{ label: `${p.risk} risk`, color: p.riskColor }}
              meta={p.meta}
              onClick={() => openPatient(p.name)}
            />
          ))}
        </SectionCard>

        <SectionCard title="Recent chat sessions" icon={ChatBubbleLeftRightIcon} onTitleClick={openList}>
          {sessions.map(s => (
            <ListItem
              key={s.id}
              primary={`Session ${s.id}`}
              secondary={s.patient}
              badge={{ label: s.status, color: s.sc }}
              meta={s.started}
              onClick={() => {
                const active = activePatientBySessionId(s.id);
                if (active) onOpenPatients?.(active.patientId);
                else openPatient(s.patient);
              }}
            />
          ))}
          <div className="px-4 py-3">
            <p className="text-xs text-slate-600">
              AI risk model: <span className="text-slate-400">AWS Bedrock — Claude 3 Haiku (demo)</span>
            </p>
          </div>
        </SectionCard>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Admin dashboard
// ---------------------------------------------------------------------------

const SERVICE_HEALTH = [
  { name: 'authentication',  slug: 'authentication',  status: 'Healthy', uptime: '99.98%', version: 'v2.4.1', sc: 'green'  as const },
  { name: 'authorization',   slug: 'authorization',   status: 'Healthy', uptime: '99.95%', version: 'v1.2.0', sc: 'green'  as const },
  { name: 'capabilities',    slug: 'capabilities',    status: 'Healthy', uptime: '100%',   version: 'v1.1.3', sc: 'green'  as const },
  { name: 'notification',    slug: 'notification',    status: 'Degraded',uptime: '98.12%', version: 'v1.0.9', sc: 'yellow' as const },
  { name: 'template',        slug: 'template',        status: 'Healthy', uptime: '99.99%', version: 'v1.3.2', sc: 'green'  as const },
  { name: 'patient-chat',    slug: 'patient-chat',    status: 'Planned', uptime: '—',      version: 'TBD',    sc: 'cyan'   as const },
];

const AUDIT_EVENTS = [
  { actor: 'ben@neosofia.tech',     action: 'Rotated service credential',  target: 'template',     time: '5 min ago',  level: 'info'    as const },
  { actor: 'alice@healthsystem.io', action: 'Logged in',                   target: 'authentication', time: '12 min ago', level: 'info'   as const },
  { actor: 'system',                action: 'Token refresh',               target: 'authorization', time: '18 min ago', level: 'info'    as const },
  { actor: 'ben@neosofia.tech',     action: 'Added service',               target: 'capabilities',  time: '2 hrs ago',  level: 'info'    as const },
  { actor: 'unknown',               action: 'Failed login attempt (×3)',   target: 'authentication', time: '4 hrs ago',  level: 'warning' as const },
];

const LEVEL_COLOR = {
  info:    'green'  as const,
  warning: 'yellow' as const,
  error:   'red'    as const,
};

function AdminDashboard() {
  return (
    <>
      <DemoBanner />

      {/* Stat row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Registered users"   value={247}     sub="+12 this month"  icon={UserGroupIcon}      accent="cyan"   />
        <StatCard label="Active services"     value="5 / 6"  sub="1 degraded"      icon={ServerIcon}         accent="yellow" />
        <StatCard label="Platform uptime"     value="99.9%"  sub="Last 30 days"    icon={ArrowTrendingUpIcon} accent="green" />
        <StatCard label="Pending audits"      value={2}      sub="Requires review" icon={ShieldCheckIcon}    accent="purple" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Service health */}
        <SectionCard title="Service health" icon={CpuChipIcon}>
          {SERVICE_HEALTH.map(s => (
            <ListItem
              key={s.slug}
              primary={s.name}
              secondary={`Uptime ${s.uptime} · ${s.version}`}
              badge={{ label: s.status, color: s.sc }}
            />
          ))}
        </SectionCard>

        {/* Audit events */}
        <SectionCard title="Recent audit events" icon={ClipboardDocumentListIcon}>
          {AUDIT_EVENTS.map((e, i) => (
            <ListItem
              key={i}
              primary={e.action}
              secondary={`${e.actor} → ${e.target}`}
              badge={{ label: e.level, color: LEVEL_COLOR[e.level] }}
              meta={e.time}
            />
          ))}
          <div className="px-4 py-3">
            <p className="text-xs text-slate-600">
              Full audit history available in <span className="text-slate-400">Admin → Services</span>
            </p>
          </div>
        </SectionCard>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Patient dashboard
// ---------------------------------------------------------------------------

function PatientDashboard({
  firstName,
  onStartChat,
  onReviewRecords,
}: {
  firstName?: string;
  onStartChat?: () => void;
  onReviewRecords?: () => void;
}) {
  const appointments = [
    { with: 'Dr. Sarah Chen',       specialty: 'Primary Care',    date: 'Jun 27, 10:30 AM', status: 'Confirmed', sc: 'green'  as const },
    { with: 'Dr. Marcus Webb',      specialty: 'Cardiology',      date: 'Jul 3, 2:00 PM',   status: 'Pending',   sc: 'yellow' as const },
    { with: 'Dr. Priya Nair',       specialty: 'Endocrinology',   date: 'Jul 18, 9:00 AM',  status: 'Confirmed', sc: 'green'  as const },
  ];

  const messages = [
    { from: 'Dr. Sarah Chen',  preview: 'Your latest lab results look good. I recommend…', time: '1 hr ago',  unread: true  },
    { from: 'Care Coordinator', preview: 'Reminder: please complete your pre-visit questionnaire', time: '3 hrs ago', unread: true  },
    { from: 'Dr. Marcus Webb', preview: 'Referral to cardiology has been submitted.',       time: 'Yesterday', unread: false },
  ];

  const records = [
    { title: 'Lab Results — Complete Metabolic Panel', date: 'Jun 22, 2026', type: 'Lab',        tc: 'cyan'   as const },
    { title: 'Visit Summary — Primary Care',           date: 'Jun 15, 2026', type: 'Visit',      tc: 'purple' as const },
    { title: 'Prescription — Metformin 500 mg',        date: 'Jun 15, 2026', type: 'Rx',         tc: 'green'  as const },
    { title: 'Imaging — Chest X-Ray',                  date: 'May 31, 2026', type: 'Imaging',    tc: 'yellow' as const },
  ];

  return (
    <>
      <DemoBanner />

      {/* Welcome */}
      <div className="mb-6 rounded-xl px-5 py-4" style={{ background: 'rgba(34,211,238,0.04)', border: '1px solid rgba(34,211,238,0.12)' }}>
        <p className="text-slate-300 text-sm">
          Welcome back{firstName ? `, ${firstName}` : ''}. Your next appointment is in <strong className="text-white">2 days</strong>.
        </p>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Next appointment"  value="Jun 27"  sub="Dr. Sarah Chen"  icon={CalendarDaysIcon}          accent="cyan"   />
        <StatCard label="Unread messages" value={2} sub="2 clinicians" icon={ChatBubbleLeftRightIcon} accent="yellow" onClick={onStartChat} />
        <StatCard label="Health records" value={14} sub="Last: Jun 22" icon={DocumentTextIcon} accent="purple" onClick={onReviewRecords} />
        <StatCard label="Active prescriptions" value={3}    sub="Next refill: Jul 2" icon={ClipboardDocumentListIcon} accent="green" />
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Upcoming appointments */}
        <SectionCard title="Upcoming appointments" icon={CalendarDaysIcon}>
          {appointments.map(a => (
            <ListItem
              key={a.date}
              primary={a.with}
              secondary={`${a.specialty} · ${a.date}`}
              badge={{ label: a.status, color: a.sc }}
            />
          ))}
        </SectionCard>

        {/* Messages */}
        <SectionCard title="Messages" icon={BellIcon} onTitleClick={onStartChat}>
          {messages.map((m, i) => (
            <ListItem
              key={i}
              primary={m.from}
              secondary={m.preview}
              badge={m.unread ? { label: 'Unread', color: 'cyan' } : undefined}
              meta={m.time}
              onClick={onStartChat}
            />
          ))}
        </SectionCard>
      </div>

      <SectionCard title="Recent health records" icon={DocumentTextIcon} onTitleClick={onReviewRecords}>
        {records.map((r, i) => (
          <ListItem
            key={i}
            primary={r.title}
            secondary={r.date}
            badge={{ label: r.type, color: r.tc }}
            onClick={onReviewRecords}
          />
        ))}
      </SectionCard>
    </>
  );
}

// ---------------------------------------------------------------------------
// No-role fallback
// ---------------------------------------------------------------------------

function NoRoleDashboard() {
  return (
    <div
      className="rounded-xl p-8 text-center"
      style={{ background: 'rgba(34,211,238,0.03)', border: '1px solid rgba(34,211,238,0.12)' }}
    >
      <ShieldCheckIcon className="h-10 w-10 mx-auto mb-3" style={{ color: 'rgba(34,211,238,0.4)' }} />
      <p className="text-slate-400 text-sm">
        No active role selected. Use the <strong className="text-white">profile menu</strong> to choose a role and see your dashboard.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root export
// ---------------------------------------------------------------------------

export default function Dashboard({
  activeActor,
  firstName,
  onPatientStartChat,
  onPatientReviewRecords,
  onClinicianOpenPatients,
}: DashboardProps) {
  const role = activeActor.toLowerCase();

  if (role === 'clinician') return <ClinicianDashboard onOpenPatients={onClinicianOpenPatients} />;
  if (role === 'operator')  return <AdminDashboard />;
  if (role === 'patient') {
    return (
      <PatientDashboard
        firstName={firstName}
        onStartChat={onPatientStartChat}
        onReviewRecords={onPatientReviewRecords}
      />
    );
  }
  return <NoRoleDashboard />;
}
