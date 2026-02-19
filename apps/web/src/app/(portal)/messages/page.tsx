"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Send, Search, Bot, MessageSquare, Home } from "lucide-react";
import { api } from "@/lib/api";

type ThreadStatus = "ACTIVE" | "AUTO_REPLIED" | "NEEDS_ATTENTION" | "ESCALATED" | "RESOLVED";
type SenderType = "GUEST" | "HOST" | "AUTOMATION" | "SYSTEM";

interface Message {
  id: string;
  content: string;
  senderType: SenderType;
  createdAt: string;
  aiStatus?: { provider?: string } | null;
}

interface Thread {
  id: string;
  propertyId: string;
  guestId: string | null;
  status: ThreadStatus;
  lastMessageAt: string | null;
  guest: { id: string; name: string | null; email: string | null } | null;
  property: { id: string; name: string };
  latestMessage: { content: string; senderType: SenderType } | null;
}

interface ThreadDetail extends Thread {
  messages: Message[];
}

interface Property {
  id: string;
  name: string;
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getAvatarColor(name: string): string {
  const colors = [
    "bg-violet-500",
    "bg-blue-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-indigo-500",
    "bg-teal-500",
    "bg-orange-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

const STATUS_CONFIG: Record<ThreadStatus, { label: string; className: string; dot: string }> = {
  ACTIVE: { label: "Open", className: "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20", dot: "bg-emerald-500" },
  AUTO_REPLIED: { label: "Auto-replied", className: "bg-blue-500/10 text-blue-700 ring-1 ring-blue-500/20", dot: "bg-blue-500" },
  NEEDS_ATTENTION: { label: "Pending", className: "bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/20", dot: "bg-amber-500" },
  ESCALATED: { label: "Escalated", className: "bg-rose-500/10 text-rose-700 ring-1 ring-rose-500/20", dot: "bg-rose-500" },
  RESOLVED: { label: "Resolved", className: "bg-slate-500/10 text-slate-600 ring-1 ring-slate-500/20", dot: "bg-slate-400" },
};

function StatusBadge({ status }: { status: ThreadStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.ACTIVE;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide", cfg.className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

export default function MessagesPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedThread, setSelectedThread] = useState<ThreadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [filters, setFilters] = useState({
    propertyId: "",
    status: "" as ThreadStatus | "",
    search: "",
  });

  const fetchThreads = useCallback(async () => {
    try {
      setError(null);
      const params = new URLSearchParams();
      if (filters.propertyId) params.set("propertyId", filters.propertyId);
      if (filters.status) params.set("status", filters.status);
      if (filters.search) params.set("search", filters.search);
      params.set("pageSize", "50");

      const res = await api.get<{ success: boolean; data: { items: Thread[] } }>(
        `/messages/threads?${params}`
      );
      setThreads(res.data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load messages");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchProperties = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: Property[] }>("/properties");
      setProperties(res.data ?? []);
    } catch {
      setProperties([]);
    }
  }, []);

  useEffect(() => { fetchProperties(); }, [fetchProperties]);
  useEffect(() => { setLoading(true); fetchThreads(); }, [fetchThreads]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedThread?.messages]);

  const fetchThreadDetail = useCallback(async (id: string) => {
    setThreadLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: ThreadDetail }>(`/messages/threads/${id}`);
      setSelectedThread(res.data);
    } catch {
      setSelectedThread(null);
    } finally {
      setThreadLoading(false);
    }
  }, []);

  const sendReply = async () => {
    if (!selectedThread || !replyText.trim()) return;
    setSending(true);
    setReplyError(null);
    try {
      await api.post<{ success: boolean; data: Message }>(
        `/messages/threads/${selectedThread.id}/messages`,
        { content: replyText.trim() }
      );
      setReplyText("");
      fetchThreadDetail(selectedThread.id);
      fetchThreads();
    } catch (err) {
      setReplyError(err instanceof Error ? err.message : "Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const guestName = selectedThread?.guest?.name ?? "Guest";
  const guestInitial = guestName[0]?.toUpperCase() ?? "G";
  const avatarColor = getAvatarColor(guestName);

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] -mt-2">
      {/* Page header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-[1.75rem] font-semibold tracking-tight text-foreground leading-tight">Messages</h1>
          <p className="text-[0.8125rem] text-muted-foreground mt-1 leading-relaxed">Manage guest conversations across all properties</p>
        </div>
      </div>

      <div className="flex gap-0 flex-1 min-h-0 rounded-xl border border-border/60 overflow-hidden shadow-sm bg-card">
        {/* ── LEFT PANEL: conversation list ── */}
        <div className="w-[320px] shrink-0 flex flex-col border-r border-border/60">
          {/* Filters */}
          <div className="p-4 border-b border-border/60 space-y-3">
            <p className="text-[13px] font-semibold text-foreground">Conversations</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search conversations…"
                className="pl-9 h-8 text-[13px] bg-muted/40 border-transparent focus:bg-background focus:border-border"
                value={filters.search}
                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <select
                  className="filter-select w-full text-[12px] h-8"
                  value={filters.propertyId}
                  onChange={(e) => setFilters((f) => ({ ...f, propertyId: e.target.value }))}
                >
                  <option value="">All properties</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="relative flex-1">
                <select
                  className="filter-select w-full text-[12px] h-8"
                  value={filters.status}
                  onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as ThreadStatus | "" }))}
                >
                  <option value="">All statuses</option>
                  <option value="ACTIVE">Open</option>
                  <option value="NEEDS_ATTENTION">Pending</option>
                  <option value="AUTO_REPLIED">Auto-replied</option>
                  <option value="RESOLVED">Resolved</option>
                </select>
              </div>
            </div>
          </div>

          {/* Thread list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-3 space-y-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex gap-3 p-3 rounded-lg">
                    <div className="h-9 w-9 rounded-full bg-muted/60 skeleton shrink-0" />
                    <div className="flex-1 space-y-2 py-0.5">
                      <div className="h-3.5 w-28 rounded bg-muted/60 skeleton" />
                      <div className="h-3 w-full rounded bg-muted/40 skeleton" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <p className="p-4 text-destructive text-sm">{error}</p>
            ) : threads.length === 0 ? (
              <div className="py-16 text-center">
                <MessageSquare className="h-8 w-8 text-muted-foreground/25 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No conversations found</p>
              </div>
            ) : (
              <div className="p-2 space-y-0.5">
                {threads.map((t) => {
                  const name = t.guest?.name ?? "Guest";
                  const initial = name[0]?.toUpperCase() ?? "?";
                  const color = getAvatarColor(name);
                  const isSelected = selectedThread?.id === t.id;
                  const cfg = STATUS_CONFIG[t.status];

                  return (
                    <button
                      key={t.id}
                      type="button"
                      aria-label={`Open conversation with ${name} at ${t.property.name}`}
                      aria-pressed={isSelected}
                      className={cn(
                        "w-full text-left px-3 py-3 rounded-lg transition-all duration-150",
                        isSelected
                          ? "bg-primary/8 ring-1 ring-primary/20"
                          : "hover:bg-muted/60"
                      )}
                      onClick={() => fetchThreadDetail(t.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn("h-9 w-9 rounded-full flex items-center justify-center shrink-0 text-white text-sm font-semibold", color)}>
                          {initial}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <p className={cn("text-[13px] font-semibold truncate", isSelected ? "text-primary" : "text-foreground")}>
                              {name}
                            </p>
                            <span className="text-[11px] text-muted-foreground shrink-0">
                              {formatRelativeTime(t.lastMessageAt)}
                            </span>
                          </div>
                          <p className="text-[12px] text-muted-foreground truncate mb-1.5">
                            <span className="text-[11px] text-muted-foreground/70 mr-1">{t.property.name} ·</span>
                            {t.latestMessage?.content ?? "No messages"}
                          </p>
                          <span className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            cfg?.className ?? "bg-gray-100 text-gray-500"
                          )}>
                            <span className={cn("h-1 w-1 rounded-full", cfg?.dot ?? "bg-gray-400")} />
                            {cfg?.label ?? t.status}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL: conversation detail ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {!selectedThread ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="h-16 w-16 rounded-2xl bg-muted/40 flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="h-7 w-7 text-muted-foreground/40" />
                </div>
                <p className="text-[15px] font-medium text-foreground mb-1">No conversation selected</p>
                <p className="text-sm text-muted-foreground">Choose a conversation from the left to get started</p>
              </div>
            </div>
          ) : threadLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="space-y-3 w-64">
                <div className="h-4 w-48 rounded bg-muted/60 skeleton mx-auto" />
                <div className="h-24 rounded-xl bg-muted/30 skeleton" />
                <div className="h-24 rounded-xl bg-muted/30 skeleton ml-8" />
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="px-6 py-4 border-b border-border/60 flex items-center gap-4 shrink-0">
                <div className={cn("h-10 w-10 rounded-full flex items-center justify-center shrink-0 text-white text-sm font-bold", avatarColor)}>
                  {guestInitial}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-[15px]">{guestName}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Home className="h-3 w-3 text-muted-foreground" />
                    <p className="text-[12px] text-muted-foreground truncate">{selectedThread.property.name}</p>
                  </div>
                </div>
                <StatusBadge status={selectedThread.status} />
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 bg-muted/20">
                {selectedThread.messages.length === 0 ? (
                  <div className="py-16 text-center">
                    <div className="h-14 w-14 rounded-2xl bg-background border border-border/60 flex items-center justify-center mx-auto mb-4 shadow-sm">
                      <MessageSquare className="h-6 w-6 text-muted-foreground/40" />
                    </div>
                    <p className="text-[14px] font-medium text-muted-foreground">No messages yet</p>
                    <p className="text-sm text-muted-foreground/60 mt-1">Start the conversation below</p>
                  </div>
                ) : (
                  selectedThread.messages.map((msg, idx) => {
                    const isGuest = msg.senderType === "GUEST";
                    const isHost = msg.senderType === "HOST";
                    const isAutomation = msg.senderType === "AUTOMATION" || msg.senderType === "SYSTEM";
                    const prevMsg = idx > 0 ? selectedThread.messages[idx - 1] : null;
                    const showSenderLabel = !prevMsg || prevMsg.senderType !== msg.senderType;

                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex",
                          isGuest && "justify-start",
                          isHost && "justify-end",
                          isAutomation && "justify-center"
                        )}
                      >
                        {isAutomation ? (
                          <div className="flex items-center gap-2 py-1 px-3 rounded-full bg-muted/60 border border-border/40 max-w-[80%]">
                            <Bot className="h-3 w-3 text-muted-foreground shrink-0" />
                            <p className="text-[12px] text-muted-foreground">{msg.content}</p>
                            <span className="text-[10px] text-muted-foreground/60 shrink-0">
                              {formatRelativeTime(msg.createdAt)}
                            </span>
                          </div>
                        ) : (
                          <div className={cn("max-w-[70%] space-y-1", isHost && "items-end flex flex-col")}>
                            {showSenderLabel && (
                              <p className={cn(
                                "text-[11px] font-medium text-muted-foreground px-1",
                                isHost && "text-right"
                              )}>
                                {isHost ? "You" : guestName}
                              </p>
                            )}
                            <div
                              className={cn(
                                "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                                isGuest && "rounded-tl-sm bg-background border border-border/60 text-foreground shadow-sm",
                                isHost && "rounded-tr-sm bg-primary text-primary-foreground shadow-sm"
                              )}
                            >
                              <p className="whitespace-pre-wrap">{msg.content}</p>
                            </div>
                            <p className={cn(
                              "text-[11px] text-muted-foreground/60 px-1",
                              isHost && "text-right"
                            )}>
                              {formatRelativeTime(msg.createdAt)}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Compose */}
              <div className="px-6 py-4 border-t border-border/60 bg-card shrink-0">
                {replyError && (
                  <p className="text-sm text-destructive mb-2">{replyError}</p>
                )}
                <div className="flex gap-3 items-end">
                  <div className="flex-1 relative">
                    <textarea
                      className={cn(
                        "w-full min-h-[80px] max-h-[160px] rounded-xl border border-border/60 bg-muted/30",
                        "px-4 py-3 text-sm resize-none leading-relaxed",
                        "focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary/40 focus:bg-background",
                        "placeholder:text-muted-foreground transition-all duration-150"
                      )}
                      placeholder="Type your reply… (Enter to send, Shift+Enter for new line)"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendReply();
                        }
                      }}
                    />
                  </div>
                  <Button
                    onClick={sendReply}
                    disabled={!replyText.trim() || sending}
                    className="h-10 px-5 gap-2 rounded-xl shrink-0"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {sending ? "Sending…" : "Send"}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground/50 mt-2">
                  Press <kbd className="font-sans font-medium">Enter</kbd> to send · <kbd className="font-sans font-medium">Shift+Enter</kbd> for new line
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
