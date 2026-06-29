import { ArrowDownTrayIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

export interface AuditCsvDownloadButtonProps {
  downloading: boolean;
  onClick: () => void;
  className: string;
  title?: string;
}

export default function AuditCsvDownloadButton({
  downloading,
  onClick,
  className,
  title = 'Download full history as CSV',
}: AuditCsvDownloadButtonProps) {
  return (
    <button type="button" onClick={onClick} disabled={downloading} className={className} title={title}>
      {downloading ? (
        <ArrowPathIcon className="h-4 w-4 animate-spin" />
      ) : (
        <ArrowDownTrayIcon className="h-4 w-4" />
      )}
    </button>
  );
}
