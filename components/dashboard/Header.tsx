import { Plus } from "lucide-react";
import Link from "next/link";
import AccountSelector from "./Accountselector";
import type { AccountOption } from "@/lib/analytics";

function formatLastSynced(date: Date | null): string {
  if (!date) return "No trades synced yet";

  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return "Synced just now";
  if (diffMin < 60) return `Synced ${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `Synced ${diffHr}h ago`;

  const diffDays = Math.floor(diffHr / 24);
  return `Synced ${diffDays}d ago`;
}

export default function Header({
  accounts,
  lastSyncedAt,
}: {
  accounts: AccountOption[];
  lastSyncedAt: Date | null;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        {/* Logo placeholder — swap this div for an <Image> once the
            real logo exists. Sized to match the text height so the
            swap is a drop-in later. */}
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-dark font-mono text-sm font-bold text-white">
          D
        </div>
        <div>
          <h1 className="text-lg font-semibold leading-tight text-text-primary">
            Debter FX
          </h1>
          <p className="text-xs text-text-muted">{formatLastSynced(lastSyncedAt)}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <AccountSelector accounts={accounts} />
        {/* Manual trade entry now exists — see app/(dashboard)/trades/new */}
        <Link
          href="/trades/new"
          className="flex items-center gap-1 rounded-full bg-accent-dark px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          <Plus size={16} />
          Log Trade
        </Link>
        <Link
          href="/trades/import"
          className="flex items-center gap-1 rounded-full border border-border bg-bg-surface px-3 py-1.5 text-sm font-medium text-text-primary transition-colors hover:bg-bg-elevated"
        >
          Import CSV
        </Link>
      </div>
    </div>
  );
}