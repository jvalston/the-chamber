// Shared navigation type and section definitions.
// Import View and NAV_SECTIONS into Sidebar and page.tsx.
// Add new views here first, then wire them in page.tsx.

export type View =
  // Core
  | "system" | "agents" | "routing"
  // Operations
  | "tasks" | "projects" | "calendar" | "pipeline"
  // Intelligence
  | "memory" | "docs" | "repos" | "inbox"
  // Comms
  | "comms" | "discord"
  // Structure
  | "team" | "office" | "approvals" | "council" | "people"
  // Growth
  | "radar" | "content" | "factory" | "feedback"
  | "keys" | "scripts" | "translate";

interface NavItem    { id: View; label: string; }
interface NavSection { label: string; items: NavItem[]; }

export const NAV_SECTIONS: NavSection[] = [
  {
    label: "CONSTELLATION",
    items: [
      { id: "system",  label: "System"  },
      { id: "agents",  label: "Agents"  },
      { id: "routing", label: "Routing" },
    ],
  },
  {
    label: "OPERATIONS",
    items: [
      { id: "tasks",    label: "Tasks"    },
      { id: "projects", label: "Projects" },
      { id: "calendar", label: "Calendar" },
      { id: "pipeline", label: "Pipeline" },
    ],
  },
  {
    label: "INTELLIGENCE",
    items: [
      { id: "memory", label: "Memory"     },
      { id: "docs",   label: "Docs"       },
      { id: "repos",  label: "Blueprints" },
      { id: "inbox",  label: "Inbox"      },
      { id: "comms",   label: "Comms"   },
      { id: "discord", label: "Discord" },
    ],
  },
  {
    label: "STRUCTURE",
    items: [
      { id: "team",      label: "Team"      },
      { id: "office",    label: "Office"    },
      { id: "approvals", label: "Approvals" },
      { id: "council",   label: "Council"   },
      { id: "people",    label: "People"    },
    ],
  },
  {
    label: "GROWTH",
    items: [
      { id: "radar",    label: "Radar"    },
      { id: "content",  label: "Content"  },
      { id: "factory",  label: "Factory"  },
      { id: "feedback", label: "Feedback" },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      { id: "keys",       label: "Keys"       },
      { id: "scripts",    label: "Scripts"    },
      { id: "translate",  label: "Translator" },
    ],
  },
];
