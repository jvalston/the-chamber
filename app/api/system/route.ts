import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

type TargetNode = "phoenix" | "lucy" | "axiom" | "mac-mini";
type RequestTarget = TargetNode | "both";
type Step = { step: string; output: string; ok: boolean };

const NODE_CONFIG: Record<TargetNode, {
  mode: "local" | "ssh";
  ocBin: string;
  hermesBin?: string;
  gatewayService?: string;
  nodeService?: string;
  sshHost?: string;
  sshUser?: string;
  sshKey?: string;
}> = {
  phoenix: {
    mode: "local",
    ocBin: "/home/natza/.npm-global/lib/node_modules/openclaw/dist/index.js",
    hermesBin: "/home/natza/.local/bin/hermes",
    gatewayService: "openclaw-gateway.service",
    nodeService: "openclaw-node.service",
  },
  lucy: {
    mode: "ssh",
    ocBin: process.env.LUCY_OC_BIN ?? "/home/nana/.npm-global/bin/openclaw",
    hermesBin: process.env.LUCY_HERMES_BIN ?? "/home/nana/.local/bin/hermes",
    sshHost: process.env.LUCY_SSH_HOST ?? "100.119.215.107",
    sshUser: process.env.LUCY_SSH_USER ?? "nana",
    sshKey: process.env.LUCY_SSH_KEY ?? "~/.ssh/lucy",
  },
  axiom: {
    mode: "ssh",
    ocBin: process.env.AXIOM_OC_BIN ?? "/usr/bin/openclaw",
    sshHost: process.env.AXIOM_SSH_HOST ?? "",
    sshUser: process.env.AXIOM_SSH_USER ?? "nana",
    sshKey: process.env.AXIOM_SSH_KEY ?? "~/.ssh/axiom",
  },
  "mac-mini": {
    mode: "ssh",
    ocBin: process.env.MAC_MINI_OC_BIN ?? "openclaw",
    sshHost: process.env.MAC_MINI_SSH_HOST ?? "",
    sshUser: process.env.MAC_MINI_SSH_USER ?? "nana",
    sshKey: process.env.MAC_MINI_SSH_KEY ?? "~/.ssh/mac-mini",
  },
};

function shSingleQuote(input: string) {
  return `'${input.replace(/'/g, `'"'"'`)}'`;
}

function labelForTarget(target: TargetNode) {
  return target === "mac-mini" ? "Mac Mini" : target[0].toUpperCase() + target.slice(1);
}

async function execWsl(cmd: string, timeoutMs = 120_000) {
  try {
    const result = await execAsync(
      `wsl -e bash -lc ${JSON.stringify(cmd)}`,
      { timeout: timeoutMs }
    );
    return { out: (result.stdout + result.stderr).trim(), ok: true };
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string; message?: string };
    return { out: ((err.stdout ?? "") + (err.stderr ?? err.message ?? "error")).trim(), ok: false };
  }
}

async function runOnTarget(target: TargetNode, cmd: string, timeoutMs = 120_000) {
  const cfg = NODE_CONFIG[target];

  if (cfg.mode === "local") return execWsl(cmd, timeoutMs);

  if (!cfg.sshHost) {
    return {
      out: `${labelForTarget(target)} SSH host is not configured. Set ${target === "axiom" ? "AXIOM_SSH_HOST" : "MAC_MINI_SSH_HOST"} in .env.local.`,
      ok: false,
    };
  }

  const remote = [
    "ssh",
    "-i", cfg.sshKey,
    "-o", "StrictHostKeyChecking=no",
    "-o", "BatchMode=yes",
    "-o", "ConnectTimeout=10",
    `${cfg.sshUser}@${cfg.sshHost}`,
    shSingleQuote(cmd),
  ].join(" ");

  return execWsl(remote, timeoutMs);
}

async function userServiceExists(target: TargetNode, service: string) {
  const check = await runOnTarget(target, `systemctl --user cat ${service} >/dev/null 2>&1 && echo yes || echo no`);
  return check.out.includes("yes");
}

async function restartGateway(target: TargetNode) {
  const cfg = NODE_CONFIG[target];

  if (!cfg.gatewayService) {
    const rs = await runOnTarget(target, `${cfg.ocBin} gateway restart`, 180_000);
    return { step: "Restart gateway", output: rs.out, ok: rs.ok && /restart|started|running/i.test(rs.out) };
  }

  const exists = await userServiceExists(target, cfg.gatewayService);
  if (!exists) {
    return { step: "Restart gateway", output: `${cfg.gatewayService} not installed; skipping`, ok: true };
  }

  const rs = await runOnTarget(
    target,
    `systemctl --user restart ${cfg.gatewayService} && sleep 1 && echo '${cfg.gatewayService} restarted' || echo '${cfg.gatewayService} restart failed'`
  );
  return { step: "Restart gateway", output: rs.out, ok: rs.out.includes("restarted") };
}

