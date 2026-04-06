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
import NodesPanel from "./components/NodesPanel";
import MemoryView from "./components/MemoryView";
import TasksView from "./components/TasksView";
import ProjectsView from "./components/ProjectsView";
import InboxView from "./components/InboxView";
import ReposView from "./components/ReposView";
import DocsView from "./components/DocsView";
import NotesBridgeView from "./components/NotesBridgeView";
import FlowLayer from "./components/flow/FlowLayer";
import CalendarView  from "./components/CalendarView";
import TeamView      from "./components/TeamView";
import OfficeView    from "./components/OfficeView";
import ContentView   from "./components/ContentView";
import ApprovalsView from "./components/ApprovalsView";
import StarToolsView from "./components/StarToolsView";
import CouncilView   from "./components/CouncilView";
import PipelineView  from "./components/PipelineView";
import RadarView     from "./components/RadarView";
import FactoryView   from "./components/FactoryView";
import PeopleView    from "./components/PeopleView";
import FeedbackView  from "./components/FeedbackView";
import CommsView     from "./components/CommsView";
import DiscordView   from "./components/DiscordView";
import KeysView      from "./components/KeysView";
import ScriptsView      from "./components/ScriptsView";
import TranslatorView   from "./components/TranslatorView";
import TranscriptView   from "./components/TranscriptView";
import TelegramView     from "./components/TelegramView";
import PollsView       from "./components/PollsView";

// Service data lives in /data/system.ts — edit there to add/remove services
import {
  CORE_SERVICES,
  AI_SERVICES,
  SUPPORT_SERVICES,
  Service,
} from "../data/system";

// Shared View type — defined in app/nav.ts, used by TopBar + page
import { View } from "./nav";

// ---------------------------------------------------------------------------
// SYSTEM view — live health checks wired to service panels
// ---------------------------------------------------------------------------

function SystemView() {
  const [liveStatus, setLiveStatus] = useState<Record<string, Service["status"]>>({});

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
    return svcs.map((s) => {
      const key = s.healthKey ?? (s.port !== undefined ? String(s.port) : undefined);
      return key && liveStatus[key] !== undefined
        ? { ...s, status: liveStatus[key] }
        : s;
    });
  }

  return (
    <div
      style={{
        flex:          1,
        display:       "flex",
        flexDirection: "column",
        padding:       "8px",
        gap:           "8px",
        overflow:      "hidden",
        height:        "100%",
      }}
    >
      <div className="panel" style={{ flexShrink: 0 }}>
        <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border)", background: "rgba(0,0,0,0.3)" }}>
          <div style={{ fontSize: "12px", letterSpacing: "0.14em", color: "var(--accent)", fontWeight: 700 }}>
            CONSTELLATION CHAMBER OF STARS
          </div>
          <div style={{ marginTop: "6px", fontSize: "11px", color: "var(--text-secondary)", letterSpacing: "0.04em", lineHeight: 1.5 }}>
            Mission: Every star receives input, performs its role, and emits output into the chain.
            No stage completes without star interaction. Origin retains full override.
          </div>
        </div>
      </div>

      {/* Live activity strip — horizontal flow across agents, routing, memory, tasks */}
      <FlowLayer />

      {/* Service / metrics grid */}
      <div
        style={{
          flex:                1,
          display:             "grid",
          gridTemplateColumns: "250px 250px 1fr 280px",
          gridTemplateRows:    "1fr 1fr",
          gap:                 "8px",
          overflow:            "hidden",
          minHeight:           0,
        }}
      >
        <ServicePanel title="CORE SERVICES"    services={withLive(CORE_SERVICES)}    />
        <ServicePanel title="AI STACK"         services={withLive(AI_SERVICES)}      />

        <div style={{ gridColumn: "3", gridRow: "1" }}>
          <ActivityLog />
        </div>

        <CloudGate />

        <ServicePanel title="SUPPORT SERVICES" services={withLive(SUPPORT_SERVICES)} />

        <SystemMetrics />

        <div style={{ gridColumn: "3 / span 2", gridRow: "2" }}>
          <QuickActions />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AGENTS view — roster + waiting + activity log
