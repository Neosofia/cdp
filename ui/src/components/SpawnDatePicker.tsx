import { useMemo, useState } from 'react';
import { CalendarDaysIcon } from '@heroicons/react/24/outline';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

function parseIsoDate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return null;
  }
  return date;
}

function formatIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(iso: string): string {
  const parsed = parseIsoDate(iso);
  if (!parsed) return 'Select date';
  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface SpawnDatePickerProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function SpawnDatePicker({ id, value, onChange, className }: SpawnDatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = parseIsoDate(value);
  const currentYear = new Date().getFullYear();
  const startMonth = useMemo(() => new Date(currentYear - 10, 0, 1), [currentYear]);
  const endMonth = useMemo(() => new Date(currentYear + 1, 11, 31), [currentYear]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        type="button"
        className={cn(
          'flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-slate-700',
          'bg-slate-900/80 px-3 text-sm text-slate-100 outline-none',
          'hover:border-cyan-500/40 hover:bg-slate-900',
          'focus-visible:border-cyan-500/50 focus-visible:ring-2 focus-visible:ring-cyan-500/25',
          'data-popup-open:border-cyan-500/40 data-popup-open:ring-2 data-popup-open:ring-cyan-500/20',
          className,
        )}
      >
        <span>{formatDisplayDate(value)}</span>
        <CalendarDaysIcon className="size-4 shrink-0 text-cyan-400/80" aria-hidden />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-auto overflow-hidden border border-cyan-500/25 bg-[#05050f] p-0 text-slate-200 shadow-[0_0_32px_rgba(34,211,238,0.12)] ring-0"
      >
        <Calendar
          mode="single"
          selected={selected ?? undefined}
          defaultMonth={selected ?? undefined}
          captionLayout="dropdown"
          startMonth={startMonth}
          endMonth={endMonth}
          onSelect={(date) => {
            if (!date) return;
            onChange(formatIsoDate(date));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
