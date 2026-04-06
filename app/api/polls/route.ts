import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { CONSTELLATION_STAR_IDS } from "../../../config/constellation-polls";

// Discord channel name → ID map — full Constellation map
const DISCORD_CHANNELS: Record<string, string> = {
  // System entry
  "veris-orientation":       "1486959535636873286",
  "constellation-alerts":    "1485720215764603052",
  "handoff-ops":             "1485720215684907018",
  // Chamber of Arrival
  "orientation-gate":        "1487045531078361209",
  "welcome":                 "1487045531573424179",
  "orientation-log":         "1487045532919795904",
  // Sentinel Wing
  "sentinel-command":        "1486727404180344933",
  "validation-log":          "1487045533062135899",
  "system-watch":            "1487045533116797120",
  // Commons of Convergence
  "commons":                 "1476118079787503708",
  "polls":                   "1487755335367393392",
  "constellation-map":       "1487045533099884647",
  "persephone":              "1487775031365861456",
  // Operations Offices
  "seraphim-hq":             "1485825391699427519",
  "diamond-build":           "1482706006596391088",
  "lumen-scribe":            "1485244869457739847",
  "kairo-flow":              "1486957646740197517",
  "atlas-navigation":        "1482706060266700951",
  "aurora-navigation":       "1482706070622310533",
  // Record
  "elior-archives":          "1482706031275413677",
  "daily-memory-log":        "1485720215546363984",
  // Treasury
  "treasury-finance":        "1482706081489748070",
  // Expression / Legend
  "legacy":                  "1482706050028408954",
  "music-creation":          "1487045533389291550",
  "chamber-of-resonance":    "1487045534089871402",
  // Inner Chambers
  "seraphim-chamber":        "1487045618655432904",
  "elior-chamber":           "1487045618613358625",
  "sentinel-chamber":        "1487045618986651710",
  "legend-chamber":          "1487045618638520425",
  "kairo-chamber":           "1487045618957422644",
  "lumen-chamber":           "1487045618953224424",
  "aurora-chamber":          "1487045619448156190",
  "atlas-chamber":           "1487045619531911228",
  "veris-chamber":           "1487045619645288538",
  "aurelion-chamber":        "1487045619804799116",
  "diamond-chamber":         "1487045625907511387",
};

// Seraphim's (default) bot token — used for direct Discord posts
const DISCORD_TOKEN = process.env.DISCORD_TOKEN_SERAPHIM ?? "";
const FILE = join(process.cwd(), "data", "polls.json");
const ARCHIVE_FILE = join(process.cwd(), "data", "polls.archive.json");

