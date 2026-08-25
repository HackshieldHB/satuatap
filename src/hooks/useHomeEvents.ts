"use client";

import { useEffect, useRef } from "react";
import { apiBaseUrl, useMockData } from "@/lib/config";

const STORAGE_KEY = "huni_session";
const POLL_MS = 15_000;

export type HomeStreamEvent = {
  event: string;
  homeId: string;
  deviceId?: string;
  data: Record<string, unknown>;
  ts: string;
};

function sessionToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as { token?: string };
    return session.token ?? null;
  } catch {
    return null;
  }
}

/**
 * Subscribe to home SSE. Reconnects with backoff; after two EventSource
 * failures, falls back to polling. Always closed on unmount.
 */
export function useHomeEvents(
  homeId: string,
  handlers: {
    onEvent: (evt: HomeStreamEvent) => void;
    onPoll: () => void;
  }
) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!homeId) return;
    let closed = false;
    let source: EventSource | null = null;
    let pollTimer: ReturnType<typeof setInterval> | undefined;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;

    const stopPoll = () => {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = undefined;
      }
    };

    const startPoll = () => {
      if (pollTimer || closed) return;
      pollTimer = setInterval(() => {
        if (!closed) handlersRef.current.onPoll();
      }, POLL_MS);
    };

    if (useMockData) {
      startPoll();
      return () => {
        closed = true;
        stopPoll();
      };
    }

    const connect = () => {
      if (closed) return;
      const token = sessionToken();
      if (!token) {
        failures = 2;
        startPoll();
        return;
      }
      const url = `${apiBaseUrl}/v1/homes/${homeId}/events?access_token=${encodeURIComponent(token)}`;
      source = new EventSource(url);
      source.onopen = () => {
        failures = 0;
      };
      source.onmessage = (msg) => {
        try {
          const parsed = JSON.parse(msg.data) as HomeStreamEvent;
          handlersRef.current.onEvent(parsed);
        } catch {
          // ignore malformed frames
        }
      };
      source.onerror = () => {
        source?.close();
        source = null;
        failures += 1;
        if (closed) return;
        if (failures >= 2) {
          startPoll();
          return;
        }
        retryTimer = setTimeout(connect, failures * 1000);
      };
    };

    connect();

    return () => {
      closed = true;
      source?.close();
      source = null;
      stopPoll();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [homeId]);
}