async function restartNodeHost(target: TargetNode) {
  const cfg = NODE_CONFIG[target];

  if (!cfg.nodeService) {
    return {
      step: "Restart node host",
      output: `${labelForTarget(target)} node host restart is optional; skipped from this panel.`,
      ok: true,
    };
  }

  const exists = await userServiceExists(target, cfg.nodeService);
  if (!exists) {
    return { step: "Restart node host", output: `${cfg.nodeService} not installed; skipping`, ok: true };
  }

  const rs = await runOnTarget(
    target,
    `systemctl --user restart ${cfg.nodeService} && sleep 1 && echo '${cfg.nodeService} restarted' || echo '${cfg.nodeService} restart failed'`
  );
  return { step: "Restart node host", output: rs.out, ok: rs.out.includes("restarted") };
}

async function runUpdate(target: TargetNode, steps: Step[]) {
  const cfg = NODE_CONFIG[target];

  const updateCmd = target === "phoenix"
    ? "npm install -g openclaw@latest 2>&1"
    : `${cfg.ocBin} update --yes --no-restart --timeout 1200 2>&1`;

  const upd = await runOnTarget(target, updateCmd, 240_000);
  steps.push({ step: "Update package", output: upd.out, ok: upd.ok });

  steps.push(await restartGateway(target));
  steps.push(await restartNodeHost(target));
}

async function runHealth(target: TargetNode, steps: Step[]) {
  const cfg = NODE_CONFIG[target];

  if (cfg.gatewayService) {
    const gw = await runOnTarget(target, `systemctl --user status ${cfg.gatewayService} --no-pager 2>&1 | head -20`);
    const nodeExists = cfg.nodeService ? await userServiceExists(target, cfg.nodeService) : false;
    const nd = (cfg.nodeService && nodeExists)
      ? await runOnTarget(target, `systemctl --user status ${cfg.nodeService} --no-pager 2>&1 | head -20`)
      : { out: cfg.nodeService ? `${cfg.nodeService} not installed; skipping` : "No node service configured", ok: true };

    const ok = gw.out.includes("active (running)") && (!cfg.nodeService || !nodeExists || nd.out.includes("active (running)"));
    steps.push({ step: "Status", output: `${gw.out}\n\n${nd.out}`, ok });
    return;
  }

  const status = await runOnTarget(target, `${cfg.ocBin} status --json 2>&1`, 120_000);
  const ok = status.ok && status.out.includes('"reachable": true');
  steps.push({ step: "Status", output: status.out, ok });
}

async function runDoctor(target: TargetNode, steps: Step[]) {
  const cfg = NODE_CONFIG[target];
  const cmd = target === "phoenix"
    ? `node ${cfg.ocBin} doctor 2>&1`
    : `${cfg.ocBin} doctor 2>&1`;

  const dr = await runOnTarget(target, cmd, 90_000);
  steps.push({ step: "Doctor", output: dr.out, ok: dr.ok });
}

async function runHermesUpdate(target: TargetNode, steps: Step[]) {
  const cfg = NODE_CONFIG[target];
  const bin = cfg.hermesBin ?? "hermes";
  const upd = await runOnTarget(target, `${bin} update 2>&1`, 300_000);
  steps.push({ step: "Hermes update", output: upd.out, ok: upd.ok && !/error/i.test(upd.out) });
}

async function runHermesDoctor(target: TargetNode, steps: Step[]) {
  const cfg = NODE_CONFIG[target];
  const bin = cfg.hermesBin ?? "hermes";
  const dr = await runOnTarget(target, `${bin} doctor 2>&1`, 180_000);
  steps.push({ step: "Hermes doctor", output: dr.out, ok: dr.ok });
}

