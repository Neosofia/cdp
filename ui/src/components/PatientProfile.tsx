import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  UserCircleIcon,
  EnvelopeIcon,
  BuildingOfficeIcon,
  IdentificationIcon,
  DocumentTextIcon,
  InboxIcon,
} from '@heroicons/react/24/outline';
import {
  listCareEpisodeInboxMessages,
  listCareEpisodeRecords,
  markCareEpisodeInboxMessageRead,
  type CareEpisodeInboxMessage,
  type CareEpisodeRecord,
} from '@/lib/careEpisodeApi';
import { formatRelativeActivity } from '@/lib/demoPatients';
import { cn } from '@/lib/utils';
import { usePatientViewStyles } from '@/lib/patientViewStyles';

interface PatientProfileProps {
  firstName: string;
  lastName: string;
  email: string;
  tenantName: string;
  displayCode?: string | null;
  token?: string;
  activeActor?: string;
  patientUuid?: string;
  onViewAllRecords?: () => void;
}

function ProfileField({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
}) {
  const pv = usePatientViewStyles();

  return (
    <div
      className={cn('flex items-start gap-3 py-3', pv.isCorporate ? 'border-b border-slate-200' : '')}
      style={pv.isCorporate ? undefined : { borderBottom: '1px solid rgba(34,211,238,0.08)' }}
    >
      <div
        className={cn(
          'rounded-lg p-2 shrink-0',
          pv.isCorporate ? 'bg-slate-100 border border-slate-200' : '',
        )}
        style={
          pv.isCorporate
            ? undefined
            : { background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.15)' }
        }
      >
        <Icon className={cn('h-4 w-4', pv.isCorporate ? 'text-slate-700' : '')} style={pv.isCorporate ? undefined : { color: '#22d3ee' }} />
      </div>
      <div className="min-w-0">
        <p className={cn('text-xs font-semibold uppercase tracking-widest', pv.subText)}>{label}</p>
        <p className={cn('text-sm mt-0.5 wrap-break-word', pv.bodyText)}>{value}</p>
      </div>
    </div>
  );
}

