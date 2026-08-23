import { prisma } from "@/lib/prisma";

// At single-user, personal-journal scale (hundreds to low thousands of
// trades, not millions), it's simpler and plenty fast to fetch the raw
// rows and aggregate in JS rather than write raw SQL for date-bucketing
// (Prisma's groupBy can't truncate a DateTime to "day" on its own).
// If this ever becomes a bottleneck, the day-bucketing in getCalendarData
// is the first thing worth moving to a raw SQL query.

export type DateRangeKey = "week" | "month" | "year" | "all";

// Computed server-side so "today" is consistent regardless of the
// viewer's device clock/timezone quirks — the server's notion of
// "now" is the single source of truth here.
export function getDateRangeBounds(range: DateRangeKey): { from?: Date; to?: Date } {
  const now = new Date();

  if (range === "all") return {};

  if (range === "week") {
    // Monday as the start of the week, matching the calendar's
    // Monday-first layout elsewhere in the app.
    const day = now.getUTCDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diffToMonday));
    return { from: start };
  }

  if (range === "month") {
    return { from: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)) };
  }

  // "year"
  return { from: new Date(Date.UTC(now.getUTCFullYear(), 0, 1)) };
}

export type KpiSummary = {
  netPnl: number;
  winRate: number; // 0–100
  profitFactor: number | null; // null when there are no losing trades to divide by
  avgWin: number;
  avgLoss: number; // stored as a negative number, e.g. -180
  totalTrades: number;
};

export async function getKpiSummary(
  tradingAccountId?: string,
  dateRange?: { from?: Date; to?: Date }
): Promise<KpiSummary> {
  const trades = await prisma.trade.findMany({
    where: {
      ...(tradingAccountId ? { tradingAccountId } : {}),
      ...(dateRange?.from || dateRange?.to
        ? {
            closeTime: {
              ...(dateRange?.from ? { gte: dateRange.from } : {}),
              ...(dateRange?.to ? { lte: dateRange.to } : {}),
            },
          }
        : {}),
    },
    select: { netProfit: true },
  });

  const totalTrades = trades.length;
  if (totalTrades === 0) {
    return { netPnl: 0, winRate: 0, profitFactor: null, avgWin: 0, avgLoss: 0, totalTrades: 0 };
  }

  const wins = trades.filter((t) => t.netProfit > 0);
  const losses = trades.filter((t) => t.netProfit < 0);

  const netPnl = trades.reduce((sum, t) => sum + t.netProfit, 0);
  const grossWin = wins.reduce((sum, t) => sum + t.netProfit, 0);
  const grossLoss = losses.reduce((sum, t) => sum + t.netProfit, 0); // negative

  const winRate = (wins.length / totalTrades) * 100;
  const avgWin = wins.length > 0 ? grossWin / wins.length : 0;
  const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0;

  // Profit factor = gross win / |gross loss|. Undefined (not infinite,
  // not zero) when there are no losses yet — a brand-new all-winning
  // streak hasn't actually proven anything about risk management yet,
  // so we surface that as "not enough data" rather than a real number.
  const profitFactor = grossLoss !== 0 ? grossWin / Math.abs(grossLoss) : null;

  return { netPnl, winRate, profitFactor, avgWin, avgLoss, totalTrades };
}

export type CalendarDay = {
  date: string; // "YYYY-MM-DD"
  netPnl: number;
  tradeCount: number;
  topTagName: string | null;
};

export async function getCalendarData(
  year: number,
  month: number, // 1–12
  tradingAccountId?: string
): Promise<CalendarDay[]> {
  const startOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const startOfNextMonth = new Date(Date.UTC(year, month, 1));

  const trades = await prisma.trade.findMany({
    where: {
      ...(tradingAccountId ? { tradingAccountId } : {}),
      closeTime: { gte: startOfMonth, lt: startOfNextMonth },
    },
    select: {
      closeTime: true,
      netProfit: true,
      tags: { select: { tag: { select: { name: true } } } },
    },
  });

  const byDay = new Map<
    string,
    { netPnl: number; tradeCount: number; tagCounts: Map<string, number> }
  >();

  for (const trade of trades) {
    const dateKey = trade.closeTime.toISOString().slice(0, 10); // "YYYY-MM-DD"
    const entry = byDay.get(dateKey) ?? {
      netPnl: 0,
      tradeCount: 0,
      tagCounts: new Map<string, number>(),
    };

    entry.netPnl += trade.netProfit;
    entry.tradeCount += 1;
    for (const { tag } of trade.tags) {
      entry.tagCounts.set(tag.name, (entry.tagCounts.get(tag.name) ?? 0) + 1);
    }

    byDay.set(dateKey, entry);
  }

  const days: CalendarDay[] = [];
  for (const [date, entry] of byDay.entries()) {
    let topTagName: string | null = null;
    let topCount = 0;
    for (const [name, count] of entry.tagCounts.entries()) {
      if (count > topCount) {
        topCount = count;
        topTagName = name;
      }
    }
    days.push({
      date,
      netPnl: entry.netPnl,
      tradeCount: entry.tradeCount,
      topTagName,
    });
  }

  return days;
}

