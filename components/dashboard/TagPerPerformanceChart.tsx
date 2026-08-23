"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import type { TagPerformance } from "@/lib/analytics";

const CATEGORY_COLORS: Record<string, string> = {
  SETUP: "var(--color-accent-dark)",
  MISTAKE: "var(--color-loss)",
  EMOTION: "var(--color-text-muted)",
};

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d: TagPerformance = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-bg-surface p-3 text-xs shadow-sm">
      <p className="mb-1 font-medium text-text-primary">#{d.tagName}</p>
      <p className={d.netPnl >= 0 ? "text-profit" : "text-loss"}>
        {d.netPnl >= 0 ? "+" : "-"}${Math.abs(d.netPnl).toFixed(2)}
      </p>
      <p className="text-text-muted">{d.winRate.toFixed(0)}% win rate · {d.tradeCount} trades</p>
    </div>
  );
}

export default function TagPerformanceChart({ data }: { data: TagPerformance[] }) {
  const [key, setKey] = useState(0);

  useEffect(() => {
    const handleThemeChange = () => setKey(prev => prev + 1);
    window.addEventListener("themechange", handleThemeChange);
    return () => window.removeEventListener("themechange", handleThemeChange);
  }, []);

  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-text-muted">
        No tagged trades yet — add tags from any trade&apos;s detail page.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 36)} key={key}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
          axisLine={{ stroke: "var(--color-border)" }}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="tagName"
          tick={{ fontSize: 11, fill: "var(--color-text-primary)" }}
          axisLine={false}
          tickLine={false}
          width={100}
          tickFormatter={(name) => `#${name}`}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--color-bg-elevated)" }} />
        <Bar dataKey="netPnl" radius={[0, 4, 4, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.netPnl >= 0 ? CATEGORY_COLORS[d.category] : "var(--color-loss)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}