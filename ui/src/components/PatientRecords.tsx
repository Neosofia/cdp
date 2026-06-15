import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import PatientRecordsPanel from '@/components/PatientRecordsPanel';
import XrayScissorsDemo from '@/components/XrayScissorsDemo';
import { usePatientViewStyles } from '@/lib/patientViewStyles';
import { listCareEpisodeRecords, type CareEpisodeRecord } from '@/lib/careEpisodeApi';
import type { MedicalRecord } from '@/lib/patientRecordsData';

type RecordType = 'Lab' | 'Visit' | 'Rx' | 'Imaging' | 'Procedure' | 'Allergy';

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
  const pv = usePatientViewStyles();
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
      <div>
        {helperText && <p className="px-2 pb-2 text-xs text-slate-500">{helperText}</p>}
        <PatientRecordsPanel
          records={records}
          onSelectRecord={record => setSheetRecord(record)}
          selectedId={sheetRecord?.id ?? null}
        />
      </div>

      <Sheet open={sheetRecord !== null} onOpenChange={open => !open && setSheetRecord(null)}>
        <SheetContent
          className={cn('w-full sm:max-w-lg overflow-y-auto', pv.sheetClass)}
          style={pv.sheetStyle}
        >
          {sheetRecord && (
            <>
              <SheetHeader>
                <SheetTitle className={cn('text-left pr-8', pv.isCorporate ? 'text-slate-900' : 'text-white')}>
                  {sheetRecord.title}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4 text-sm">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" style={pv.recordTypeBadge(sheetRecord.type)}>{sheetRecord.type}</Badge>
                  <span className={pv.subText}>{formatDate(sheetRecord.date)}</span>
                </div>
                <div>
                  <p className={cn('text-xs font-semibold uppercase tracking-widest mb-1', pv.subText)}>Provider</p>
                  <p className={pv.isCorporate ? 'text-slate-900' : 'text-slate-200'}>{sheetRecord.provider}</p>
                </div>
                <div>
                  <p className={cn('text-xs font-semibold uppercase tracking-widest mb-1', pv.subText)}>Summary</p>
                  <p className={cn('leading-relaxed', pv.isCorporate ? 'text-slate-700' : 'text-slate-300')}>
                    {sheetRecord.summary}
                  </p>
                </div>
                {sheetRecord.imageKey === 'xray-scissors' && (
                  <div className={cn('p-2', pv.imageFrameClass)} style={pv.imageFrameStyle}>
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