// ---------------------------------------------------------------------------

function AgentsView() {
  return (
    <div style={{ flex: 1, display: "flex", gap: "8px", padding: "8px", overflow: "hidden", height: "100%" }}>

      {/* Main area — agents stack vertically */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px", overflow: "hidden", minWidth: 0 }}>
        {/* Active agents — shrinks to natural height */}
        <ActiveAgentsPanel />
        {/* Waiting agents — takes remaining space, scrolls internally */}
        <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
          <WaitingAgentsPanel />
        </div>
        {/* Pending — shrinks to natural height */}
        <PendingAgentSlots />
      </div>

      {/* Right sidebar — system nodes, full portraits, scrollable */}
      <div style={{ width: "272px", flexShrink: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
        <NodesPanel />
      </div>

    </div>
  );
}

const PENDING_COUNT = 4;

function PendingAgentSlots() {
  return (
    <div className="panel" style={{ flexShrink: 0 }}>
      <div className="panel-header">
        <span style={{ color: "var(--text-muted)", marginRight: "6px" }}>◌</span>
        PENDING SLOTS
        <span style={{ color: "var(--text-muted)", fontWeight: 400, marginLeft: "6px" }}>
          — {PENDING_COUNT} reserved
        </span>
      </div>
      <div style={{ padding: "10px", display: "flex", gap: "8px" }}>
        {Array.from({ length: PENDING_COUNT }).map((_, i) => (
          <div
            key={i}
            style={{
              flex:          1,
              height:        "72px",
              border:        "1px dashed var(--border)",
              borderRadius:  "4px",
              display:       "flex",
              flexDirection: "column",
              alignItems:    "center",
              justifyContent:"center",
              gap:           "5px",
              color:         "var(--text-muted)",
              background:    "rgba(0,0,0,0.15)",
            }}
          >
            <div style={{ fontSize: "18px", lineHeight: 1, opacity: 0.3 }}>+</div>
            <div style={{ fontSize: "8px", letterSpacing: "0.14em" }}>AGENT SLOT</div>
          </div>
        ))}
      </div>
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
      {view === "system"    ? <SystemView />    :
       view === "agents"    ? <AgentsView />    :
       view === "routing"   ? (
         <div style={{ flex: 1, display: "grid", gridTemplateColumns: "360px 360px", gap: "8px", padding: "8px", alignContent: "start", overflowY: "auto" }}>
           <ModelPanel />
         </div>
       ) :
       view === "memory"    ? <MemoryView />    :
       view === "tasks"     ? <TasksView />     :
       view === "projects"  ? <ProjectsView />  :
       view === "inbox"     ? <InboxView />     :
       view === "repos"     ? <ReposView />     :
       view === "docs"      ? <DocsView />      :
       view === "notes"     ? <NotesBridgeView /> :
       view === "calendar"  ? <CalendarView />  :
       view === "team"      ? <TeamView />      :
       view === "office"    ? <OfficeView />    :
       view === "star-tools"? <StarToolsView /> :
       view === "content"   ? <ContentView />   :
       view === "approvals" ? <ApprovalsView /> :
       view === "council"   ? <CouncilView />   :
       view === "pipeline"  ? <PipelineView />  :
       view === "radar"     ? <RadarView />     :
       view === "factory"   ? <FactoryView />   :
       view === "people"    ? <PeopleView />    :
       view === "feedback"  ? <FeedbackView />  :
       view === "comms"     ? <CommsView />     :
       view === "discord"   ? <DiscordView />   :
       view === "keys"      ? <KeysView />      :
       view === "scripts"    ? <ScriptsView />    :
       view === "translate"  ? <TranslatorView /> :
       view === "transcript" ? <TranscriptView /> :
       view === "telegram"   ? <TelegramView />   :
       view === "polls"      ? <PollsView />      :
       null}
    </div>
  );
}