export interface PollOption { id: string; label: string; votes: string[]; }
export interface Poll {
  id:        string;
  question:  string;
  options:   PollOption[];
  type:      "single" | "multi";
  status:    "draft" | "open" | "closed";
  channel:   string;
  createdBy: string;
  createdAt: string;
  closesAt?: string;
  postedToDiscord: boolean;
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

function normalizeVoter(voter: string) {
  return voter.trim().toLowerCase();
}

function getExpectedVoters(poll?: Poll) {
  return (poll?.expectedVoters && poll.expectedVoters.length > 0
    ? poll.expectedVoters
    : [...CONSTELLATION_STAR_IDS]
  ).map(normalizeVoter);
}

function countVotes(poll: Poll) {
  return poll.options.reduce((sum, option) => sum + option.votes.length, 0);
}

function winnerLabel(poll: Poll) {
  if (poll.options.length === 0) return "No options";
  return poll.options.reduce((a, b) => (a.votes.length >= b.votes.length ? a : b)).label;
}

function replaceVotesForPoll(poll: Poll, picks: Record<string, string>) {
  const expected = new Set(getExpectedVoters(poll));
  poll.options = poll.options.map((option) => ({ ...option, votes: [] }));

  for (const [rawVoter, optionId] of Object.entries(picks)) {
    const voter = normalizeVoter(rawVoter);
    if (!expected.has(voter) || !optionId) continue;
    const option = poll.options.find((entry) => entry.id === optionId);
    if (!option) continue;
    if (!option.votes.includes(voter)) option.votes.push(voter);
  }
}

function appendActivity(data: { activity?: Array<{ id: string; text: string; ts: string }> }, text: string, ts = new Date().toISOString()) {
  data.activity = [
    { id: `a${Date.now()}`, text, ts },
    ...(data.activity ?? []).slice(0, 49),
  ];
}

function read() {
  if (!existsSync(FILE)) return { polls: [], activity: [] };
  return JSON.parse(readFileSync(FILE, "utf8"));
}
function write(data: object) {
  writeFileSync(FILE, JSON.stringify(data, null, 2));
}

function readArchive() {
  if (!existsSync(ARCHIVE_FILE)) return { archived: [] as Array<Poll & { archivedAt: string; archiveReason: string }> };
  return JSON.parse(readFileSync(ARCHIVE_FILE, "utf8"));
}

function writeArchive(data: object) {
  writeFileSync(ARCHIVE_FILE, JSON.stringify(data, null, 2));
}

// Format poll as Discord message
function formatForDiscord(poll: Poll): string {
  const emojiMap = ["1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣"];
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
  ].filter(l => l !== undefined);
  return lines.join("\n");
}

