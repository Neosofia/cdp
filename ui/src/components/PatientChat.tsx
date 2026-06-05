import { useCallback, useEffect, useState, useRef } from 'react';
import { listCareEpisodeSessions } from '@/lib/careEpisodeApi';
import {
  buildPatientChatInteractionContext,
  createChatInteraction,
  formatChatInteractionActivityDate,
  formatChatInteractionLabel,
  interactionsWithClinicianEngagement,
  loadPatientChatHistory,
  listChatInteractions,
  requestChatSessionStart,
  requestPatientCompletion,
  threadMessagesHaveClinicianIntervention,
  toPatientThreadMessage,
  type ChatInteraction,
  type ChatInteractionContext,
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

interface EpisodeContext {
  surgery?: string;
  procedureDate?: string;
  daysPostOp?: number;
}

interface Props {
  token: string;
  activeActor: string;
  patientName?: string;
  patientUuid?: string;
  careEpisodeUuid?: string;
  tenantName?: string;
}

const WELCOME: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  senderType: 'ai_agent',
  content:
    "Hi — I'm your care assistant. Ask about symptoms, medications, appointments, or your health records. This is a demo chat; responses are stubbed until the chat service is connected.",
  createdAt: new Date(),
};

function stubReply(userText: string, patientName?: string): string {
  const q = userText.toLowerCase();
  const name = patientName ? patientName.split(' ')[0] : 'there';

  if (/\b(hello|hi|hey)\b/.test(q)) {
    return `Hello ${name}. How can I help you today?`;
  }
  if (/\b(pain|hurt|symptom)\b/.test(q)) {
    return "I'm not a substitute for emergency care. For new or worsening symptoms, contact your care team or call emergency services. I can help you prepare questions for your clinician — what are you experiencing?";
  }
  if (/\b(medication|medicine|prescription|metformin|pill)\b/.test(q)) {
    return 'Your active prescriptions include Metformin 500 mg (twice daily) and Lisinopril 10 mg (once daily). Always follow your clinician\'s instructions and report side effects promptly.';
  }
  if (/\b(appointment|visit|schedule)\b/.test(q)) {
    return 'Your next confirmed appointment is Jun 27 at 10:30 AM with Dr. Sarah Chen (Primary Care). You also have a pending cardiology visit on Jul 3.';
  }
  if (/\b(lab|result|record)\b/.test(q)) {
    return 'Your most recent record is a Complete Metabolic Panel from Jun 22, 2026. Open **Health records** on your dashboard for the full searchable list.';
  }
  return `Thanks for your message. I've noted: "${userText.slice(0, 120)}${userText.length > 120 ? '…' : ''}". In production this will route to the platform AI agent with your care-episode context.`;
}

