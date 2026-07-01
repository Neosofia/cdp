import { useEffect, useState } from 'react';
import PatientRecordsPanel from '@/features/patient/components/PatientRecordsPanel';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { MedicalRecord } from '@/features/patient/lib/patientRecordsData';
import { listCareEpisodeRecords } from '@/shared/care-episode/careEpisodeApi';
import { usePatientViewStyles } from '@/shared/core/patientViewStyles';
import { cn } from '@/shared/core/utils';
import { toUserFacingError } from '@/shared/core/userFacingError';

export default function PatientMedicalRecordsSheet({
  open,
  onOpenChange,
  token,
  activeActor,
  patientUuid,
  defaultRiskLevel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  activeActor: string;
  patientUuid: string;
  defaultRiskLevel?: 'High' | 'Medium' | 'Low';
}) {
  const pv = usePatientViewStyles();
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setRecords([]);
    setSelectedRecordId(null);

    const loadRecords = async () => {
      try {
        const remoteRecords = await listCareEpisodeRecords(token, activeActor, patientUuid);
        if (cancelled) return;
        if (remoteRecords.length === 0) {
          return;
        }
        const nextRecords = remoteRecords as MedicalRecord[];
        setRecords(nextRecords);
        setSelectedRecordId((previousId) => {
          if (previousId && nextRecords.some((record) => record.id === previousId)) {
            return previousId;
          }
          if (defaultRiskLevel === 'High') {
            return nextRecords.find((record) => record.imageKey === 'xray-scissors')?.id
              ?? nextRecords[0]?.id
              ?? null;
          }
          return nextRecords[0]?.id ?? null;
        });
      } catch (error) {
        if (cancelled) return;
        setLoadError(toUserFacingError(error, 'Failed to load medical records'));
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadRecords();
    return () => {
      cancelled = true;
    };
  }, [open, token, activeActor, patientUuid, defaultRiskLevel]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          'gap-0 overflow-hidden p-0',
          'w-[75vw] max-w-[75vw] data-[side=right]:w-[75vw] data-[side=right]:max-w-[75vw] data-[side=right]:sm:max-w-[75vw]',
          pv.isCorporate ? 'bg-white' : 'bg-slate-950',
        )}
      >
        <SheetHeader
          className={cn(
            'shrink-0 border-b px-6 pt-6 pb-4',
            pv.isCorporate ? 'border-slate-200' : 'border-slate-700/60',
          )}
        >
          <SheetTitle className={cn('pr-8', pv.titleClass)}>Medical records</SheetTitle>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-hidden px-6 pb-6 pt-4">
          {loadError ? (
            <p className={cn('text-sm text-red-600', !pv.isCorporate && 'text-red-400')}>{loadError}</p>
          ) : null}
          <PatientRecordsPanel
            records={records}
            embedded
            selectedId={selectedRecordId}
            onSelectRecord={(record) => setSelectedRecordId(record?.id ?? null)}
            loading={loading}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
