"use client";
import { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import {
  fetchConversations,
  fetchMessages,
  sendMessage,
  markMessagesRead,
  subscribeToMessages,
  type ConversationWithDetails,
  type Message,
} from "@/lib/supabase";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import type { User } from "@supabase/supabase-js";

const fmt = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

function timeAgo(dateString: string): string {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateString).toLocaleDateString();
}

function initialsOf(text: string): string {
  return text
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div style={{ position: "relative", zIndex: 1, display: "flex" }}>
        <Sidebar activeKey="messages" />
        <div style={{ flex: 1, padding: "40px 20px", color: "var(--text-muted)" }}>Loadingâ€¦</div>
      </div>
    }>
      <MessagesPageInner />
    </Suspense>
  );
}

function MessagesPageInner() {
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabaseBrowser.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setCheckingAuth(false);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchConversations(user.id)
      .then(setConversations)
      .finally(() => setLoadingConvos(false));
  }, [user]);

  // If arriving via /messages?c=123 (e.g. from a listing's "Message Seller" button),
  // auto-select that conversation once the list has loaded.
  useEffect(() => {
    const c = searchParams.get("c");
    if (!c) return;
    const id = Number(c);
    if (conversations.some((conv) => conv.id === id)) {
      setSelectedId(id);
    }
  }, [conversations, searchParams]);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId || !user) return;
    setLoadingMessages(true);
    fetchMessages(selectedId)
      .then((msgs) => {
        setMessages(msgs);
        markMessagesRead(selectedId, user.id).then(() => {
          setConversations((prev) => prev.map((c) => (c.id === selectedId ? { ...c, unreadCount: 0 } : c)));
        });
      })
      .finally(() => setLoadingMessages(false));

    const unsubscribe = subscribeToMessages(selectedId, (msg) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      if (msg.sender_id !== user.id) markMessagesRead(selectedId, user.id);
    });
    return unsubscribe;
  }, [selectedId, user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || !user || !selectedId) return;
    setSending(true);
    const body = draft.trim();
    setDraft("");
    try {
      const msg = await sendMessage(selectedId, user.id, body);
      setMessages((prev) => [...prev, msg]);
      setConversations((prev) =>
        prev.map((c) => (c.id === selectedId ? { ...c, lastMessageBody: body, last_message_at: msg.created_at } : c))
      );
    } catch {
      setDraft(body);
    } finally {
      setSending(false);
    }
  }

  if (checkingAuth) {
    return (
      <div style={{ position: "relative", zIndex: 1, display: "flex" }}>
        <Sidebar activeKey="messages" />
        <div style={{ flex: 1, padding: "40px 20px", color: "var(--text-muted)" }}>Loadingâ€¦</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ position: "relative", zIndex: 1, display: "flex" }}>
        <Sidebar activeKey="messages" />
        <div style={{ flex: 1, maxWidth: 480, margin: "0 auto", padding: "80px 20px", textAlign: "center" }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", marginBottom: 16 }}>Sign in to view your messages</h1>
          <Link href="/login" style={{ color: "var(--accent)", fontWeight: 700, fontSize: 14 }}>Log in</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", zIndex: 1, display: "flex" }}>
      <Sidebar activeKey="messages" />
      <div style={{ flex: 1, display: "flex", height: "100vh", background: "var(--surface)" }}>
        {/* Conversation list */}
        <div style={{ width: 340, flexShrink: 0, borderRight: "1px solid var(--border)", overflowY: "auto", background: "var(--surface)" }}>
          <div style={{ padding: "20px 20px 12px" }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.02em" }}>Chats</h1>
          </div>

          {loadingConvos ? (
            <div style={{ padding: "20px", color: "var(--text-muted)", fontSize: 13 }}>Loadingâ€¦</div>
          ) : conversations.length === 0 ? (
            <div style={{ padding: "20px", color: "var(--text-muted)", fontSize: 13 }}>
              No conversations yet. Message a seller from any listing to start one.
            </div>
          ) : (
            conversations.map((c) => {
              const isBuyer = c.buyer_id === user.id;
              const active = c.id === selectedId;
              const title = c.listing ? `${c.listing.brand} ${c.listing.model}` : "Listing removed";
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  style={{
                    display: "flex", gap: 12, alignItems: "center", textAlign: "left",
                    padding: "10px 16px", margin: "2px 8px", width: "calc(100% - 16px)",
                    borderRadius: 12,
                    background: active ? "var(--surface-2)" : "transparent",
                    border: "none", cursor: "pointer",
                  }}
                >
                  <div style={{
                    width: 52, height: 52, borderRadius: "50%", background: "var(--accent)", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
                    position: "relative",
                  }}>
                    {c.listing?.images?.[0] ? (
                      <img src={c.listing.images[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>{initialsOf(title)}</span>
                    )}
                    {c.unreadCount > 0 && (
                      <span style={{
                        position: "absolute", top: -1, right: -1, width: 14, height: 14, borderRadius: "50%",
                        background: "var(--accent)", border: "2px solid var(--surface)",
                      }} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <span style={{
                        fontSize: 14, fontWeight: c.unreadCount > 0 ? 800 : 700, color: "var(--text)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {title}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--text-dim)", flexShrink: 0, marginLeft: 6 }}>
                        {timeAgo(c.last_message_at)}
                      </span>
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--text-dim)", marginBottom: 2 }}>
                      {isBuyer ? "Buying" : "Selling"} Â· {c.listing ? fmt(c.listing.price) : ""}
                    </div>
                    <div style={{
                      fontSize: 12.5, color: c.unreadCount > 0 ? "var(--text)" : "var(--text-muted)",
                      fontWeight: c.unreadCount > 0 ? 700 : 400,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {c.lastMessageBody ?? "Say helloâ€¦"}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Thread */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--bg, var(--surface))" }}>
          {!selected ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 14 }}>
              Select a conversation to start chatting
            </div>
          ) : (
            <>
              <div style={{
                padding: "12px 24px", borderBottom: "1px solid var(--border)", display: "flex",
                justifyContent: "space-between", alignItems: "center", background: "var(--surface)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%", background: "var(--accent)",
                    display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0,
                  }}>
                    {selected.listing?.images?.[0] ? (
                      <img src={selected.listing.images[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>
                        {initialsOf(selected.listing ? `${selected.listing.brand} ${selected.listing.model}` : "?")}
                      </span>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--text)" }}>
                      {selected.listing ? `${selected.listing.brand} ${selected.listing.model}` : "Listing removed"}
                    </div>
                    {selected.listing && (
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{fmt(selected.listing.price)}</div>
                    )}
                  </div>
                </div>
                {selected.listing && (
                  <Link href={`/refurbished/${selected.listing.id}`} style={{ fontSize: 12.5, color: "var(--accent)", fontWeight: 600 }}>
                    View listing â†’
                  </Link>
                )}
              </div>

              <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 4 }}>
                {loadingMessages ? (
                  <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Loadingâ€¦</div>
                ) : (
                  messages.map((m, i) => {
                    const mine = m.sender_id === user.id;
                    const prev = messages[i - 1];
                    const next = messages[i + 1];
                    const startsGroup = !prev || prev.sender_id !== m.sender_id;
                    const endsGroup = !next || next.sender_id !== m.sender_id;
                    return (
                      <div
                        key={m.id}
                        style={{
                          display: "flex", justifyContent: mine ? "flex-end" : "flex-start",
                          marginTop: startsGroup ? 10 : 2,
                        }}
                      >
                        <div style={{
                          maxWidth: "65%", padding: "9px 14px", fontSize: 14, lineHeight: 1.4,
                          background: mine ? "var(--accent)" : "var(--surface-2)",
                          color: mine ? "#fff" : "var(--text)",
                          borderRadius: 18,
                          borderBottomRightRadius: mine && endsGroup ? 4 : 18,
                          borderBottomLeftRadius: !mine && endsGroup ? 4 : 18,
                        }}>
                          {m.body}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <form onSubmit={handleSend} style={{ padding: "12px 24px 18px", display: "flex", gap: 10, alignItems: "center" }}>
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Aa"
                  style={{
                    flex: 1, padding: "11px 16px", fontSize: 14, border: "none",
                    borderRadius: 999, background: "var(--surface-2)", color: "var(--text)",
                    fontFamily: "inherit", outline: "none",
                  }}
                />
                <button
                  type="submit"
                  disabled={sending || !draft.trim()}
                  aria-label="Send"
                  style={{
                    width: 40, height: 40, flexShrink: 0, background: "var(--accent)", color: "#fff", border: "none",
                    borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: sending ? "default" : "pointer",
                    opacity: sending || !draft.trim() ? 0.5 : 1,
                  }}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
                  </svg>
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}