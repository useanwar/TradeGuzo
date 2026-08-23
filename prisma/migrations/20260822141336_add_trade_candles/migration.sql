-- CreateTable
CREATE TABLE "TradeCandle" (
    "id" TEXT NOT NULL,
    "time" TIMESTAMP(3) NOT NULL,
    "open" DOUBLE PRECISION NOT NULL,
    "high" DOUBLE PRECISION NOT NULL,
    "low" DOUBLE PRECISION NOT NULL,
    "close" DOUBLE PRECISION NOT NULL,
    "tradeId" TEXT NOT NULL,

    CONSTRAINT "TradeCandle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TradeCandle_tradeId_time_idx" ON "TradeCandle"("tradeId", "time");

-- AddForeignKey
ALTER TABLE "TradeCandle" ADD CONSTRAINT "TradeCandle_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE CASCADE ON UPDATE CASCADE;