export type RecentTrade = {
  id: string;
  symbol: string;
  type: "BUY" | "SELL";
  lots: number;
  openPrice: number;
  closePrice: number;
  netProfit: number;
  closeTime: Date;
  screenshotUrl?: string | null; // first screenshot, for grid-view thumbnails
};

export async function getRecentTrades(
  limit = 20,
  tradingAccountId?: string
): Promise<RecentTrade[]> {
  const trades = await prisma.trade.findMany({
    where: tradingAccountId ? { tradingAccountId } : undefined,
    orderBy: { closeTime: "desc" },
    take: limit,
    select: {
      id: true,
      symbol: true,
      type: true,
      lots: true,
      openPrice: true,
      closePrice: true,
      netProfit: true,
      closeTime: true,
    },
  });

  return trades;
}

export type EquityPoint = {
  date: string; // "YYYY-MM-DD"
  cumulativeNetPnl: number;
};

export async function getEquityCurve(
  tradingAccountId?: string
): Promise<EquityPoint[]> {
  const trades = await prisma.trade.findMany({
    where: tradingAccountId ? { tradingAccountId } : undefined,
    orderBy: { closeTime: "asc" },
    select: { closeTime: true, netProfit: true },
  });

  let running = 0;
  return trades.map((t) => {
    running += t.netProfit;
    return { date: t.closeTime.toISOString().slice(0, 10), cumulativeNetPnl: running };
  });
}

export type TradingAccountSummary = {
  id: string;
  accountNumber: string; // stringified BigInt — see note below
  brokerName: string;
  lastTradeAt: Date | null;
};

export async function getTradingAccounts(): Promise<TradingAccountSummary[]> {
  const accounts = await prisma.tradingAccount.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      accountNumber: true,
      brokerName: true,
      trades: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
    },
  });

  // accountNumber is a BigInt at the DB layer — Next.js can't serialize
  // BigInt across the server/client boundary (it'll throw at runtime if
  // you try), so convert to a plain string here, at the one place this
  // data leaves the server-only analytics layer.
  return accounts.map((a) => ({
    id: a.id,
    accountNumber: a.accountNumber.toString(),
    brokerName: a.brokerName,
    lastTradeAt: a.trades[0]?.createdAt ?? null,
  }));
}

export async function getTradesForDay(
  date: string, // "YYYY-MM-DD"
  tradingAccountId?: string
): Promise<RecentTrade[]> {
  const startOfDay = new Date(`${date}T00:00:00.000Z`);
  const startOfNextDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const trades = await prisma.trade.findMany({
    where: {
      ...(tradingAccountId ? { tradingAccountId } : {}),
      closeTime: { gte: startOfDay, lt: startOfNextDay },
    },
    orderBy: { closeTime: "asc" },
    select: {
      id: true,
      symbol: true,
      type: true,
      lots: true,
      openPrice: true,
      closePrice: true,
      netProfit: true,
      closeTime: true,
    },
  });

  return trades;
}

export type AccountOption = {
  id: string;
  accountNumber: string; // BigInt converted to string — BigInt can't
                          // cross the server/client component boundary
  brokerName: string;
  currency: string;
  initialBalance: number;
};

export async function getAllAccounts(): Promise<AccountOption[]> {
  const accounts = await prisma.tradingAccount.findMany({
    select: { id: true, accountNumber: true, brokerName: true, currency: true, initialBalance: true },
    orderBy: { createdAt: "asc" },
  });

  return accounts.map((a) => ({
    id: a.id,
    accountNumber: a.accountNumber.toString(),
    brokerName: a.brokerName,
    currency: a.currency,
    initialBalance: a.initialBalance,
  }));
}

