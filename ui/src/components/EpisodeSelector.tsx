import type { CareEpisodeHistoryEntry } from '@/lib/careEpisodeApi';
import {
  careEpisodeHistoryOptionLabel,
  careEpisodeHistoryPrimaryLabel,
  careEpisodeHistorySecondaryLabel,
} from '@/lib/careEpisodeHistoryLabels';
import { cn } from '@/lib/utils';

interface EpisodeSelectorProps {
  episodeHistory: CareEpisodeHistoryEntry[];
  selectedHistoryUuid: string;
  historyLoading: boolean;
  onSelectEpisode: (episodeUuid: string) => void;
  inputClass: string;
  variant?: 'inline' | 'stacked';
}

export default function EpisodeSelector({
  episodeHistory,
  selectedHistoryUuid,
  historyLoading,
  onSelectEpisode,
  inputClass,
  variant = 'inline',
}: EpisodeSelectorProps) {
  if (episodeHistory.length === 0) {
    return null;
  }

  const selectedEntry =
    episodeHistory.find((entry) => entry.episode_uuid === selectedHistoryUuid) ?? episodeHistory[0];

  if (variant === 'stacked') {
    return (
      <div className="relative w-full min-w-0">
        <label htmlFor="care-episode-select-mobile" className="sr-only">
          Care episode
        </label>
        <select
          id="care-episode-select-mobile"
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
          value={selectedHistoryUuid}
          disabled={historyLoading}
          onChange={(event) => onSelectEpisode(event.target.value)}
          aria-label="Care episode"
        >
          {episodeHistory.map((entry) => (
            <option key={entry.episode_uuid} value={entry.episode_uuid}>
              {careEpisodeHistoryOptionLabel(entry)}
            </option>
          ))}
        </select>
        <div
          className={cn(
            'rounded-md border px-3 py-2 min-h-[3.25rem]',
            inputClass,
            historyLoading && 'opacity-60',
          )}
          aria-hidden
        >
          <span className="block text-xs font-medium leading-snug wrap-break-word">
            {careEpisodeHistoryPrimaryLabel(selectedEntry)}
          </span>
          <span className="block text-[11px] leading-snug opacity-70 wrap-break-word">
            {careEpisodeHistorySecondaryLabel(selectedEntry)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <select
      className={cn('h-8 min-w-[14rem] max-w-[20rem] rounded-md border px-2 text-xs', inputClass)}
      value={selectedHistoryUuid}
      disabled={historyLoading}
      onChange={(event) => onSelectEpisode(event.target.value)}
      aria-label="Care episode"
    >
      {episodeHistory.map((entry) => (
        <option key={entry.episode_uuid} value={entry.episode_uuid}>
          {careEpisodeHistoryOptionLabel(entry)}
        </option>
      ))}
    </select>
  );
}
