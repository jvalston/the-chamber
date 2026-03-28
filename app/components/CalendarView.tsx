"use client";

import { useEffect, useState } from "react";

const AGENT_COLOR: Record<string, string> = {
  Legend:   "#00d4ff",
  Seraphim: "#a855f7",
  Diamond:  "#00ff9d",
  Elior:    "#ffd700",
  System:   "#7a9ab8",
  Gateway:  "#5b9bd5",
};

interface Task { time: string; title: string; agent: string; }
interface WeekTask extends Task { day: number; } // JS getDay() — 0=Sun

const ALWAYS_RUNNING = [
  { label: "Discord Listener",  interval: "continuous"  },
  { label: "Qdrant Monitor",    interval: "every 5 min" },
  { label: "OpenClaw Watch",    interval: "every 1 min" },
  { label: "TrueRecall Sync",   interval: "every 30 min"},
  { label: "LiveKit Heartbeat", interval: "every 2 min" },
];

const DAILY: Task[] = [
  { time: "06:00", title: "Morning Briefing",      agent: "Legend"   },
  { time: "07:00", title: "System Health Check",   agent: "Diamond"  },
  { time: "08:30", title: "Memory Archive",        agent: "Elior"    },
  { time: "09:00", title: "Task Triage",           agent: "Seraphim" },
  { time: "12:00", title: "Qdrant Sync",           agent: "Elior"    },
  { time: "17:00", title: "Evening Summary",       agent: "Legend"   },
  { time: "21:00", title: "Mem. Consolidation",    agent: "Elior"    },
];

const WEEKLY: WeekTask[] = [
  { day: 1, time: "10:00", title: "Governance Review",   agent: "Seraphim" },
  { day: 3, time: "13:00", title: "Deep Build Session",  agent: "Diamond"  },
  { day: 5, time: "16:00", title: "Creative Wrap",       agent: "Legend"   },
  { day: 6, time: "23:00", title: "Full Archive Backup", agent: "Elior"    },
];

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarView() {
  const [weekDates, setWeekDates] = useState<Date[]>([]);
  const [todayDay, setTodayDay] = useState(-1);

  useEffect(() => {
    const now = new Date();
    setTodayDay(now.getDay());
    // Build Mon–Sun dates for this week
    const mondayOffset = (now.getDay() + 6) % 7;
    const mon = new Date(now);
    mon.setDate(now.getDate() - mondayOffset);
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(mon);
      d.setDate(mon.getDate() + i);
      days.push(d);
    }
    setWeekDates(days);
  }, []);

  function tasksForDay(jsDay: number): Task[] {
    const extra = WEEKLY.filter((t) => t.day === jsDay);
    return [...DAILY, ...extra].sort((a, b) => a.time.localeCompare(b.time));
  }

  return (
    <div style={{
      flex:          1,
      display:       "flex",
      flexDirection: "column",
      padding:       "8px",
      gap:           "8px",
      overflow:      "hidden",
      height:        "100%",
    }}>
      {/* Always Running */}
      <div className="panel" style={{ flexShrink: 0 }}>
        <div className="panel-header">
          <span className="status-dot online" />
          ALWAYS RUNNING
        </div>
        <div style={{ padding: "10px 12px", display: "flex", gap: "7px", flexWrap: "wrap" }}>
          {ALWAYS_RUNNING.map((t) => (
            <span
              key={t.label}
              style={{
                display:    "inline-flex",
                alignItems: "center",
                gap:        "6px",
                background: "rgba(0,212,255,0.05)",
                border:     "1px solid rgba(0,212,255,0.18)",
                borderRadius: "3px",
                padding:    "3px 9px",
                fontSize:   "11px",
              }}
            >
              <span style={{ color: "var(--green)", fontSize: "7px" }}>●</span>
              <span style={{ color: "var(--text-primary)" }}>{t.label}</span>
              <span style={{ color: "var(--text-muted)" }}>• {t.interval}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Week grid */}
      <div className="panel" style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div className="panel-header" style={{ justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span>THIS WEEK</span>
            <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: "10px" }}>
              constellation schedule
            </span>
          </div>
        </div>

        {weekDates.length > 0 && (
          <div style={{
            flex:                1,
            display:             "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap:                 "1px",
            overflow:            "hidden",
            background:          "var(--border)",
          }}>
            {weekDates.map((date, i) => {
              const jsDay  = date.getDay();
              const isToday = jsDay === todayDay;
              const tasks  = tasksForDay(jsDay);

              return (
                <div key={i} style={{
                  background:    isToday ? "rgba(0,212,255,0.04)" : "var(--bg-panel)",
                  display:       "flex",
                  flexDirection: "column",
                  overflow:      "hidden",
                }}>
                  {/* Day header */}
                  <div style={{
                    padding:      "7px 8px 5px",
                    borderBottom: "1px solid var(--border)",
                    background:   isToday ? "rgba(0,212,255,0.09)" : "rgba(0,0,0,0.25)",
                    flexShrink:   0,
                  }}>
                    <div style={{
                      fontSize:      "9px",
                      fontWeight:    700,
                      letterSpacing: "0.12em",
                      color:         isToday ? "var(--accent)" : "var(--text-muted)",
                    }}>
                      {DAY_SHORT[jsDay]}
                    </div>
                    <div style={{
                      fontSize:  "18px",
                      fontWeight: 700,
                      color:     isToday ? "var(--accent)" : "var(--text-secondary)",
                      lineHeight: 1.1,
                    }}>
                      {date.getDate()}
                    </div>
                  </div>

                  {/* Tasks */}
                  <div style={{
                    flex:          1,
                    overflowY:     "auto",
                    padding:       "5px",
                    display:       "flex",
                    flexDirection: "column",
                    gap:           "4px",
                    scrollbarWidth: "thin",
                    scrollbarColor: "var(--border) transparent",
                  } as React.CSSProperties}>
                    {tasks.map((task, ti) => {
                      const col = AGENT_COLOR[task.agent] ?? "#7a9ab8";
                      return (
                        <div key={ti} style={{
                          borderLeft:   `2px solid ${col}`,
                          paddingLeft:  "5px",
                          paddingTop:   "2px",
                          paddingBottom: "2px",
                          background:   `${col}12`,
                          borderRadius: "0 2px 2px 0",
                        }}>
                          <div style={{
                            fontSize:           "9px",
                            color:              "var(--text-muted)",
                            fontVariantNumeric: "tabular-nums",
                          }}>
                            {task.time}
                          </div>
                          <div style={{
                            fontSize:   "11px",
                            color:      "var(--text-primary)",
                            lineHeight: 1.3,
                            fontWeight: 500,
                          }}>
                            {task.title}
                          </div>
                          <div style={{ fontSize: "10px", color: col }}>
                            {task.agent}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
