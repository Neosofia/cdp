import { useCallback, useEffect, useState, useRef } from 'react';
import {
  createChatInteraction,
  fetchChatMeta,
  formatChatInteractionActivityDate,
  formatChatInteractionLabel,
  interactionsWithIntervention,
  isAssistantUnavailableError,
  loadPatientChatHistory,
  listChatInteractions,
  requestChatSessionStart,
  requestPatientCompletion,
  threadMessagesHaveIntervention,
  toPatientThreadMessage,
  type ChatInteraction,
  type PatientThreadMessage,
} from '@/lib/chatApi';
import { cdpClinicalRoleCatalog, clinicianRoleLabelForUserRoles } from '@/lib/roleCatalogApi';
import {
  fetchRegistryUser,
  registryUserDisplayName,
} from '@/lib/userRegistryApi';
import { useScrollToBottom } from '@/lib/useScrollToBottom';
import {
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  PlusIcon,
  SparklesIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import ChatMessageContent from '@/components/ChatMessageContent';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const CHAT_API = import.meta.env.VITE_CHAT_API_URL;

type ChatMessage = PatientThreadMessage;

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
  patientName: _patientName,
  patientUuid,
  tenantName: _tenantName,
}: Props) {
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
  const scrollRef = useScrollToBottom<HTMLDivElement>([messages, sending, loadingHistory]);
  const inputRef = useRef<HTMLInputElement>(null);

  const showSidebar = canLoadHistory && interactions.length >= 2;
  const humanInterventionActive = threadMessagesHaveIntervention(messages);
  const canSendMessages = humanInterventionActive || assistantAvailable;

  const primeNewSession = useCallback(
    async (interactionUuid: string): Promise<ChatMessage[]> => {
      if (!patientUuid) {
        return [];
      }
      const result = await requestChatSessionStart(token, activeActor, patientUuid, interactionUuid);
      if (result.assistant_message) {
        return [toPatientThreadMessage(result.assistant_message)];
      }
      if (result.message) {
        return [
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            senderType: 'ai_agent',
            content: result.message,
            createdAt: new Date(),
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
          if (threadMessagesHaveIntervention(history)) {
            next.add(interactionUuid);
          } else {
            next.delete(interactionUuid);
          }
          return next;
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to load chat history';
        setError(msg);
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
          const created = await createChatInteraction(token, activeActor, patientUuid);
          if (cancelled) return;
          items = [created];
        }

        setInteractions(items);
        const selected = items[0]?.chat_interaction_uuid ?? null;
        setActiveInteractionUuid(selected);

        if (selected) {
          const history = await loadPatientChatHistory(token, activeActor, patientUuid, selected);
          if (cancelled) return;
          if (history.length > 0) {
            setMessages(history);
          } else if (assistantReady) {
            try {
              setMessages(await primeNewSession(selected));
            } catch (primeError) {
              if (isAssistantUnavailableError(primeError)) {
                setAssistantAvailable(false);
                setError(ASSISTANT_UNAVAILABLE_MESSAGE);
                setMessages([]);
              } else {
                throw primeError;
              }
            }
          } else {
            setError(ASSISTANT_UNAVAILABLE_MESSAGE);
            setMessages([]);
          }
        } else {
          setMessages([]);
        }
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : 'Failed to load conversations';
        setError(msg);
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
          .filter(message => message.senderType === 'clinician' && message.senderUuid)
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
          } catch {
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
      const created = await createChatInteraction(token, activeActor, patientUuid);
      setInteractions(prev => [created, ...prev]);
      setActiveInteractionUuid(created.chat_interaction_uuid);
      setLoadingHistory(true);
      if (assistantAvailable) {
        try {
          setMessages(await primeNewSession(created.chat_interaction_uuid));
        } catch (primeError) {
          if (isAssistantUnavailableError(primeError)) {
            setAssistantAvailable(false);
            setError(ASSISTANT_UNAVAILABLE_MESSAGE);
            setMessages([]);
          } else {
            throw primeError;
          }
        }
      } else {
        setError(ASSISTANT_UNAVAILABLE_MESSAGE);
        setMessages([]);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to start a new chat';
      setError(msg);
    } finally {
      setLoadingInteractions(false);
      setLoadingHistory(false);
      focusChatInput();
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      senderType: 'patient',
      content: text,
      createdAt: new Date(),
    };

    setInput('');
    setError(null);
    setSending(true);
    setMessages(prev => [...prev, userMsg]);
    focusChatInput();

    try {
      if (!CHAT_API || !patientUuid || !activeInteractionUuid) {
        setAssistantAvailable(false);
        setError(ASSISTANT_UNAVAILABLE_MESSAGE);
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
        },
      );
      if (result.intervention || !result.assistant_message) {
        if (result.user_message) {
          const persisted = toPatientThreadMessage(result.user_message);
          setMessages(prev => [
            ...prev.filter(message => message.id !== userMsg.id),
            persisted,
          ]);
        }
      } else {
        const assistantMsg = toPatientThreadMessage(result.assistant_message);
        setMessages(prev => [...prev, assistantMsg]);
      }
      await refreshInteractions();
    } catch (e) {
      if (isAssistantUnavailableError(e)) {
        setAssistantAvailable(false);
        setError(ASSISTANT_UNAVAILABLE_MESSAGE);
        setMessages(prev => prev.filter(message => message.id !== userMsg.id));
      } else {
        const msg = e instanceof Error ? e.message : 'Failed to get a response';
        setError(msg);
        setMessages(prev => prev.filter(message => message.id !== userMsg.id));
      }
    } finally {
      setSending(false);
      focusChatInput();
    }
  };

  const cardStyle = {
    background: 'rgba(5,5,15,0.7)',
    border: '1px solid rgba(34,211,238,0.18)',
    boxShadow: '0 0 40px rgba(34,211,238,0.05)',
  };

  const sidebarStyle = {
    background: 'rgba(5,5,15,0.85)',
    borderLeft: '1px solid rgba(34,211,238,0.12)',
  };

  const conversationsSidebar = showSidebar ? (
    <aside className="w-64 shrink-0 flex flex-col min-h-0 overflow-hidden" style={sidebarStyle}>
      <div className="px-3 py-3 border-b" style={{ borderColor: 'rgba(34,211,238,0.12)' }}>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Conversations</p>
      </div>
      <nav className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain py-2 px-2 space-y-1">
        {interactions.map(interaction => {
          const isActive = interaction.chat_interaction_uuid === activeInteractionUuid;
          const activityDate = formatChatInteractionActivityDate(interaction);
          const threadHasIntervention = interventionThreadUuids.has(interaction.chat_interaction_uuid);
          return (
            <button
              key={interaction.chat_interaction_uuid}
              type="button"
              onClick={() => void selectInteraction(interaction.chat_interaction_uuid)}
              disabled={loadingHistory || sending}
              className={cn(
                'w-full text-left rounded-lg px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'text-cyan-200 bg-cyan-500/15 border border-cyan-500/30'
                  : threadHasIntervention
                    ? 'text-slate-300 hover:bg-slate-800/60 border border-amber-500/25 bg-amber-500/5'
                    : 'text-slate-300 hover:bg-slate-800/60 border border-transparent',
              )}
            >
              <span className="flex items-start gap-2 min-w-0">
                <span className="block truncate font-medium flex-1 min-w-0">
                  {formatChatInteractionLabel(interaction)}
                </span>
                {threadHasIntervention ? (
                  <span
                    className="shrink-0 inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-amber-200/90 bg-amber-500/15 border border-amber-500/25"
                    title="Your care team is responding in this conversation"
                  >
                    <UserGroupIcon className="h-3 w-3" aria-hidden />
                    Care team
                  </span>
                ) : null}
              </span>
              {activityDate ? (
                <span className="block text-[10px] mt-1 opacity-60">{activityDate}</span>
              ) : null}
            </button>
          );
        })}
      </nav>
    </aside>
  ) : null;

  return (
    <div className="col-span-2 h-full min-h-0 flex overflow-hidden">
      <Card
        className="gap-0 py-0 flex-1 min-w-0 h-full min-h-0 flex flex-col overflow-hidden"
        style={cardStyle}
      >
        <CardHeader
          className="py-4"
          style={{ borderBottom: '1px solid rgba(34,211,238,0.12)', background: 'rgba(34,211,238,0.03)' }}
        >
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-lg flex items-center gap-2" style={{ color: '#22d3ee' }}>
              <ChatBubbleLeftRightIcon className="h-5 w-5" />
              Care assistant
              {canLoadHistory && !assistantAvailable && !humanInterventionActive && (
                <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-md ml-2 text-amber-200/90 border border-amber-500/30 bg-amber-500/10">
                  Unavailable
                </span>
              )}
            </CardTitle>
            {canLoadHistory && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void startNewChat()}
                disabled={sending || loadingInteractions}
                className="shrink-0 border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/10 hover:text-cyan-100"
              >
                <PlusIcon className="h-4 w-4 mr-1.5" />
                New chat
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0 flex flex-1 flex-col min-h-0 overflow-hidden">
          <div
            ref={scrollRef}
            className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-4 py-4 pb-6 space-y-4"
          >
            {loadingHistory && messages.length === 0 && (
              <div className="flex justify-center py-8">
                <p className="text-sm text-slate-400">Loading your conversation…</p>
              </div>
            )}
            {messages.map(msg => {
              const clinicianLabel =
                msg.role === 'assistant' && msg.senderType === 'clinician'
                  ? clinicianBubbleLabel(msg)
                  : null;
              const [clinicianName = '', ...clinicianRoleParts] = clinicianLabel
                ? clinicianLabel.split(' · ')
                : [];
              const clinicianRole = clinicianRoleParts.join(' · ');

              return (
              <div
                key={msg.id}
                className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-4 py-3 text-base leading-relaxed',
                    msg.role === 'user'
                      ? 'text-white rounded-br-md'
                      : 'text-slate-200 rounded-bl-md',
                  )}
                  style={
                    msg.role === 'user'
                      ? {
                          background: 'linear-gradient(135deg, rgba(34,211,238,0.35) 0%, rgba(168,85,247,0.35) 100%)',
                          border: '1px solid rgba(34,211,238,0.25)',
                        }
                      : {
                          background: 'rgba(15,23,42,0.8)',
                          border: '1px solid rgba(34,211,238,0.12)',
                        }
                  }
                >
                  {msg.role === 'assistant' && msg.senderType === 'ai_agent' && (
                    <SparklesIcon className="h-4 w-4 mb-1.5 inline-block mr-1.5" style={{ color: '#a855f7' }} />
                  )}
                  {clinicianLabel ? (
                    <div className="text-xs mb-1.5 leading-snug">
                      <span className="font-medium text-cyan-200/90">{clinicianName}</span>
                      {clinicianRole ? (
                        <span className="text-slate-400">{` · ${clinicianRole}`}</span>
                      ) : null}
                    </div>
                  ) : null}
                  <ChatMessageContent content={msg.content} markdown={msg.role === 'assistant'} />
                  <div className="text-[10px] mt-2 opacity-50 text-right">
                    {msg.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
              );
            })}
            {!humanInterventionActive && !assistantAvailable && canLoadHistory && !loadingHistory ? (
              <div
                className="mx-auto max-w-md rounded-xl px-4 py-3 text-center"
                style={{
                  background: 'rgba(245,158,11,0.08)',
                  border: '1px solid rgba(245,158,11,0.22)',
                }}
              >
                <p className="text-xs text-amber-100/90 leading-relaxed">
                  {ASSISTANT_UNAVAILABLE_MESSAGE}
                </p>
              </div>
            ) : null}
            {humanInterventionActive ? (
              <div
                className="mx-auto max-w-md rounded-xl px-4 py-3 text-center space-y-2"
                style={{
                  background: 'rgba(245,158,11,0.08)',
                  border: '1px solid rgba(245,158,11,0.22)',
                }}
              >
                <p className="text-xs text-amber-100/90 leading-relaxed">
                  Your care team is responding directly in this conversation. The care assistant is
                  paused here — you can still message your clinicians, and this thread stays in your
                  conversations list.
                </p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  To chat with the care assistant, start a new conversation.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void startNewChat()}
                  disabled={sending || loadingInteractions}
                  className="border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/10 hover:text-cyan-100"
                >
                  <SparklesIcon className="h-4 w-4 mr-1.5" />
                  New chat with assistant
                </Button>
              </div>
            ) : null}
            {sending && !humanInterventionActive ? (
              <div className="flex justify-start">
                <div
                  className="rounded-2xl rounded-bl-md px-4 py-3 text-sm text-slate-400"
                  style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(34,211,238,0.12)' }}
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
            className="flex gap-2 p-4 border-t"
            style={{ borderColor: 'rgba(34,211,238,0.12)', background: 'rgba(34,211,238,0.02)' }}
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
              className="flex-1 h-10 bg-slate-900/60 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:border-cyan-500/50 focus-visible:ring-cyan-500/20"
              autoComplete="off"
            />
            <Button
              type="button"
              onClick={() => void sendMessage()}
              disabled={
                sending || loadingHistory || loadingInteractions || !canSendMessages || !input.trim()
              }
              className="shrink-0 text-white"
              style={{ background: 'linear-gradient(135deg, #22d3ee 0%, #a855f7 100%)' }}
            >
              <PaperAirplaneIcon className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
      {conversationsSidebar}
    </div>
  );
}
