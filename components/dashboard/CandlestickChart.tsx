"use client";

import { useEffect, useRef } from "react";
import type { CandleBar } from "@/lib/analytics";

export default function CandlestickChart({
  bars,
  entryTime,
  entryPrice,
  exitTime,
  exitPrice,
  type,
}: {
  bars: CandleBar[];
  entryTime: number; // unix seconds
  entryPrice: number;
  exitTime: number;
  exitPrice: number;
  type: "BUY" | "SELL";
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || bars.length === 0) return;

    // lightweight-charts touches the DOM directly, so it can only be
    // imported/used client-side, after mount — importing it at the
    // top of the file would break server rendering entirely.
    let chart: any;
    let cleanup = () => {};

    (async () => {
      const { createChart, CandlestickSeries, ColorType } = await import("lightweight-charts");
      if (!containerRef.current) return;

      chart = createChart(containerRef.current, {
        width: containerRef.current.clientWidth,
        height: 320,
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: "var(--color-text-muted)",
        },
        grid: {
          vertLines: { color: "var(--color-border)" },
          horzLines: { color: "var(--color-border)" },
        },
        timeScale: { timeVisible: true, secondsVisible: false },
      });

      const series = chart.addSeries(CandlestickSeries, {
        upColor: "var(--color-profit)",
        downColor: "var(--color-loss)",
        borderVisible: false,
        wickUpColor: "var(--color-profit)",
        wickDownColor: "var(--color-loss)",
      });

      series.setData(bars);

      // Entry marker: an up-arrow for a BUY, down-arrow for a SELL
      // (matching the direction of the position, not just "entry").
      // Exit marker is always the opposite shape, colored neutrally
      // since "was this a good exit" isn't a color-codable fact the
      // way entry direction is.
      series.setMarkers([
        {
          time: entryTime,
          position: type === "BUY" ? "belowBar" : "aboveBar",
          color: "var(--color-accent-dark)",
          shape: type === "BUY" ? "arrowUp" : "arrowDown",
          text: `Entry ${entryPrice}`,
        },
        {
          time: exitTime,
          position: type === "BUY" ? "aboveBar" : "belowBar",
          color: "var(--color-text-muted)",
          shape: "circle",
          text: `Exit ${exitPrice}`,
        },
      ]);

      chart.timeScale().fitContent();

      const handleResize = () => {
        if (containerRef.current) {
          chart.applyOptions({ width: containerRef.current.clientWidth });
        }
      };
      window.addEventListener("resize", handleResize);
      cleanup = () => {
        window.removeEventListener("resize", handleResize);
        chart.remove();
      };
    })();

    return () => cleanup();
  }, [bars, entryTime, entryPrice, exitTime, exitPrice, type]);

  if (bars.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-lg bg-bg-elevated text-sm text-text-muted">
        No price chart available — this trade closed before chart data started being tracked.
      </div>
    );
  }

  return <div ref={containerRef} />;
}