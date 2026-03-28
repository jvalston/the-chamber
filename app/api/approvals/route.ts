import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const FILE        = join(process.cwd(), "data", "approvals.json");
const GATEWAY_URL = process.env.GATEWAY_URL ?? "http://localhost:4000";

type ApprovalPriority = "urgent" | "normal" | "low";
type ApprovalStatus   = "pending" | "approved" | "deferred" | "rejected";

interface ApprovalItem {
  id:          string;
  title:       string;
  description: string;
  requestedBy: string;
  priority:    ApprovalPriority;
  status:      ApprovalStatus;
  created:     string;
  category:    string;
  resolvedAt?: string;
}

function read(): { approvals: ApprovalItem[] } {
  if (!existsSync(FILE)) return { approvals: [] };
  return JSON.parse(readFileSync(FILE, "utf8"));
}

function save(data: { approvals: ApprovalItem[] }) {
  writeFileSync(FILE, JSON.stringify(data, null, 2));
}

// Notify Seraphim of the decision (best-effort)
async function notifySeraphim(item: ApprovalItem, action: ApprovalStatus) {
  try {
    await fetch(`${GATEWAY_URL}/agent/seraphim/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from:    "mission-control",
        type:    "approval.decision",
        payload: { id: item.id, title: item.title, action, category: item.category },
      }),
      signal: AbortSignal.timeout(4000),
    });
  } catch { /* Gateway offline — decision is persisted locally */ }
}

// Have Elior record the governance event (best-effort)
async function notifyElior(item: ApprovalItem, action: ApprovalStatus) {
  try {
    await fetch(`${GATEWAY_URL}/agent/elior/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        from:    "mission-control",
        type:    "approval.record",
        payload: {
          event:      `approval.${action}`,
          approvalId: item.id,
          title:      item.title,
          category:   item.category,
          requestedBy: item.requestedBy,
          timestamp:  new Date().toISOString(),
        },
      }),
      signal: AbortSignal.timeout(4000),
    });
  } catch { /* Gateway offline */ }
}

export async function GET() {
  const data = read();
  return NextResponse.json({ approvals: data.approvals });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const data = read();

  // PATCH — update approval status
  if (body._action === "patch" && body.id && body.status) {
    const allowed: ApprovalStatus[] = ["approved", "deferred", "rejected", "pending"];
    if (!allowed.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    let updated: ApprovalItem | undefined;
    data.approvals = data.approvals.map((a) => {
      if (a.id !== body.id) return a;
      updated = { ...a, status: body.status, resolvedAt: new Date().toISOString() };
      return updated;
    });

    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

    save(data);

    // Fire-and-forget governance notifications
    notifySeraphim(updated, body.status);
    notifyElior(updated, body.status);

    return NextResponse.json({ ok: true, approval: updated });
  }

  // CREATE — agents or Origin can submit new approval requests
  if (body.title) {
    const item: ApprovalItem = {
      id:          `a${Date.now()}`,
      title:       body.title,
      description: body.description ?? "",
      requestedBy: body.requestedBy ?? "unknown",
      priority:    body.priority ?? "normal",
      status:      "pending",
      created:     new Date().toISOString(),
      category:    body.category ?? "General",
    };

    data.approvals.unshift(item);
    save(data);
    return NextResponse.json(item);
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}
