"use client";
import { useEffect, useState } from "react";
import MetricBar from "./MetricBar";

interface Metrics {
  cpu:  number;
  ram:  number;
  gpu:  number | null;
  vram: number | null;
}

export default function SystemMetrics() {
  const [m, setM]           = useState<Metrics | null>(null);
  const [lastSeen, setLastSeen] = useState<string>("–");

  useEffect(() => {
    async function poll() {
      try {
        const r = await fetch("/api/metrics", { cache: "no-store" });
        if (!r.ok) return;
        const data = await r.json();
        setM(data);
        setLastSeen(new Date().toLocaleTimeString("en-US", { hour12: false }));
      } catch { /* keep showing last known */ }
    }

    poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="panel" style={{ height: "100%" }}>
      <div className="panel-header">
        <span>SYSTEM RESOURCES</span>
        <span style={{ marginLeft: "auto", fontSize: "9px", color: "var(--text-muted)" }}>
          {lastSeen}
        </span>
      </div>
      <div style={{ padding: "12px" }}>
        {m === null ? (
          <div style={{ fontSize: "10px", color: "var(--text-muted)", padding: "8px 0" }}>
            Sampling…
          </div>
        ) : (
          <>
            <MetricBar label="CPU"  value={m.cpu}          warn={70} crit={88} />
            <MetricBar label="RAM"  value={m.ram}          warn={75} crit={90} />
            {m.gpu  !== null && <MetricBar label="GPU"  value={m.gpu}  warn={80} crit={95} />}
            {m.vram !== null && <MetricBar label="VRAM" value={m.vram} warn={75} crit={90} />}
            {m.gpu  === null && (
              <div style={{ fontSize: "9px", color: "var(--text-muted)", marginTop: "8px" }}>
                GPU — no nvidia-smi
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