// Global signal (not filtered by account) — this is really answering
// "is my ingestion pipeline still alive at all," which matters
// regardless of which account you're currently viewing.
export async function getLastSyncedAt(): Promise<Date | null> {
  const latest = await prisma.trade.findFirst({
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  return latest?.createdAt ?? null;
}

export type TradeDetail = {
  id: string;
  ticketId: string; // BigInt -> string, same reasoning as accountNumber
  symbol: string;
  type: "BUY" | "SELL";
  lots: number;
  openPrice: number;
  closePrice: number;
  stopLoss: number | null;
  takeProfit: number | null;
  profit: number;
  commission: number;
  swap: number;
  netProfit: number;
  openTime: Date;
  closeTime: Date;
  notes: string | null;
  rating: number | null;
  followedPlan: boolean | null;
  isManual: boolean;
  mae: number | null;
  mfe: number | null;
  account: { id: string; brokerName: string; accountNumber: string };
  tags: { id: string; name: string; category: "SETUP" | "MISTAKE" | "EMOTION" }[];
  screenshots: { id: string; url: string; label: string | null }[];
};

export async function getTradeById(id: string): Promise<TradeDetail | null> {
  const trade = await prisma.trade.findUnique({
    where: { id },
    include: {
      account: { select: { id: true, brokerName: true, accountNumber: true } },
      tags: { include: { tag: true } },
      screenshots: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!trade) return null;

  return {
    id: trade.id,
    ticketId: trade.ticketId.toString(),
    symbol: trade.symbol,
    type: trade.type,
    lots: trade.lots,
    openPrice: trade.openPrice,
    closePrice: trade.closePrice,
    stopLoss: trade.stopLoss,
    takeProfit: trade.takeProfit,
    profit: trade.profit,
    commission: trade.commission,
    swap: trade.swap,
    netProfit: trade.netProfit,
    openTime: trade.openTime,
    closeTime: trade.closeTime,
    notes: trade.notes,
    rating: trade.rating,
    followedPlan: trade.followedPlan,
    isManual: trade.isManual,
    mae: trade.mae,
    mfe: trade.mfe,
    account: {
      id: trade.account.id,
      brokerName: trade.account.brokerName,
      accountNumber: trade.account.accountNumber.toString(),
    },
    tags: trade.tags.map((t) => ({
      id: t.tag.id,
      name: t.tag.name,
      category: t.tag.category,
    })),
    screenshots: trade.screenshots.map((s) => ({
      id: s.id,
      url: s.url,
      label: s.label,
    })),
  };
}

export type TagOption = { id: string; name: string; category: "SETUP" | "MISTAKE" | "EMOTION" };

export async function getAllTags(): Promise<TagOption[]> {
  const tags = await prisma.tag.findMany({ orderBy: { name: "asc" } });
  return tags;
}

export type DayOfWeekStat = {
  day: string; // "Mon".."Sun"
  winRate: number;
  netPnl: number;
  tradeCount: number;
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export async function getWinRateByDayOfWeek(
  tradingAccountId?: string
): Promise<DayOfWeekStat[]> {
  const trades = await prisma.trade.findMany({
    where: tradingAccountId ? { tradingAccountId } : undefined,
    select: { closeTime: true, netProfit: true },
  });

  // Bucket in JS rather than SQL — Prisma can't extract day-of-week
  // from a DateTime directly, same tradeoff as the calendar's day
  // bucketing. Fine at personal-journal scale.
  const buckets = new Map<number, { wins: number; total: number; netPnl: number }>();
  for (let i = 0; i < 7; i++) buckets.set(i, { wins: 0, total: 0, netPnl: 0 });

  for (const trade of trades) {
    const day = trade.closeTime.getUTCDay();
    const b = buckets.get(day)!;
    b.total += 1;
    b.netPnl += trade.netProfit;
    if (trade.netProfit > 0) b.wins += 1;
  }

  // Reorder Mon-first to match the calendar's convention elsewhere.
  const order = [1, 2, 3, 4, 5, 6, 0];
  return order.map((dayIndex) => {
    const b = buckets.get(dayIndex)!;
    return {
      day: DAY_LABELS[dayIndex],
      winRate: b.total > 0 ? (b.wins / b.total) * 100 : 0,
      netPnl: b.netPnl,
      tradeCount: b.total,
    };
  });
}

export type HourStat = {
  hour: number; // 0–23
  winRate: number;
  netPnl: number;
  tradeCount: number;
};

export async function getWinRateByHour(tradingAccountId?: string): Promise<HourStat[]> {
  const trades = await prisma.trade.findMany({
    where: tradingAccountId ? { tradingAccountId } : undefined,
    select: { openTime: true, netProfit: true },
  });

  const buckets = new Map<number, { wins: number; total: number; netPnl: number }>();
  for (let i = 0; i < 24; i++) buckets.set(i, { wins: 0, total: 0, netPnl: 0 });

  for (const trade of trades) {
    const hour = trade.openTime.getUTCHours();
    const b = buckets.get(hour)!;
    b.total += 1;
    b.netPnl += trade.netProfit;
    if (trade.netProfit > 0) b.wins += 1;
  }

  return Array.from(buckets.entries()).map(([hour, b]) => ({
    hour,
    winRate: b.total > 0 ? (b.wins / b.total) * 100 : 0,
    netPnl: b.netPnl,
    tradeCount: b.total,
  }));
}

export type TagPerformance = {
  tagName: string;
  category: "SETUP" | "MISTAKE" | "EMOTION";
  netPnl: number;
  winRate: number;
  tradeCount: number;
};

export async function getPerformanceByTag(
  tradingAccountId?: string
): Promise<TagPerformance[]> {
  const tagLinks = await prisma.tagOnTrade.findMany({
    where: tradingAccountId ? { trade: { tradingAccountId } } : undefined,
    include: { tag: true, trade: { select: { netProfit: true } } },
  });

  const buckets = new Map<
    string,
    { category: "SETUP" | "MISTAKE" | "EMOTION"; wins: number; total: number; netPnl: number }
  >();

  for (const link of tagLinks) {
    const key = link.tag.name;
    const b = buckets.get(key) ?? { category: link.tag.category, wins: 0, total: 0, netPnl: 0 };
    b.total += 1;
    b.netPnl += link.trade.netProfit;
    if (link.trade.netProfit > 0) b.wins += 1;
    buckets.set(key, b);
  }

  return Array.from(buckets.entries())
    .map(([tagName, b]) => ({
      tagName,
      category: b.category,
      netPnl: b.netPnl,
      winRate: b.total > 0 ? (b.wins / b.total) * 100 : 0,
      tradeCount: b.total,
    }))
    .sort((a, b) => b.netPnl - a.netPnl);
}

export type TradeFilters = {
  symbol?: string;
  tradingAccountId?: string;
  result?: "win" | "loss"; // omitted = both
  dateFrom?: Date;
  dateTo?: Date;
};

export async function getFilteredTrades(filters: TradeFilters): Promise<RecentTrade[]> {
  const trades = await prisma.trade.findMany({
    where: {
      ...(filters.tradingAccountId ? { tradingAccountId: filters.tradingAccountId } : {}),
      ...(filters.symbol ? { symbol: { contains: filters.symbol, mode: "insensitive" } } : {}),
      ...(filters.result === "win" ? { netProfit: { gt: 0 } } : {}),
      ...(filters.result === "loss" ? { netProfit: { lt: 0 } } : {}),
      ...(filters.dateFrom || filters.dateTo
        ? {
            closeTime: {
              ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
              ...(filters.dateTo ? { lte: filters.dateTo } : {}),
            },
          }
        : {}),
    },
    orderBy: { closeTime: "desc" },
    select: {
      id: true,
      symbol: true,
      type: true,
      lots: true,
      openPrice: true,
      closePrice: true,
      netProfit: true,
      closeTime: true,
      // Just the first screenshot — grid view only needs one
      // thumbnail per card, not the full set (that's what the trade
      // detail page is for).
      screenshots: { take: 1, orderBy: { createdAt: "asc" }, select: { url: true } },
    },
  });

  return trades.map((t) => ({
    ...t,
    screenshotUrl: t.screenshots[0]?.url ?? null,
  }));
}

export type CandleBar = {
  time: number; // unix seconds, what lightweight-charts expects
  open: number;
  high: number;
  low: number;
  close: number;
};

export async function getTradeCandles(tradeId: string): Promise<CandleBar[]> {
  const candles = await prisma.tradeCandle.findMany({
    where: { tradeId },
    orderBy: { time: "asc" },
  });

  return candles.map((c) => ({
    time: Math.floor(c.time.getTime() / 1000),
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
  }));
}

export type TagWithCount = TagOption & { tradeCount: number };

export async function getAllTagsWithCounts(): Promise<TagWithCount[]> {
  const tags = await prisma.tag.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { trades: true } } },
  });

  return tags.map((t) => ({
    id: t.id,
    name: t.name,
    category: t.category,
    tradeCount: t._count.trades,
  }));
}