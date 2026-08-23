"use client";

import { useEffect, useState } from "react";
import { Line, LineChart, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import type { EquityPoint } from "@/lib/analytics";

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const value: number = payload[0].value;
  return (
    <div className="rounded-lg border border-border bg-bg-surface p-3 text-xs shadow-sm">
      <p className="mb-1 text-text-muted">{label}</p>
      <p className={value >= 0 ? "text-profit" : "text-loss"}>
        {value >= 0 ? "+" : "-"}${Math.abs(value).toFixed(2)}
      </p>
    </div>
  );
}

export default function EquityCurveChart({ data }: { data: EquityPoint[] }) {
  const [key, setKey] = useState(0);

  useEffect(() => {
    const handleThemeChange = () => setKey(prev => prev + 1);
    window.addEventListener("themechange", handleThemeChange);
    return () => window.removeEventListener("themechange", handleThemeChange);
  }, []);

  if (data.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-text-muted">
        No trades yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260} key={key}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
          axisLine={{ stroke: "var(--color-border)" }}
          tickLine={false}
          minTickGap={40}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
          axisLine={false}
          tickLine={false}
          width={50}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="cumulativeNetPnl"
          stroke="var(--color-accent-dark)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}