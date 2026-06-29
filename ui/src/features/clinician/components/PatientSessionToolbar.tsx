import {
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';
import EpisodeSelector from '@/features/clinician/components/EpisodeSelector';
import { Button } from '@/components/ui/button';
import type { CareEpisodeHistoryEntry } from '@/shared/care-episode/careEpisodeApi';
import { cn } from '@/shared/core/utils';

export interface PatientSessionToolbarProps {
  episodeHistory: CareEpisodeHistoryEntry[];
  selectedHistoryUuid: string;
  historyLoading: boolean;
  onSelectEpisode: (episodeUuid: string) => void;
  onOpenRecords: () => void;
  onOpenAudits: () => void;
  onEditPatient: () => void;
  outlineButtonClass: string;
  inputClass: string;
}

function PatientSessionToolbarActions({
  onOpenRecords,
  onOpenAudits,
  onEditPatient,
  outlineButtonClass,
  layout,
}: Pick<
  PatientSessionToolbarProps,
  'onOpenRecords' | 'onOpenAudits' | 'onEditPatient' | 'outlineButtonClass'
> & {
  layout: 'mobile' | 'desktop';
}) {
  if (layout === 'mobile') {
    return (
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={cn('flex-1', outlineButtonClass)}
          onClick={onOpenRecords}
        >
          <DocumentTextIcon className="h-4 w-4 mr-1.5" />
          Records
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={cn('flex-1', outlineButtonClass)}
          onClick={onOpenAudits}
        >
          <ClipboardDocumentListIcon className="h-4 w-4 mr-1.5" />
          Audits
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={outlineButtonClass}
          onClick={onEditPatient}
          aria-label="Edit patient profile"
        >
          <PencilSquareIcon className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={outlineButtonClass}
        onClick={onOpenRecords}
      >
        <DocumentTextIcon className="h-4 w-4 mr-1.5" />
        Records
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={outlineButtonClass}
        onClick={onOpenAudits}
      >
        <ClipboardDocumentListIcon className="h-4 w-4 mr-1.5" />
        Audits
      </Button>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={outlineButtonClass}
        onClick={onEditPatient}
        aria-label="Edit patient profile"
      >
        <PencilSquareIcon className="h-4 w-4" />
      </Button>
    </>
  );
}

/** Episode picker + session actions above the transcript on small screens. */
export function PatientSessionMobileToolbar(props: PatientSessionToolbarProps) {
  return (
    <div className="md:hidden shrink-0 space-y-2">
      <EpisodeSelector
        episodeHistory={props.episodeHistory}
        selectedHistoryUuid={props.selectedHistoryUuid}
        historyLoading={props.historyLoading}
        onSelectEpisode={props.onSelectEpisode}
        inputClass={props.inputClass}
        variant="stacked"
      />
      <PatientSessionToolbarActions
        layout="mobile"
        onOpenRecords={props.onOpenRecords}
        onOpenAudits={props.onOpenAudits}
        onEditPatient={props.onEditPatient}
        outlineButtonClass={props.outlineButtonClass}
      />
    </div>
  );
}

/** Episode picker + session actions in the app breadcrumb on medium screens and up. */
export default function PatientSessionDesktopToolbar(props: PatientSessionToolbarProps) {
  return (
    <div className="hidden md:flex items-center gap-2 shrink-0">
      <EpisodeSelector
        episodeHistory={props.episodeHistory}
        selectedHistoryUuid={props.selectedHistoryUuid}
        historyLoading={props.historyLoading}
        onSelectEpisode={props.onSelectEpisode}
        inputClass={props.inputClass}
        variant="inline"
      />
      <PatientSessionToolbarActions
        layout="desktop"
        onOpenRecords={props.onOpenRecords}
        onOpenAudits={props.onOpenAudits}
        onEditPatient={props.onEditPatient}
        outlineButtonClass={props.outlineButtonClass}
      />
    </div>
  );
}
