"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { AccountOption } from "@/lib/analytics";

export default function AccountSelector({ accounts }: { accounts: AccountOption[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentAccountId = searchParams.get("account") ?? "all";

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value === "all") {
      params.delete("account");
    } else {
      params.set("account", e.target.value);
    }
    router.push(`/?${params.toString()}`);
  }

  if (accounts.length === 0) return null;

  return (
    <select
      value={currentAccountId}
      onChange={handleChange}
      className="rounded-full border border-border bg-bg-surface px-3 py-1.5 text-sm text-text-primary shadow-sm"
    >
      <option value="all">All Accounts</option>
      {accounts.map((account) => (
        <option key={account.id} value={account.id}>
          {account.brokerName} · #{account.accountNumber}
        </option>
      ))}
    </select>
  );
}