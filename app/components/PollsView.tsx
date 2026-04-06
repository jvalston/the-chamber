"use client";

import { useEffect, useState } from "react";
import { CONSTELLATION_STAR_IDS, CONSTELLATION_STAR_NAMES } from "../../config/constellation-polls";

interface PollOption { id: string; label: string; votes: string[]; }
interface Poll {
  id: string; question: string; options: PollOption[];
  type: "single" | "multi"; status: "draft" | "open" | "closed";
  channel: string; createdBy: string; createdAt: string;
  closesAt?: string; postedToDiscord: boolean;
  discordMessageId?: string;
  discordChannelId?: string;
  expectedVoters?: string[];
  talliedAt?: string;
  talliedBy?: string;
  resultsPostedAt?: string;
  resultsPostedBy?: string;
  lastCommsPollAt?: string;
  lastCommsPollSummary?: {
    attempted: number;
    delivered: number;
    recorded: number;
    failed: string[];
  };
}

const CHANNELS = ["polls", "commons", "constellation-alerts", "handoff-ops", "seraphim-hq", "diamond-build"];

export default function PollsView() {
  const [polls,       setPolls]       = useState<Poll[]>([]);
  const [creating,    setCreating]    = useState(false);
  const [posting,     setPosting]     = useState<string | null>(null);
  const [archiving,   setArchiving]   = useState(false);
  const [presenting,  setPresenting]  = useState<string | null>(null);
  const [presentMsg,  setPresentMsg]  = useState<Record<string, string>>({});
  const [workflowing, setWorkflowing] = useState<string | null>(null);

  // New poll form state
  const [question, setQuestion] = useState("");
  const [options,  setOptions]  = useState(["", "", "", ""]);
  const [type,     setType]     = useState<"single"|"multi">("single");
  const [channel,  setChannel]  = useState("polls");
  const [hours,    setHours]    = useState("24");

  async function load() {
    const r = await fetch("/api/polls");
    const d = await r.json();
    const next = d.polls ?? [];
    setPolls(next);
    return next as Poll[];
  }

  useEffect(() => {
    const handler = () => load();
    window.addEventListener("polls-refresh", handler);
    return () => window.removeEventListener("polls-refresh", handler);
  }, []);

  useEffect(() => {
    let active = true;
    let syncing = false;

    async function tick() {
      if (!active || syncing) return;
      syncing = true;
      try {
        const current = await load();
        const syncTargets = current
          .filter((p) => p.postedToDiscord && (p.status === "open" || p.status === "closed"))
          .slice(0, 8);

        for (const p of syncTargets) {
          await fetch("/api/polls", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ _action: "sync-discord", id: p.id }),
          });
        }

        if (syncTargets.length > 0) {
          await load();
        }
      } finally {
        syncing = false;
      }
    }

    tick();
    const id = setInterval(tick, 45_000);
    return () => { active = false; clearInterval(id); };
  }, []);

  async function createPoll() {
    const opts = options.filter(o => o.trim());
    if (!question.trim() || opts.length < 2) return;
    await fetch("/api/polls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, options: opts, type, channel, durationHours: Number(hours), createdBy: "origin" }),
    });
    setQuestion(""); setOptions(["","","",""]); setCreating(false);
    load();
  }

  async function action(id: string, act: string) {
    if (act === "post-discord") setPosting(id);
    await fetch("/api/polls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _action: act, id }),
    });
    setPosting(null);
    load();
  }

  async function vote(pollId: string, optionId: string, voter: string) {
    await fetch("/api/polls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _action: "vote", pollId, optionId, voter }),
    });
    load();
  }

  async function sendPollViaComms(poll: Poll) {
    const emojiMap = ["1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣"];
    const optLines = poll.options.map((o, i) => `${emojiMap[i]} ${o.label}`).join("\n");
    const message = [
      `📊 CONSTELLATION POLL — please vote now`,
      ``,
      `"${poll.question}"`,
      ``,
      optLines,
      ``,
      `Reply with ONLY the number of your choice (1–${poll.options.length}). Your response will be recorded as your vote.`,
    ].join("\n");

    const r = await fetch("/api/comms/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: CONSTELLATION_STAR_IDS.map(id => ({ agentId: id, message })) }),
    });
    const d = await r.json() as { results?: Array<{ agentId: string; ok: boolean; response: string }> };

    // Parse each response for a number choice
    const results = d.results ?? [];
    const recorded: Array<{ agentId: string; optionId: string }> = [];
    const failed: string[] = [];
    for (const res of results) {
      if (!res.ok || !res.response) {
        failed.push(res.agentId);
        continue;
      }
      const text = res.response;
      // Look for first standalone digit 1-N in the response
      const match = text.match(/\b([1-9])\b/);
      if (!match) continue;
      const idx = parseInt(match[1]) - 1;
      if (idx < 0 || idx >= poll.options.length) continue;
      recorded.push({ agentId: res.agentId, optionId: poll.options[idx].id });
    }
    await fetch("/api/polls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        _action: "record-comms-votes",
        pollId: poll.id,
        responses: recorded,
        delivered: results.filter((entry) => entry.ok).length,
        failed,
      }),
    });
    await load();
    window.dispatchEvent(new Event("polls-refresh"));
  }

  async function presentResults(poll: Poll) {
    setPresenting(poll.id);
    const emojiMap = ["1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣"];
    const totalVotes = poll.options.reduce((s, o) => s + o.votes.length, 0);
    const winner = poll.options.reduce((a, b) => a.votes.length >= b.votes.length ? a : b);
    const lines = [
      `📊 POLL RESULTS — ${poll.question}`,
      ``,
      ...poll.options.map((o, i) => {
        const pct = totalVotes > 0 ? Math.round((o.votes.length / totalVotes) * 100) : 0;
        const bar = "█".repeat(Math.round(pct / 10)) + "░".repeat(10 - Math.round(pct / 10));
        const voterList = o.votes.length > 0 ? ` (${o.votes.join(", ")})` : "";
        return `${emojiMap[i]} ${o.label}\n   ${bar} ${pct}% · ${o.votes.length} vote${o.votes.length !== 1 ? "s" : ""}${voterList}`;
      }),
      ``,
      totalVotes > 0
        ? `✦ LEADING: ${winner.label} with ${winner.votes.length} vote${winner.votes.length !== 1 ? "s" : ""}`
        : `✦ No votes recorded.`,
      ``,
      `Total votes: ${totalVotes} · Poll closed.`,
      `Results delivered by Origin via The Chamber.`,
    ].join("\n");

    try {
      const r = await fetch("/api/comms/broadcast", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ messages: CONSTELLATION_STAR_IDS.map(id => ({ agentId: id, message: lines })) }),
      });
      const d = await r.json();
      const ok = d.ok || d.results?.some((x: { ok: boolean }) => x.ok);
      if (ok) {
        await fetch("/api/polls", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ _action: "mark-results-posted", pollId: poll.id, postedBy: "origin" }),
        });
      }
      setPresentMsg(prev => ({ ...prev, [poll.id]: ok ? "Results broadcast to all stars." : "Partial delivery — check Comms log." }));
    } catch {
      setPresentMsg(prev => ({ ...prev, [poll.id]: "Broadcast failed — check Comms." }));
    }
    await load();
    setPresenting(null);
  }

  async function archiveClosed() {
    setArchiving(true);
    try {
      await fetch("/api/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _action: "archive-closed" }),
      });
      await load();
    } finally {
      setArchiving(false);
    }
  }

  async function runWorkflow(poll: Poll) {
    setWorkflowing(poll.id);
    try {
      if (poll.status === "draft") {
        await fetch("/api/polls", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ _action: "open", id: poll.id }),
        });
        await fetch("/api/polls", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ _action: "post-discord", id: poll.id }),
        });
      } else if (poll.status === "open") {
        if (!poll.lastCommsPollAt) {
          await sendPollViaComms(poll);
        } else {
          await fetch("/api/polls", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ _action: "sync-discord", id: poll.id }),
          });
        }
      } else if (poll.status === "closed" && !poll.resultsPostedAt) {
        await presentResults(poll);
      }
    } finally {
      await load();
      setWorkflowing(null);
    }
  }

  const open   = polls.filter(p => p.status === "open");
  const drafts = polls.filter(p => p.status === "draft");
  const closed = polls.filter(p => p.status === "closed");

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "8px", gap: "8px", overflow: "hidden", height: "100%" }}>

      {/* Header */}
      <div className="panel" style={{ flexShrink: 0 }}>
        <div className="panel-header">
          CONSTELLATION POLLS
          <button
            onClick={archiveClosed}
            disabled={archiving || closed.length === 0}
            style={{
              marginLeft: "auto", padding: "3px 10px",
              background: "transparent",
              border: "1px solid var(--border)",
              color: archiving || closed.length === 0 ? "var(--text-muted)" : "var(--yellow)",
              fontSize: "9px", cursor: archiving || closed.length === 0 ? "default" : "pointer", borderRadius: "2px", fontFamily: "inherit",
            }}
          >
            {archiving ? "ARCHIVING…" : `ARCHIVE CLOSED${closed.length > 0 ? ` (${closed.length})` : ""}`}
          </button>
          <button
            onClick={() => setCreating(!creating)}
            style={{
              marginLeft: "8px", padding: "3px 10px",
              background: creating ? "transparent" : "rgba(0,212,255,0.1)",
              border: "1px solid var(--accent)", color: "var(--accent)",
              fontSize: "9px", cursor: "pointer", borderRadius: "2px", fontFamily: "inherit",
            }}
          >
            {creating ? "CANCEL" : "+ NEW POLL"}
          </button>
        </div>

        {/* Create form */}
        {creating && (
          <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
            <input
              value={question} onChange={e => setQuestion(e.target.value)}
              placeholder="Poll question..."
              style={{ background: "rgba(0,0,0,0.4)", border: "1px solid var(--border)", color: "var(--text-primary)", padding: "6px 10px", fontSize: "11px", fontFamily: "inherit", borderRadius: "2px", outline: "none" }}
            />
            <div style={{ fontSize: "9px", color: "var(--text-muted)", letterSpacing: "0.08em" }}>OPTIONS</div>
            {options.map((o, i) => (
              <input key={i} value={o} onChange={e => { const n=[...options]; n[i]=e.target.value; setOptions(n); }}
                placeholder={`Option ${i+1}${i < 2 ? " (required)" : ""}`}
                style={{ background: "rgba(0,0,0,0.4)", border: "1px solid var(--border)", color: "var(--text-primary)", padding: "5px 10px", fontSize: "10px", fontFamily: "inherit", borderRadius: "2px", outline: "none" }}
              />
            ))}
            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
              <select value={type} onChange={e => setType(e.target.value as "single"|"multi")}
                style={{ background: "rgba(0,0,0,0.4)", border: "1px solid var(--border)", color: "var(--text-primary)", padding: "4px 8px", fontSize: "10px", fontFamily: "inherit", borderRadius: "2px" }}>
                <option value="single">Single choice</option>
                <option value="multi">Multi choice</option>
              </select>
              <select value={channel} onChange={e => setChannel(e.target.value)}
                style={{ background: "rgba(0,0,0,0.4)", border: "1px solid var(--border)", color: "var(--text-primary)", padding: "4px 8px", fontSize: "10px", fontFamily: "inherit", borderRadius: "2px" }}>
                {CHANNELS.map(c => <option key={c} value={c}>#{c}</option>)}
              </select>
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <input value={hours} onChange={e => setHours(e.target.value)} style={{ width: "40px", background: "rgba(0,0,0,0.4)", border: "1px solid var(--border)", color: "var(--text-primary)", padding: "4px 6px", fontSize: "10px", fontFamily: "inherit", borderRadius: "2px", textAlign: "center" }} />
                <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>hrs</span>
              </div>
              <button onClick={createPoll}
                style={{ padding: "5px 16px", background: "rgba(0,212,255,0.1)", border: "1px solid var(--accent)", color: "var(--accent)", fontSize: "10px", cursor: "pointer", borderRadius: "2px", fontFamily: "inherit", marginLeft: "auto" }}>
                CREATE
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Poll lists */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px", minHeight: 0 }}>

        {/* Open */}
        {open.length > 0 && open.map(poll => (
          <div key={poll.id}>
            <PollCard poll={poll} posting={posting} onAction={action} onVote={vote} />
            <PollLifecycle poll={poll} onRunWorkflow={runWorkflow} workflowing={workflowing === poll.id} />
            <CommsVoteBar poll={poll} onSend={sendPollViaComms} />
          </div>
        ))}

        {/* Drafts */}
        {drafts.length > 0 && (
          <>
            <div style={{ fontSize: "9px", color: "var(--text-muted)", letterSpacing: "0.12em", paddingLeft: "4px" }}>DRAFTS</div>
            {drafts.map(poll => <PollCard key={poll.id} poll={poll} posting={posting} onAction={action} onVote={vote} />)}
          </>
        )}

        {/* Closed */}
        {closed.length > 0 && (
          <>
            <div style={{ fontSize: "9px", color: "var(--text-muted)", letterSpacing: "0.12em", paddingLeft: "4px" }}>CLOSED</div>
            {closed.map(poll => (
              <div key={poll.id} style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                <PollCard poll={poll} posting={posting} onAction={action} onVote={vote} />
                <PollLifecycle poll={poll} onRunWorkflow={runWorkflow} workflowing={workflowing === poll.id} />
                <TallyPanel poll={poll} onPresent={presentResults} onSend={sendPollViaComms} presenting={presenting} presentMsg={presentMsg[poll.id]} />
              </div>
            ))}
          </>
        )}

        {polls.length === 0 && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "11px" }}>
            No polls yet. Create one above and post it to Discord.
          </div>
        )}
      </div>
    </div>
  );
}

