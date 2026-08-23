"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import type { AccountOption } from "@/lib/analytics";

export default function AccountsSettings({ accounts }: { accounts: AccountOption[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [currency, setCurrency] = useState("");
  const [initialBalance, setInitialBalance] = useState("");

  function startEditing(account: AccountOption) {
    setEditingId(account.id);
    setCurrency(account.currency);
    setInitialBalance(String(account.initialBalance));
  }

  async function handleSave(id: string) {
    await fetch(`/api/accounts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currency, initialBalance: parseFloat(initialBalance) }),
    });
    setEditingId(null);
    router.refresh();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/accounts/${id}`, { method: "DELETE" });
    setDeletingId(null);
    setConfirmText("");
    router.refresh();
  }

  const inputClass =
    "rounded-lg border border-border bg-bg-surface px-2 py-1 text-sm text-text-primary outline-none focus:border-accent";

  if (accounts.length === 0) {
    return <p className="text-sm text-text-muted">No accounts yet.</p>;
  }

  return (
    <div className="space-y-3">
      {accounts.map((account) => (
        <div key={account.id} className="rounded-xl border border-border p-3">
          {deletingId === account.id ? (
            <div className="space-y-2">
              <p className="text-sm text-loss">
                This deletes the account and every trade under it — permanently. Type the
                account number (<span className="font-mono">{account.accountNumber}</span>) to
                confirm.
              </p>
              <div className="flex gap-2">
                <input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className={inputClass}
                  placeholder="Account number"
                />
                <button
                  onClick={() => handleDelete(account.id)}
                  disabled={confirmText !== account.accountNumber}
                  className="rounded-lg bg-loss px-3 py-1 text-sm font-medium text-white disabled:opacity-40"
                >
                  Delete permanently
                </button>
                <button
                  onClick={() => { setDeletingId(null); setConfirmText(""); }}
                  className="rounded-lg bg-bg-elevated px-3 py-1 text-sm text-text-muted"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : editingId === account.id ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-text-primary">
                {account.brokerName} · #{account.accountNumber}
              </span>
              <input
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className={`${inputClass} w-20`}
                placeholder="Currency"
              />
              <input
                type="number"
                value={initialBalance}
                onChange={(e) => setInitialBalance(e.target.value)}
                className={`${inputClass} w-28`}
                placeholder="Initial balance"
              />
              <button
                onClick={() => handleSave(account.id)}
                className="rounded-lg bg-accent-dark px-3 py-1 text-sm font-medium text-white"
              >
                Save
              </button>
              <button
                onClick={() => setEditingId(null)}
                className="rounded-lg bg-bg-elevated px-3 py-1 text-sm text-text-muted"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-sm font-medium text-text-primary">
                  {account.brokerName} · #{account.accountNumber}
                </span>
                <span className="ml-2 text-xs text-text-muted">
                  {account.currency} · initial balance {account.initialBalance}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => startEditing(account)}
                  className="rounded-full border border-border px-3 py-1 text-xs text-text-muted hover:bg-bg-elevated"
                >
                  Edit
                </button>
                <button
                  onClick={() => setDeletingId(account.id)}
                  className="flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs text-loss hover:bg-loss-muted"
                >
                  <Trash2 size={12} />
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}