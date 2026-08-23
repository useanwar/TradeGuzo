"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

type DataPoint = {
  label: string;
  netPnl: number;
  winRate: number;
  tradeCount: number;
};

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d: DataPoint = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-bg-surface p-3 text-xs shadow-sm">
      <p className="mb-1 font-medium text-text-primary">{d.label}</p>
      <p className={d.netPnl >= 0 ? "text-profit" : "text-loss"}>
        {d.netPnl >= 0 ? "+" : "-"}${Math.abs(d.netPnl).toFixed(2)}
      </p>
      <p className="text-text-muted">{d.winRate.toFixed(0)}% win rate · {d.tradeCount} trades</p>
    </div>
  );
}

export default function PerformanceBarChart({ data }: { data: DataPoint[] }) {
  const [key, setKey] = useState(0);

  useEffect(() => {
    const handleThemeChange = () => setKey(prev => prev + 1);
    window.addEventListener("themechange", handleThemeChange);
    return () => window.removeEventListener("themechange", handleThemeChange);
  }, []);

  return (
    <ResponsiveContainer width="100%" height={220} key={key}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
          axisLine={{ stroke: "var(--color-border)" }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--color-bg-elevated)" }} />
        <Bar dataKey="netPnl" radius={[4, 4, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.netPnl >= 0 ? "var(--color-profit)" : "var(--color-loss)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}