async function runReauthCodex(target: TargetNode, steps: Step[]) {
  const cfg = NODE_CONFIG[target];

  if (target === "phoenix") {
    const stop = await runOnTarget(target, `systemctl --user stop ${cfg.gatewayService} && echo 'stopped'`);
    steps.push({ step: "Stop gateway", output: stop.out, ok: stop.out.includes("stopped") });

    const clear = await runOnTarget(
      target,
      `node -e "const fs=require('fs');const p='/home/natza/.openclaw/agents/main/agent/auth.json';try{const raw=JSON.parse(fs.readFileSync(p,'utf8'));if(raw['openai-codex']){delete raw['openai-codex'];fs.writeFileSync(p,JSON.stringify(raw,null,2));console.log('cleared stale token')}else{console.log('no stale token')}}catch(e){console.log('skip: '+e.message)}" 2>&1`
    );
    steps.push({ step: "Clear stale token", output: clear.out, ok: true });

    const login = await runOnTarget(target, `node ${cfg.ocBin} models auth login --provider openai-codex 2>&1`, 120_000);
    steps.push({ step: "OAuth login", output: login.out, ok: !/error/i.test(login.out) });

    const restart = await runOnTarget(target, `systemctl --user start ${cfg.gatewayService} && sleep 2 && echo 'gateway started'`);
    steps.push({ step: "Restart gateway", output: restart.out, ok: restart.out.includes("started") });
    return;
  }

  const login = await runOnTarget(target, `${cfg.ocBin} models auth login --provider openai-codex 2>&1`, 120_000);
  steps.push({
    step: "OAuth login",
    output: login.out,
    ok: login.ok && !/error|invalidated/i.test(login.out),
  });
}

async function runProviderHealth(target: TargetNode, steps: Step[]) {
  const cfg = NODE_CONFIG[target];
  const oc = target === "phoenix" ? `node ${cfg.ocBin}` : cfg.ocBin;

  const ollama = await runOnTarget(
    target,
    `curl -s http://localhost:11434/api/tags 2>/dev/null | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);console.log('ok:'+((j.models||[]).length)+' models')}catch{console.log('unreachable')}})"`,
    15_000
  );
  steps.push({ step: "Ollama (local)", output: ollama.out, ok: ollama.out.includes("ok:") });

  const ch = await runOnTarget(target, `${oc} channels status --probe 2>&1`, 90_000);
  steps.push({
    step: "Channel Providers",
    output: ch.out,
    ok: ch.ok && !/failed|error/i.test(ch.out),
  });

  const st = await runOnTarget(target, `${oc} status --json 2>&1`, 90_000);
  steps.push({
    step: "Gateway Services",
    output: st.out,
    ok: st.ok && st.out.includes('"reachable": true'),
  });
}

function parseTarget(raw: unknown): TargetNode {
  const value = String(raw ?? "").trim().toLowerCase();
  if (value === "lucy") return "lucy";
  if (value === "axiom") return "axiom";
  if (value === "mac-mini" || value === "macmini") return "mac-mini";
  return "phoenix";
}

function parseRequestTarget(raw: unknown): RequestTarget {
  const value = String(raw ?? "").trim().toLowerCase();
  if (value === "both") return "both";
  return parseTarget(value);
}

async function runActionForTarget(action: string, target: TargetNode, steps: Step[]) {
  if (action === "update") {
    await runUpdate(target, steps);
    await new Promise((r) => setTimeout(r, 1500));
    await runHealth(target, steps);
    await runDoctor(target, steps);
    return;
  }

  if (action === "restart") {
    steps.push(await restartGateway(target));
    steps.push(await restartNodeHost(target));
    return;
  }

  if (action === "health") {
    await runHealth(target, steps);
    return;
  }

  if (action === "doctor") {
    await runDoctor(target, steps);
    return;
  }

  if (action === "reauth-codex") {
    await runReauthCodex(target, steps);
    return;
  }

  if (action === "provider-health") {
    await runProviderHealth(target, steps);
    return;
  }

  if (action === "update-hermes") {
    await runHermesUpdate(target, steps);
    await runHermesDoctor(target, steps);
    return;
  }

  if (action === "doctor-hermes") {
    await runHermesDoctor(target, steps);
    return;
  }

  throw new Error("unknown action");
}

function prefixSteps(prefix: string, steps: Step[]): Step[] {
  return steps.map((s) => ({ ...s, step: `[${prefix}] ${s.step}` }));
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { action?: string; target?: string };
  const action = body.action?.trim();
  const target = parseRequestTarget(body.target);
  const steps: Step[] = [];

  if (!action) {
    return NextResponse.json({ error: "action is required" }, { status: 400 });
  }

  if (!["update", "restart", "health", "doctor", "reauth-codex", "provider-health", "update-hermes", "doctor-hermes"].includes(action)) {
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  }

  if (target === "both") {
    const bothTargets: TargetNode[] = ["phoenix", "lucy"];
    for (const node of bothTargets) {
      const nodeSteps: Step[] = [];
      await runActionForTarget(action, node, nodeSteps);
      steps.push(...prefixSteps(node.toUpperCase(), nodeSteps));
    }
    return NextResponse.json({ target: "both", steps });
  }

  await runActionForTarget(action, target, steps);
  return NextResponse.json({ target, steps });
}
