"use client";

interface Props {
  label: string;
  value: number;   // 0–100
  unit?: string;
  warn?: number;
  crit?: number;
}

export default function MetricBar({ label, value, unit = "%", warn = 70, crit = 90 }: Props) {
  const color = value >= crit ? "var(--red)" : value >= warn ? "var(--yellow)" : "var(--green)";
  return (
    <div style={{ marginBottom: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
        <span style={{ color: "var(--text-secondary)", letterSpacing: "0.08em" }}>{label}</span>
        <span style={{ color, fontVariantNumeric: "tabular-nums" }}>{value}{unit}</span>
      </div>
      <div style={{
        height: "3px",
        background: "var(--border)",
        borderRadius: "2px",
        overflow: "hidden",
      }}>
        <div style={{
          height: "100%",
          width: `${value}%`,
          background: color,
          boxShadow: `0 0 6px ${color}`,
          borderRadius: "2px",
          transition: "width 0.5s ease, background 0.3s ease",
        }} />
      </div>
    </div>
  );
}
