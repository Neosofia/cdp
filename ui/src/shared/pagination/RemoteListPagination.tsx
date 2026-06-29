import { Button } from '@/components/ui/button';
import { usePatientViewStyles } from '@/shared/core/patientViewStyles';

interface Props {
  total: number;
  totalLabel: string;
  page: number;
  totalPages: number;
  rangeStart?: number;
  rangeEnd?: number;
  onPageChange: (page: number) => void;
}

export default function RemoteListPagination({
  total,
  totalLabel,
  page,
  totalPages,
  rangeStart,
  rangeEnd,
  onPageChange,
}: Props) {
  const adminStyles = usePatientViewStyles();
  const summary =
    rangeStart !== undefined && rangeEnd !== undefined
      ? `${rangeStart}–${rangeEnd} of ${total} ${totalLabel}`
      : `${total} ${totalLabel}`;

  return (
    <div className={adminStyles.adminPaginationClass}>
      <span>{summary}</span>
      {totalPages > 1 ? (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => onPageChange(Math.max(1, page - 1))}
          >
            Previous
          </Button>
          <span className="py-1">
            Page {page} / {totalPages}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}
