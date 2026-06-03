import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import PatientRecordsPanel from '@/components/PatientRecordsPanel';
import XrayScissorsDemo from '@/components/XrayScissorsDemo';
import { listCareEpisodeRecords, type CareEpisodeRecord } from '@/lib/careEpisodeApi';
import type { MedicalRecord } from '@/lib/patientRecordsData';

type RecordType = 'Lab' | 'Visit' | 'Rx' | 'Imaging' | 'Procedure' | 'Allergy';

const TYPE_BADGE: Record<RecordType, React.CSSProperties> = {
  Lab:       { borderColor: 'rgba(34,211,238,0.4)', color: '#22d3ee', background: 'rgba(34,211,238,0.08)' },
  Visit:     { borderColor: 'rgba(168,85,247,0.4)', color: '#a855f7', background: 'rgba(168,85,247,0.08)' },
  Rx:        { borderColor: 'rgba(34,197,94,0.4)',  color: '#22c55e', background: 'rgba(34,197,94,0.08)' },
  Imaging:   { borderColor: 'rgba(234,179,8,0.4)',  color: '#eab308', background: 'rgba(234,179,8,0.08)' },
  Procedure: { borderColor: 'rgba(239,68,68,0.4)',  color: '#ef4444', background: 'rgba(239,68,68,0.08)' },
  Allergy:   { borderColor: 'rgba(251,146,60,0.4)', color: '#fb923c', background: 'rgba(251,146,60,0.08)' },
};

function formatDate(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

interface Props {
  token: string;
  activeActor: string;
  patientUuid?: string;
}

export default function PatientRecords({ token, activeActor, patientUuid }: Props) {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [sheetRecord, setSheetRecord] = useState<MedicalRecord | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!patientUuid) {
      setRecords([]);
      setSheetRecord(null);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const remote = await listCareEpisodeRecords(token, activeActor, patientUuid);
      if (cancelled) return;
      setRecords((remote as CareEpisodeRecord[]).map(r => ({
        id: r.id,
        title: r.title,
        date: r.date,
        type: (r.type as RecordType),
        provider: r.provider,
        summary: r.summary,
        imageKey: r.imageKey as MedicalRecord['imageKey'],
      })));
      setLoading(false);
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [token, activeActor, patientUuid]);

  const helperText = useMemo(() => {
    if (!patientUuid) return 'No patient context available.';
    if (loading) return 'Loading records from care-episode service...';
    if (records.length === 0) return 'No records returned by care-episode service.';
    return null;
  }, [loading, patientUuid, records.length]);

  return (
    <>
      <div className="h-full min-h-0 flex flex-col overflow-hidden">
        {helperText && <p className="px-2 pb-2 text-xs text-slate-500">{helperText}</p>}
        <PatientRecordsPanel
          records={records}
          onSelectRecord={record => setSheetRecord(record)}
          selectedId={sheetRecord?.id ?? null}
        />
      </div>

      <Sheet open={sheetRecord !== null} onOpenChange={open => !open && setSheetRecord(null)}>
        <SheetContent
          className="w-full sm:max-w-lg text-slate-200 overflow-y-auto"
          style={{ background: '#05050f', borderLeft: '1px solid rgba(34,211,238,0.18)' }}
        >
          {sheetRecord && (
            <>
              <SheetHeader>
                <SheetTitle className="text-white text-left pr-8">{sheetRecord.title}</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4 text-sm">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" style={TYPE_BADGE[sheetRecord.type]}>{sheetRecord.type}</Badge>
                  <span className="text-slate-500">{formatDate(sheetRecord.date)}</span>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Provider</p>
                  <p className="text-slate-200">{sheetRecord.provider}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Summary</p>
                  <p className="text-slate-300 leading-relaxed">{sheetRecord.summary}</p>
                </div>
                {sheetRecord.imageKey === 'xray-scissors' && (
                  <div
                    className="rounded-lg overflow-hidden p-2"
                    style={{ background: '#0f172a', border: '1px solid rgba(34,211,238,0.15)' }}
                  >
                    <XrayScissorsDemo className="w-full h-auto" />
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
