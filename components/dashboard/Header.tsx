import { Plus, Upload } from "lucide-react";
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
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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

        {/* ml-auto pins these two flush to the row's right edge,
            regardless of how wide AccountSelector ends up being —
            keeps them from just floating wherever there's leftover
            space when the header wraps on mobile. */}
        <div className="ml-auto flex items-center gap-2 sm:ml-0">
          {/* Manual trade entry now exists — see app/(dashboard)/trades/new.
              Icon-only circle on mobile (label hidden), full pill with
              label at sm and up — matches the sidebar's own responsive
              pattern rather than letting text wrap awkwardly. */}
          <Link
            href="/trades/new"
            title="Log Trade"
            className="flex h-9 w-9 items-center justify-center gap-1 rounded-full bg-accent-dark text-white transition-opacity hover:opacity-90 sm:h-auto sm:w-auto sm:px-3 sm:py-1.5 sm:text-sm sm:font-medium"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Log Trade</span>
          </Link>
          <Link
            href="/trades/import"
            title="Import CSV"
            className="flex h-9 w-9 items-center justify-center gap-1 rounded-full border border-border bg-bg-surface text-text-primary transition-colors hover:bg-bg-elevated sm:h-auto sm:w-auto sm:px-3 sm:py-1.5 sm:text-sm sm:font-medium"
          >
            <Upload size={16} />
            <span className="hidden sm:inline">Import CSV</span>
          </Link>
        </div>
      </div>
    </div>
  );
}