import { useEffect, useMemo, useState } from 'react';
import {
  BellIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

import { formatRelativeActivity } from '@/shared/core/formatRelativeActivity';
import {
  DashboardListItem,
  DashboardSectionCard,
  DashboardStatCard,
  DemoBanner,
} from '@/shared/dashboard/Dashboard';
import {
  listCareEpisodeAppointments,
  listCareEpisodeInboxMessages,
  listCareEpisodeRecords,
  type CareEpisodeAppointment,
  type CareEpisodeInboxMessage,
  type CareEpisodeRecord,
} from '@/shared/care-episode/careEpisodeApi';
import { useUiTheme } from '@/shared/core/uiTheme';
import { cn } from '@/shared/core/utils';
import {
  appointmentStatusColor,
  daysUntil,
  formatAppointmentWhen,
  formatRecordDate,
  previewText,
  RECORD_TYPE_COLOR,
} from '@/features/patient/lib/patientDashboardFormatters';

export interface PatientDashboardProps {
  firstName?: string;
  token?: string;
  activeActor: string;
  patientUuid?: string;
  demoSeedVersion?: number;
  demoSeeding?: boolean;
  onGoToProfile?: () => void;
}

export default function PatientDashboard({
  firstName,
  token,
  activeActor,
  patientUuid,
  demoSeedVersion = 0,
  demoSeeding = false,
  onGoToProfile,
}: PatientDashboardProps) {
  const { isCorporate } = useUiTheme();
  const [appointments, setAppointments] = useState<CareEpisodeAppointment[]>([]);
  const [messages, setMessages] = useState<CareEpisodeInboxMessage[]>([]);
  const [records, setRecords] = useState<CareEpisodeRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!token || !patientUuid || demoSeeding) {
      if (!demoSeeding) {
        setAppointments([]);
        setMessages([]);
        setRecords([]);
      }
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [appts, inbox, recs] = await Promise.all([
          listCareEpisodeAppointments(token, activeActor, patientUuid),
          listCareEpisodeInboxMessages(token, activeActor, patientUuid),
          listCareEpisodeRecords(token, activeActor, patientUuid),
        ]);
        if (cancelled) return;
        setAppointments(appts);
        setMessages(inbox);
        setRecords(recs);
        setNowMs(Date.now());
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [token, activeActor, patientUuid, demoSeedVersion, demoSeeding]);

  const upcoming = useMemo(
    () =>
      [...appointments]
        .filter((appointment) => Date.parse(appointment.scheduled_at) >= nowMs - 60 * 60 * 1000)
        .sort((a, b) => Date.parse(a.scheduled_at) - Date.parse(b.scheduled_at)),
    [appointments, nowMs],
  );

  const nextAppointment = upcoming[0] ?? null;
  const unreadCount = messages.filter((message) => !message.read_at).length;
  const recentRecords = useMemo(
    () => [...records].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4),
    [records],
  );
  const rxCount = records.filter((record) => record.type === 'Rx').length;
  const lastRecord = records.length
    ? [...records].sort((a, b) => b.date.localeCompare(a.date))[0]
    : null;

  const welcomeDays = nextAppointment ? daysUntil(nextAppointment.scheduled_at, nowMs) : null;

  return (
    <>
      <DemoBanner />

      <div
        className={cn(
          'mb-6 rounded-xl px-5 py-4',
          isCorporate && 'border border-slate-300 bg-slate-100',
        )}
        style={
          isCorporate
            ? undefined
            : {
                background: 'rgba(34,211,238,0.04)',
                border: '1px solid rgba(34,211,238,0.12)',
              }
        }
      >
        <p className={cn('text-sm', isCorporate ? 'text-slate-800' : 'text-slate-300')}>
          {demoSeeding || loading ? (
            <>Loading your care overview…</>
          ) : nextAppointment ? (
            <>
              Welcome back{firstName ? `, ${firstName}` : ''}. Your next appointment is in{' '}
              <strong className={isCorporate ? 'text-slate-950' : 'text-white'}>
                {welcomeDays === 0 ? 'less than a day' : `${welcomeDays} day${welcomeDays === 1 ? '' : 's'}`}
              </strong>
              .
            </>
          ) : (
            <>Welcome back{firstName ? `, ${firstName}` : ''}. No upcoming appointments are scheduled.</>
          )}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <DashboardStatCard
          label="Next appointment"
          value={
            nextAppointment
              ? new Date(nextAppointment.scheduled_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })
              : '—'
          }
          sub={nextAppointment?.clinician_display_name ?? 'None scheduled'}
          icon={CalendarDaysIcon}
          accent="cyan"
        />
        <DashboardStatCard
          label="Unread messages"
          value={unreadCount}
          sub={unreadCount === 1 ? '1 message' : `${unreadCount} messages`}
          icon={ChatBubbleLeftRightIcon}
          accent="yellow"
          onClick={onGoToProfile}
        />
        <DashboardStatCard
          label="Health records"
          value={records.length || '—'}
          sub={lastRecord ? `Last: ${formatRecordDate(lastRecord.date)}` : 'On your profile'}
          icon={DocumentTextIcon}
          accent="purple"
          onClick={onGoToProfile}
        />
        <DashboardStatCard
          label="Active prescriptions"
          value={rxCount || '—'}
          sub={rxCount ? 'From your record list' : 'None on file'}
          icon={ClipboardDocumentListIcon}
          accent="green"
          onClick={onGoToProfile}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <DashboardSectionCard title="Upcoming appointments" icon={CalendarDaysIcon}>
          {upcoming.length === 0 ? (
            <p className={cn('px-4 py-3 text-xs', isCorporate ? 'text-slate-700' : 'text-slate-500')}>
              No upcoming appointments.
            </p>
          ) : (
            upcoming.map((appointment) => (
              <DashboardListItem
                key={appointment.id}
                primary={appointment.clinician_display_name}
                secondary={`${appointment.specialty} · ${formatAppointmentWhen(appointment.scheduled_at)}`}
                badge={{ label: appointment.status, color: appointmentStatusColor(appointment.status) }}
              />
            ))
          )}
        </DashboardSectionCard>

        <DashboardSectionCard title="Messages" icon={BellIcon} onTitleClick={onGoToProfile}>
          {messages.length === 0 ? (
            <p className={cn('px-4 py-3 text-xs', isCorporate ? 'text-slate-700' : 'text-slate-500')}>
              No messages from your care team.
            </p>
          ) : (
            messages.map((message) => (
              <DashboardListItem
                key={message.id}
                primary={message.sender_display_name}
                secondary={previewText(message.body)}
                badge={!message.read_at ? { label: 'Unread', color: 'cyan' } : undefined}
                meta={formatRelativeActivity(message.sent_at, nowMs)}
                onClick={onGoToProfile}
              />
            ))
          )}
        </DashboardSectionCard>
      </div>

      <DashboardSectionCard title="Recent medical records" icon={DocumentTextIcon} onTitleClick={onGoToProfile}>
        {recentRecords.length === 0 ? (
          <p className={cn('px-4 py-3 text-xs', isCorporate ? 'text-slate-700' : 'text-slate-500')}>
            No records yet. View your profile for health records.
          </p>
        ) : (
          recentRecords.map((record) => (
            <DashboardListItem
              key={record.id}
              primary={record.title}
              secondary={formatRecordDate(record.date)}
              badge={{ label: record.type, color: RECORD_TYPE_COLOR[record.type] ?? 'cyan' }}
              onClick={onGoToProfile}
            />
          ))
        )}
      </DashboardSectionCard>
    </>
  );
}