function PollCard({ poll, posting, onAction, onVote }: {
  poll: Poll;
  posting: string | null;
  onAction: (id: string, act: string) => void;
  onVote: (pollId: string, optionId: string, voter: string) => void;
}) {
  const totalVotes = poll.options.reduce((s, o) => s + o.votes.length, 0);
  const maxVotes   = Math.max(...poll.options.map(o => o.votes.length), 1);
  const emojiMap   = ["1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣"];
  const [copied, setCopied]         = useState(false);
  const [addingTo, setAddingTo]     = useState<string | null>(null);
  const [voterName, setVoterName]   = useState("");

  const statusColor = poll.status === "open" ? "var(--green)" : poll.status === "draft" ? "var(--yellow)" : "var(--text-muted)";

  function copyPoll() {
    const lines = [
      `📊 **CONSTELLATION POLL**`,
      ``,
      `**${poll.question}**`,
      ``,
      ...poll.options.map((o, i) => `${emojiMap[i]} ${o.label}`),
      ``,
      poll.closesAt ? `⏱ Closes: ${new Date(poll.closesAt).toLocaleString()}` : "",
      ``,
      `**HOW TO RESPOND** — reply in this channel:`,
      `\`\`\``,
      `Agent: [Your name]`,
      `Choice: [Option number]`,
      `Reason: [1–2 lines from your domain only]`,
      `\`\`\``,
      `One response per agent. Stay within your domain.`,
      `Origin will review and decide after the window closes.`,
      ``,
      `Poll ID: \`${poll.id}\``,
    ].filter(Boolean).join("\n");
    navigator.clipboard.writeText(lines);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function submitVote(optId: string) {
    const name = voterName.trim().toLowerCase();
    if (!name) return;
    onVote(poll.id, optId, name);
    setVoterName("");
    setAddingTo(null);
  }

  return (
    <div className="panel" style={{ flexShrink: 0 }}>
      <div style={{ padding: "12px 14px" }}>

        {/* Question + status */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
          <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.4, flex: 1 }}>
            {poll.question}
          </div>
          <div style={{ display: "flex", gap: "6px", alignItems: "center", flexShrink: 0, marginLeft: "10px" }}>
            <span style={{ fontSize: "8px", color: statusColor, letterSpacing: "0.1em", border: `1px solid ${statusColor}`, padding: "2px 6px", borderRadius: "2px" }}>
              {poll.status.toUpperCase()}
            </span>
          {poll.postedToDiscord && (
              <span style={{ fontSize: "8px", color: "var(--accent)", letterSpacing: "0.08em" }}>📡 DISCORD</span>
            )}
          </div>
        </div>

        {/* Meta */}
        <div style={{ fontSize: "9px", color: "var(--text-muted)", marginBottom: "10px" }}>
          #{poll.channel} · {poll.type === "single" ? "single choice" : "multi choice"} · {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
          {poll.closesAt && ` · closes ${new Date(poll.closesAt).toLocaleDateString()}`}
        </div>

        {/* Options */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
          {poll.options.map((opt, i) => {
            const pct = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
            const isLeading = opt.votes.length === maxVotes && opt.votes.length > 0;
            return (
              <div key={opt.id}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px", alignItems: "center" }}>
                  <span style={{ fontSize: "10px", color: isLeading ? "var(--accent)" : "var(--text-secondary)" }}>
                    {emojiMap[i]} {opt.label}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "9px", color: "var(--text-muted)" }}>
                      {opt.votes.length} ({pct}%)
                    </span>
                    {poll.status !== "draft" && (
                      <button
                        onClick={() => { setAddingTo(addingTo === opt.id ? null : opt.id); setVoterName(""); }}
                        style={{ padding: "1px 6px", background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", fontSize: "9px", cursor: "pointer", borderRadius: "2px", fontFamily: "inherit", lineHeight: 1.4 }}>
                        +
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ height: "3px", background: "rgba(255,255,255,0.05)", borderRadius: "2px", marginBottom: addingTo === opt.id ? "6px" : 0 }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: isLeading ? "var(--accent)" : "rgba(0,212,255,0.3)", borderRadius: "2px", transition: "width 0.3s" }} />
                </div>
                {/* Voter names */}
                {opt.votes.length > 0 && (
                  <div style={{ fontSize: "8px", color: "var(--text-muted)", marginTop: "3px", letterSpacing: "0.05em" }}>
                    {opt.votes.join(", ")}
                  </div>
                )}
                {/* Manual vote input */}
                {addingTo === opt.id && (
                  <div style={{ display: "flex", gap: "4px", marginTop: "4px" }}>
                    <input
                      autoFocus
                      value={voterName}
                      onChange={e => setVoterName(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") submitVote(opt.id); if (e.key === "Escape") setAddingTo(null); }}
                      placeholder="Agent name..."
                      style={{ flex: 1, background: "rgba(0,0,0,0.4)", border: "1px solid var(--border)", color: "var(--text-primary)", padding: "3px 8px", fontSize: "10px", fontFamily: "inherit", borderRadius: "2px", outline: "none" }}
                    />
                    <button onClick={() => submitVote(opt.id)}
                      style={{ padding: "3px 10px", background: "rgba(0,212,255,0.07)", border: "1px solid var(--accent-dim)", color: "var(--accent)", fontSize: "9px", cursor: "pointer", borderRadius: "2px", fontFamily: "inherit" }}>
                      LOG
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          <button onClick={copyPoll}
            style={{ padding: "4px 10px", background: copied ? "rgba(0,255,157,0.07)" : "transparent", border: `1px solid ${copied ? "rgba(0,255,157,0.3)" : "var(--border)"}`, color: copied ? "var(--green)" : "var(--text-muted)", fontSize: "9px", cursor: "pointer", borderRadius: "2px", fontFamily: "inherit" }}>
            {copied ? "COPIED ✓" : "COPY"}
          </button>
          {poll.status === "draft" && (
            <>
              <button onClick={() => onAction(poll.id, "open")}
                style={{ padding: "4px 10px", background: "rgba(0,255,157,0.07)", border: "1px solid rgba(0,255,157,0.3)", color: "var(--green)", fontSize: "9px", cursor: "pointer", borderRadius: "2px", fontFamily: "inherit" }}>
                OPEN
              </button>
              <button onClick={() => onAction(poll.id, "post-discord")} disabled={posting === poll.id}
                style={{ padding: "4px 10px", background: "rgba(0,212,255,0.07)", border: "1px solid var(--accent-dim)", color: posting === poll.id ? "var(--text-muted)" : "var(--accent)", fontSize: "9px", cursor: posting === poll.id ? "default" : "pointer", borderRadius: "2px", fontFamily: "inherit" }}>
                {posting === poll.id ? "POSTING…" : "POST TO DISCORD"}
              </button>
              <button onClick={() => onAction(poll.id, "sync-discord")}
                style={{ padding: "4px 10px", background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", fontSize: "9px", cursor: "pointer", borderRadius: "2px", fontFamily: "inherit" }}>
                SYNC DISCORD VOTES
              </button>
            </>
          )}
          {poll.status === "open" && (
            <>
              <button onClick={() => onAction(poll.id, "post-discord")} disabled={posting === poll.id}
                style={{ padding: "4px 10px", background: "rgba(0,212,255,0.07)", border: "1px solid var(--accent-dim)", color: posting === poll.id ? "var(--text-muted)" : "var(--accent)", fontSize: "9px", cursor: posting === poll.id ? "default" : "pointer", borderRadius: "2px", fontFamily: "inherit" }}>
                {posting === poll.id ? "POSTING…" : "REPOST"}
              </button>
              <button onClick={() => onAction(poll.id, "close")}
                style={{ padding: "4px 10px", background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", fontSize: "9px", cursor: "pointer", borderRadius: "2px", fontFamily: "inherit" }}>
                CLOSE POLL
              </button>
              <button onClick={() => onAction(poll.id, "sync-discord")}
                style={{ padding: "4px 10px", background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", fontSize: "9px", cursor: "pointer", borderRadius: "2px", fontFamily: "inherit" }}>
                SYNC DISCORD VOTES
              </button>
            </>
          )}
          {poll.status === "closed" && (
            <button onClick={() => onAction(poll.id, "sync-discord")}
              style={{ padding: "4px 10px", background: "transparent", border: "1px solid var(--border)", color: "var(--text-muted)", fontSize: "9px", cursor: "pointer", borderRadius: "2px", fontFamily: "inherit" }}>
              SYNC DISCORD VOTES
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function PollLifecycle({ poll, onRunWorkflow, workflowing }: { poll: Poll; onRunWorkflow: (poll: Poll) => Promise<void>; workflowing: boolean; }) {
  const seatCount = poll.expectedVoters?.length ?? CONSTELLATION_STAR_IDS.length;
  const voteCount = poll.options.reduce((sum, option) => sum + option.votes.length, 0);
  const failed = poll.lastCommsPollSummary?.failed.length ?? 0;
  const steps = [
    { label: "Seats Ready", done: seatCount > 0, note: `${seatCount} seats` },
    { label: "Votes Open", done: poll.status === "open" || poll.status === "closed", note: poll.postedToDiscord ? "Discord posted" : "Awaiting post" },
    { label: "Tally Saved", done: Boolean(poll.talliedAt) || voteCount > 0, note: `${voteCount}/${seatCount} recorded` },
    { label: "Results Posted", done: Boolean(poll.resultsPostedAt), note: poll.resultsPostedAt ? "Broadcast complete" : "Pending" },
  ];
  const nextStep =
    poll.status === "draft"
      ? "Open + post"
      : poll.status === "open"
        ? (!poll.lastCommsPollAt ? "Send for votes" : "Refresh votes")
        : (!poll.resultsPostedAt ? "Post results" : "Complete");

  return (
    <div className="panel" style={{ marginTop: "-1px", borderTop: "none", borderRadius: "0", padding: "8px 14px" }}>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
        {steps.map((step) => (
          <div
            key={step.label}
            style={{
              minWidth: "126px",
              padding: "6px 8px",
              border: `1px solid ${step.done ? "rgba(0,255,157,0.25)" : "var(--border)"}`,
              background: step.done ? "rgba(0,255,157,0.05)" : "rgba(255,255,255,0.02)",
              borderRadius: "2px",
            }}
          >
            <div style={{ fontSize: "8px", letterSpacing: "0.08em", color: step.done ? "var(--green)" : "var(--text-muted)" }}>
              {step.done ? "READY" : "WAITING"}
            </div>
            <div style={{ fontSize: "10px", color: "var(--text-primary)", marginTop: "2px" }}>{step.label}</div>
            <div style={{ fontSize: "8px", color: "var(--text-muted)", marginTop: "2px" }}>{step.note}</div>
          </div>
        ))}
        {poll.lastCommsPollSummary && (
          <div style={{ marginLeft: "auto", fontSize: "9px", color: failed > 0 ? "#fb923c" : "var(--text-muted)" }}>
            Last poll pass: {poll.lastCommsPollSummary.recorded} recorded · {poll.lastCommsPollSummary.delivered} delivered
            {failed > 0 ? ` · ${failed} failed` : ""}
          </div>
        )}
        <button
          onClick={() => onRunWorkflow(poll)}
          disabled={workflowing || nextStep === "Complete"}
          style={{
            marginLeft: "auto",
            padding: "5px 12px",
            background: workflowing || nextStep === "Complete" ? "transparent" : "rgba(0,212,255,0.08)",
            border: "1px solid var(--accent-dim)",
            color: workflowing || nextStep === "Complete" ? "var(--text-muted)" : "var(--accent)",
            fontSize: "9px",
            cursor: workflowing || nextStep === "Complete" ? "default" : "pointer",
            borderRadius: "2px",
            fontFamily: "inherit",
            letterSpacing: "0.08em",
          }}
        >
          {workflowing ? "RUNNING…" : nextStep === "Complete" ? "WORKFLOW COMPLETE" : `NEXT STEP: ${nextStep.toUpperCase()}`}
        </button>
      </div>
    </div>
  );
}

function TallyPanel({ poll, onPresent, onSend, presenting, presentMsg }: {
  poll: Poll;
  onPresent: (poll: Poll) => void;
  onSend: (poll: Poll) => Promise<void>;
  presenting: string | null;
  presentMsg?: string;
}) {
  const [open, setOpen]       = useState(false);
  const [picks, setPicks]     = useState<Record<string, string>>({});
  const [saving, setSaving]   = useState(false);
  const [saved,  setSaved]    = useState(false);

  // Pre-populate from existing votes
  function initPicks() {
    const init: Record<string, string> = {};
    poll.options.forEach(opt => {
      opt.votes.forEach(voter => {
        init[voter.toLowerCase()] = opt.id;
      });
    });
    setPicks(init);
  }

  function toggle() {
    if (!open) initPicks();
    setOpen(o => !o);
  }

  async function saveAll() {
    setSaving(true);
    await fetch("/api/polls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _action: "replace-tally", pollId: poll.id, picks, talliedBy: "origin" }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    // Refresh parent
    window.dispatchEvent(new Event("polls-refresh"));
  }

  const totalVotes = poll.options.reduce((s, o) => s + o.votes.length, 0);

  return (
    <div className="panel" style={{ borderTop: "none", borderRadius: "0 0 4px 4px", marginTop: "-1px" }}>
      <div style={{ padding: "8px 14px", display: "flex", alignItems: "center", gap: "8px", borderTop: "1px solid var(--border)" }}>
        <button
          onClick={toggle}
          style={{
            padding: "4px 12px", background: open ? "rgba(251,146,60,0.1)" : "transparent",
            border: `1px solid ${open ? "rgba(251,146,60,0.5)" : "var(--border)"}`,
            color: open ? "#fb923c" : "var(--text-muted)",
            fontSize: "9px", cursor: "pointer", borderRadius: "2px", fontFamily: "inherit", letterSpacing: "0.08em",
          }}
        >
          {open ? "▲ HIDE TALLY" : `▼ TALLY VOTES${totalVotes > 0 ? ` (${totalVotes} recorded)` : ""}`}
        </button>
        <CommsVoteBar poll={poll} onSend={onSend} />
        <button
          onClick={() => onPresent(poll)}
          disabled={presenting === poll.id}
          style={{
            padding: "4px 12px",
            background: presenting === poll.id ? "transparent" : "rgba(251,146,60,0.1)",
            border: "1px solid rgba(251,146,60,0.5)",
            color: presenting === poll.id ? "var(--text-muted)" : "#fb923c",
            fontSize: "9px", cursor: presenting === poll.id ? "default" : "pointer",
            borderRadius: "2px", fontFamily: "inherit", letterSpacing: "0.08em",
          }}
        >
          {presenting === poll.id ? "BROADCASTING…" : "📡 PRESENT TO STARS"}
        </button>
        {presentMsg && (
          <span style={{ fontSize: "9px", color: "var(--green)" }}>{presentMsg}</span>
        )}
      </div>

      {open && (
        <div style={{ padding: "0 14px 12px" }}>
          <div style={{ fontSize: "9px", color: "var(--text-muted)", letterSpacing: "0.08em", marginBottom: "8px" }}>
            SELECT EACH STAR CHOICE - LEAVE BLANK IF THERE WAS NO VOTE
          </div>

          {/* Column headers */}
          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "4px 8px", marginBottom: "4px" }}>
            <span style={{ fontSize: "8px", color: "var(--text-muted)", letterSpacing: "0.08em" }}>STAR</span>
            <span style={{ fontSize: "8px", color: "var(--text-muted)", letterSpacing: "0.08em" }}>CHOICE</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "280px", overflowY: "auto" }}>
            {CONSTELLATION_STAR_NAMES.map(star => {
              const key = star.toLowerCase();
              const emojiMap = ["1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣"];
              return (
                <div key={star} style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: "4px 8px", alignItems: "center" }}>
                  <span style={{ fontSize: "10px", color: "var(--text-secondary)", letterSpacing: "0.06em" }}>{star}</span>
                  <select
                    value={picks[key] ?? ""}
                    onChange={e => setPicks(p => ({ ...p, [key]: e.target.value }))}
                    style={{
                      background: picks[key] ? "rgba(0,212,255,0.06)" : "rgba(0,0,0,0.3)",
                      border: `1px solid ${picks[key] ? "var(--accent-dim)" : "var(--border)"}`,
                      color: picks[key] ? "var(--text-primary)" : "var(--text-muted)",
                      padding: "3px 6px", fontSize: "10px", fontFamily: "inherit",
                      borderRadius: "2px", width: "100%",
                    }}
                  >
                    <option value="">— no vote</option>
                    {poll.options.map((opt, i) => (
                      <option key={opt.id} value={opt.id}>{emojiMap[i]} {opt.label}</option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "10px" }}>
            <button
              onClick={saveAll}
              disabled={saving}
              style={{
                padding: "5px 16px",
                background: saving ? "transparent" : "rgba(0,212,255,0.1)",
                border: "1px solid var(--accent)", color: saving ? "var(--text-muted)" : "var(--accent)",
                fontSize: "10px", cursor: saving ? "default" : "pointer",
                borderRadius: "2px", fontFamily: "inherit", letterSpacing: "0.08em",
              }}
            >
              {saving ? "SAVING…" : "SAVE TALLY"}
            </button>
            {saved && <span style={{ fontSize: "9px", color: "var(--green)" }}>✓ Saved</span>}
            <span style={{ fontSize: "9px", color: "var(--text-muted)", marginLeft: "auto" }}>
              {Object.values(picks).filter(Boolean).length} of {CONSTELLATION_STAR_NAMES.length} stars recorded
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function CommsVoteBar({ poll, onSend }: { poll: Poll; onSend: (poll: Poll) => Promise<void> }) {
  const [sending, setSending] = useState(false);
  const [done,    setDone]    = useState(false);

  async function go() {
    setSending(true);
    await onSend(poll);
    setSending(false);
    setDone(true);
    setTimeout(() => setDone(false), 4000);
  }

  return (
    <div style={{ padding: "6px 14px 10px", marginTop: "-4px", display: "flex", alignItems: "center", gap: "8px" }}>
      <button
        onClick={go}
        disabled={sending}
        style={{
          padding: "4px 14px",
          background: sending ? "transparent" : "rgba(74,176,245,0.1)",
          border: "1px solid rgba(74,176,245,0.4)",
          color: sending ? "var(--text-muted)" : "var(--accent)",
          fontSize: "9px", cursor: sending ? "default" : "pointer",
          borderRadius: "2px", fontFamily: "inherit", letterSpacing: "0.08em",
        }}
      >
        {sending ? "SENDING TO STARS…" : "💬 POLL STARS VIA COMMS"}
      </button>
      {done && <span style={{ fontSize: "9px", color: "var(--green)" }}>✓ Sent — votes recorded from responses</span>}
      <span style={{ fontSize: "9px", color: "var(--text-muted)", marginLeft: "auto" }}>
        Sends directly via agent channels · replies auto-recorded
      </span>
    </div>
  );
}
