"use client";

import { Service, ServiceStatus } from "../../data/system";

export type { Service, ServiceStatus };

const STATUS_LABEL: Record<ServiceStatus, string> = {
  online:  "ONLINE",
  warn:    "DEGRADED",
  offline: "OFFLINE",
  idle:    "IDLE",
};

interface Props {
  title: string;
  services: Service[];
}

export default function ServicePanel({ title, services }: Props) {
  return (
    <div className="panel" style={{ height: "100%" }}>
      <div className="panel-header">
        <span>{title}</span>
      </div>
      <div style={{ padding: "8px 0" }}>
        {services.map((svc) => (
          <div
            key={svc.name}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "8px 12px",
              borderBottom: "1px solid rgba(30,45,69,0.4)",
              fontSize: "13px",
            }}
          >
            <div className={`status-dot ${svc.status}`} />
            <span style={{ flex: 1, color: "var(--text-primary)" }}>
              {svc.name}
            </span>
            {svc.port && (
              <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>
                :{svc.port}
              </span>
            )}
            <span
              style={{
                fontSize: "12px",
                letterSpacing: "0.08em",
                color:
                  svc.status === "online"  ? "var(--green)"   :
                  svc.status === "warn"    ? "var(--yellow)"  :
                  svc.status === "offline" ? "var(--red)"     :
                                             "var(--text-muted)",
              }}
            >
              {STATUS_LABEL[svc.status]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
