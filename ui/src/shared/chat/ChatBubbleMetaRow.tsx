import type { ReactNode } from 'react';
import { cn } from '@/shared/core/utils';

interface ChatBubbleMetaRowProps {
  time: string;
  title?: ReactNode;
  leading?: ReactNode;
  className?: string;
  titleClass?: string;
  timeClass?: string;
}

/** Single-line sender label and timestamp above bubble body copy. */
export default function ChatBubbleMetaRow({
  time,
  title,
  leading,
  className,
  titleClass,
  timeClass,
}: ChatBubbleMetaRowProps) {
  const hasLabel = Boolean(leading || title);

  return (
    <div
      className={cn(
        'mb-0.5 flex min-w-0 items-baseline justify-between gap-2',
        !hasLabel && 'justify-end',
        className,
      )}
    >
      {hasLabel ? (
        <div
          className={cn(
            'flex min-w-0 flex-1 items-center gap-1 truncate text-[10px] leading-snug md:text-xs',
            titleClass,
          )}
        >
          {leading}
          {title}
        </div>
      ) : null}
      <time
        className={cn(
          'shrink-0 text-[10px] leading-snug tabular-nums',
          timeClass,
        )}
      >
        {time}
      </time>
    </div>
  );
}
