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
  return (
    <div className="flex items-start gap-3 py-3" style={{ borderBottom: '1px solid rgba(34,211,238,0.08)' }}>
      <div
        className="rounded-lg p-2 shrink-0"
        style={{ background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.15)' }}
      >
        <Icon className="h-4 w-4" style={{ color: '#22d3ee' }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{label}</p>
        <p className="text-sm text-slate-100 mt-0.5 wrap-break-word">{value}</p>
      </div>
    </div>
  );
}

const CARD_STYLE = {
  background: 'rgba(5,5,15,0.7)',
  border: '1px solid rgba(34,211,238,0.14)',
  boxShadow: '0 0 30px rgba(34,211,238,0.04)',
};

const TYPE_BADGE: Record<string, React.CSSProperties> = {
  Lab: { borderColor: 'rgba(34,211,238,0.4)', color: '#22d3ee', background: 'rgba(34,211,238,0.08)' },
  Visit: { borderColor: 'rgba(168,85,247,0.4)', color: '#a855f7', background: 'rgba(168,85,247,0.08)' },
  Rx: { borderColor: 'rgba(34,197,94,0.4)', color: '#22c55e', background: 'rgba(34,197,94,0.08)' },
  Imaging: { borderColor: 'rgba(234,179,8,0.4)', color: '#eab308', background: 'rgba(234,179,8,0.08)' },
  Procedure: { borderColor: 'rgba(239,68,68,0.4)', color: '#ef4444', background: 'rgba(239,68,68,0.08)' },
  Allergy: { borderColor: 'rgba(251,146,60,0.4)', color: '#fb923c', background: 'rgba(251,146,60,0.08)' },
};

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
  const fullName = `${firstName} ${lastName}`.trim() || 'Patient';
  const [records, setRecords] = useState<CareEpisodeRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [messages, setMessages] = useState<CareEpisodeInboxMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [markingReadId, setMarkingReadId] = useState<string | null>(null);
  const nowMs = useMemo(() => Date.now(), []);

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
        <Card className="gap-0 py-0" style={CARD_STYLE}>
          <CardHeader
            className="py-4 px-5"
            style={{ borderBottom: '1px solid rgba(34,211,238,0.1)', background: 'rgba(34,211,238,0.02)' }}
          >
            <CardTitle className="text-lg flex items-center gap-3 text-white">
              <UserCircleIcon className="h-6 w-6" style={{ color: '#22d3ee' }} />
              Your profile
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-2">
            <div className="flex items-center gap-3 mb-4">
              <Badge
                variant="outline"
                className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ borderColor: 'rgba(34,211,238,0.4)', color: '#22d3ee', background: 'rgba(34,211,238,0.08)' }}
              >
                Patient
              </Badge>
              <span className="text-xs text-slate-500">Account information from your care organization</span>
            </div>
            <ProfileField label="Full name" value={fullName} icon={UserCircleIcon} />
            <ProfileField label="Email" value={email || 'Not provided'} icon={EnvelopeIcon} />
            <ProfileField label="Organization" value={tenantName} icon={BuildingOfficeIcon} />
            {displayCode ? (
              <ProfileField label="Patient ID" value={displayCode} icon={IdentificationIcon} />
            ) : null}
          </CardContent>
        </Card>

        <Card className="gap-0 py-0" style={CARD_STYLE}>
          <CardHeader
            className="py-4 px-5 flex flex-row items-center justify-between gap-3"
            style={{ borderBottom: '1px solid rgba(34,211,238,0.1)', background: 'rgba(34,211,238,0.02)' }}
          >
            <CardTitle className="text-lg flex items-center gap-3 text-white">
              <InboxIcon className="h-6 w-6" style={{ color: '#22d3ee' }} />
              Messages
            </CardTitle>
            {unreadCount > 0 ? (
              <Badge
                variant="outline"
                className="text-[10px] font-semibold uppercase tracking-wider shrink-0"
                style={{ borderColor: 'rgba(34,211,238,0.4)', color: '#22d3ee', background: 'rgba(34,211,238,0.08)' }}
              >
                {unreadCount} unread
              </Badge>
            ) : null}
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-2">
            {loadingMessages ? (
              <p className="text-sm text-slate-500 py-2">Loading messages…</p>
            ) : messages.length === 0 ? (
              <p className="text-sm text-slate-500 py-2">No messages from your care team.</p>
            ) : (
              <ul className="divide-y divide-cyan-500/10">
                {messages.map(message => {
                  const isUnread = !message.read_at;
                  return (
                    <li
                      key={message.id}
                      className="py-4"
                      style={
                        isUnread
                          ? { background: 'rgba(34,211,238,0.03)', margin: '0 -0.25rem', padding: '1rem 0.25rem', borderRadius: '0.5rem' }
                          : undefined
                      }
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium text-slate-100">{message.sender_display_name}</p>
                            {isUnread ? (
                              <Badge
                                variant="outline"
                                className="text-[10px] font-semibold uppercase"
                                style={{
                                  borderColor: 'rgba(34,211,238,0.4)',
                                  color: '#22d3ee',
                                  background: 'rgba(34,211,238,0.08)',
                                }}
                              >
                                Unread
                              </Badge>
                            ) : null}
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            {formatMessageSent(message.sent_at)}
                            <span className="text-slate-600"> · </span>
                            {formatRelativeActivity(message.sent_at, nowMs)}
                          </p>
                          <p className="text-sm text-slate-300 mt-2 leading-relaxed whitespace-pre-wrap">
                            {message.body}
                          </p>
                        </div>
                      </div>
                      {isUnread ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-3 text-cyan-300"
                          style={{ borderColor: 'rgba(34,211,238,0.3)', background: 'rgba(34,211,238,0.05)' }}
                          disabled={markingReadId === message.id}
                          onClick={() => void handleMarkRead(message.id)}
                        >
                          {markingReadId === message.id ? 'Marking…' : 'Mark as read'}
                        </Button>
                      ) : (
                        <p className="text-xs text-slate-600 mt-2">
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

      <Card className="gap-0 py-0 h-full flex flex-col min-w-0" style={CARD_STYLE}>
        <CardHeader
          className="py-4 px-5 flex flex-row items-center justify-between gap-3 shrink-0"
          style={{ borderBottom: '1px solid rgba(34,211,238,0.1)', background: 'rgba(34,211,238,0.02)' }}
        >
          <CardTitle className="text-lg flex items-center gap-3 text-white">
            <DocumentTextIcon className="h-6 w-6" style={{ color: '#22d3ee' }} />
            Health records
          </CardTitle>
          {onViewAllRecords ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-cyan-300 shrink-0"
              style={{ borderColor: 'rgba(34,211,238,0.3)', background: 'rgba(34,211,238,0.05)' }}
              onClick={onViewAllRecords}
            >
              View all records
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="px-5 pb-5 pt-2 flex-1">
          {loadingRecords ? (
            <p className="text-sm text-slate-500 py-2">Loading health records…</p>
          ) : sortedRecords.length === 0 ? (
            <p className="text-sm text-slate-500 py-2">No health records on file yet.</p>
          ) : (
            <ul className="divide-y divide-cyan-500/10">
              {sortedRecords.map(record => (
                <li key={record.id} className="py-4 flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-100 leading-snug">{record.title}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {formatRecordDate(record.date)} · {record.provider}
                    </p>
                    <p className="text-sm text-slate-400 mt-2 leading-relaxed">{record.summary}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-semibold shrink-0 mt-0.5"
                    style={TYPE_BADGE[record.type] ?? TYPE_BADGE.Lab}
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
