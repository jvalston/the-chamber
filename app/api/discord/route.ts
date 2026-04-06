import { NextResponse } from "next/server";

interface DiscordMessage {
  id: string;
  content: string;
  timestamp: string;
  author: { username: string; id: string };
}

interface AgentFeed {
  agent:     string;
  channelId: string;
  messages:  (DiscordMessage & { agentName: string })[];
  error?:    string;
}

async function fetchMessages(token: string, channelId: string, limit = 50) {
  const res = await fetch(
    `https://discord.com/api/v10/channels/${channelId}/messages?limit=${limit}`,
    { headers: { Authorization: `Bot ${token}` }, cache: "no-store" }
  );
  if (!res.ok) throw new Error(`Discord ${res.status}`);
  return res.json() as Promise<DiscordMessage[]>;
}

export async function GET() {
  const agents = [
    { name: "Legend",   token: process.env.DISCORD_TOKEN_LEGEND,    channelId: process.env.LEGEND_DISCORD_ROOM    },
    { name: "Seraphim", token: process.env.DISCORD_TOKEN_SERAPHIM,  channelId: process.env.SERAPHIM_DISCORD_ROOM  },
    { name: "Diamond",  token: process.env.DISCORD_TOKEN_DIAMOND,   channelId: process.env.DIAMOND_DISCORD_ROOM   },
    { name: "Lumen",    token: process.env.DISCORD_TOKEN_LUMEN,     channelId: process.env.LUMEN_DISCORD_ROOM     },
    { name: "Elior",    token: process.env.DISCORD_TOKEN_ELIOR,     channelId: process.env.ELIOR_DISCORD_ROOM     },
    { name: "Sentinel", token: process.env.DISCORD_TOKEN_SENTINEL,  channelId: process.env.SENTINEL_DISCORD_ROOM  },
    { name: "Atlas",    token: process.env.DISCORD_TOKEN_ATLAS,     channelId: process.env.ATLAS_DISCORD_ROOM     },
    { name: "Aurora",   token: process.env.DISCORD_TOKEN_AURORA,    channelId: process.env.AURORA_DISCORD_ROOM    },
    { name: "Aurelion", token: process.env.DISCORD_TOKEN_AURELION,  channelId: process.env.AURELION_DISCORD_ROOM  },
    { name: "Veris",    token: process.env.DISCORD_TOKEN_VERIS,     channelId: process.env.VERIS_DISCORD_ROOM     },
    { name: "Kairo",    token: process.env.DISCORD_TOKEN_KAIRO,     channelId: process.env.KAIRO_DISCORD_ROOM     },
    { name: "Hermes",     token: process.env.DISCORD_TOKEN_HERMES,     channelId: process.env.HERMES_DISCORD_ROOM                                                        },
    { name: "Olympus",   token: process.env.DISCORD_TOKEN_OLYMPUS,   channelId: process.env.OLYMPUS_DISCORD_ROOM                                                       },
    { name: "Persephone",token: process.env.DISCORD_TOKEN_PERSEPHONE,channelId: process.env.PERSEPHONE_DISCORD_ROOM ?? process.env.PERSEPHONE_DISCORD_WORKSPACE_ROOM  },
  ];

  const feeds: AgentFeed[] = await Promise.all(
    agents.map(async (a) => {
      if (!a.token || !a.channelId) {
        return { agent: a.name, channelId: a.channelId ?? "", messages: [], error: "not configured" };
      }
      try {
        const msgs = await fetchMessages(a.token, a.channelId);
        return {
          agent:     a.name,
          channelId: a.channelId,
          messages:  msgs.map((m) => ({ ...m, agentName: a.name })),
        };
      } catch (e) {
        return { agent: a.name, channelId: a.channelId ?? "", messages: [], error: String(e) };
      }
    })
  );

  const merged = feeds
    .flatMap((f) => f.messages)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 200);

  return NextResponse.json({ feeds, merged });
}
