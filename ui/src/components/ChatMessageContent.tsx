import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { cn } from '@/lib/utils';

interface Props {
  content: string;
  /** Render assistant-style markdown; patient/user text stays plain. */
  markdown?: boolean;
  className?: string;
}

export default function ChatMessageContent({ content, markdown = false, className }: Props) {
  if (!markdown) {
    return <span className={cn('whitespace-pre-wrap', className)}>{content}</span>;
  }

  return (
    <div
      className={cn(
        'prose prose-base prose-invert max-w-none',
        'prose-p:my-1 prose-p:leading-relaxed',
        'prose-ul:my-1 prose-ol:my-1 prose-li:my-0',
        'prose-headings:my-2 prose-headings:text-slate-100',
        'prose-strong:text-slate-100 prose-a:text-cyan-400',
        className,
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
