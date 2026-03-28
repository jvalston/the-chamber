/**
 * clear-discord-channels.mjs
 * Clears all messages from each agent's Discord channel.
 * Keeps the channels — only deletes the messages.
 *
 * Usage:  node scripts/clear-discord-channels.mjs
 *
 * Fill in your bot tokens and channel IDs below.
 * Each agent needs its OWN bot token (the one for that agent's bot).
 */

const CHANNELS = [
  // { name: "Legend",   token: "Bot token for Legend",   channelId: "channel ID" },
  // { name: "Seraphim", token: "Bot token for Seraphim", channelId: "channel ID" },
  // { name: "Diamond",  token: "Bot token for Diamond",  channelId: "channel ID" },
  // { name: "Lumen",    token: "Bot token for Lumen",    channelId: "channel ID" },
  // { name: "Elior",    token: "Bot token for Elior",    channelId: "channel ID" },
];

// ---------------------------------------------------------------------------

const BASE = "https://discord.com/api/v10";
const FOURTEEN_DAYS = 14 * 24 * 60 * 60 * 1000;

async function api(method, path, token, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function clearChannel(name, token, channelId) {
  console.log(`\n── ${name} (${channelId}) ──`);
  let total = 0;

  while (true) {
    // Fetch up to 100 messages
    const messages = await api("GET", `/channels/${channelId}/messages?limit=100`, token);

    if (!Array.isArray(messages) || messages.length === 0) {
      console.log(`  ✓ Done — deleted ${total} messages`);
      break;
    }

    const now = Date.now();
    const recent = messages.filter((m) => now - new Date(m.timestamp).getTime() < FOURTEEN_DAYS);
    const old    = messages.filter((m) => now - new Date(m.timestamp).getTime() >= FOURTEEN_DAYS);

    // Bulk-delete recent messages (Discord limit: 2-100 at a time)
    if (recent.length >= 2) {
      const ids = recent.map((m) => m.id);
      const result = await api("POST", `/channels/${channelId}/messages/bulk-delete`, token, { messages: ids });
      if (result?.message) {
        console.log(`  ✗ Bulk-delete error: ${result.message}`);
      } else {
        total += ids.length;
        console.log(`  Bulk-deleted ${ids.length} messages`);
      }
      await sleep(1000); // rate limit
    } else if (recent.length === 1) {
      await api("DELETE", `/channels/${channelId}/messages/${recent[0].id}`, token);
      total += 1;
      await sleep(500);
    }

    // Delete old messages one by one
    for (const m of old) {
      const result = await api("DELETE", `/channels/${channelId}/messages/${m.id}`, token);
      if (result?.message) {
        console.log(`  ✗ Could not delete old message ${m.id}: ${result.message}`);
      } else {
        total += 1;
      }
      await sleep(1100); // slower — Discord rate-limits individual deletes heavily
    }

    if (messages.length < 100) break;
  }
}

// ---------------------------------------------------------------------------

const configured = CHANNELS.filter((c) => c.token && c.channelId && !c.token.startsWith("Bot token"));

if (configured.length === 0) {
  console.log("No channels configured. Open this file and fill in your tokens and channel IDs.");
  process.exit(1);
}

console.log(`Clearing ${configured.length} channel(s)…`);

for (const ch of configured) {
  await clearChannel(ch.name, ch.token, ch.channelId);
}

console.log("\nAll done.");
