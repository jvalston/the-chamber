"use client";
import { useEffect, useRef, useState } from "react";

interface GwEntry {
  timestamp: string;
  machine: string;
  agent: string;
  model_requested: string;
  model_used: string | null;
  provider: string;
  local_vs_cloud: string;
  latency_ms: number;
  input_tokens: number;
  output_tokens: number;
  success: boolean;
  error: string | null;
}

interface LogEntry {
  id: number;
  ts: string;
  level: "info" | "warn" | "error" | "sys";
  msg: string;
}

function entryToLog(e: GwEntry, id: number): LogEntry {
  const ts = new Date(e.timestamp).toLocaleTimeString("en-US", { hour12: false });
  const isCloud = e.local_vs_cloud === "cloud";
  const isBlock = e.error === "cloud_disabled";

  if (!e.success) {
    return {
      id, ts,
      level: isBlock ? "warn" : "error",
      msg: isBlock
        ? `BLOCKED  cloud request from [${e.agent}] — cloud disabled`
        : `FAIL  [${e.agent}] ${e.model_requested} → ${e.error ?? "unknown"}`,
    };
  }

  if (e.error?.includes("cloud_enabled_by_operator"))
    return { id, ts, level: "warn", msg: "CLOUD ACCESS ENABLED by operator" };
  if (e.error?.includes("cloud_disabled_by_operator"))
    return { id, ts, level: "sys",  msg: "Cloud access disabled" };

  return {
    id, ts,
    level: isCloud ? "warn" : "info",
    msg: `${isCloud ? "CLOUD" : "LOCAL"}  [${e.machine}/${e.agent}] `
       + `${e.model_requested} → ${e.model_used ?? "?"}  `
       + `${e.latency_ms}ms  ${e.input_tokens}+${e.output_tokens}tok`,
  };
}

const SEED: Omit<LogEntry, "id">[] = [
  { ts: "–", level: "sys",  msg: "Mission Control initialized" },
  { ts: "–", level: "sys",  msg: "Connecting to provider gateway…" },
];

export default function ActivityLog() {
  const [logs, setLogs] = useState<LogEntry[]>(() =>
    SEED.map((l, i) => ({ ...l, id: i }))
  );
  const counterRef = useRef(SEED.length);
  const bottomRef  = useRef<HTMLDivElement>(null);

  // SSE connection to the gateway log stream
  useEffect(() => {
    let es: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout>;

    function connect() {
      es = new EventSource("/api/gateway/logs");

      es.onopen = () => {
        const ts = new Date().toLocaleTimeString("en-US", { hour12: false });
        setLogs(prev => [
          ...prev.slice(-199),
          { id: counterRef.current++, ts, level: "sys", msg: "Gateway stream connected" },
        ]);
      };

      es.onmessage = (ev) => {
        try {
          const entry: GwEntry = JSON.parse(ev.data);
          setLogs(prev => [
            ...prev.slice(-299),
            entryToLog(entry, counterRef.current++),
          ]);
        } catch { /* malformed line — skip */ }
      };

      es.onerror = () => {
        es?.close();
        const ts = new Date().toLocaleTimeString("en-US", { hour12: false });
        setLogs(prev => [
          ...prev.slice(-199),
          { id: counterRef.current++, ts, level: "warn", msg: "Gateway stream lost — retrying…" },
        ]);
        retryTimer = setTimeout(connect, 4000);
      };
    }

    connect();

    // expose push hook for other components
    (window as unknown as Record<string, unknown>).__missionLog = (
      level: LogEntry["level"], msg: string
    ) => {
      const ts = new Date().toLocaleTimeString("en-US", { hour12: false });
      setLogs(prev => [...prev.slice(-299), { id: counterRef.current++, ts, level, msg }]);
    };

    return () => { es?.close(); clearTimeout(retryTimer); };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const COLOR: Record<LogEntry["level"], string> = {
    sys:   "var(--accent)",
    info:  "var(--text-primary)",
    warn:  "var(--yellow)",
    error: "var(--red)",
  };

  return (
    <div className="panel" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div className="panel-header">
        <span>PROVIDER TRAFFIC</span>
        <span style={{ marginLeft: "auto", color: "var(--text-muted)" }}>{logs.length} entries</span>
      </div>
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "8px 12px",
        fontSize: "13px",
        lineHeight: "1.8",
        fontFamily: "monospace",
      }}>
        {logs.map((l) => (
          <div key={l.id} style={{ display: "flex", gap: "10px" }}>
            <span style={{ color: "var(--text-muted)", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
              {l.ts}
            </span>
            <span style={{ color: COLOR[l.level] }}>{l.msg}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