function formatRecordDate(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatMessageSent(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function PatientProfile({
  firstName,
  lastName,
  email,
  tenantName,
  displayCode,
  token,
  activeActor = 'patient',
  patientUuid,
  onViewAllRecords,
}: PatientProfileProps) {
  const pv = usePatientViewStyles();
  const fullName = `${firstName} ${lastName}`.trim() || 'Patient';
  const [records, setRecords] = useState<CareEpisodeRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [messages, setMessages] = useState<CareEpisodeInboxMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [markingReadId, setMarkingReadId] = useState<string | null>(null);
  const nowMs = useMemo(() => Date.now(), []);

  const patientBadgeStyle = pv.isCorporate
    ? { borderColor: '#0e7490', color: '#164e63', background: '#cffafe' }
    : { borderColor: 'rgba(34,211,238,0.4)', color: '#22d3ee', background: 'rgba(34,211,238,0.08)' };

  useEffect(() => {
    if (!token || !patientUuid) {
      setRecords([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoadingRecords(true);
      const items = await listCareEpisodeRecords(token, activeActor, patientUuid);
      if (cancelled) return;
      setRecords(items);
      setLoadingRecords(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [token, activeActor, patientUuid]);

  useEffect(() => {
    if (!token || !patientUuid) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoadingMessages(true);
      const items = await listCareEpisodeInboxMessages(token, activeActor, patientUuid);
      if (cancelled) return;
      setMessages(items);
      setLoadingMessages(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [token, activeActor, patientUuid]);

  const sortedRecords = useMemo(
    () => [...records].sort((a, b) => b.date.localeCompare(a.date)),
    [records],
  );

  const unreadCount = messages.filter(m => !m.read_at).length;

  const handleMarkRead = useCallback(
    async (messageId: string) => {
      if (!token || !patientUuid) return;
      setMarkingReadId(messageId);
      try {
        const updated = await markCareEpisodeInboxMessageRead(token, activeActor, patientUuid, messageId);
        if (updated) {
          setMessages(prev => prev.map(m => (m.id === messageId ? updated : m)));
        }
      } finally {
        setMarkingReadId(null);
      }
    },
    [token, activeActor, patientUuid],
  );

  return (
    <div className="grid w-full gap-6 lg:grid-cols-[minmax(360px,480px)_minmax(0,1fr)] lg:items-start">
      <div className="flex flex-col gap-6 min-w-0">
        <Card className={cn('gap-0 py-0', pv.cardClass)} style={pv.cardStyle}>
          <CardHeader className={cn('py-4 px-5', pv.headerClass)} style={pv.headerStyle}>
            <CardTitle className={cn('text-lg flex items-center gap-3', pv.titleClass)} style={pv.titleStyle}>
              <UserCircleIcon className={cn('h-6 w-6', pv.isCorporate ? 'text-slate-700' : '')} />
              Your profile
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-2">
            <div className="flex items-center gap-3 mb-4">
              <Badge
                variant="outline"
                className="text-[10px] font-semibold uppercase tracking-wider"
                style={patientBadgeStyle}
              >
                Patient
              </Badge>
              <span className={cn('text-xs', pv.subText)}>Account information from your care organization</span>
            </div>
            <ProfileField label="Full name" value={fullName} icon={UserCircleIcon} />
            <ProfileField label="Email" value={email || 'Not provided'} icon={EnvelopeIcon} />
            <ProfileField label="Organization" value={tenantName} icon={BuildingOfficeIcon} />
            {displayCode ? (
              <ProfileField label="Patient ID" value={displayCode} icon={IdentificationIcon} />
            ) : null}
          </CardContent>
        </Card>

        <Card className={cn('gap-0 py-0', pv.cardClass)} style={pv.cardStyle}>
          <CardHeader
            className={cn('py-4 px-5 flex flex-row items-center justify-between gap-3', pv.headerClass)}
            style={pv.headerStyle}
          >
            <CardTitle className={cn('text-lg flex items-center gap-3', pv.titleClass)} style={pv.titleStyle}>
              <InboxIcon className={cn('h-6 w-6', pv.isCorporate ? 'text-slate-700' : '')} />
              Messages
            </CardTitle>
            {unreadCount > 0 ? (
              <Badge
                variant="outline"
                className="text-[10px] font-semibold uppercase tracking-wider shrink-0"
                style={patientBadgeStyle}
              >
                {unreadCount} unread
              </Badge>
            ) : null}
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-2">
            {loadingMessages ? (
              <p className={cn('text-sm py-2', pv.subText)}>Loading messages…</p>
            ) : messages.length === 0 ? (
              <p className={cn('text-sm py-2', pv.subText)}>No messages from your care team.</p>
            ) : (
              <ul className={cn('divide-y', pv.isCorporate ? 'divide-slate-200' : 'divide-cyan-500/10')}>
                {messages.map(message => {
                  const isUnread = !message.read_at;
                  return (
                    <li
                      key={message.id}
                      className="py-4"
                      style={
                        isUnread
                          ? pv.isCorporate
                            ? {
                                background: '#f8fafc',
                                margin: '0 -0.25rem',
                                padding: '1rem 0.25rem',
                                borderRadius: '0.5rem',
                              }
                            : {
                                background: 'rgba(34,211,238,0.03)',
                                margin: '0 -0.25rem',
                                padding: '1rem 0.25rem',
                                borderRadius: '0.5rem',
                              }
                          : undefined
                      }
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className={cn('text-sm font-medium', pv.bodyText)}>{message.sender_display_name}</p>
                            {isUnread ? (
                              <Badge
                                variant="outline"
                                className="text-[10px] font-semibold uppercase"
                                style={patientBadgeStyle}
                              >
                                Unread
                              </Badge>
                            ) : null}
                          </div>
                          <p className={cn('text-xs mt-1', pv.subText)}>
                            {formatMessageSent(message.sent_at)}
                            <span className={pv.isCorporate ? 'text-slate-400' : 'text-slate-600'}> · </span>
                            {formatRelativeActivity(message.sent_at, nowMs)}
                          </p>
                          <p className={cn('text-sm mt-2 leading-relaxed whitespace-pre-wrap', pv.isCorporate ? 'text-slate-700' : 'text-slate-300')}>
                            {message.body}
                          </p>
                        </div>
                      </div>
                      {isUnread ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className={cn('mt-3', pv.outlineButton)}
                          disabled={markingReadId === message.id}
                          onClick={() => void handleMarkRead(message.id)}
                        >
                          {markingReadId === message.id ? 'Marking…' : 'Mark as read'}
                        </Button>
                      ) : (
                        <p className={cn('text-xs mt-2', pv.isCorporate ? 'text-slate-500' : 'text-slate-600')}>
                          Read {formatMessageSent(message.read_at!)}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className={cn('gap-0 py-0 h-full flex flex-col min-w-0', pv.cardClass)} style={pv.cardStyle}>
        <CardHeader
          className={cn('py-4 px-5 flex flex-row items-center justify-between gap-3 shrink-0', pv.headerClass)}
          style={pv.headerStyle}
        >
          <CardTitle className={cn('text-lg flex items-center gap-3', pv.titleClass)} style={pv.titleStyle}>
            <DocumentTextIcon className={cn('h-6 w-6', pv.isCorporate ? 'text-slate-700' : '')} />
            Health records
          </CardTitle>
          {onViewAllRecords ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn('shrink-0', pv.outlineButton)}
              onClick={onViewAllRecords}
            >
              View all records
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="px-5 pb-5 pt-2 flex-1">
          {loadingRecords ? (
            <p className={cn('text-sm py-2', pv.subText)}>Loading health records…</p>
          ) : sortedRecords.length === 0 ? (
            <p className={cn('text-sm py-2', pv.subText)}>No health records on file yet.</p>
          ) : (
            <ul className={cn('divide-y', pv.isCorporate ? 'divide-slate-200' : 'divide-cyan-500/10')}>
              {sortedRecords.map(record => (
                <li key={record.id} className="py-4 flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-sm font-medium leading-snug', pv.bodyText)}>{record.title}</p>
                    <p className={cn('text-xs mt-1', pv.subText)}>
                      {formatRecordDate(record.date)} · {record.provider}
                    </p>
                    <p className={cn('text-sm mt-2 leading-relaxed', pv.mutedText)}>{record.summary}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-semibold shrink-0 mt-0.5"
                    style={pv.recordTypeBadge(record.type as 'Lab' | 'Visit' | 'Rx' | 'Imaging' | 'Procedure' | 'Allergy')}
                  >
                    {record.type}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
