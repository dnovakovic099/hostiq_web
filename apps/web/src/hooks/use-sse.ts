"use client";

import { useEffect, useCallback, useRef } from "react";
import { useAuthStore } from "@/lib/auth-store";

export interface SSEEvent {
  type: string;
  data: unknown;
  timestamp: string;
}

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
const TOKEN_KEY = "hostiq_token";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

function getSSEUrl(): string {
  const base = BASE_URL.replace(/\/api$/, "") || "http://localhost:3001";
  return `${base}/api/sse/stream`;
}

const MAX_RECONNECT_DELAY_MS = 60_000;
const INITIAL_RECONNECT_DELAY_MS = 1_000;

export function useSSE(onEvent: (event: SSEEvent) => void) {
  const onEventRef = useRef(onEvent);
  const reconnectAttemptRef = useRef(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  onEventRef.current = onEvent;

  const connect = useCallback(() => {
    const token = getToken();
    if (!token) return;

    const url = `${getSSEUrl()}?token=${encodeURIComponent(token)}`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data) as SSEEvent;
        if (parsed.type !== "ping") {
          onEventRef.current(parsed);
        }
      } catch {
        // Ignore parse errors (e.g. heartbeat ping)
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      eventSourceRef.current = null;
      if (!mountedRef.current) return;
      reconnectAttemptRef.current += 1;
      const delay = Math.min(
        INITIAL_RECONNECT_DELAY_MS * Math.pow(2, reconnectAttemptRef.current),
        MAX_RECONNECT_DELAY_MS
      );
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, delay);
    };

    eventSource.addEventListener("heartbeat", () => {
      reconnectAttemptRef.current = 0;
    });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (!useAuthStore.getState().isAuthenticated()) return;

    reconnectAttemptRef.current = 0;
    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
    };
  }, [connect]);
}
