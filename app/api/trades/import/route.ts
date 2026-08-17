import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import Papa from "papaparse";
import { prisma } from "@/lib/prisma";

type CsvRow = {
  ticketId?: string;
  symbol?: string;
  type?: string;
  lots?: string;
  openPrice?: string;
  closePrice?: string;
  openTime?: string;
  closeTime?: string;
  profit?: string;
  commission?: string;
  swap?: string;
  stopLoss?: string;
  takeProfit?: string;
};

// Content-hash fallback — ONLY used when a row has no real ticketId
// at all (e.g. hand-typed paper trades with no broker behind them).
// Whenever a real MT5 ticket number is available, use it directly —
// it's the authoritative unique ID, and using it keeps CSV-imported
// trades consistent with anything the same ticket already synced via
// the live EA webhook, rather than the two paths disagreeing about
// what identifies "the same trade."
function deterministicTicketId(row: {
  symbol: string;
  openTime: string;
  closeTime: string;
  profit: number;
  lots: number;
}): bigint {
  const key = `${row.symbol}|${row.openTime}|${row.closeTime}|${row.profit}|${row.lots}`;
  const hash = crypto.createHash("sha256").update(key).digest();
  return BigInt(hash.readUIntBE(0, 6));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { tradingAccountId, csvText } = body;

  if (!tradingAccountId || !csvText) {
    return NextResponse.json(
      { error: "tradingAccountId and csvText are required" },
      { status: 400 }
    );
  }

  const parsed = Papa.parse<CsvRow>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0 && parsed.data.length === 0) {
    return NextResponse.json(
      { error: "Could not parse CSV file. Check it matches the template format." },
      { status: 400 }
    );
  }

  let imported = 0;
  const rowErrors: { row: number; message: string }[] = [];

  for (let i = 0; i < parsed.data.length; i++) {
    const row = parsed.data[i];
    const rowNum = i + 2; // +1 for 0-index, +1 for the header row

    try {
      const symbol = row.symbol?.trim().toUpperCase();
      const type = row.type?.trim().toUpperCase();
      const lots = parseFloat(row.lots ?? "");
      const openPrice = parseFloat(row.openPrice ?? "");
      const closePrice = parseFloat(row.closePrice ?? "");
      const profit = parseFloat(row.profit ?? "");
      const commission = row.commission ? parseFloat(row.commission) : 0;
      const swap = row.swap ? parseFloat(row.swap) : 0;
      const stopLoss = row.stopLoss ? parseFloat(row.stopLoss) : undefined;
      const takeProfit = row.takeProfit ? parseFloat(row.takeProfit) : undefined;
      const openTime = row.openTime?.trim();
      const closeTime = row.closeTime?.trim();

      if (!symbol) throw new Error("Missing symbol");
      if (type !== "BUY" && type !== "SELL") throw new Error(`Invalid type "${row.type}" — must be BUY or SELL`);
      if (isNaN(lots)) throw new Error("Invalid or missing lots");
      if (isNaN(openPrice)) throw new Error("Invalid or missing openPrice");
      if (isNaN(closePrice)) throw new Error("Invalid or missing closePrice");
      if (isNaN(profit)) throw new Error("Invalid or missing profit");
      if (!openTime) throw new Error("Missing openTime");
      if (!closeTime) throw new Error("Missing closeTime");

      const openDate = new Date(openTime);
      const closeDate = new Date(closeTime);
      if (isNaN(openDate.getTime())) throw new Error(`Invalid openTime "${openTime}"`);
      if (isNaN(closeDate.getTime())) throw new Error(`Invalid closeTime "${closeTime}"`);

      const netProfit = profit - commission - swap;

      // Prefer the real broker ticket number when the row provides one.
      // Only fall back to the content hash for rows with no ticketId
      // at all — e.g. purely manual paper trades with no broker ID.
      const rawTicketId = row.ticketId?.trim();
      const ticketId =
        rawTicketId && /^\d+$/.test(rawTicketId)
          ? BigInt(rawTicketId)
          : deterministicTicketId({ symbol, openTime, closeTime, profit, lots });

      await prisma.trade.upsert({
        where: { ticketId },
        update: {
          closePrice,
          profit,
          commission,
          swap,
          netProfit,
          closeTime: closeDate,
        },
        create: {
          ticketId,
          symbol,
          type,
          lots,
          openPrice,
          closePrice,
          stopLoss,
          takeProfit,
          profit,
          commission,
          swap,
          netProfit,
          openTime: openDate,
          closeTime: closeDate,
          isManual: true,
          tradingAccountId,
        },
      });

      imported++;
    } catch (err: any) {
      rowErrors.push({ row: rowNum, message: err.message ?? "Unknown error" });
    }
  }

  return NextResponse.json({
    ok: true,
    imported,
    skipped: rowErrors.length,
    errors: rowErrors,
  });
}