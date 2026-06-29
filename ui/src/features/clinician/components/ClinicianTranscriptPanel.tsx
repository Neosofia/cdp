import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline';
import ChatConversationsSidebar from '@/shared/chat/ChatConversationsSidebar';
import ChatThreadMessageRow from '@/shared/chat/ChatThreadMessageRow';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { chatDisplayBubbleLayout } from '@/shared/chat/chatBubbleLayout';
import { chatDisplayHasClinician, type ChatDisplayMessage, type ChatInteraction } from '@/shared/chat/chatApi';
import type { ActivePatientRecovery } from '@/features/clinician/lib/patientRoster';
import { usePatientViewStyles } from '@/shared/core/patientViewStyles';
import { useScrollToBottom } from '@/shared/core/useScrollToBottom';
import { cn } from '@/shared/core/utils';

export default function ClinicianTranscriptPanel({
  patient,
  messages,
  interactions,
  activeInteractionUuid,
  onSelectInteraction,
  onSendClinicianMessage,
  clinicianDisplayName,
  clinicianRoleLabel,
  interventionThreadUuids,
  canCompose,
  loading,
  error,
  composeError,
  sending,
}: {
  patient: ActivePatientRecovery;
  messages: ChatDisplayMessage[];
  interactions: ChatInteraction[];
  activeInteractionUuid: string | null;
  onSelectInteraction: (interactionUuid: string) => void;
  onSendClinicianMessage: (content: string) => Promise<void>;
  clinicianDisplayName?: string;
  clinicianRoleLabel?: string;
  interventionThreadUuids: Set<string>;
  canCompose: boolean;
  loading: boolean;
  error: string | null;
  composeError: string | null;
  sending: boolean;
}) {
  const pv = usePatientViewStyles();
  const [draft, setDraft] = useState('');
  const [conversationsOpen, setConversationsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastMessageId = messages[messages.length - 1]?.id;
  const scrollRef = useScrollToBottom<HTMLDivElement>([
    patient.patientUuid,
    activeInteractionUuid,
    messages.length,
    lastMessageId,
  ]);
  const showDesktopSidebar = interactions.length >= 2;
  const showConversationsPicker = interactions.length > 0;
  const activeThreadHasIntervention = activeInteractionUuid
    ? interventionThreadUuids.has(activeInteractionUuid) || chatDisplayHasClinician(messages)
    : false;

  const focusComposeInput = useCallback(() => {
    queueMicrotask(() => {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    });
  }, []);

  useEffect(() => {
    if (canCompose && !sending && !loading) {
      focusComposeInput();
    }
  }, [canCompose, sending, loading, focusComposeInput]);

  const selectInteraction = (interactionUuid: string) => {
    if (interactionUuid === activeInteractionUuid || sending) {
      return;
    }
    onSelectInteraction(interactionUuid);
    focusComposeInput();
  };

  const submitReply = async () => {
    const text = draft.trim();
    if (!text || sending || !canCompose) {
      return;
    }
    setDraft('');
    focusComposeInput();
    try {
      await onSendClinicianMessage(text);
    } finally {
      focusComposeInput();
    }
  };

  const conversationsChrome = (
    <ChatConversationsSidebar
      styles={pv}
      interactions={interactions}
      activeInteractionUuid={activeInteractionUuid}
      interventionThreadUuids={interventionThreadUuids}
      disabled={loading || sending}
      onSelect={selectInteraction}
      conversationsOpen={conversationsOpen}
      onConversationsOpenChange={setConversationsOpen}
      showDesktopSidebar={showDesktopSidebar}
      showConversationsPicker={showConversationsPicker}
    />
  );

  const clinicianName = clinicianDisplayName?.trim() || 'Clinician';

  return (
    <div className={pv.chatLayoutClass}>
      <Card
        className={cn('flex-1 min-w-0 h-full min-h-0 flex flex-col overflow-hidden', pv.chatCardClass)}
        {...(pv.cardStyle ? { style: pv.cardStyle } : {})}
      >
        <CardHeader className={pv.chatCardHeaderClass} style={pv.headerStyle}>
          <div className="flex items-start justify-between gap-2">
            <CardTitle
              className={cn('text-lg flex flex-wrap items-center gap-2 min-w-0', pv.titleClass)}
              style={pv.titleStyle}
            >
              <ChatBubbleLeftRightIcon className="h-5 w-5 shrink-0" />
              <span>Patient chat</span>
              {activeThreadHasIntervention ? (
                <span
                  className={cn(
                    'text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-md',
                    pv.careTeamBadgeClass,
                  )}
                >
                  Care team active
                </span>
              ) : null}
            </CardTitle>
            {showConversationsPicker ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn('shrink-0 md:hidden', pv.outlineButton)}
                onClick={() => setConversationsOpen(true)}
              >
                Conversations
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="p-0 flex flex-1 flex-col min-h-0 overflow-hidden">
          <div
            ref={scrollRef}
            className={cn(pv.chatScrollAreaClass, pv.chatScrollClass)}
          >
            {loading && messages.length === 0 ? (
              <div className="flex justify-center py-4 md:py-3">
                <p className={cn('text-sm', pv.mutedText)}>Loading chat transcript…</p>
              </div>
            ) : null}
            {error ? (
              <p className="text-sm text-red-400 text-center py-4 md:py-3">{error}</p>
            ) : null}
            {!loading && !error && messages.length === 0 ? (
              <p className={cn('text-sm text-center py-4 md:py-3', pv.mutedText)}>No messages in this conversation yet.</p>
            ) : null}
            {messages.map((msg) => (
              <ChatThreadMessageRow
                key={msg.id}
                content={msg.content}
                time={msg.time}
                layout={chatDisplayBubbleLayout('clinician', msg.role)}
                styles={pv}
                inboundTitleTone="clinician"
                title={
                  msg.role === 'clinician' ? (
                    <>
                      <span className="shrink-0 font-medium">{clinicianName}</span>
                      {clinicianRoleLabel ? (
                        <span
                          className={cn(
                            'truncate',
                            pv.isCorporate ? 'text-slate-300' : 'text-cyan-200/80',
                          )}
                        >
                          {` · ${clinicianRoleLabel}`}
                        </span>
                      ) : null}
                    </>
                  ) : msg.role === 'patient' ? (
                    <span className="truncate font-medium">{patient.displayName}</span>
                  ) : undefined
                }
              />
            ))}
          </div>

          {composeError ? (
            <p className="px-4 pb-2 text-xs text-red-400">{composeError}</p>
          ) : null}

          {canCompose ? (
            <form
              className={cn(pv.chatComposeFormClass, pv.chatCardFooterClass, pv.formFooterClass)}
              style={pv.formFooterStyle}
              onSubmit={event => {
                event.preventDefault();
                void submitReply();
              }}
            >
              <Input
                ref={inputRef}
                value={draft}
                onChange={event => setDraft(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void submitReply();
                  }
                }}
                placeholder="Reply to patient…"
                disabled={loading || sending}
                className={cn('flex-1 h-10', pv.inputClass)}
                autoComplete="off"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => void submitReply()}
                disabled={loading || sending || !draft.trim()}
                className={cn('chat-send-button', pv.sendButtonClass)}
                style={pv.sendButtonStyle}
                aria-label="Send reply"
              >
                <PaperAirplaneIcon className="h-4 w-4" />
              </Button>
            </form>
          ) : null}
        </CardContent>
      </Card>
      {conversationsChrome}
    </div>
  );
}
