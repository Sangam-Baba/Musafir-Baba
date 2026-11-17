"use client";
// useRealtime — the one hook for live updates (docs/plan/11-notifications-and-realtime.md §12).
// Opens GET /api/v1/realtime/stream with fetch (so the normal Authorization header is sent — no token in
// the URL), reads Server-Sent Events, reconnects with Last-Event-ID (the server replays what was missed or
// says `resync`), and reports the status. Pushes only say "something changed"; pages refetch through the API.
import { useEffect, useRef, useState } from "react";

import { B2B_API } from "./api";

export type RealtimeStatus = "connecting" | "live" | "reconnecting" | "offline";
export type RealtimeMessage = { event: string; room?: string; data?: Record<string, unknown> };

type Options = {
  /** a token for each (re)connection; `expired` = the last one was refused (renew it); null = can't connect */
  getToken: (expired: boolean) => Promise<string | null>;
  enabled?: boolean;
  onMessage: (m: RealtimeMessage) => void;
  /** after (re)connecting or a `resync`: reload what the page shows (catch-up) */
  onSync?: () => void;
  /** extra public rooms to follow, e.g. `availability:property:<id>` (optional; none = personal rooms only, as before) */
  rooms?: string[];
};

/** Splits an SSE text buffer into complete frames; returns the frames and the unfinished rest. */
function frames(buffer: string): { complete: { id?: string; event: string; data: string; retry?: number }[]; rest: string } {
  const parts = buffer.split(/\r?\n\r?\n/);
  const rest = parts.pop() ?? "";
  const complete = parts
    .map((block) => {
      const f: { id?: string; event: string; data: string; retry?: number } = { event: "message", data: "" };
      for (const line of block.split(/\r?\n/)) {
        if (line.startsWith(":")) continue; // heartbeat
        const i = line.indexOf(":");
        const field = i === -1 ? line : line.slice(0, i);
        const value = i === -1 ? "" : line.slice(i + 1).replace(/^ /, "");
        if (field === "id") f.id = value;
        else if (field === "event") f.event = value;
        else if (field === "data") f.data += value;
        else if (field === "retry") f.retry = Number(value);
      }
      return f;
    })
    .filter((f) => f.data !== "" || f.event !== "message");
  return { complete, rest };
}

export function useRealtime({ getToken, enabled = true, onMessage, onSync, rooms }: Options): RealtimeStatus {
  const [status, setStatus] = useState<RealtimeStatus>("connecting");
  const roomList = rooms && rooms.length > 0 ? rooms.join(",") : "";
  const handlers = useRef({ getToken, onMessage, onSync });
  handlers.current = { getToken, onMessage, onSync };

  useEffect(() => {
    if (!enabled) return;
    const abort = new AbortController();
    let lastId = "";
    let delay = 3000;
    let expired = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const dispatch = (f: { id?: string; event: string; data: string; retry?: number }) => {
      if (f.id) lastId = f.id;
      if (f.retry && f.retry > 0) delay = f.retry;
      if (f.event === "ready") {
        setStatus("live");
        delay = 3000;
        return handlers.current.onSync?.();
      }
      if (f.event === "resync") return handlers.current.onSync?.();
      let parsed: { room?: string; data?: Record<string, unknown> } = {};
      try {
        parsed = JSON.parse(f.data || "{}");
      } catch {
        return;
      }
      handlers.current.onMessage({ event: f.event, room: parsed.room, data: parsed.data });
    };

    async function connect() {
      const token = await handlers.current.getToken(expired).catch(() => null);
      expired = false;
      if (abort.signal.aborted) return;
      if (!token) return setStatus("offline");
      const headers: Record<string, string> = { Authorization: `Bearer ${token}`, Accept: "text/event-stream" };
      if (lastId) headers["Last-Event-ID"] = lastId;
      try {
        const query = roomList ? `?rooms=${encodeURIComponent(roomList)}` : "";
        const res = await fetch(`${B2B_API}/realtime/stream${query}`, { headers, signal: abort.signal, credentials: "include", cache: "no-store" });
        if (res.status === 401) expired = true;
        if (!res.ok || !res.body) throw new Error(`stream ${res.status}`);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const { complete, rest } = frames(buffer);
          buffer = rest;
          complete.forEach(dispatch);
        }
      } catch {
        if (abort.signal.aborted) return;
      }
      if (abort.signal.aborted) return;
      setStatus("reconnecting");
      timer = setTimeout(connect, delay);
      delay = Math.min(delay * 2, 30_000); // back off while the server is away; the bell polls meanwhile
    }

    setStatus("connecting");
    void connect();
    return () => {
      abort.abort();
      if (timer) clearTimeout(timer);
    };
  }, [enabled, roomList]);

  return status;
}

export const STATUS_LABEL: Record<RealtimeStatus, { text: string; dot: string }> = {
  connecting: { text: "Connecting…", dot: "bg-slate-300" },
  live: { text: "Live", dot: "bg-emerald-500" },
  reconnecting: { text: "Reconnecting… (checking every minute)", dot: "bg-amber-400" },
  offline: { text: "Offline (checking every minute)", dot: "bg-slate-400" },
};
