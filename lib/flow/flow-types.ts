// FlowLayer event schema — shared contract for all real-time system events.
// Every agent, gateway, memory write, task, and repo action should emit
// events that conform to this shape so the strip stays unified.

export type FlowEventType =
  | "input"       // message / trigger received
  | "routing"     // model or path selection
  | "memory"      // memory read or write
  | "task"        // task created, updated, or completed
  | "blueprint"   // blueprint submitted or promoted
  | "project"     // project created or updated
  | "repo"        // file / repo operation
  | "output"      // response generated or sent
  | "warning"     // non-fatal issue
  | "error";      // failure or fault

export type FlowEventStatus =
  | "active"
  | "complete"
  | "waiting"
  | "failed"
  | "queued";

export interface FlowEvent {
  id:        string;
  timestamp: string;
  agent:     string;           // Legend / Seraphim / Diamond / Elior / Gateway / System
  type:      FlowEventType;
  status:    FlowEventStatus;
  title:     string;
  detail?:   string;           // one short supporting line
  source?:   string;           // origin node
  target?:   string;           // destination node
  project?:  string;           // project context if applicable
  metadata?: Record<string, string | number | boolean>;
}
