"use client";
import { useEffect, useState } from "react";

import TopBar from "./components/TopBar";
import ServicePanel from "./components/ServicePanel";
import ModelPanel from "./components/ModelPanel";
import CloudGate from "./components/CloudGate";
import SystemMetrics from "./components/SystemMetrics";
import ActivityLog from "./components/ActivityLog";
import QuickActions from "./components/QuickActions";
import ActiveAgentsPanel from "./components/ActiveAgentsPanel";
import WaitingAgentsPanel from "./components/WaitingAgentsPanel";
import MemoryView from "./components/MemoryView";
import TasksView from "./components/TasksView";
import ProjectsView from "./components/ProjectsView";
import DocsView from "./components/DocsView";

// Service data lives in /data/system.ts — edit there to add/remove services
import {
  CORE_SERVICES,
  AI_SERVICES,
  SUPPORT_SERVICES,
  Service,
} from "../data/system";

type View = "system" | "agents" | "memory" | "tasks" | "projects" | "docs";

// ---------------------------------------------------------------------------
// SYSTEM view — live health checks wired to service panels
// ---------------------------------------------------------------------------

function SystemView() {
  const [liveStatus, setLiveStatus] = useState<Record<number, Service["status"]>>({});

  useEffect(() => {
    async function poll() {
      try {
        const r = await fetch("/api/health", { cache: "no-store" });
        if (r.ok) setLiveStatus(await r.json());
      } catch { /* keep last known */ }
    }
    poll();
    const id = setInterval(poll, 15_000);
    return () => clearInterval(id);
  }, []);

  function withLive(svcs: Service[]): Service[] {
    return svcs.map((s) =>
      s.port !== undefined && liveStatus[s.port] !== undefined
        ? { ...s, status: liveStatus[s.port] }
        : s
    );
  }

  return (
    <div
      style={{
        flex: 1,
        display: "grid",
        gridTemplateColumns: "250px 250px 1fr 280px",
        gridTemplateRows: "1fr 1fr",
        gap: "8px",
        padding: "8px",
        overflow: "hidden",
        height: "100%",
      }}
    >
      <ServicePanel title="CORE SERVICES"    services={withLive(CORE_SERVICES)}    />
      <ServicePanel title="AI STACK"         services={withLive(AI_SERVICES)}      />

      <div style={{ gridRow: "1 / 3" }}>
        <ActivityLog />
      </div>

      <CloudGate />

      <ServicePanel title="SUPPORT SERVICES" services={withLive(SUPPORT_SERVICES)} />

      <SystemMetrics />

      <QuickActions />
    </div>
  );
}

// ---------------------------------------------------------------------------
// AGENTS view — roster + waiting + activity log
// ---------------------------------------------------------------------------

function AgentsView() {
  return (
    <div
      style={{
        flex: 1,
        display: "grid",
        gridTemplateColumns: "1fr 300px",
        gridTemplateRows: "1.2fr 0.8fr",
        gap: "8px",
        padding: "8px",
        overflow: "hidden",
        height: "100%",
      }}
    >
      <ActiveAgentsPanel />

      {/* Activity Log spans both rows — TODO: wire to live log stream endpoint */}
      <div style={{ gridRow: "1 / 3" }}>
        <ActivityLog />
      </div>

      <WaitingAgentsPanel />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

export default function Home() {
  const [view, setView] = useState<View>("system");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      <TopBar view={view} onViewChange={setView} />
      {view === "system"   ? <SystemView />   :
       view === "agents"   ? <AgentsView />   :
       view === "memory"   ? <MemoryView />   :
       view === "tasks"    ? <TasksView />    :
       view === "projects" ? <ProjectsView /> :
       <DocsView />}
    </div>
  );
}
