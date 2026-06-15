import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { useUiTheme } from '@/lib/uiTheme';
import { cn } from '@/lib/utils';

interface Props {
  content: string;
  /** Render assistant-style markdown; patient/user text stays plain. */
  markdown?: boolean;
  /** Corporate light theme: text color follows bubble background. */
  surface?: 'light' | 'dark';
  className?: string;
}

export default function ChatMessageContent({
  content,
  markdown = false,
  surface = 'light',
  className,
}: Props) {
  const { isCorporate } = useUiTheme();
  const onDarkSurface = isCorporate && surface === 'dark';

  if (!markdown) {
    return (
      <span
        className={cn(
          'whitespace-pre-wrap',
          isCorporate && (onDarkSurface ? '!text-white' : '!text-slate-900'),
          className,
        )}
      >
        {content}
      </span>
    );
  }

  return (
    <div
      className={cn(
        'prose prose-base max-w-none',
        'prose-p:my-1 prose-p:leading-relaxed',
        'prose-ul:my-1 prose-ol:my-1 prose-li:my-0',
        isCorporate
          ? onDarkSurface
            ? [
                'prose-invert',
                '!text-white',
                'prose-headings:!text-white prose-strong:!text-white prose-a:!text-sky-300',
                'prose-p:!text-slate-100 prose-li:!text-slate-100 prose-code:!text-slate-100',
                '[&_p]:!text-slate-100 [&_li]:!text-slate-100 [&_strong]:!text-white',
              ]
            : [
                'prose-slate',
                '!text-slate-900',
                'prose-headings:!text-slate-900 prose-strong:!text-slate-900 prose-a:!text-sky-700',
                'prose-p:!text-slate-800 prose-li:!text-slate-800 prose-code:!text-slate-800',
                '[&_p]:!text-slate-800 [&_li]:!text-slate-800 [&_strong]:!text-slate-900',
              ]
          : [
              'prose-invert',
              'prose-headings:text-slate-100 prose-strong:text-slate-100 prose-a:text-cyan-400',
            ],
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
