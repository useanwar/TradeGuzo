import { prisma } from "@/lib/prisma";

// At single-user, personal-journal scale (hundreds to low thousands of
// trades, not millions), it's simpler and plenty fast to fetch the raw
// rows and aggregate in JS rather than write raw SQL for date-bucketing
// (Prisma's groupBy can't truncate a DateTime to "day" on its own).
// If this ever becomes a bottleneck, the day-bucketing in getCalendarData
// is the first thing worth moving to a raw SQL query.

export type KpiSummary = {
  netPnl: number;
  winRate: number; // 0–100
  profitFactor: number | null; // null when there are no losing trades to divide by
  avgWin: number;
  avgLoss: number; // stored as a negative number, e.g. -180
  totalTrades: number;
};

export async function getKpiSummary(
  tradingAccountId?: string
): Promise<KpiSummary> {
  const trades = await prisma.trade.findMany({
    where: tradingAccountId ? { tradingAccountId } : undefined,
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

export type AccountOption = {
  id: string;
  accountNumber: string; // BigInt converted to string — BigInt can't
                          // cross the server/client component boundary
  brokerName: string;
};

export async function getAllAccounts(): Promise<AccountOption[]> {
  const accounts = await prisma.tradingAccount.findMany({
    select: { id: true, accountNumber: true, brokerName: true },
    orderBy: { createdAt: "asc" },
  });

  return accounts.map((a) => ({
    id: a.id,
    accountNumber: a.accountNumber.toString(),
    brokerName: a.brokerName,
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