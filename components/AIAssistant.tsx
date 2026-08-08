'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './AIAssistant.module.css';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export default function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hey! Tell me what you need a laptop for (budget, use case, portability) and I'll point you at some picks.",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const nextMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages }),
      });

      if (!res.ok) throw new Error('Request failed');

      const data = await res.json();
      setMessages([...nextMessages, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages([
        ...nextMessages,
        { role: 'assistant', content: "Sorry, something went wrong. Try again in a moment." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <>
      <button
        className={styles.launcher}
        onClick={() => setOpen((v) => !v)}
        aria-label="Open laptop assistant"
      >
        {open ? 'Close ✕' : '💬 Ask AI'}
      </button>

      {open && (
        <div className={styles.panel}>
          <div className={styles.header}>
            <span>Laptop Assistant</span>
            <button className={styles.closeBtn} onClick={() => setOpen(false)} aria-label="Close">
              ✕
            </button>
          </div>

          <div className={styles.messages} ref={scrollRef}>
            {messages.map((m, i) => (
              <div
                key={i}
                className={m.role === 'user' ? styles.userMsg : styles.assistantMsg}
              >
                {m.content}
              </div>
            ))}
            {loading && <div className={styles.assistantMsg}>Thinking...</div>}
          </div>

          <div className={styles.inputRow}>
            <textarea
              className={styles.input}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Best laptop under $900 for university"
              rows={1}
            />
            <button className={styles.sendBtn} onClick={sendMessage} disabled={loading}>
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}