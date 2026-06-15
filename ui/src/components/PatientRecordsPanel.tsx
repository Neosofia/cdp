import { useMemo, useState } from 'react';
import { MagnifyingGlassIcon, DocumentTextIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { usePatientViewStyles } from '@/lib/patientViewStyles';
import XrayScissorsDemo from '@/components/XrayScissorsDemo';
import type { MedicalRecord, RecordType } from '@/lib/patientRecordsData';

function RecordImagePreview({ record }: { record: MedicalRecord }) {
  if (record.imageKey === 'xray-scissors') {
    return <XrayScissorsDemo className="w-full h-auto max-h-56 object-contain" />;
  }
  return null;
}

const TYPE_FILTERS: { value: RecordType | 'all'; label: string }[] = [
  { value: 'all', label: 'All types' },
  { value: 'Lab', label: 'Lab' },
  { value: 'Visit', label: 'Visit' },
  { value: 'Rx', label: 'Rx' },
  { value: 'Imaging', label: 'Imaging' },
  { value: 'Procedure', label: 'Procedure' },
  { value: 'Allergy', label: 'Allergy' },
];

function formatDate(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

interface Props {
  records: MedicalRecord[];
  /** Embedded in clinician split view */
  embedded?: boolean;
  selectedId?: string | null;
  onSelectRecord?: (record: MedicalRecord | null) => void;
  loading?: boolean;
}

export default function PatientRecordsPanel({
  records,
  embedded = false,
  selectedId = null,
  onSelectRecord,
  loading = false,
}: Props) {
  const pv = usePatientViewStyles();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<RecordType | 'all'>('all');
  const [internalSelected, setInternalSelected] = useState<MedicalRecord | null>(null);

  const selected = onSelectRecord
    ? records.find(r => r.id === selectedId) ?? null
    : internalSelected;

  const setSelected = (record: MedicalRecord | null) => {
    if (onSelectRecord) onSelectRecord(record);
    else setInternalSelected(record);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records
      .filter(r => {
        if (typeFilter !== 'all' && r.type !== typeFilter) return false;
        if (!q) return true;
        const haystack = [r.title, r.provider, r.summary, r.type, formatDate(r.date)].join(' ').toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [records, query, typeFilter]);

  return (
    <Card
      className={cn(
        'gap-0 py-0 flex flex-col',
        !embedded && 'col-span-2',
        embedded && 'min-h-0 flex-1 overflow-hidden',
        pv.cardClass,
      )}
      style={pv.cardStyle}
    >
      <CardHeader className={cn('py-3 shrink-0', pv.headerClass)} style={pv.headerStyle}>
        <CardTitle
          className={cn(
            'flex items-center gap-2',
            embedded ? 'text-sm uppercase tracking-wider' : 'text-lg',
            embedded ? pv.titleEmbeddedClass : pv.titleClass,
          )}
          style={embedded ? pv.titleEmbeddedStyle : pv.titleStyle}
        >
          <DocumentTextIcon className={embedded ? 'h-4 w-4' : 'h-5 w-5'} />
          Health records
        </CardTitle>
      </CardHeader>
      <CardContent
        className={cn(
          'flex flex-col',
          embedded ? 'min-h-0 flex-1 overflow-hidden p-3' : 'p-6',
        )}
      >
        <div className={cn('shrink-0 space-y-3', embedded ? '' : 'mb-4')}>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search records…"
                className={cn('pl-9 h-9 text-sm', pv.inputClass)}
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <FunnelIcon className={cn('h-4 w-4 hidden sm:block', pv.mutedText)} />
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value as RecordType | 'all')}
                className={cn('h-9 rounded-lg border px-2 text-sm', pv.selectClass)}
              >
                {TYPE_FILTERS.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
          </div>
          <p className={cn('text-xs', pv.subText)}>
            {filtered.length} of {records.length} records
          </p>
        </div>

        <div
          className={cn(
            'space-y-3',
            embedded && 'min-h-0 flex-1 overflow-y-auto overscroll-y-contain',
          )}
        >
          {selected && embedded && (
            <div className={cn('p-3 text-xs space-y-2', pv.detailPanelClass)} style={pv.detailPanelStyle}>
              <div className="flex items-start justify-between gap-2">
                <span className={cn('font-medium', pv.bodyText)}>{selected.title}</span>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className={cn('text-[10px] uppercase tracking-widest', pv.ghostButton)}
                >
                  Close
                </button>
              </div>
              <p className={cn('leading-relaxed', pv.mutedText)}>{selected.summary}</p>
              {selected.imageKey && (
                <div className={cn('mt-2 p-2', pv.imageFrameClass)} style={pv.imageFrameStyle}>
                  <RecordImagePreview record={selected} />
                </div>
              )}
            </div>
          )}

          <ul className={cn('divide-y', pv.listBorderClass)} style={pv.listBorderStyle}>
          {loading && records.length === 0 ? (
            <li className={cn('px-4 py-8 text-center text-sm', pv.subText)}>Loading health records…</li>
          ) : filtered.length === 0 ? (
            <li className={cn('px-4 py-8 text-center text-sm', pv.subText)}>No matching records.</li>
          ) : (
            filtered.map(r => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setSelected(selected?.id === r.id ? null : r)}
                  className={cn(
                    'w-full text-left px-3 py-3 flex items-center justify-between gap-3 transition-colors',
                    selected?.id === r.id ? pv.rowSelected : pv.rowHover,
                  )}
                >
                  <div className="min-w-0">
                    <div className={cn('text-sm font-medium truncate', pv.bodyText)}>{r.title}</div>
                    <div className={cn('text-xs mt-0.5', pv.subText)}>
                      {formatDate(r.date)} · {r.provider}
                    </div>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-[10px] font-semibold" style={pv.recordTypeBadge(r.type)}>
                    {r.type}
                  </Badge>
                </button>
              </li>
            ))
          )}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
