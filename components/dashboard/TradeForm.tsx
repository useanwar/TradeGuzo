"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AccountOption } from "@/lib/analytics";

export default function TradeForm({ accounts }: { accounts: AccountOption[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [isNewAccount, setIsNewAccount] = useState(accounts.length === 0);
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id ?? "");

  // New account fields
  const [newAccountNumber, setNewAccountNumber] = useState("");
  const [newBrokerName, setNewBrokerName] = useState("Manual");

  // Trade fields
  const [symbol, setSymbol] = useState("");
  const [type, setType] = useState<"BUY" | "SELL">("BUY");
  const [lots, setLots] = useState("");
  const [openPrice, setOpenPrice] = useState("");
  const [closePrice, setClosePrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [profit, setProfit] = useState("");
  const [commission, setCommission] = useState("0");
  const [swap, setSwap] = useState("0");
  const [openTime, setOpenTime] = useState("");
  const [closeTime, setCloseTime] = useState("");
  const [notes, setNotes] = useState("");
  const [followedPlan, setFollowedPlan] = useState<"" | "yes" | "no">("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      let tradingAccountId = selectedAccountId;

      if (isNewAccount) {
        if (!newAccountNumber || !newBrokerName) {
          setError("Account number and broker name are required.");
          setSubmitting(false);
          return;
        }

        const accountRes = await fetch("/api/accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountNumber: newAccountNumber,
            brokerName: newBrokerName,
          }),
        });

        const accountData = await accountRes.json();
        if (!accountRes.ok) {
          setError(accountData.error ?? "Failed to create account");
          setSubmitting(false);
          return;
        }
        tradingAccountId = accountData.account.id;
      }

      const tradeRes = await fetch("/api/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tradingAccountId,
          symbol,
          type,
          lots: parseFloat(lots),
          openPrice: parseFloat(openPrice),
          closePrice: parseFloat(closePrice),
          stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
          takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
          profit: parseFloat(profit),
          commission: parseFloat(commission || "0"),
          swap: parseFloat(swap || "0"),
          openTime,
          closeTime,
          notes: notes || undefined,
          followedPlan: followedPlan === "" ? undefined : followedPlan === "yes",
        }),
      });

      const tradeData = await tradeRes.json();
      if (!tradeRes.ok) {
        setError(tradeData.error ?? "Failed to log trade");
        setSubmitting(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary outline-none focus:border-accent";
  const labelClass = "mb-1 block text-xs font-medium text-text-muted";

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-border bg-bg-surface p-5 shadow-sm">
      {/* Account */}
      <div>
        <label className={labelClass}>Account</label>
        {accounts.length > 0 && (
          <div className="mb-2 flex gap-2 text-xs">
            <button
              type="button"
              onClick={() => setIsNewAccount(false)}
              className={`rounded-full px-3 py-1 ${!isNewAccount ? "bg-accent-dark text-white" : "bg-bg-elevated text-text-muted"}`}
            >
              Existing account
            </button>
            <button
              type="button"
              onClick={() => setIsNewAccount(true)}
              className={`rounded-full px-3 py-1 ${isNewAccount ? "bg-accent-dark text-white" : "bg-bg-elevated text-text-muted"}`}
            >
              New account
            </button>
          </div>
        )}

        {isNewAccount ? (
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="Account number"
              value={newAccountNumber}
              onChange={(e) => setNewAccountNumber(e.target.value)}
              className={inputClass}
            />
            <input
              placeholder="Broker name"
              value={newBrokerName}
              onChange={(e) => setNewBrokerName(e.target.value)}
              className={inputClass}
            />
          </div>
        ) : (
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className={inputClass}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.brokerName} · #{a.accountNumber}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Symbol + Type */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Symbol</label>
          <input
            required
            placeholder="EURUSD"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Type</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setType("BUY")}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${type === "BUY" ? "bg-profit-muted text-profit" : "bg-bg-elevated text-text-muted"}`}
            >
              BUY
            </button>
            <button
              type="button"
              onClick={() => setType("SELL")}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${type === "SELL" ? "bg-loss-muted text-loss" : "bg-bg-elevated text-text-muted"}`}
            >
              SELL
            </button>
          </div>
        </div>
      </div>

      {/* Lots + prices */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelClass}>Lots</label>
          <input required type="number" step="0.01" value={lots} onChange={(e) => setLots(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Open Price</label>
          <input required type="number" step="0.00001" value={openPrice} onChange={(e) => setOpenPrice(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Close Price</label>
          <input required type="number" step="0.00001" value={closePrice} onChange={(e) => setClosePrice(e.target.value)} className={inputClass} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Stop Loss (optional)</label>
          <input type="number" step="0.00001" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Take Profit (optional)</label>
          <input type="number" step="0.00001" value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} className={inputClass} />
        </div>
      </div>

      {/* P&L */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelClass}>Profit (gross)</label>
          <input required type="number" step="0.01" value={profit} onChange={(e) => setProfit(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Commission</label>
          <input type="number" step="0.01" value={commission} onChange={(e) => setCommission(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Swap</label>
          <input type="number" step="0.01" value={swap} onChange={(e) => setSwap(e.target.value)} className={inputClass} />
        </div>
      </div>

      {/* Times */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Open Time</label>
          <input required type="datetime-local" value={openTime} onChange={(e) => setOpenTime(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Close Time</label>
          <input required type="datetime-local" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} className={inputClass} />
        </div>
      </div>

      {/* Followed plan */}
      <div>
        <label className={labelClass}>Followed your plan?</label>
        <div className="flex gap-2">
          {(["yes", "no", ""] as const).map((val) => (
            <button
              key={val || "unset"}
              type="button"
              onClick={() => setFollowedPlan(val)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                followedPlan === val ? "bg-accent-dark text-white" : "bg-bg-elevated text-text-muted"
              }`}
            >
              {val === "" ? "Not reviewed" : val === "yes" ? "Yes" : "No"}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className={labelClass}>Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className={inputClass}
        />
      </div>

      {error && <p className="text-sm text-loss">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-full bg-accent-dark py-2.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {submitting ? "Saving..." : "Log Trade"}
      </button>
    </form>
  );
}