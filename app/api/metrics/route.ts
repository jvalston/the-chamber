import { NextResponse } from "next/server";
import os from "os";
import { execSync } from "child_process";

function sampleCpus() {
  let idle = 0, total = 0;
  for (const cpu of os.cpus()) {
    idle += cpu.times.idle;
    for (const t of Object.values(cpu.times)) total += t;
  }
  return { idle, total };
}

async function getCpuPercent(): Promise<number> {
  const s1 = sampleCpus();
  await new Promise((r) => setTimeout(r, 150));
  const s2 = sampleCpus();
  const dIdle  = s2.idle  - s1.idle;
  const dTotal = s2.total - s1.total;
  if (dTotal === 0) return 0;
  return Math.round(100 - (dIdle / dTotal) * 100);
}

function getRamPercent(): number {
  const total = os.totalmem();
  const free  = os.freemem();
  return Math.round(((total - free) / total) * 100);
}

function getGpu(): { gpu: number; vram: number } | null {
  try {
    const out = execSync(
      "nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total --format=csv,noheader,nounits",
      { timeout: 3000, encoding: "utf8" }
    ).trim();
    const [gpuUtil, memUsed, memTotal] = out.split(",").map((s) => parseFloat(s.trim()));
    return {
      gpu:  Math.round(gpuUtil),
      vram: Math.round((memUsed / memTotal) * 100),
    };
  } catch {
    return null;
  }
}

export async function GET() {
  const [cpu, ram, gpuData] = await Promise.all([
    getCpuPercent(),
    Promise.resolve(getRamPercent()),
    Promise.resolve(getGpu()),
  ]);

  return NextResponse.json({
    cpu,
    ram,
    gpu:  gpuData?.gpu  ?? null,
    vram: gpuData?.vram ?? null,
    checkedAt: Date.now(),
  });
}
