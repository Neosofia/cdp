import { useMemo, useState } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Input } from '@/components/ui/input';
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
  selected: string[];
  onChange: (roles: string[]) => void;
  /** All Tier-1 roles on the assigner's JWT (not only the UI active role). */
  assignerTier1Roles: string[];
}

export default function PlatformRolePicker({
  roleCatalog,
  selected,
  onChange,
  assignerTier1Roles,
}: PlatformRolePickerProps) {
  const [filter, setFilter] = useState('');

  const grouped = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const matches = (role: string) =>
      !q || role.toLowerCase().includes(q) || formatRoleLabel(role).toLowerCase().includes(q);

    const byBranch = new Map<string, string[]>();
    for (const role of roleCatalog.filter(matches)) {
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
  }, [roleCatalog, filter]);

  if (roleCatalog.length === 0) {
    return (
      <p className="text-sm text-slate-500 rounded-md border border-slate-800 bg-slate-900/50 px-3 py-2">
        Role catalog unavailable. Check user API and sign-in.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((role) => (
            <span
              key={role}
              className="inline-flex items-center gap-1 rounded-md border border-cyan-500/40 bg-cyan-950/60 px-2 py-0.5 text-xs text-cyan-200"
            >
              {formatRoleLabel(role)}
              <button
                type="button"
                aria-label={`Remove ${role}`}
                className="rounded p-0.5 hover:bg-cyan-500/20 text-cyan-400/80"
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
          className="pl-9 bg-slate-800 border-slate-700 text-slate-100"
        />
      </div>

      <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900/40 divide-y divide-slate-800">
        {grouped.length === 0 ? (
          <p className="px-3 py-4 text-sm text-slate-500 text-center">No roles match your filter</p>
        ) : (
          grouped.map((group) => (
            <div key={group.id} className="p-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-500/70 mb-2">
                {group.label}
              </p>
              <ul className="space-y-1.5">
                {group.roles.map((role) => {
                  const checked = selected.includes(role);
                  return (
                    <li key={role}>
                      <label
                        className={cn(
                          'flex items-start gap-3 rounded-md border px-3 py-2 cursor-pointer transition-colors',
                          checked
                            ? 'border-cyan-500/50 bg-cyan-950/40'
                            : 'border-slate-700/60 hover:border-slate-600 hover:bg-slate-800/50',
                        )}
                      >
                        <input
                          type="checkbox"
                          className="mt-1 size-4 rounded border-slate-600 bg-slate-900 text-cyan-500 focus:ring-cyan-500/40"
                          checked={checked}
                          onChange={() => onChange(toggleRole(selected, role))}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm text-slate-100">{formatRoleLabel(role)}</span>
                          <span className="block text-[11px] font-mono text-slate-500 truncate">{role}</span>
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
      <p className="text-[11px] text-slate-500">
        {selected.length} selected · {roleCatalog.length} assignable (
        {assignerTier1Roles.length > 0 ? assignerTier1Roles.join(', ') : 'no Tier-1 roles'})
      </p>
    </div>
  );
}
