import { useMemo, useState } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Input } from '@/components/ui/input';
import { useUserFormStyles } from '@/components/userFormStyles';
import type { RoleDefinition } from '@/lib/roleCatalogApi';
import { cn } from '@/lib/utils';

export function formatRoleLabel(role: string): string {
  const segment = role.split('.').slice(1).join(' ');
  return segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatGroupLabel(branch: string): string {
  return branch.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function toggleRole(roles: string[], role: string): string[] {
  const next = new Set(roles);
  if (next.has(role)) next.delete(role);
  else next.add(role);
  return [...next];
}

interface PlatformRolePickerProps {
  roleCatalog: string[];
  roleDefinitions?: RoleDefinition[];
  selected: string[];
  onChange: (roles: string[]) => void;
  /** All actor classes on the assigner's JWT (not only the UI active actor). */
  assignerActors: string[];
  /** When set, only roles in this slug namespace (e.g. `platform`) are assignable. */
  roleNamespacePrefix?: string;
}

export default function PlatformRolePicker({
  roleCatalog,
  roleDefinitions,
  selected,
  onChange,
  assignerActors,
  roleNamespacePrefix,
}: PlatformRolePickerProps) {
  const formStyles = useUserFormStyles();
  const [filter, setFilter] = useState('');

  const assignableCatalog = useMemo(() => {
    if (!roleNamespacePrefix) {
      return roleCatalog;
    }
    const prefix = `${roleNamespacePrefix}.`;
    return roleCatalog.filter((role) => role.startsWith(prefix));
  }, [roleCatalog, roleNamespacePrefix]);

  const labelFor = useMemo(() => {
    const byId = new Map((roleDefinitions ?? []).map((def) => [def.id, def.label]));
    return (role: string) => byId.get(role) ?? formatRoleLabel(role);
  }, [roleDefinitions]);

  const grouped = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const matches = (role: string) =>
      !q ||
      role.toLowerCase().includes(q) ||
      labelFor(role).toLowerCase().includes(q);

    const byBranch = new Map<string, string[]>();
    for (const role of assignableCatalog.filter(matches)) {
      const branch = role.split('.')[0] || 'platform';
      byBranch.set(branch, [...(byBranch.get(branch) ?? []), role]);
    }

    return [...byBranch.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([branch, roles]) => ({
        id: branch,
        label: formatGroupLabel(branch),
        roles: roles.sort((a, b) => a.localeCompare(b)),
      }));
  }, [assignableCatalog, filter, labelFor]);

  if (assignableCatalog.length === 0) {
    return <p className={formStyles.pickerEmptyClass}>Role catalog unavailable. Check user API and sign-in.</p>;
  }

  return (
    <div className="space-y-3">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((role) => (
            <span key={role} className={formStyles.pickerChipClass}>
              {labelFor(role)}
              <button
                type="button"
                aria-label={`Remove ${role}`}
                className={formStyles.pickerChipRemoveClass}
                onClick={() => onChange(toggleRole(selected, role))}
              >
                <XMarkIcon className="size-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter roles…"
          className={cn('pl-9', formStyles.inputClass)}
        />
      </div>

      <div className={formStyles.pickerListClass}>
        {grouped.length === 0 ? (
          <p className="px-3 py-4 text-sm text-slate-500 text-center">No roles match your filter</p>
        ) : (
          grouped.map((group) => (
            <div key={group.id} className="p-3">
              <p className={formStyles.pickerGroupTitleClass}>{group.label}</p>
              <ul className="space-y-1.5">
                {group.roles.map((role) => {
                  const checked = selected.includes(role);
                  return (
                    <li key={role}>
                      <label className={formStyles.pickerItemClass(checked)}>
                        <input
                          type="checkbox"
                          className={formStyles.pickerCheckboxClass}
                          checked={checked}
                          onChange={() => onChange(toggleRole(selected, role))}
                        />
                        <span className="min-w-0 flex-1">
                          <span className={formStyles.pickerItemLabelClass}>{labelFor(role)}</span>
                          <span className={formStyles.pickerItemSubClass}>{role}</span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </div>
      <p className={formStyles.pickerFooterClass}>
        {selected.length} selected · {assignableCatalog.length} assignable (
        {assignerActors.length > 0 ? assignerActors.join(', ') : 'no actors on JWT'})
      </p>
    </div>
  );
}
