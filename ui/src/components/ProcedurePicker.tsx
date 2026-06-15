import { useMemo, useState } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Input } from '@/components/ui/input';
import { useUserFormStyles } from '@/components/userFormStyles';
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
  const formStyles = useUserFormStyles();
  const [filter, setFilter] = useState('');
  const selected = selectedId ? procedureById(selectedId) : undefined;

  const grouped = useMemo(
    () => groupProceduresBySpecialty(searchProcedureCatalog(filter)),
    [filter],
  );

  return (
    <div className="space-y-3">
      <span className={formStyles.fieldLabelClass}>Procedure</span>

      {selected ? (
        <div className={formStyles.pickerSelectedBoxClass}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={formStyles.pickerSelectedTitleClass}>{selected.name}</p>
              <p className={formStyles.pickerSelectedSubClass}>
                {PROCEDURE_TYPE_LABELS[selected.procedureType]}
                {' · '}
                <span className={formStyles.pickerSelectedEmrClass}>{selected.emrRef}</span>
              </p>
            </div>
            <button
              type="button"
              aria-label="Clear selected procedure"
              className={formStyles.pickerClearButtonClass}
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
          className={cn('pl-9', formStyles.inputClass)}
        />
      </div>

      <div
        className={formStyles.pickerProcedureListClass}
        role="listbox"
        aria-label="Procedure catalog"
      >
        {grouped.length === 0 ? (
          <p className="px-3 py-4 text-sm text-slate-500 text-center">No procedures match your search.</p>
        ) : (
          grouped.map((group) => (
            <div key={group.specialty} className="p-3">
              <p className={formStyles.pickerGroupTitleClass}>{group.specialty}</p>
              <ul className="space-y-1.5">
                {group.procedures.map((entry) => {
                  const isSelected = entry.id === selectedId;
                  return (
                    <li key={entry.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        className={formStyles.pickerProcedureItemClass(isSelected)}
                        onClick={() => {
                          onChange(entry.id);
                          setFilter('');
                        }}
                      >
                        <span className={formStyles.pickerItemLabelClass}>{entry.name}</span>
                        <span className={formStyles.pickerItemMetaClass}>
                          {PROCEDURE_TYPE_LABELS[entry.procedureType]}
                          {' · '}
                          <span className={formStyles.pickerItemMetaMonoClass}>{entry.emrRef}</span>
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
