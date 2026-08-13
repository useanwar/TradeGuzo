import Link from "next/link";
import type { CalendarDay } from "@/lib/analytics";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatMoney(value: number): string {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}$${Math.abs(value).toFixed(0)}`;
}

function mondayIndex(date: Date): number {
  const day = date.getUTCDay();
  return day === 0 ? 6 : day - 1;
}

export default function Calendar({
  year,
  month,
  days,
}: {
  year: number;
  month: number;
  days: CalendarDay[];
}) {
  const dayMap = new Map(days.map((d) => [d.date, d]));

  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const leadingBlanks = mondayIndex(firstOfMonth);

  const maxAbsPnl = Math.max(1, ...days.map((d) => Math.abs(d.netPnl)));

  const cells: Array<{ date: string; dayNum: number } | null> = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = new Date(Date.UTC(year, month - 1, d)).toISOString().slice(0, 10);
    cells.push({ date: dateStr, dayNum: d });
  }

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  return (
    <div className="rounded-2xl border border-border bg-bg-surface p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <Link
          href={`/?year=${prevYear}&month=${prevMonth}`}
          className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-bg-elevated hover:text-text-primary"
        >
          &larr;
        </Link>
        <h2 className="text-sm font-semibold text-text-primary">
          {MONTH_LABELS[month - 1]} {year}
        </h2>
        <Link
          href={`/?year=${nextYear}&month=${nextMonth}`}
          className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-bg-elevated hover:text-text-primary"
        >
          &rarr;
        </Link>
      </div>

      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="text-center text-[10px] font-medium uppercase text-text-muted sm:text-xs">
            {label}
          </div>
        ))}

        {cells.map((cell, i) => {
          if (!cell) return <div key={`blank-${i}`} />;

          const dayData = dayMap.get(cell.date);
          const hasTrades = !!dayData && dayData.tradeCount > 0;
          const intensity = hasTrades ? Math.min(1, Math.abs(dayData!.netPnl) / maxAbsPnl) : 0;
          const isProfit = hasTrades && dayData!.netPnl >= 0;

          return (
            <div
              key={cell.date}
              className="flex min-h-14 flex-col rounded-lg border border-border p-1 sm:min-h-20 sm:rounded-xl sm:p-2"
              style={{
                backgroundColor: hasTrades
                  ? isProfit
                    ? `color-mix(in srgb, var(--color-profit) ${15 + intensity * 55}%, var(--color-bg-surface))`
                    : `color-mix(in srgb, var(--color-loss) ${15 + intensity * 55}%, var(--color-bg-surface))`
                  : "var(--color-bg-elevated)",
              }}
            >
              <span className="text-[10px] text-text-muted sm:text-xs">{cell.dayNum}</span>
              {hasTrades && (
                <>
                  <span
                    className={`mt-auto truncate font-mono text-[11px] font-semibold sm:text-sm ${
                      intensity > 0.5 ? "text-white" : "text-text-primary"
                    }`}
                  >
                    {formatMoney(dayData!.netPnl)}
                  </span>
                  {/* Trade count and top tag add too much density on
                      narrow screens — day number + P&L is the glance
                      that matters most on mobile; full detail stays
                      available at sm and up. */}
                  <span
                    className={`hidden text-[11px] sm:block ${
                      intensity > 0.5 ? "text-white/70" : "text-text-muted"
                    }`}
                  >
                    {dayData!.tradeCount} trade{dayData!.tradeCount === 1 ? "" : "s"}
                  </span>
                  {dayData!.topTagName && (
                    <span
                      className={`hidden truncate text-[11px] font-medium sm:block ${
                        intensity > 0.5 ? "text-white/90" : "text-accent"
                      }`}
                    >
                      #{dayData!.topTagName}
                    </span>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}