/*
  Warnings:

  - A unique constraint covering the columns `[tradeId,time]` on the table `TradeCandle` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "TradeCandle_tradeId_time_key" ON "TradeCandle"("tradeId", "time");