export default function PatientChat({
  token,
  activeActor,
  patientName,
  patientUuid,
  careEpisodeUuid,
  tenantName,
}: Props) {
  const canLoadHistory = Boolean(CHAT_API && patientUuid && careEpisodeUuid);
  const [episodeContext, setEpisodeContext] = useState<EpisodeContext>({});
  const [interactions, setInteractions] = useState<ChatInteraction[]>([]);
  const [activeInteractionUuid, setActiveInteractionUuid] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(canLoadHistory ? [] : [WELCOME]);
  const [loadingHistory, setLoadingHistory] = useState(canLoadHistory);
  const [loadingInteractions, setLoadingInteractions] = useState(canLoadHistory);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clinicianSenders, setClinicianSenders] = useState<Map<string, ClinicianSenderLabel>>(
    () => new Map(),
  );
  const [clinicianEngagedUuids, setClinicianEngagedUuids] = useState<Set<string>>(
    () => new Set(),
  );
  const scrollRef = useScrollToBottom<HTMLDivElement>([messages, sending, loadingHistory]);
  const inputRef = useRef<HTMLInputElement>(null);

  const showSidebar = canLoadHistory && interactions.length >= 2;
  const careTeamResponding = threadMessagesHaveClinicianIntervention(messages);

  const buildInteractionContext = useCallback((): ChatInteractionContext => {
    return buildPatientChatInteractionContext({
      patientName,
      patientUuid,
      careEpisodeUuid,
      tenantName,
      surgery: episodeContext.surgery,
      procedureDate: episodeContext.procedureDate,
      daysPostOp: episodeContext.daysPostOp,
    });
  }, [patientName, patientUuid, careEpisodeUuid, tenantName, episodeContext]);

  const primeNewSession = useCallback(
    async (interactionUuid: string): Promise<ChatMessage[]> => {
      try {
        const result = await requestChatSessionStart(token, activeActor, {
          chat_interaction_uuid: interactionUuid,
        });
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
      } catch (primeError) {
        console.warn('Chat session start failed; using local welcome', primeError);
      }
      return [WELCOME];
    },
    [token, activeActor],
  );

  const refreshInteractions = useCallback(async () => {
    if (!canLoadHistory || !patientUuid || !careEpisodeUuid) {
      return [];
    }
    const items = await listChatInteractions(token, activeActor, patientUuid, careEpisodeUuid);
    setInteractions(items);
    return items;
  }, [token, activeActor, patientUuid, careEpisodeUuid, canLoadHistory]);

  const loadThreadHistory = useCallback(
    async (interactionUuid: string) => {
      setLoadingHistory(true);
      setError(null);
      try {
        const history = await loadPatientChatHistory(token, activeActor, interactionUuid);
        setMessages(history.length > 0 ? history : [WELCOME]);
        setClinicianEngagedUuids(previous => {
          const next = new Set(previous);
          if (threadMessagesHaveClinicianIntervention(history)) {
            next.add(interactionUuid);
          } else {
            next.delete(interactionUuid);
          }
          return next;
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to load chat history';
        setError(msg);
        setMessages([WELCOME]);
      } finally {
        setLoadingHistory(false);
      }
    },
    [token, activeActor],
  );

  useEffect(() => {
    if (!canLoadHistory || !patientUuid || !careEpisodeUuid) {
      return;
    }

    let cancelled = false;

    const bootstrap = async () => {
      setLoadingInteractions(true);
      setLoadingHistory(true);
      setError(null);

      try {
        const [itemsResult, sessions] = await Promise.all([
          listChatInteractions(token, activeActor, patientUuid, careEpisodeUuid),
          listCareEpisodeSessions(token, activeActor).catch(() => []),
        ]);
        if (cancelled) return;

        const session = sessions.find(entry => entry.patient_uuid === patientUuid);
        const nextEpisodeContext: EpisodeContext = session
          ? {
              surgery: session.surgery,
              procedureDate: session.procedure_date,
              daysPostOp: session.days_post_op,
            }
          : {};
        setEpisodeContext(nextEpisodeContext);

        let items = itemsResult;
        if (items.length === 0) {
          const context = buildPatientChatInteractionContext({
            patientName,
            patientUuid,
            careEpisodeUuid,
            tenantName,
            surgery: nextEpisodeContext.surgery,
            procedureDate: nextEpisodeContext.procedureDate,
            daysPostOp: nextEpisodeContext.daysPostOp,
          });
          const created = await createChatInteraction(
            token,
            activeActor,
            patientUuid,
            careEpisodeUuid,
            context,
          );
          if (cancelled) return;
          items = [created];
        }

        setInteractions(items);
        const selected = items[0]?.chat_interaction_uuid ?? null;
        setActiveInteractionUuid(selected);

        if (selected) {
          const history = await loadPatientChatHistory(token, activeActor, selected);
          if (cancelled) return;
          if (history.length > 0) {
            setMessages(history);
          } else {
            setMessages(await primeNewSession(selected));
          }
        } else {
          setMessages([WELCOME]);
        }
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : 'Failed to load conversations';
        setError(msg);
        setMessages([WELCOME]);
      } finally {
        if (!cancelled) {
          setLoadingInteractions(false);
          setLoadingHistory(false);
        }
      }
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [token, activeActor, patientUuid, careEpisodeUuid, patientName, tenantName, canLoadHistory, primeNewSession]);

  useEffect(() => {
    if (!canLoadHistory || interactions.length < 2) {
      return;
    }

    let cancelled = false;
    const interactionUuids = interactions.map(
      interaction => interaction.chat_interaction_uuid,
    );

    void interactionsWithClinicianEngagement(token, activeActor, interactionUuids).then(
      engaged => {
        if (!cancelled) {
          setClinicianEngagedUuids(engaged);
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [interactions, token, activeActor, canLoadHistory]);

  useEffect(() => {
    if (!careTeamResponding || !activeInteractionUuid) {
      return;
    }
    setClinicianEngagedUuids(previous => {
      if (previous.has(activeInteractionUuid)) {
        return previous;
      }
      const next = new Set(previous);
      next.add(activeInteractionUuid);
      return next;
    });
  }, [careTeamResponding, activeInteractionUuid]);

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
    if (!canLoadHistory || !patientUuid || !careEpisodeUuid || sending || loadingInteractions) {
      return;
    }

    setError(null);
    setLoadingInteractions(true);
    try {
      const created = await createChatInteraction(
        token,
        activeActor,
        patientUuid,
        careEpisodeUuid,
        buildInteractionContext(),
      );
      setInteractions(prev => [created, ...prev]);
      setActiveInteractionUuid(created.chat_interaction_uuid);
      setLoadingHistory(true);
      setMessages(await primeNewSession(created.chat_interaction_uuid));
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
      if (CHAT_API && patientUuid && careEpisodeUuid && activeInteractionUuid) {
        const result = await requestPatientCompletion(token, activeActor, {
          chat_interaction_uuid: activeInteractionUuid,
          sender_uuid: patientUuid,
          content: text,
        });
        if (result.ai_disabled || !result.assistant_message) {
          if (result.patient_message) {
            const persisted = toPatientThreadMessage(result.patient_message);
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
      } else {
        await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
        const reply = stubReply(text, patientName);
        setMessages(prev => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            senderType: 'ai_agent',
            content: reply,
            createdAt: new Date(),
          },
        ]);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to get a response';
      setError(msg);
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          senderType: 'ai_agent',
          content: `Sorry — I couldn't reach the assistant (${msg}). Please try again.`,
          createdAt: new Date(),
        },
      ]);
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
          const careTeamEngaged = clinicianEngagedUuids.has(interaction.chat_interaction_uuid);
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
                  : careTeamEngaged
                    ? 'text-slate-300 hover:bg-slate-800/60 border border-amber-500/25 bg-amber-500/5'
                    : 'text-slate-300 hover:bg-slate-800/60 border border-transparent',
              )}
            >
              <span className="flex items-start gap-2 min-w-0">
                <span className="block truncate font-medium flex-1 min-w-0">
                  {formatChatInteractionLabel(interaction)}
                </span>
                {careTeamEngaged ? (
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
              {!CHAT_API && (
                <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-md ml-2 text-slate-400 border border-slate-600">
                  Stub
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
            {careTeamResponding ? (
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
            {sending && !careTeamResponding ? (
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
              placeholder="Type your message…"
              disabled={loadingHistory || loadingInteractions}
              className="flex-1 h-10 bg-slate-900/60 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:border-cyan-500/50 focus-visible:ring-cyan-500/20"
              autoComplete="off"
            />
            <Button
              type="button"
              onClick={() => void sendMessage()}
              disabled={sending || loadingHistory || loadingInteractions || !input.trim()}
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
