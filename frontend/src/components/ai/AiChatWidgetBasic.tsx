// FILE: app/components/ai/AiChatWidget.tsx
"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import { useAppSelector } from "@/store/hooks";
import styles from "./AiChatWidget.module.css";

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
}

const AGENT_STREAM_URL =
  process.env.NEXT_PUBLIC_AI_AGENT_URL || "http://localhost:8000/api/agent/stream";

export default function AiChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  const reduxRole = useAppSelector((state) => state.user.role);
  const reduxUserId = useAppSelector((state) => state.user.id);
  const isAuthenticated = useAppSelector((state) => state.user.isAuthenticated);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-msg",
      sender: "assistant",
      text: "Hi! Ask me to search available houses or check your listings and bookings.",
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  if (!hasMounted) {
    return null;
  }

  const localRole = localStorage.getItem("userChoice");
  const localToken = localStorage.getItem("token");
  const localUserId = localStorage.getItem("userId");

  const activeRole = reduxRole || localRole;
  const activeUserId = reduxUserId || localUserId || null;
  const loggedIn = isAuthenticated || !!localToken;

  // Show the assistant only for authenticated users
  if (!loggedIn || !activeRole) {
    return null;
  }

  const quickPrompts =
    activeRole === "Owner"
      ? ["Show my listed houses and bookings", "Do I have any booked properties?"]
      : ["Find available houses in Valencia under 1000", "Show houses with at least 3 rooms"];

  const sendMessage = async (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed || isStreaming) return;

    const userMsgId = `user-${Date.now()}`;
    const assistantMsgId = `assistant-${Date.now() + 1}`;

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, sender: "user", text: trimmed },
      { id: assistantMsgId, sender: "assistant", text: "" },
    ]);
    setInput("");
    setIsStreaming(true);

    try {
      const response = await fetch(AGENT_STREAM_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmed,
          role: activeRole,
          user_id: activeUserId,
          auth_token: localToken,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Agent service error (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let sseBuffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });
        const events = sseBuffer.split("\n\n");
        sseBuffer = events.pop() || "";

        for (const rawEvent of events) {
          const line = rawEvent
            .split("\n")
            .find((l) => l.startsWith("data: "));
          if (!line) continue;

          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          const parsed = JSON.parse(jsonStr) as {
            type: "token" | "done" | "error";
            content?: string;
          };

          if (parsed.type === "token" && parsed.content) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId
                  ? { ...msg, text: msg.text + parsed.content }
                  : msg
              )
            );
          }
        }
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unable to reach AI helper service.";
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? { ...msg, text: `Error: ${errorMessage}` }
            : msg
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void sendMessage(input);
  };

  return (
    <div className={styles.launcherWrapper}>
      {isOpen && (
        <section className={styles.chatWindow} aria-label="Rental AI Assistant">
          <header className={styles.header}>
            <div>
              <h2 className={styles.headerTitle}>
                Rental AI Helper
                <span className={styles.roleBadge}>{activeRole}</span>
              </h2>
            </div>
            <button
              type="button"
              className={styles.closeButton}
              aria-label="Close AI assistant"
              onClick={() => setIsOpen(false)}
            >
              ×
            </button>
          </header>

          <div className={styles.messagesArea}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`${styles.messageBubble} ${
                  msg.sender === "user"
                    ? styles.userBubble
                    : styles.assistantBubble
                }`}
              >
                {msg.text || (isStreaming ? "Thinking..." : "")}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className={styles.quickPrompts}>
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                className={styles.quickChip}
                disabled={isStreaming}
                onClick={() => void sendMessage(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>

          <form className={styles.inputForm} onSubmit={handleSubmit}>
            <input
              type="text"
              className={styles.textInput}
              placeholder="Ask about houses or bookings..."
              aria-label="Ask AI helper"
              value={input}
              disabled={isStreaming}
              onChange={(e) => setInput(e.target.value)}
            />
            <button
              type="submit"
              className={styles.sendButton}
              disabled={isStreaming || !input.trim()}
            >
              {isStreaming ? "..." : "Send"}
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        className={styles.toggleButton}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        {isOpen ? "Hide AI Helper" : "AI Helper"}
      </button>
    </div>
  );
}