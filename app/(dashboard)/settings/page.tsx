import { headers } from "next/headers";
import { Download } from "lucide-react";
import { getAllAccounts, getAllTagsWithCounts } from "@/lib/analytics";
import AccountsSettings from "@/components/dashboard/AccountsSettings";
import TagsSettings from "@/components/dashboard/TagsSettings";

export default async function SettingsPage() {
  const [accounts, tags] = await Promise.all([getAllAccounts(), getAllTagsWithCounts()]);

  // Derive the real deployed origin from the request itself, rather
  // than hardcoding it — this way the displayed URLs are always
  // correct whether you're looking at this on localhost or your
  // real Vercel deployment, with no manual updating needed.
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = headersList.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  const webhookUrls = [
    { label: "Trade webhook", path: "/api/webhooks/trade" },
    { label: "Last-sync (catch-up)", path: "/api/webhooks/last-sync" },
    { label: "Candles", path: "/api/webhooks/candles" },
  ];

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <h1 className="text-lg font-semibold text-text-primary">Settings</h1>

      <div className="rounded-2xl border border-border bg-bg-surface p-5 shadow-sm">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-text-muted">
          Accounts
        </h2>
        <AccountsSettings accounts={accounts} />
      </div>

      <div className="rounded-2xl border border-border bg-bg-surface p-5 shadow-sm">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-text-muted">
          Tags
        </h2>
        <TagsSettings tags={tags} />
      </div>

      <div className="rounded-2xl border border-border bg-bg-surface p-5 shadow-sm">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-text-muted">
          Export
        </h2>
        <p className="mb-3 text-sm text-text-muted">
          Download every trade as a CSV — a portable backup independent of this app.
        </p>
        <a
          href="/api/trades/export"
          download
          className="inline-flex items-center gap-1.5 rounded-full bg-accent-dark px-3 py-1.5 text-sm font-medium text-white"
        >
          <Download size={14} />
          Export all trades (CSV)
        </a>
      </div>

      <div className="rounded-2xl border border-border bg-bg-surface p-5 shadow-sm">
        <h2 className="mb-1 text-xs font-medium uppercase tracking-wide text-text-muted">
          EA Reference
        </h2>
        <p className="mb-3 text-xs text-text-muted">
          These are the exact URLs to set in your EA's inputs when reconfiguring it on a new
          machine. EA_SECRET_KEY itself lives in your .env file — not shown here.
        </p>
        <div className="space-y-2">
          {webhookUrls.map((w) => (
            <div key={w.path}>
              <p className="text-xs text-text-muted">{w.label}</p>
              <p className="rounded-lg bg-bg-elevated px-3 py-2 font-mono text-xs text-text-primary">
                {origin}{w.path}
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}