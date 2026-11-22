'use client';

import React, { useRef, useState } from 'react';
import { useSelector } from 'react-redux';

interface ActionRequest {
  name: string;
  args: Record<string, unknown>;
  description?: string;
}

interface InterruptPayload {
  action_requests?: ActionRequest[];
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  interrupts?: InterruptPayload[];
}

interface AgentTurnResponse {
  thread_id: string;
  status: 'completed' | 'interrupted';
  interrupts?: InterruptPayload[];
  reply?: string;
}

const AGENT_TURN_URL =
  process.env.NEXT_PUBLIC_AGENT_TURN_URL || 'http://localhost:8000/api/agent/turn';

export default function AiChatWidget() {
  const userState = useSelector((state: any) => state?.user || {});

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [threadId, setThreadId] = useState<string>(() =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? `thread-${crypto.randomUUID()}`
      : `thread-${Date.now()}`
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeInterrupts, setActiveInterrupts] = useState<InterruptPayload[] | null>(
    null
  );

  const listEndRef = useRef<HTMLDivElement | null>(null);

  const getAuthContext = () => {
    const token =
      userState?.token ||
      (typeof window !== 'undefined' ? localStorage.getItem('token') : '') ||
      '';
    const role =
      userState?.role ||
      (typeof window !== 'undefined' ? localStorage.getItem('userChoice') : '') ||
      '';
    const userId =
      userState?.id ||
      userState?._id ||
      (typeof window !== 'undefined' ? localStorage.getItem('userId') : '') ||
      '';

    return { token, role, userId };
  };

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
  };

  const postTurn = async (payload: {
    message?: string;
    resume_decision?: Record<string, unknown>;
  }) => {
    const { token, role, userId } = getAuthContext();
    setLoading(true);

    try {
      const res = await fetch(AGENT_TURN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thread_id: threadId,
          message: payload.message ?? null,
          resume_decision: payload.resume_decision ?? null,
          role: role || null,
          user_id: userId || null,
          auth_token: token || null,
        }),
      });

      if (!res.ok) {
        throw new Error(`Agent request failed with status ${res.status}`);
      }

      const data: AgentTurnResponse = await res.json();

      if (data.status === 'interrupted' && data.interrupts?.length) {
        setActiveInterrupts(data.interrupts);
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}-int`,
            role: 'assistant',
            content:
              data.reply ||
              'Action requires your confirmation before executing.',
            interrupts: data.interrupts,
          },
        ]);
      } else {
        setActiveInterrupts(null);
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}-bot`,
            role: 'assistant',
            content: data.reply || 'Done.',
          },
        ]);
      }
    } catch (err: any) {
      setActiveInterrupts(null);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}-err`,
          role: 'assistant',
          content: err?.message || 'Error communicating with AI Helper.',
        },
      ]);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    setInput('');
    setMessages((prev) => [
      ...prev,
      { id: `msg-${Date.now()}-usr`, role: 'user', content: trimmed },
    ]);
    scrollToBottom();

    await postTurn({ message: trimmed });
  };

  const handleDecision = async (decisionType: 'approve' | 'reject') => {
    if (loading || !activeInterrupts) return;

    const decision =
      decisionType === 'approve'
        ? { decisions: [{ type: 'approve' }] }
        : {
            decisions: [
              { type: 'reject', message: 'User rejected action in chat widget.' },
            ],
          };

    setMessages((prev) => [
      ...prev,
      {
        id: `msg-${Date.now()}-dec`,
        role: 'user',
        content: decisionType === 'approve' ? 'Approved action.' : 'Rejected action.',
      },
    ]);

    const currentInterrupts = activeInterrupts;
    setActiveInterrupts(null);
    await postTurn({ resume_decision: decision });
    void currentInterrupts;
  };

  const handleResetThread = () => {
    const nextId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? `thread-${crypto.randomUUID()}`
        : `thread-${Date.now()}`;
    setThreadId(nextId);
    setMessages([]);
    setActiveInterrupts(null);
  };

  return (
    <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1050 }}>
      {!isOpen ? (
        <button
          type="button"
          className="btn btn-primary rounded-pill shadow px-4 py-2"
          onClick={() => setIsOpen(true)}
        >
          AI Helper
        </button>
      ) : (
        <div
          className="card shadow-lg border"
          style={{ width: 370, maxHeight: '75vh', display: 'flex', flexDirection: 'column' }}
        >
          <div className="card-header d-flex justify-content-between align-items-center py-2">
            <div>
              <strong>AI Helper</strong>
              <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                Thread: {threadId.slice(0, 16)}...
              </div>
            </div>
            <div className="d-flex gap-1">
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={handleResetThread}
                disabled={loading}
              >
                New Chat
              </button>
              <button
                type="button"
                className="btn btn-sm btn-close"
                aria-label="Close"
                onClick={() => setIsOpen(false)}
              />
            </div>
          </div>

          <div
            className="card-body overflow-auto d-flex flex-column gap-2"
            style={{ flex: 1 }}
          >
            {messages.map((m) => (
              <div
                key={m.id}
                className={`p-2 rounded ${
                  m.role === 'user'
                    ? 'bg-primary text-white align-self-end'
                    : 'bg-light text-dark align-self-start border'
                }`}
                style={{ maxWidth: '88%', whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}
              >
                <div>{m.content}</div>

                {m.interrupts && m.interrupts.length > 0 && activeInterrupts && (
                  <div className="mt-2 pt-2 border-top">
                    {m.interrupts.flatMap((intr, idx) =>
                      (intr.action_requests || []).map((act, aIdx) => (
                        <div key={`${idx}-${aIdx}`} className="mb-2">
                          <div className="fw-semibold" style={{ fontSize: '0.8rem' }}>
                            Pending Tool: {act.name}
                          </div>
                          <pre
                            className="bg-white p-1 border rounded mt-1 mb-0"
                            style={{ fontSize: '0.72rem', maxHeight: 110, overflow: 'auto' }}
                          >
                            {JSON.stringify(act.args, null, 2)}
                          </pre>
                        </div>
                      ))
                    )}

                    <div className="d-flex gap-2 mt-2">
                      <button
                        type="button"
                        className="btn btn-sm btn-success"
                        disabled={loading}
                        onClick={() => handleDecision('approve')}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        disabled={loading}
                        onClick={() => handleDecision('reject')}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="text-muted small align-self-start">Thinking...</div>
            )}
            <div ref={listEndRef} />
          </div>

          <form onSubmit={handleSend} className="card-footer d-flex gap-2 p-2">
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Ask about houses or bookings..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading || Boolean(activeInterrupts)}
            />
            <button
              type="submit"
              className="btn btn-sm btn-primary"
              disabled={loading || Boolean(activeInterrupts) || !input.trim()}
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}