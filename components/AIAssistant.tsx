'use client';

import { useState, useRef, useEffect } from 'react';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export default function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hey, I'm Lapi! Tell me what you need a laptop for (budget, use case, portability) and I'll point you at some picks.",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
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
        { role: 'assistant', content: 'Sorry, something went wrong. Try again in a moment.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 999999 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: 160,
          height: 48,
          borderRadius: 10,
          border: 'none',
          background: '#2563eb',
          color: '#fff',
          fontSize: 15,
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
        }}
      >
        {open ? 'Close ✕' : '💬 Lapi'}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            bottom: 60,
            right: 0,
            width: 320,
            height: 420,
            background: '#fff',
            color: '#111',
            borderRadius: 12,
            boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              background: '#2563eb',
              color: '#fff',
              padding: '10px 14px',
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            Lapi
          </div>

          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: 10,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  background: m.role === 'user' ? '#2563eb' : '#f1f1f1',
                  color: m.role === 'user' ? '#fff' : '#111',
                  padding: '6px 10px',
                  borderRadius: 10,
                  maxWidth: '80%',
                  fontSize: 13,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {m.content}
              </div>
            ))}
            {loading && <div style={{ fontSize: 13, color: '#888' }}>Thinking...</div>}
          </div>

          <div style={{ display: 'flex', gap: 6, padding: 8, borderTop: '1px solid #eee' }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') sendMessage();
              }}
              placeholder="Best laptop under $900..."
              style={{
                flex: 1,
                border: '1px solid #ddd',
                borderRadius: 8,
                padding: '6px 8px',
                fontSize: 13,
              }}
            />
            <button
              onClick={sendMessage}
              disabled={loading}
              style={{
                border: 'none',
                background: '#2563eb',
                color: '#fff',
                borderRadius: 8,
                padding: '0 12px',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