export async function GET() {
  return NextResponse.json(read());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const data = read();

  async function fetchDiscordMessages(channelId: string, limit = 50) {
    const res = await fetch(
      `https://discord.com/api/v10/channels/${channelId}/messages?limit=${limit}`,
      {
        headers: {
          "Authorization": `Bot ${DISCORD_TOKEN}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Discord API ${res.status}: ${err}`);
    }
    return res.json() as Promise<Array<{
      id: string;
      content: string;
      timestamp?: string;
      author?: { username?: string };
      poll?: {
        answers?: Array<{ poll_media?: { text?: string } }>;
        results?: { answer_counts?: Array<{ count?: number }> };
      };
    }>>;
  }

  // VOTE
  if (body._action === "vote" && body.pollId && body.optionId && body.voter) {
    const poll = data.polls.find((p: Poll) => p.id === body.pollId);
    if (!poll) return NextResponse.json({ error: "poll not found" }, { status: 404 });
    if (poll.status === "draft") return NextResponse.json({ error: "poll not open" }, { status: 400 });
    const voter = normalizeVoter(body.voter);
    if (!getExpectedVoters(poll).includes(voter)) {
      return NextResponse.json({ error: `unknown voter: ${body.voter}` }, { status: 400 });
    }

    // Single choice: remove voter from all options first
    if (poll.type === "single") {
      poll.options.forEach((o: PollOption) => {
        o.votes = o.votes.filter((v: string) => v !== voter);
      });
    }
    const opt = poll.options.find((o: PollOption) => o.id === body.optionId);
    if (opt && !opt.votes.includes(voter)) opt.votes.push(voter);
    write(data);
    return NextResponse.json({ ok: true });
  }

  if (body._action === "replace-tally" && body.pollId && body.picks) {
    const poll = data.polls.find((p: Poll) => p.id === body.pollId);
    if (!poll) return NextResponse.json({ error: "poll not found" }, { status: 404 });

    replaceVotesForPoll(poll, body.picks as Record<string, string>);
    const ts = new Date().toISOString();
    poll.talliedAt = ts;
    poll.talliedBy = body.talliedBy ?? "origin";
    appendActivity(
      data,
      `Poll tally saved for "${poll.question}" with ${countVotes(poll)}/${getExpectedVoters(poll).length} stars recorded.`,
      ts,
    );
    write(data);
    return NextResponse.json({ ok: true, votes: countVotes(poll) });
  }

  if (body._action === "record-comms-votes" && body.pollId && Array.isArray(body.responses)) {
    const poll = data.polls.find((p: Poll) => p.id === body.pollId);
    if (!poll) return NextResponse.json({ error: "poll not found" }, { status: 404 });

    const expected = new Set(getExpectedVoters(poll));
    const picks: Record<string, string> = {};
    const recorded: string[] = [];

    for (const item of body.responses as Array<{ agentId?: string; optionId?: string }>) {
      const voter = normalizeVoter(item.agentId ?? "");
      if (!expected.has(voter) || !item.optionId) continue;
      picks[voter] = item.optionId;
      recorded.push(voter);
    }

    for (const [voter, optionId] of Object.entries(picks)) {
      if (poll.type === "single") {
        poll.options.forEach((option: PollOption) => {
          option.votes = option.votes.filter((entry: string) => entry !== voter);
        });
      }
      const option = poll.options.find((entry: PollOption) => entry.id === optionId);
      if (option && !option.votes.includes(voter)) option.votes.push(voter);
    }

    const failed = Array.isArray(body.failed) ? body.failed.map((entry: string) => normalizeVoter(entry)) : [];
    poll.lastCommsPollAt = new Date().toISOString();
    poll.lastCommsPollSummary = {
      attempted: getExpectedVoters(poll).length,
      delivered: Number(body.delivered ?? 0),
      recorded: recorded.length,
      failed,
    };
    appendActivity(
      data,
      `Comms poll pass for "${poll.question}": ${recorded.length} vote${recorded.length !== 1 ? "s" : ""} recorded, ${failed.length} failed delivery${failed.length !== 1 ? "ies" : "y"}.`,
      poll.lastCommsPollAt,
    );
    write(data);
    return NextResponse.json({ ok: true, recorded: recorded.length, failed });
  }

  // CLOSE
  if (body._action === "close" && body.id) {
    data.polls = data.polls.map((p: Poll) => {
      if (p.id !== body.id) return p;
      const closed = { ...p, status: "closed" as const };
      const expected = getExpectedVoters(closed).length;
      appendActivity(
        data,
        `Poll closed. Final result: ${countVotes(closed)}/${expected} stars voted — ${winnerLabel(closed)} wins.`,
      );
      return closed;
    });
    write(data);
    return NextResponse.json({ ok: true });
  }

  // ARCHIVE CLOSED POLLS
  if (body._action === "archive-closed") {
    const archive = readArchive();
    const closed = (data.polls as Poll[]).filter((p) => p.status === "closed");
    const active = (data.polls as Poll[]).filter((p) => p.status !== "closed");

    if (closed.length === 0) {
      return NextResponse.json({ ok: true, archived: 0 });
    }

    const nowIso = new Date().toISOString();
    archive.archived = [
      ...closed.map((p) => ({ ...p, archivedAt: nowIso, archiveReason: "manual-archive-closed" })),
      ...(archive.archived ?? []),
    ];
    data.polls = active;
    data.activity = [
      {
        id: `a${Date.now()}`,
        text: `Archived ${closed.length} closed poll${closed.length !== 1 ? "s" : ""}.`,
        ts: nowIso,
      },
      ...(data.activity ?? []).slice(0, 49),
    ];

    writeArchive(archive);
    write(data);
    return NextResponse.json({ ok: true, archived: closed.length });
  }

  // OPEN
  if (body._action === "open" && body.id) {
    data.polls = data.polls.map((p: Poll) =>
      p.id === body.id ? { ...p, status: "open" } : p
    );
    write(data);
    return NextResponse.json({ ok: true });
  }

  if (body._action === "mark-results-posted" && body.pollId) {
    const poll = data.polls.find((p: Poll) => p.id === body.pollId);
    if (!poll) return NextResponse.json({ error: "poll not found" }, { status: 404 });
    const ts = new Date().toISOString();
    poll.resultsPostedAt = ts;
    poll.resultsPostedBy = body.postedBy ?? "origin";
    appendActivity(
      data,
      `Poll results posted for "${poll.question}" with ${countVotes(poll)}/${getExpectedVoters(poll).length} stars recorded.`,
      ts,
    );
    write(data);
    return NextResponse.json({ ok: true });
  }

  // POST TO DISCORD
  if (body._action === "post-discord" && body.id) {
    const poll = data.polls.find((p: Poll) => p.id === body.id);
    if (!poll) return NextResponse.json({ error: "poll not found" }, { status: 404 });

    const channelId = DISCORD_CHANNELS[poll.channel];
    if (!channelId) {
      return NextResponse.json({ error: `No Discord channel ID mapped for "${poll.channel}". Add it to DISCORD_CHANNELS in the API.` }, { status: 400 });
    }

    const msg = formatForDiscord(poll);
    try {
      const headers = {
        "Authorization": `Bot ${DISCORD_TOKEN}`,
        "Content-Type": "application/json",
      };

      // Post to selected poll channel
      const primaryRes = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
        method: "POST",
        headers,
        body: JSON.stringify({ content: msg }),
      });
      if (!primaryRes.ok) {
        const err = await primaryRes.text();
        return NextResponse.json({ error: `Discord API ${primaryRes.status}: ${err}` }, { status: 500 });
      }
      const posted = await primaryRes.json() as { id?: string };

      // Mirror to commons so all agents that monitor commons can see it
      const commonsId = DISCORD_CHANNELS["commons"];
      if (commonsId && commonsId !== channelId) {
        await fetch(`https://discord.com/api/v10/channels/${commonsId}/messages`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            content: `📣 Poll mirror from #${poll.channel}\n\n${msg}`,
          }),
        }).catch(() => undefined);
      }

      data.polls = data.polls.map((p: Poll) =>
        p.id === body.id
          ? {
              ...p,
              postedToDiscord: true,
              status: "open",
              discordMessageId: posted.id,
              discordChannelId: channelId,
            }
          : p
      );
      write(data);
      return NextResponse.json({ ok: true });
    } catch (e) {
      return NextResponse.json({ error: String(e) }, { status: 500 });
    }
  }

  // SYNC VOTES FROM DISCORD
  if (body._action === "sync-discord" && body.id) {
    const poll = data.polls.find((p: Poll) => p.id === body.id);
    if (!poll) return NextResponse.json({ error: "poll not found" }, { status: 404 });

    const channelId = DISCORD_CHANNELS[poll.channel] || poll.discordChannelId;
    if (!channelId) {
      return NextResponse.json({ error: `No Discord channel ID mapped for "${poll.channel}"` }, { status: 400 });
    }

    try {
      const messages = await fetchDiscordMessages(channelId, 100);
      const pollIdLower = poll.id.toLowerCase();
      const questionLower = poll.question.toLowerCase();
      const target = poll.discordMessageId
        ? messages.find((m) => m.id === poll.discordMessageId)
        : messages.find((m) => (m.content ?? "").toLowerCase().includes(`poll id: \`${pollIdLower}\``))
          ?? messages.find((m) => (m.content ?? "").toLowerCase().includes(`poll id: ${pollIdLower}`))
          ?? messages.find((m) => {
            const c = (m.content ?? "").toLowerCase();
            return c.includes("constellation poll") && c.includes(questionLower.slice(0, 24));
          })
          ?? messages.find((m) => !!m.poll)
          ?? messages[0];

      if (!target) {
        return NextResponse.json({ error: "No Discord messages found in channel for sync." }, { status: 404 });
      }

      // Native Discord poll sync (count-based)
      const counts = target.poll?.results?.answer_counts?.map((a) => Number(a.count ?? 0));
      if (counts && counts.length > 0) {
        poll.options = poll.options.map((opt: PollOption, idx: number) => {
          const count = counts[idx] ?? 0;
          const voters = Array.from({ length: count }, (_, i) => `discord-vote-${idx + 1}-${i + 1}`);
          return { ...opt, votes: voters };
        });
        poll.postedToDiscord = true;
        poll.discordMessageId = target.id;
        poll.discordChannelId = channelId;
        write(data);
        return NextResponse.json({ ok: true, synced: "native-poll", messageId: target.id });
      }

      // Fallback: parse structured reply messages
      const byVoter = new Map<string, number>();
      const targetIndex = messages.findIndex((m) => m.id === target.id);
      const closeTime = poll.closesAt ? new Date(poll.closesAt).getTime() : null;

      for (let idx = 0; idx < messages.length; idx++) {
        const m = messages[idx];
        const text = (m.content ?? "").toLowerCase();
        if (!text) continue;

        const mentionsPoll =
          text.includes(`poll id: \`${pollIdLower}\``) ||
          text.includes(`poll id: ${pollIdLower}`);
        const isReplyAfterPoll = targetIndex >= 0 && idx < targetIndex;
        const hasChoiceLine = /choice:\s*(?:option\s*)?([1-9])/i.test(text);
        if (!(mentionsPoll || (isReplyAfterPoll && hasChoiceLine))) continue;

        if (closeTime && m.timestamp) {
          const t = new Date(m.timestamp).getTime();
          if (!Number.isNaN(t) && t > closeTime) continue;
        }

        const choice = text.match(/choice:\s*(?:option\s*)?([1-9])/i);
        if (!choice) continue;

        const voter =
          m.content.match(/agent:\s*([^\n\r]+)/i)?.[1]?.trim().toLowerCase() ||
          m.author?.username?.toLowerCase() ||
          "";
        if (!voter || voter.includes("[your name]")) continue;

        const optIndex = Math.max(0, Number(choice[1]) - 1);
        if (!voter || Number.isNaN(optIndex) || optIndex >= poll.options.length) continue;
        byVoter.set(voter, optIndex);
      }

      // If the poll is closed and already has votes, don't overwrite with an empty Discord parse
      const existingVoteCount = poll.options.reduce((n: number, o: PollOption) => n + o.votes.length, 0);
      if (poll.status === "closed" && existingVoteCount > 0 && byVoter.size === 0) {
        return NextResponse.json({ ok: true, synced: "skipped-protected", reason: "closed poll has votes; Discord parse found none", voters: 0 });
      }
      poll.options = poll.options.map((o: PollOption) => ({ ...o, votes: [] }));
      for (const [voter, optIndex] of byVoter.entries()) {
        poll.options[optIndex].votes.push(voter);
      }
      poll.postedToDiscord = true;
      poll.discordMessageId = target.id;
      poll.discordChannelId = channelId;
      write(data);
      return NextResponse.json({ ok: true, synced: "reply-parse", messageId: target.id, voters: byVoter.size });
    } catch (e) {
      return NextResponse.json({ error: String(e) }, { status: 500 });
    }
  }

  // CREATE
  const id = `poll-${Date.now()}`;
  const closesAt = body.durationHours
    ? new Date(Date.now() + body.durationHours * 3600_000).toISOString()
    : undefined;

  const poll: Poll = {
    id,
    question:        body.question ?? "Untitled poll",
    options:         (body.options ?? []).map((label: string, i: number) => ({
      id:    `opt-${i}`,
      label,
      votes: [],
    })),
    type:            body.type ?? "single",
    status:          "draft",
    channel:         body.channel ?? "commons",
    createdBy:       body.createdBy ?? "origin",
    createdAt:       new Date().toISOString(),
    postedToDiscord: false,
    expectedVoters:  [...CONSTELLATION_STAR_IDS],
    ...(closesAt ? { closesAt } : {}),
  };

  data.polls.unshift(poll);
  appendActivity(data, `Poll created: "${poll.question}" for ${poll.expectedVoters?.length ?? 0} stars.`);
  write(data);
  return NextResponse.json(poll);
}
