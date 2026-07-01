import { useCallback, useEffect, useState, useRef } from 'react';
import {
  chatDisplayHasClinician,
  createChatInteraction,
  fetchChatMeta,
  interactionsWithIntervention,
  isAssistantUnavailableError,
  loadPatientChatHistory,
  listChatInteractions,
  requestChatSessionStart,
  requestPatientCompletion,
  toChatDisplayMessage,
  type ChatDisplayMessage,
  type ChatInteraction,
} from '@/shared/chat/chatApi';
import { cdpClinicalRoleCatalog, clinicianRoleLabelForUserRoles } from '@/shared/user-registry/roleCatalogApi';
import {
  fetchRegistryUser,
  registryUserDisplayName,
} from '@/shared/user-registry/userRegistryApi';
import { useScrollToBottom } from '@/shared/core/useScrollToBottom';
import {
  PaperAirplaneIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import ChatConversationsSidebar from '@/shared/chat/ChatConversationsSidebar';
import ChatThreadMessageRow from '@/shared/chat/ChatThreadMessageRow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/shared/core/utils';
import { chatDisplayBubbleLayout } from '@/shared/chat/chatBubbleLayout';
import { usePatientViewStyles } from '@/shared/core/patientViewStyles';
import { toUserFacingError, swallowOptionalEnrichmentError } from '@/shared/core/userFacingError';

const CHAT_API = import.meta.env.VITE_CHAT_API_URL;

type ChatMessage = ChatDisplayMessage;

interface ClinicianSenderLabel {
  displayName: string;
  roleLabel: string;
}

interface Props {
  token: string;
  activeActor: string;
  patientName?: string;
  patientUuid?: string;
  tenantName?: string;
}

const ASSISTANT_UNAVAILABLE_MESSAGE =
  'The care assistant is temporarily unavailable. You can still read past messages, but new assistant replies are paused.';

export default function PatientChat({
  token,
  activeActor,
  patientName,
  patientUuid,
}: Props) {
  const pv = usePatientViewStyles();
  const greetingName = patientName?.trim() || undefined;
  const canLoadHistory = Boolean(CHAT_API && patientUuid);
  const [interactions, setInteractions] = useState<ChatInteraction[]>([]);
  const [activeInteractionUuid, setActiveInteractionUuid] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(canLoadHistory);
  const [loadingInteractions, setLoadingInteractions] = useState(canLoadHistory);
  const [assistantAvailable, setAssistantAvailable] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clinicianSenders, setClinicianSenders] = useState<Map<string, ClinicianSenderLabel>>(
    () => new Map(),
  );
  const [interventionThreadUuids, setInterventionThreadUuids] = useState<Set<string>>(
    () => new Set(),
  );
  const [conversationsOpen, setConversationsOpen] = useState(false);
  const scrollRef = useScrollToBottom<HTMLDivElement>([messages, sending, loadingHistory]);
  const inputRef = useRef<HTMLInputElement>(null);

  const showDesktopSidebar = canLoadHistory && interactions.length >= 2;
  const showConversationsPicker = canLoadHistory && interactions.length > 0;
  const humanInterventionActive = chatDisplayHasClinician(messages);
  const canSendMessages = humanInterventionActive || assistantAvailable;

  const primeNewSession = useCallback(
    async (interactionUuid: string): Promise<ChatMessage[]> => {
      if (!patientUuid) {
        return [];
      }
      const result = await requestChatSessionStart(token, activeActor, patientUuid, interactionUuid);
      if (result.assistant_message) {
        return [toChatDisplayMessage(result.assistant_message)];
      }
      if (result.message) {
        return [
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            senderType: 'ai_agent',
            senderUuid: null,
            content: result.message,
            createdAt: new Date(),
            time: '',
          },
        ];
      }
      return [];
    },
    [token, activeActor, patientUuid],
  );

  const refreshInteractions = useCallback(async () => {
    if (!canLoadHistory || !patientUuid) {
      return [];
    }
    const items = await listChatInteractions(token, activeActor, patientUuid);
    setInteractions(items);
    return items;
  }, [token, activeActor, patientUuid, canLoadHistory]);

  const loadThreadHistory = useCallback(
    async (interactionUuid: string) => {
      if (!patientUuid) {
        return;
      }
      setLoadingHistory(true);
      setError(null);
      try {
        const history = await loadPatientChatHistory(token, activeActor, patientUuid, interactionUuid);
        setMessages(history);
        setInterventionThreadUuids(previous => {
          const next = new Set(previous);
          if (chatDisplayHasClinician(history)) {
            next.add(interactionUuid);
          } else {
            next.delete(interactionUuid);
          }
          return next;
        });
      } catch (e) {
        setError(toUserFacingError(e, 'Failed to load chat history'));
        setMessages([]);
      } finally {
        setLoadingHistory(false);
      }
    },
    [token, activeActor, patientUuid],
  );

  useEffect(() => {
    if (!canLoadHistory || !patientUuid) {
      return;
    }

    let cancelled = false;

    const initializeConversation = async () => {
      setLoadingInteractions(true);
      setLoadingHistory(true);
      setError(null);

      try {
        const [itemsResult, meta] = await Promise.all([
          listChatInteractions(token, activeActor, patientUuid),
          fetchChatMeta(token, activeActor),
        ]);
        const assistantReady = meta.assistant?.available === true;
        setAssistantAvailable(assistantReady);
        if (cancelled) return;

        let items = itemsResult;
        if (items.length === 0) {
          const created = await createChatInteraction(token, activeActor, patientUuid, greetingName);
          if (cancelled) return;
          items = [created];
        }

        setInteractions(items);
        const selected = items[0]?.chat_interaction_uuid ?? null;
        setActiveInteractionUuid(selected);

        if (selected) {
          const history = await loadPatientChatHistory(token, activeActor, patientUuid, selected);
          if (cancelled) return;
          setMessages(history);
          if (history.length === 0 && assistantReady) {
            try {
              setMessages(await primeNewSession(selected));
            } catch (primeError) {
              if (isAssistantUnavailableError(primeError)) {
                setAssistantAvailable(false);
                setMessages([]);
              } else {
                throw primeError;
              }
            }
          }
        } else {
          setMessages([]);
        }
      } catch (e) {
        if (cancelled) return;
        setError(toUserFacingError(e, 'Failed to load conversations'));
        setMessages([]);
      } finally {
        if (!cancelled) {
          setLoadingInteractions(false);
          setLoadingHistory(false);
        }
      }
    };

    void initializeConversation();
    return () => {
      cancelled = true;
    };
  }, [token, activeActor, patientUuid, canLoadHistory, primeNewSession]);

  useEffect(() => {
    if (!canLoadHistory || !patientUuid || interactions.length < 2) {
      return;
    }

    let cancelled = false;
    const interactionUuids = interactions.map(
      interaction => interaction.chat_interaction_uuid,
    );

    void interactionsWithIntervention(token, activeActor, patientUuid, interactionUuids).then(
      engaged => {
        if (!cancelled) {
          setInterventionThreadUuids(engaged);
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [interactions, token, activeActor, patientUuid, canLoadHistory]);

  useEffect(() => {
    if (!humanInterventionActive || !activeInteractionUuid) {
      return;
    }
    setInterventionThreadUuids(previous => {
      if (previous.has(activeInteractionUuid)) {
        return previous;
      }
      const next = new Set(previous);
      next.add(activeInteractionUuid);
      return next;
    });
  }, [humanInterventionActive, activeInteractionUuid]);

  const focusChatInput = useCallback(() => {
    queueMicrotask(() => {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    });
  }, []);

  useEffect(() => {
    const senderUuids = [
      ...new Set(
        messages
          .filter(message => message.role === 'clinician' && message.senderUuid)
          .map(message => message.senderUuid as string),
      ),
    ].filter(senderUuid => !clinicianSenders.has(senderUuid));
    if (!token || senderUuids.length === 0) {
      return;
    }

    let cancelled = false;
    const roleCatalog = cdpClinicalRoleCatalog();

    const resolveSenders = async () => {
      const resolved = await Promise.all(
        senderUuids.map(async (senderUuid): Promise<[string, ClinicianSenderLabel]> => {
          try {
            const user = await fetchRegistryUser(token, activeActor, senderUuid);
            const displayName = registryUserDisplayName(user) || 'Care team';
            const roleLabel = clinicianRoleLabelForUserRoles(user.roles, roleCatalog);
            return [senderUuid, { displayName, roleLabel }];
          } catch (error) {
            swallowOptionalEnrichmentError(error);
            return [senderUuid, { displayName: 'Care team', roleLabel: '' }];
          }
        }),
      );

      if (cancelled) {
        return;
      }

      setClinicianSenders(previous => {
        const next = new Map(previous);
        for (const [senderUuid, label] of resolved) {
          next.set(senderUuid, label);
        }
        return next;
      });
    };

    void resolveSenders();
    return () => {
      cancelled = true;
    };
  }, [messages, token, activeActor, clinicianSenders]);

  useEffect(() => {
    if (!sending && !loadingHistory && !loadingInteractions) {
      focusChatInput();
    }
  }, [sending, loadingHistory, loadingInteractions, focusChatInput]);

  const clinicianBubbleLabel = (message: ChatMessage): string => {
    if (!message.senderUuid) {
      return 'Care team';
    }
    const sender = clinicianSenders.get(message.senderUuid);
    if (!sender) {
      return 'Care team';
    }
    if (sender.roleLabel) {
      return `${sender.displayName} · ${sender.roleLabel}`;
    }
    return sender.displayName;
  };

  const selectInteraction = async (interactionUuid: string) => {
    if (interactionUuid === activeInteractionUuid || sending) {
      return;
    }
    setActiveInteractionUuid(interactionUuid);
    await loadThreadHistory(interactionUuid);
    focusChatInput();
  };

  const startNewChat = async () => {
    if (!canLoadHistory || !patientUuid || sending || loadingInteractions) {
      return;
    }

    setError(null);
    setLoadingInteractions(true);
    try {
      const created = await createChatInteraction(token, activeActor, patientUuid, greetingName);
      setInteractions(prev => [created, ...prev]);
      setActiveInteractionUuid(created.chat_interaction_uuid);
      setLoadingHistory(true);
      if (assistantAvailable) {
        try {
          setMessages(await primeNewSession(created.chat_interaction_uuid));
        } catch (primeError) {
          if (isAssistantUnavailableError(primeError)) {
            setAssistantAvailable(false);
            setMessages([]);
          } else {
            throw primeError;
          }
        }
      } else {
        setMessages([]);
      }
    } catch (e) {
      setError(toUserFacingError(e, 'Failed to start a new chat'));
    } finally {
      setLoadingInteractions(false);
      setLoadingHistory(false);
      focusChatInput();
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending || !canSendMessages) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'patient',
      senderType: 'patient',
      senderUuid: patientUuid ?? null,
      content: text,
      createdAt: new Date(),
      time: '',
    };

    setInput('');
    setError(null);
    setSending(true);
    setMessages(prev => [...prev, userMsg]);
    focusChatInput();

    try {
      if (!CHAT_API || !patientUuid || !activeInteractionUuid) {
        setAssistantAvailable(false);
        setMessages(prev => prev.filter(message => message.id !== userMsg.id));
        return;
      }

      const result = await requestPatientCompletion(
        token,
        activeActor,
        patientUuid,
        activeInteractionUuid,
        {
          sender_uuid: patientUuid,
          content: text,
          ...(greetingName ? { patient_display_name: greetingName } : {}),
        },
      );
      if (result.intervention || !result.assistant_message) {
        if (result.user_message) {
          const persisted = toChatDisplayMessage(result.user_message);
          setMessages(prev => [
            ...prev.filter(message => message.id !== userMsg.id),
            persisted,
          ]);
        }
      } else {
        const assistantMsg = toChatDisplayMessage(result.assistant_message);
        setMessages(prev => [...prev, assistantMsg]);
      }
      await refreshInteractions();
    } catch (e) {
      if (isAssistantUnavailableError(e)) {
        setAssistantAvailable(false);
        setMessages(prev => prev.filter(message => message.id !== userMsg.id));
      } else {
        setError(toUserFacingError(e, 'Failed to get a response'));
        setMessages(prev => prev.filter(message => message.id !== userMsg.id));
      }
    } finally {
      setSending(false);
      focusChatInput();
    }
  };

  const conversationsChrome = (
    <ChatConversationsSidebar
      styles={pv}
      interactions={interactions}
      activeInteractionUuid={activeInteractionUuid}
      interventionThreadUuids={interventionThreadUuids}
      disabled={loadingHistory || sending}
      onSelect={(interactionUuid) => void selectInteraction(interactionUuid)}
      conversationsOpen={conversationsOpen}
      onConversationsOpenChange={setConversationsOpen}
      showDesktopSidebar={showDesktopSidebar}
      showConversationsPicker={showConversationsPicker}
    />
  );

  return (
    <div className={pv.chatLayoutClass}>
      <Card
        className={cn('flex-1 min-w-0 h-full min-h-0 flex flex-col overflow-hidden', pv.chatCardClass)}
        {...(pv.cardStyle ? { style: pv.cardStyle } : {})}
      >
        <CardHeader className={pv.chatCardHeaderClass} style={pv.headerStyle}>
          <div className="flex items-center justify-between gap-2 min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              {humanInterventionActive ? (
                <span
                  role="status"
                  aria-label="Care team active"
                  className={cn(
                    'shrink-0 text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-md',
                    pv.careTeamBadgeClass,
                  )}
                >
                  Care team
                </span>
              ) : null}
              {!humanInterventionActive && !assistantAvailable && canLoadHistory && !loadingHistory ? (
                <span
                  className={cn(
                    'shrink-0 text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-md',
                    pv.unavailableBadgeClass,
                  )}
                >
                  Unavailable
                </span>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {showConversationsPicker ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setConversationsOpen(true)}
                  disabled={loadingInteractions}
                  className={cn('h-8 px-2.5 text-xs md:hidden', pv.outlineButton)}
                >
                  Conversations
                </Button>
              ) : null}
              {canLoadHistory ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void startNewChat()}
                  disabled={sending || loadingInteractions}
                  className={cn('h-8 shrink-0 px-2.5 text-xs', pv.outlineButton)}
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                  New
                </Button>
              ) : null}
            </div>
          </div>
        </CardHeader>
        {!humanInterventionActive && !assistantAvailable && canLoadHistory && !loadingHistory ? (
          <div
            className={cn(pv.chatMobileAlertClass, pv.alertClass)}
            style={pv.alertStyle}
            role="status"
          >
            <p className={cn(pv.chatMobileAlertTextClass, pv.alertText)}>{ASSISTANT_UNAVAILABLE_MESSAGE}</p>
          </div>
        ) : null}
        <CardContent className="p-0 flex flex-1 flex-col min-h-0 overflow-hidden">
          <div
            ref={scrollRef}
            className={cn(pv.chatScrollAreaClass, pv.chatScrollClass)}
          >
            {loadingHistory && messages.length === 0 && (
              <div className="flex justify-center py-4 md:py-3">
                <p className={cn('text-xs md:text-sm', pv.mutedText)}>Loading your conversation…</p>
              </div>
            )}
            {messages.map((msg) => {
              const layout = chatDisplayBubbleLayout('patient', msg.role);
              const clinicianLabel =
                msg.role === 'clinician' ? clinicianBubbleLabel(msg) : null;
              const [clinicianName = '', ...clinicianRoleParts] = clinicianLabel
                ? clinicianLabel.split(' · ')
                : [];
              const clinicianRole = clinicianRoleParts.join(' · ');

              return (
                <ChatThreadMessageRow
                  key={msg.id}
                  content={msg.content}
                  time={msg.time}
                  layout={layout}
                  styles={pv}
                  title={
                    clinicianLabel ? (
                      <>
                        <span className="shrink-0 font-medium">{clinicianName}</span>
                        {clinicianRole ? (
                          <span className="truncate opacity-80">{` · ${clinicianRole}`}</span>
                        ) : null}
                      </>
                    ) : undefined
                  }
                />
              );
            })}
            {sending && !humanInterventionActive ? (
              <div className="flex justify-start">
                <div
                  className={cn(
                    'rounded-2xl rounded-bl-md px-4 py-3 text-sm',
                    pv.chatBubbleAssistantClass,
                    pv.mutedText,
                  )}
                  style={pv.chatBubbleAssistant()}
                >
                  <span className="inline-flex gap-1">
                    <span className="animate-pulse">●</span>
                    <span className="animate-pulse delay-75">●</span>
                    <span className="animate-pulse delay-150">●</span>
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          {error && (
            <p className="px-4 pb-2 text-xs text-red-400">{error}</p>
          )}

          <form
            className={cn(pv.chatComposeFormClass, pv.chatCardFooterClass, pv.formFooterClass)}
            style={pv.formFooterStyle}
            onSubmit={e => {
              e.preventDefault();
              void sendMessage();
            }}
          >
            <Input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void sendMessage();
                }
              }}
              placeholder={
                canSendMessages ? 'Type your message…' : 'Care assistant is unavailable'
              }
              disabled={loadingHistory || loadingInteractions || !canSendMessages}
              className={cn(pv.chatComposeInputClass, pv.inputClass)}
              autoComplete="off"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => void sendMessage()}
              disabled={
                sending || loadingHistory || loadingInteractions || !canSendMessages || !input.trim()
              }
              className={cn('chat-send-button', pv.sendButtonClass)}
              style={pv.sendButtonStyle}
            >
              <PaperAirplaneIcon className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
      {conversationsChrome}
    </div>
  );
}
