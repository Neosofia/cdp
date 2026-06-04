import { useMemo, useState } from 'react';
import { MagnifyingGlassIcon, DocumentTextIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
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

const TYPE_BADGE: Record<RecordType, React.CSSProperties> = {
  Lab:       { borderColor: 'rgba(34,211,238,0.4)', color: '#22d3ee', background: 'rgba(34,211,238,0.08)' },
  Visit:     { borderColor: 'rgba(168,85,247,0.4)', color: '#a855f7', background: 'rgba(168,85,247,0.08)' },
  Rx:        { borderColor: 'rgba(34,197,94,0.4)',  color: '#22c55e', background: 'rgba(34,197,94,0.08)' },
  Imaging:   { borderColor: 'rgba(234,179,8,0.4)',  color: '#eab308', background: 'rgba(234,179,8,0.08)' },
  Procedure: { borderColor: 'rgba(239,68,68,0.4)',  color: '#ef4444', background: 'rgba(239,68,68,0.08)' },
  Allergy:   { borderColor: 'rgba(251,146,60,0.4)', color: '#fb923c', background: 'rgba(251,146,60,0.08)' },
};

const CARD_STYLE = {
  background: 'rgba(5,5,15,0.7)',
  border: '1px solid rgba(34,211,238,0.18)',
  boxShadow: '0 0 40px rgba(34,211,238,0.05)',
};

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
        'gap-0 py-0 h-full min-h-0 flex flex-col overflow-hidden',
        !embedded && 'col-span-2',
      )}
      style={CARD_STYLE}
    >
      <CardHeader
        className="py-3 shrink-0"
        style={{ borderBottom: '1px solid rgba(34,211,238,0.12)', background: 'rgba(34,211,238,0.03)' }}
      >
        <CardTitle
          className={cn('flex items-center gap-2', embedded ? 'text-sm uppercase tracking-wider' : 'text-lg')}
          style={{ color: embedded ? 'rgba(34,211,238,0.8)' : '#22d3ee' }}
        >
          <DocumentTextIcon className={embedded ? 'h-4 w-4' : 'h-5 w-5'} />
          Health records
        </CardTitle>
      </CardHeader>
      <CardContent
        className={cn(
          'flex flex-col flex-1 min-h-0 overflow-hidden',
          embedded ? 'p-3' : 'p-6',
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
                className="pl-9 h-9 bg-slate-900/60 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:border-cyan-500/50 text-sm"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <FunnelIcon className="h-4 w-4 text-slate-500 hidden sm:block" />
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value as RecordType | 'all')}
                className="h-9 rounded-lg border border-slate-700 bg-slate-900/60 px-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50"
              >
                {TYPE_FILTERS.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            {filtered.length} of {records.length} records
          </p>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain space-y-3">
          {selected && embedded && (
            <div
              className="rounded-lg p-3 text-xs space-y-2"
              style={{ background: 'rgba(34,211,238,0.04)', border: '1px solid rgba(34,211,238,0.15)' }}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-slate-100">{selected.title}</span>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="text-slate-500 hover:text-cyan-300 text-[10px] uppercase tracking-widest"
                >
                  Close
                </button>
              </div>
              <p className="text-slate-400 leading-relaxed">{selected.summary}</p>
              {selected.imageKey && (
                <div
                  className="rounded-lg overflow-hidden mt-2 p-2"
                  style={{ background: '#0f172a', border: '1px solid rgba(34,211,238,0.15)' }}
                >
                  <RecordImagePreview record={selected} />
                </div>
              )}
            </div>
          )}

          <ul
            className="divide-y rounded-xl"
            style={{ border: '1px solid rgba(34,211,238,0.12)' }}
          >
          {loading && records.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-slate-500">Loading health records…</li>
          ) : filtered.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-slate-500">No matching records.</li>
          ) : (
            filtered.map(r => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setSelected(selected?.id === r.id ? null : r)}
                  className={cn(
                    'w-full text-left px-3 py-3 flex items-center justify-between gap-3 transition-colors',
                    selected?.id === r.id ? 'bg-cyan-500/10' : 'hover:bg-cyan-500/5',
                  )}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-100 truncate">{r.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {formatDate(r.date)} · {r.provider}
                    </div>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-[10px] font-semibold" style={TYPE_BADGE[r.type]}>
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
