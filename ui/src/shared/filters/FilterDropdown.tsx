import { ChevronDownIcon } from '@heroicons/react/24/outline';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePatientViewStyles } from '@/shared/core/patientViewStyles';
import { cn } from '@/shared/core/utils';

interface FilterDropdownProps<T extends string> {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onSelect: (value: T) => void;
  fullWidth?: boolean;
}

export default function FilterDropdown<T extends string>({
  label,
  value,
  options,
  onSelect,
  fullWidth = false,
}: FilterDropdownProps<T>) {
  const pv = usePatientViewStyles();
  const currentLabel = options.find((option) => option.value === value)?.label ?? label;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(pv.filterTriggerClass, fullWidth && 'w-full justify-between')}
        aria-label={`${label}: ${currentLabel}`}
      >
        <span className={pv.filterLabelClass}>{label}</span>
        <span className={pv.filterValueClass}>{currentLabel}</span>
        <ChevronDownIcon className={cn('size-3.5 shrink-0', pv.mutedText)} />
      </DropdownMenuTrigger>
      <DropdownMenuContent className={pv.filterMenuClass} align="end">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => onSelect(option.value)}
            className={pv.filterMenuItemClass(value === option.value)}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
