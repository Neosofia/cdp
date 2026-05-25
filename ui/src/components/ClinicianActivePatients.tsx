import { useState } from 'react';
import { useScrollToBottom } from '@/lib/useScrollToBottom';
import {
  ArrowLeftIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  SignalIcon,
} from '@heroicons/react/24/outline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import PatientRecordsPanel from '@/components/PatientRecordsPanel';
import { recordsForPatient, type MedicalRecord } from '@/lib/patientRecordsData';
import {
  ACTIVE_PATIENT_SESSIONS,
  transcriptForPatient,
  type ActivePatientSession,
} from '@/lib/clinicianDemoData';

const CARD_STYLE = {
  background: 'rgba(5,5,15,0.7)',
  border: '1px solid rgba(34,211,238,0.18)',
  boxShadow: '0 0 40px rgba(34,211,238,0.05)',
};

interface Props {
  selectedPatientId?: string | null;
  onSelectPatient: (patientId: string | null) => void;
}

function PatientList({ onSelect }: { onSelect: (id: string) => void }) {
  return (
    <Card className="gap-0 py-0 h-full min-h-0 flex flex-col overflow-hidden" style={CARD_STYLE}>
      <CardHeader
        className="py-4 shrink-0"
        style={{ borderBottom: '1px solid rgba(34,211,238,0.12)', background: 'rgba(34,211,238,0.03)' }}
      >
        <CardTitle className="text-lg flex items-center gap-2" style={{ color: '#22d3ee' }}>
          <UserGroupIcon className="h-5 w-5" />
          Patients
          <Badge
            variant="outline"
            className="ml-2 text-[10px] font-semibold"
            style={{ borderColor: 'rgba(34,211,238,0.4)', color: '#22d3ee', background: 'rgba(34,211,238,0.08)' }}
          >
            {ACTIVE_PATIENT_SESSIONS.length} active chats
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1 min-h-0 flex flex-col overflow-hidden">
        <p className="px-6 py-3 text-xs text-slate-500 border-b shrink-0" style={{ borderColor: 'rgba(34,211,238,0.08)' }}>
          Patients with open AI chat sessions. Select a row to supervise the live transcript and review records.
        </p>
        <ul className="divide-y flex-1 min-h-0 overflow-y-auto overscroll-y-contain" style={{ borderColor: 'rgba(34,211,238,0.08)' }}>
          {ACTIVE_PATIENT_SESSIONS.map(p => (
            <li key={p.patientId}>
              <button
                type="button"
                onClick={() => onSelect(p.patientId)}
                className="w-full text-left px-6 py-4 flex flex-wrap items-center gap-4 hover:bg-cyan-500/5 transition-colors"
              >
                <div className="flex-1 min-w-48">
                  <div className="font-mono text-sm font-semibold text-cyan-300">{p.patientId}</div>
                  <div className="text-sm text-slate-200 mt-0.5">{p.surgery}</div>
                </div>
                <div className="text-center min-w-20">
                  <div className="text-lg font-bold text-white">{p.daysPostOp}</div>
                  <div className="text-[10px] uppercase tracking-widest text-slate-500">days post-op</div>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <SignalIcon className="h-4 w-4 text-green-400" />
                  <span>{p.messageCount} msgs · {p.lastActivity}</span>
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px] shrink-0"
                  style={{ borderColor: 'rgba(34,197,94,0.4)', color: '#22c55e', background: 'rgba(34,197,94,0.08)' }}
                >
                  Active
                </Badge>
              </button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function TranscriptPanel({ patientId }: { patientId: string }) {
  const messages = transcriptForPatient(patientId);
  const lastMessageId = messages[messages.length - 1]?.id;
  const scrollRef = useScrollToBottom<HTMLDivElement>([patientId, messages.length, lastMessageId]);

  return (
    <Card className="gap-0 py-0 h-full min-h-0 flex flex-col overflow-hidden" style={CARD_STYLE}>
      <CardHeader
        className="py-3 shrink-0"
        style={{ borderBottom: '1px solid rgba(34,211,238,0.12)', background: 'rgba(34,211,238,0.03)' }}
      >
        <CardTitle className="text-sm flex items-center gap-2 uppercase tracking-wider" style={{ color: 'rgba(34,211,238,0.8)' }}>
          <ChatBubbleLeftRightIcon className="h-4 w-4" />
          Active chat · {messages.length} messages
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex flex-1 flex-col min-h-0 overflow-hidden">
        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-3 py-3 pb-6 space-y-3"
        >
          {messages.map(msg => (
            <div
              key={msg.id}
              className={cn('flex', msg.role === 'patient' ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[92%] rounded-xl px-3 py-2 text-xs leading-relaxed',
                  msg.role === 'patient' ? 'rounded-br-sm' : 'rounded-bl-sm',
                )}
                style={
                  msg.role === 'patient'
                    ? {
                        background: 'linear-gradient(135deg, rgba(34,211,238,0.2) 0%, rgba(168,85,247,0.2) 100%)',
                        border: '1px solid rgba(34,211,238,0.2)',
                        color: '#e2e8f0',
                      }
                    : {
                        background: 'rgba(15,23,42,0.85)',
                        border: '1px solid rgba(34,211,238,0.1)',
                        color: '#cbd5e1',
                      }
                }
              >
                <div className="text-[9px] uppercase tracking-widest mb-1 opacity-60">
                  {msg.role === 'patient' ? 'Patient' : 'Care assistant'} · {msg.time}
                </div>
                <span className="whitespace-pre-wrap">{msg.content}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function SessionDetail({
  patient,
  onBack,
}: {
  patient: ActivePatientSession;
  onBack: () => void;
}) {
  const patientRecords = recordsForPatient(patient.patientId);
  const defaultRecordId = patient.featured ? 'rec-xray-2847' : null;
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(defaultRecordId);

  const handleSelectRecord = (record: MedicalRecord | null) => {
    setSelectedRecordId(record?.id ?? null);
  };

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden gap-3">
      <Button
        type="button"
        variant="ghost"
        onClick={onBack}
        className="shrink-0 w-fit text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10"
      >
        <ArrowLeftIcon className="h-4 w-4 mr-1.5" />
        Back to list
      </Button>
      <div className="flex-1 min-h-0 grid lg:grid-cols-2 gap-4 overflow-hidden">
        <div className="min-h-0 h-full overflow-hidden">
          <TranscriptPanel patientId={patient.patientId} />
        </div>
        <div className="min-h-0 h-full overflow-hidden">
          <PatientRecordsPanel
            records={patientRecords}
            embedded
            selectedId={selectedRecordId}
            onSelectRecord={handleSelectRecord}
          />
        </div>
      </div>
    </div>
  );
}

export default function ClinicianActivePatients({ selectedPatientId, onSelectPatient }: Props) {
  const patient = selectedPatientId
    ? ACTIVE_PATIENT_SESSIONS.find(p => p.patientId === selectedPatientId)
    : null;

  if (patient) {
    return (
      <div className="h-full min-h-0 flex flex-col overflow-hidden">
        <SessionDetail patient={patient} onBack={() => onSelectPatient(null)} />
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden">
      <PatientList onSelect={onSelectPatient} />
    </div>
  );
}
