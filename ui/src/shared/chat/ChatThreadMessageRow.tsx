import type { ReactNode } from 'react';
import { SparklesIcon } from '@heroicons/react/24/outline';
import ChatBubbleMetaRow from '@/shared/chat/ChatBubbleMetaRow';
import ChatMessageContent from '@/shared/chat/ChatMessageContent';
import type { ChatBubbleLayout } from '@/shared/chat/chatBubbleLayout';
import type { PatientViewStyles } from '@/shared/core/patientViewStyles';
import { cn } from '@/shared/core/utils';

export interface ChatThreadMessageRowProps {
  content: string;
  time: string;
  layout: ChatBubbleLayout;
  styles: PatientViewStyles;
  title?: ReactNode;
  /** Light-surface title tone when not a user bubble (patient vs clinician thread). */
  inboundTitleTone?: 'patient' | 'clinician';
}

function metaTimeClass(styles: PatientViewStyles, useUserBubble: boolean): string {
  return cn(
    styles.isCorporate
      ? useUserBubble
        ? 'text-slate-300'
        : 'text-slate-500'
      : 'text-slate-400/80',
  );
}

function titleClass(
  styles: PatientViewStyles,
  useUserBubble: boolean,
  inboundTitleTone: 'patient' | 'clinician',
): string {
  if (useUserBubble) {
    return styles.isCorporate ? 'text-slate-100' : 'text-cyan-100';
  }
  if (styles.isCorporate) {
    return 'text-slate-800';
  }
  return inboundTitleTone === 'clinician' ? 'text-slate-200' : 'text-cyan-200/90';
}

export default function ChatThreadMessageRow({
  content,
  time,
  layout,
  styles: pv,
  title,
  inboundTitleTone = 'patient',
}: ChatThreadMessageRowProps) {
  return (
    <div className={cn('flex w-full', layout.alignEnd ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          pv.chatMessageBubbleClass,
          layout.sizeClass,
          layout.offsetClass,
          layout.useUserBubble
            ? cn(pv.chatBubbleUserClass, layout.tailClass)
            : cn(pv.chatBubbleAssistantClass, layout.tailClass),
        )}
        style={layout.useUserBubble ? pv.chatBubbleUser() : pv.chatBubbleAssistant()}
      >
        <ChatBubbleMetaRow
          time={time}
          timeClass={metaTimeClass(pv, layout.useUserBubble)}
          titleClass={titleClass(pv, layout.useUserBubble, inboundTitleTone)}
          leading={
            layout.showSparkles ? (
              <SparklesIcon
                className={cn('h-3.5 w-3.5 shrink-0', pv.isCorporate ? 'text-violet-600' : '')}
                style={pv.isCorporate ? undefined : { color: '#a855f7' }}
                aria-hidden
              />
            ) : undefined
          }
          title={title}
        />
        <ChatMessageContent
          content={content}
          markdown={layout.markdown}
          surface={layout.useUserBubble ? 'dark' : 'light'}
        />
      </div>
    </div>
  );
}
