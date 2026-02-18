"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Send, Search, Bot } from "lucide-react";
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

      const res = await api.get<{
        success: boolean;
        data: { items: Thread[] };
      }>(`/messages/threads?${params}`);
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

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  useEffect(() => {
    setLoading(true);
    fetchThreads();
  }, [fetchThreads]);

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

  const getStatusLabel = (status: ThreadStatus) => {
    const map: Record<ThreadStatus, string> = {
      ACTIVE: "Open",
      AUTO_REPLIED: "Auto-replied",
      NEEDS_ATTENTION: "Pending",
      ESCALATED: "Escalated",
      RESOLVED: "Resolved",
    };
    return map[status] ?? status;
  };

  return (
    <div className="space-y-4 h-[calc(100vh-12rem)]">
      <div className="page-header mb-0">
        <h1>Messages</h1>
        <p>Manage guest conversations across all properties</p>
      </div>

      <div className="flex gap-4 h-full min-h-0">
        {/* Thread list - 1/3 */}
        <Card className="w-1/3 min-w-[280px] flex flex-col overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle>Conversations</CardTitle>
            <div className="flex flex-col gap-2 mt-2">
              <select
                className="filter-select w-full"
                value={filters.propertyId}
                onChange={(e) => setFilters((f) => ({ ...f, propertyId: e.target.value }))}
              >
                <option value="">All properties</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <select
                className="filter-select w-full"
                value={filters.status}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, status: e.target.value as ThreadStatus | "" }))
                }
              >
                <option value="">All statuses</option>
                <option value="ACTIVE">Open</option>
                <option value="NEEDS_ATTENTION">Pending</option>
                <option value="RESOLVED">Resolved</option>
              </select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  className="pl-9"
                  value={filters.search}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex gap-3 py-3">
                    <div className="h-10 w-10 rounded-full bg-muted/60 skeleton shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 rounded bg-muted/60 skeleton" />
                      <div className="h-3 w-full rounded bg-muted/40 skeleton" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <p className="p-4 text-destructive text-sm">{error}</p>
            ) : threads.length === 0 ? (
              <div className="py-12 text-center">
                <Send className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No conversations found</p>
              </div>
            ) : (
                  <div className="divide-y">
                {threads.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    aria-label={`Open conversation with ${t.guest?.name ?? "Guest"} at ${t.property.name}`}
                    aria-pressed={selectedThread?.id === t.id}
                    className={cn(
                      "w-full text-left p-4 hover:bg-muted/50 transition-colors",
                      selectedThread?.id === t.id && "bg-muted"
                    )}
                    onClick={() => fetchThreadDetail(t.id)}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback>
                          {(t.guest?.name ?? t.property.name)[0]?.toUpperCase() ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {t.guest?.name ?? "Guest"} • {t.property.name}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {t.latestMessage?.content ?? "No messages"}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {t.lastMessageAt
                              ? new Date(t.lastMessageAt).toLocaleString()
                              : "—"}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {getStatusLabel(t.status)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Conversation - 2/3 */}
        <Card className="flex-1 flex flex-col overflow-hidden min-w-0">
          {!selectedThread ? (
            <CardContent className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Send className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Select a conversation</p>
              </div>
            </CardContent>
          ) : threadLoading ? (
            <CardContent className="flex-1 flex items-center justify-center">
              <div className="space-y-3">
                <div className="h-4 w-48 rounded bg-muted/60 skeleton mx-auto" />
                <div className="h-32 rounded-lg bg-muted/30 skeleton w-64 mx-auto" />
              </div>
            </CardContent>
          ) : (
            <>
              <CardHeader className="border-b">
                <CardTitle>
                  {selectedThread.guest?.name ?? "Guest"} — {selectedThread.property.name}
                </CardTitle>
                <Badge variant="outline">{getStatusLabel(selectedThread.status)}</Badge>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                {selectedThread.messages.length === 0 ? (
                  <div className="py-8 text-center">
                    <Send className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No messages yet</p>
                  </div>
                ) : (
                  selectedThread.messages.map((msg) => {
                    const isGuest = msg.senderType === "GUEST";
                    const isHost = msg.senderType === "HOST";
                    const isAutomation = msg.senderType === "AUTOMATION" || msg.senderType === "SYSTEM";
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
                      <div
                        className={cn(
                          "max-w-[75%] rounded-lg px-4 py-2",
                          isGuest && "bg-muted",
                          isHost && "bg-primary text-primary-foreground",
                          isAutomation && "bg-muted/70 text-muted-foreground"
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {msg.senderType === "AUTOMATION" && (
                            <Bot className="h-3 w-3" />
                          )}
                          <span className="text-xs font-medium capitalize">
                            {msg.senderType.toLowerCase()}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {new Date(msg.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    );
                  })
                )}
              </CardContent>
              <div className="p-4 border-t space-y-2">
                {replyError && (
                  <p className="text-sm text-destructive">{replyError}</p>
                )}
                <div className="flex gap-2">
                  <textarea
                    className="flex-1 min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm resize-none"
                    placeholder="Type your reply... (Enter to send, Shift+Enter for new line)"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendReply();
                      }
                    }}
                  />
                  <Button onClick={sendReply} disabled={!replyText.trim() || sending}>
                    <Send className="h-4 w-4" />
                    {sending ? "Sending..." : "Send"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
