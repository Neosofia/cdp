import { useMemo, useState } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Input } from '@/components/ui/input';
import { USER_FIELD_LABEL_CLASS, USER_INPUT_CLASS } from '@/components/userFormStyles';
import {
  groupProceduresBySpecialty,
  PROCEDURE_TYPE_LABELS,
  procedureById,
  searchProcedureCatalog,
} from '@/lib/procedureCatalog';
import { cn } from '@/lib/utils';

interface ProcedurePickerProps {
  selectedId: string | null;
  onChange: (id: string | null) => void;
}

export default function ProcedurePicker({ selectedId, onChange }: ProcedurePickerProps) {
  const [filter, setFilter] = useState('');
  const selected = selectedId ? procedureById(selectedId) : undefined;

  const grouped = useMemo(
    () => groupProceduresBySpecialty(searchProcedureCatalog(filter)),
    [filter],
  );

  return (
    <div className="space-y-3">
      <span className={USER_FIELD_LABEL_CLASS}>Procedure</span>

      {selected ? (
        <div className="rounded-lg border border-cyan-500/40 bg-cyan-950/30 px-3 py-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-100">{selected.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {PROCEDURE_TYPE_LABELS[selected.procedureType]}
                {' · '}
                <span className="font-mono text-cyan-400/90">{selected.emrRef}</span>
              </p>
            </div>
            <button
              type="button"
              aria-label="Clear selected procedure"
              className="shrink-0 rounded p-1 text-slate-400 hover:bg-cyan-500/10 hover:text-cyan-200"
              onClick={() => onChange(null)}
            >
              <XMarkIcon className="size-4" />
            </button>
          </div>
        </div>
      ) : null}

      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search by procedure, specialty, or EMR ref…"
          className={cn('pl-9', USER_INPUT_CLASS)}
        />
      </div>

      <div
        className="max-h-52 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900/40 divide-y divide-slate-800"
        role="listbox"
        aria-label="Procedure catalog"
      >
        {grouped.length === 0 ? (
          <p className="px-3 py-4 text-sm text-slate-500 text-center">No procedures match your search.</p>
        ) : (
          grouped.map((group) => (
            <div key={group.specialty} className="p-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-500/70 mb-2">
                {group.specialty}
              </p>
              <ul className="space-y-1.5">
                {group.procedures.map((entry) => {
                  const isSelected = entry.id === selectedId;
                  return (
                    <li key={entry.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        className={cn(
                          'w-full text-left rounded-md border px-3 py-2 transition-colors',
                          isSelected
                            ? 'border-cyan-500/50 bg-cyan-950/40'
                            : 'border-slate-700/60 hover:border-slate-600 hover:bg-slate-800/50',
                        )}
                        onClick={() => {
                          onChange(entry.id);
                          setFilter('');
                        }}
                      >
                        <span className="block text-sm text-slate-100">{entry.name}</span>
                        <span className="block text-[11px] text-slate-500 mt-0.5">
                          {PROCEDURE_TYPE_LABELS[entry.procedureType]}
                          {' · '}
                          <span className="font-mono text-slate-400">{entry.emrRef}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
