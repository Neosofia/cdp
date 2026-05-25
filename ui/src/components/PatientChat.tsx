import { useState, useRef } from 'react';
import { useScrollToBottom } from '@/lib/useScrollToBottom';
import {
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const CHAT_API = import.meta.env.VITE_CHAT_API_URL;

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

interface Props {
  token: string;
  activeRole: string;
  patientName?: string;
}

const WELCOME: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
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
    return 'Your most recent record is a Complete Metabolic Panel from Jun 22, 2026. Open **Review records** from the Patient menu for the full searchable list.';
  }
  return `Thanks for your message. I've noted: "${userText.slice(0, 120)}${userText.length > 120 ? '…' : ''}". In production this will route to the platform AI agent with your care-episode context.`;
}

async function fetchAssistantReply(
  messages: ChatMessage[],
  token: string,
  activeRole: string,
): Promise<string> {
  if (!CHAT_API) {
    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
    return stubReply(lastUser?.content ?? '', undefined);
  }

  const res = await fetch(`${CHAT_API}/api/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Active-Role': activeRole,
    },
    body: JSON.stringify({
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    }),
  });

  if (!res.ok) {
    throw new Error(`Chat API returned ${res.status}`);
  }

  const data = (await res.json()) as { content?: string; message?: string };
  return data.content ?? data.message ?? 'No response from assistant.';
}

export default function PatientChat({ token, activeRole, patientName }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useScrollToBottom<HTMLDivElement>([messages, sending]);
  const inputRef = useRef<HTMLInputElement>(null);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      createdAt: new Date(),
    };

    setInput('');
    setError(null);
    setSending(true);
    setMessages(prev => [...prev, userMsg]);

    try {
      let reply: string;
      if (CHAT_API) {
        reply = await fetchAssistantReply([...messages, userMsg], token, activeRole);
      } else {
        await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
        reply = stubReply(text, patientName);
      }

      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: reply,
          createdAt: new Date(),
        },
      ]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to get a response';
      setError(msg);
      setMessages(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Sorry — I couldn't reach the assistant (${msg}). Please try again.`,
          createdAt: new Date(),
        },
      ]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const cardStyle = {
    background: 'rgba(5,5,15,0.7)',
    border: '1px solid rgba(34,211,238,0.18)',
    boxShadow: '0 0 40px rgba(34,211,238,0.05)',
  };

  return (
    <Card
      className="gap-0 py-0 col-span-2 h-full min-h-0 flex flex-col overflow-hidden"
      style={cardStyle}
    >
      <CardHeader
        className="py-4"
        style={{ borderBottom: '1px solid rgba(34,211,238,0.12)', background: 'rgba(34,211,238,0.03)' }}
      >
        <CardTitle className="text-lg flex items-center gap-2" style={{ color: '#22d3ee' }}>
          <ChatBubbleLeftRightIcon className="h-5 w-5" />
          Care assistant
          {!CHAT_API && (
            <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-md ml-2 text-slate-400 border border-slate-600">
              Stub
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex flex-1 flex-col min-h-0 overflow-hidden">
        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-4 py-4 pb-6 space-y-4"
        >
          {messages.map(msg => (
            <div
              key={msg.id}
              className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
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
                {msg.role === 'assistant' && (
                  <SparklesIcon className="h-4 w-4 mb-1.5 inline-block mr-1.5" style={{ color: '#a855f7' }} />
                )}
                <span className="whitespace-pre-wrap">{msg.content}</span>
                <div className="text-[10px] mt-2 opacity-50 text-right">
                  {msg.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
          {sending && (
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
          )}
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
            placeholder="Type your message…"
            disabled={sending}
            className="flex-1 h-10 bg-slate-900/60 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:border-cyan-500/50 focus-visible:ring-cyan-500/20"
            autoComplete="off"
          />
          <Button
            type="submit"
            disabled={sending || !input.trim()}
            className="shrink-0 text-white"
            style={{ background: 'linear-gradient(135deg, #22d3ee 0%, #a855f7 100%)' }}
          >
            <PaperAirplaneIcon className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
