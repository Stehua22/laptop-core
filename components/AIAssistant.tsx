'use client';

import { useState, useRef, useEffect } from 'react';
import { supabaseBrowser } from '@/lib/supabaseBrowser';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export default function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hey, I'm Lapi! Tell me what you need a laptop for (budget, use case, portability) and I'll show you some picks.",
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
      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const userId = sessionData.session?.user.id;

      if (!userId) {
        setMessages([
          ...nextMessages,
          { role: 'assistant', content: 'Please log in to chat with Lapi.' },
        ]);
        setLoading(false);
        return;
      }

      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages, userId }),
      });

      if (res.status === 429) {
        const data = await res.json();
        setMessages([
          ...nextMessages,
          { role: 'assistant', content: data.message || "You've hit today's chat limit." },
        ]);
        return;
      }

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
      <style>{`
        @keyframes lapiPanelIn {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes lapiMsgIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes lapiDot {
          0%, 80%, 100% { opacity: 0.25; transform: translateY(0); }
          40% { opacity: 1; transform: translateY(-3px); }
        }
        .lapi-launcher {
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .lapi-launcher:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(0,0,0,0.35);
        }
        .lapi-launcher:active {
          transform: scale(0.96);
        }
        .lapi-panel {
          animation: lapiPanelIn 0.22s cubic-bezier(0.16, 1, 0.3, 1);
          transform-origin: bottom right;
        }
        .lapi-msg {
          animation: lapiMsgIn 0.2s ease-out;
        }
        .lapi-dot {
          display: inline-block;
          width: 5px;
          height: 5px;
          margin-right: 3px;
          border-radius: 50%;
          background: #888;
          animation: lapiDot 1s infinite;
        }
      `}</style>

      <button
        className="lapi-launcher"
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
          className="lapi-panel"
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
                className="lapi-msg"
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
            {loading && (
              <div className="lapi-msg" style={{ fontSize: 13, padding: '6px 10px' }}>
                <span className="lapi-dot" style={{ animationDelay: '0s' }} />
                <span className="lapi-dot" style={{ animationDelay: '0.15s' }} />
                <span className="lapi-dot" style={{ animationDelay: '0.3s' }} />
              </div>
            )}
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
