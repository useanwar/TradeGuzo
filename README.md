# TradeGuzo

A self-hosted personal trading journal for MetaTrader 4/5 traders. Syncs closed trades automatically from your MT5 terminal, tracks MAE/MFE and price history live, and gives you a dashboard, calendar heatmap, tagging, and reports — all running on your own free-tier infrastructure.

Built for **single-user, self-hosted** use: you deploy your own instance, connect your own MT5 account(s), and your data stays in your own database.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router) + TypeScript, Tailwind CSS v4 |
| Charts | Recharts (reports), lightweight-charts (candlestick view) |
| Database | PostgreSQL via [Neon](https://neon.tech) (free tier) |
| ORM | Prisma 6 |
| File storage | [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) (screenshots) |
| Auth | Single-password session (JWT cookie), no user accounts |
| Desktop integration | MQL5 Expert Advisor (`mql/JournalSync.mq5`) |
| Hosting | Vercel |

---

## Features

- **Live trade sync** — an MT5 Expert Advisor pushes every closed trade to your dashboard automatically
- **Catch-up sync** — backfills any trades that closed while the EA wasn't running (MT5 was off, or you traded from your phone)
- **MAE/MFE tracking** — tracks how far each trade moved for/against you while it was open
- **Candlestick charts** — price history around each trade, fetched from MT5 itself (not a third-party API), with entry/exit markers
- **Dashboard** — KPI cards (Net P&L, Win Rate, Profit Factor, etc.), a P&L calendar heatmap with day drill-down, recent trades
- **Trade detail** — tagging (setup/mistake/emotion), notes, execution rating, "followed your plan" toggle, screenshot uploads
- **Reports** — win rate by day of week / hour, performance by tag, equity curve
- **Manual trade entry** and **CSV/xlsx bulk import** — for accounts or trades not connected via the EA
- **Settings** — manage accounts and tags, export all trades to CSV, reference your webhook URLs

---

## Prerequisites

- Node.js 18+
- A [Neon](https://neon.tech) account (free tier)
- A [Vercel](https://vercel.com) account (free tier)
- MetaTrader 5 (for live sync — the app also works with manual entry / CSV import alone if you don't use MT5)

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/useanwar/TradeGuzo.git
cd tradeguzo
npm install
```

### 2. Set up your database

1. Create a project on [Neon](https://neon.tech).
2. In your Neon dashboard, copy **both** connection strings:
   - The **pooled** connection (hostname contains `-pooler`) — this is your app's runtime connection.
   - The **direct/unpooled** connection — used only for migrations.
3. Append `?sslmode=require&connect_timeout=30` to both. The `connect_timeout` matters: Neon's free tier suspends its compute after 5 minutes of inactivity, and the default timeout is too short to wait for it to wake back up.

### 3. Set up Vercel Blob (for screenshot uploads)

1. Go to [vercel.com](https://vercel.com), sign in, and import this repo as a new project (this triggers an initial deployment — that's fine even if it's not fully configured yet).
2. In your new project → **Storage** tab → create a Blob store. This generates a `BLOB_READ_WRITE_TOKEN`.
3. Copy that token's value from **Settings → Environment Variables**.

### 4. Configure your `.env`

Copy `.env.example` to `.env` and fill in:

```dotenv
DATABASE_URL="<pooled Neon connection string>"
DIRECT_URL="<direct Neon connection string>"

EA_SECRET_KEY="<generate a long random string>"
DASHBOARD_PASSWORD="<your login password>"
JWT_SECRET="<generate with: openssl rand -base64 32>"

BLOB_READ_WRITE_TOKEN="<from Vercel Blob store>"
```

**Never reuse the example values in production.** Generate fresh random strings for `EA_SECRET_KEY` and `JWT_SECRET`.

### 5. Run the database migration

```bash
npx prisma migrate dev
```

### 6. Run it locally

```bash
npm run dev
```

Visit `http://localhost:3000` — you'll be redirected to `/login`. Log in with `DASHBOARD_PASSWORD`.

### 7. Deploy

Push to your connected GitHub repo, or run `vercel --prod`. Make sure every variable from `.env` is also set in your Vercel project's **Settings → Environment Variables** — local `.env` files aren't deployed.

---

## Connecting MetaTrader 5

The EA (`mql/JournalSync.mq5`) sends closed trades, catch-up backfills, and price history to your deployed app.

### Install the EA

1. In MT5: **File → Open Data Folder → MQL5 → Experts**.
2. Copy `mql/JournalSync.mq5` into that folder.
3. In MT5, open **MetaEditor** (F4), find the file in the Navigator under Experts, open it, and press **F7** to compile. Confirm "0 errors, 0 warnings."

### Allow WebRequest access

MT5 blocks outbound web requests by default — this is the single most common setup snag.

1. **Tools → Options → Expert Advisors.**
2. Check **"Allow WebRequest for listed URL."**
3. Add your app's URL (e.g. `https://your-app.vercel.app`, or `http://127.0.0.1:3000` for local testing — use `127.0.0.1`, not `localhost`, as some setups treat them as different entries).
4. **Press Enter after typing the URL**, and confirm it actually appears as a listed entry before clicking OK.
5. **Fully close and reopen MT5** — permission changes here often don't apply to an already-running session.
6. If it still doesn't work, try running MT5 as Administrator once — some installs can't otherwise save this setting.

### Configure the EA's inputs

Drag the EA onto any chart. In the input dialog, set:

- `ServerUrl` → `https://your-app.vercel.app/api/webhooks/trade`
- `LastSyncUrl` → `https://your-app.vercel.app/api/webhooks/last-sync`
- `CandlesUrl` → `https://your-app.vercel.app/api/webhooks/candles`
- `EaSecretKey` → must exactly match `EA_SECRET_KEY` in your `.env`

Your app's Settings page (`/settings`) also displays these exact URLs for reference, so you don't need to reconstruct them by hand when reconfiguring on a new machine.

Confirm **"Allow Algo Trading"** is checked in the Common tab, then click OK. Check the top-right of the chart for a smiley face — that confirms the EA is running.

### Troubleshooting

| Symptom | Likely cause |
|---|---|
| `WebRequest failed. Error code: 4060` | URL not in the whitelist (see above) |
| `Error code: 4014` | Algo Trading disabled — check both the toolbar toggle and the EA's own "Allow Algo Trading" setting |
| `HTTP status: 1001` or `1003` | Request timed out — often a Next.js dev-mode first-compile delay; retry, or increase the EA's `timeout` values |
| No `Print()` output at all | The EA isn't actually running — check for the smiley face, and remember recompiling doesn't restart an already-attached EA |

---

## Data Import Options

If you don't want to run the EA at all (or want to backfill history from before you started using this app):

- **Manual entry** — `/trades/new`, one trade at a time, with full tagging/notes support
- **CSV/Excel import** — `/trades/import`, download the template from that page. Including a real MT5 ticket number in the `ticketId` column is strongly recommended — it's the only way to guarantee re-importing the same file won't create duplicates.

---

## Known Limitations

- **MAE/MFE and candlestick charts only work for trades closed after the EA has this feature** — MT5's trade history doesn't retroactively store price paths, so this data can only be captured live, tick by tick, while a trade is open.
- **Neon's free tier suspends after 5 minutes of inactivity.** The first request after a while can take a moment to wake it back up — this is expected, not a bug.
- **CSV/Excel import needs your data reformatted into the app's template columns** — it doesn't parse MT5's raw HTML statement export directly.
- **Dark mode is not yet implemented** (planned).

---

## Project Structure

```
app/
  (dashboard)/          # authenticated pages — dashboard, trades, reports, settings
  login/                 # login page (outside the dashboard shell)
  api/
    webhooks/            # EA-facing endpoints (trade, last-sync, candles) — auth via EA_SECRET_KEY
    auth/                # login/logout
    accounts/, tags/, trades/   # dashboard-facing endpoints — auth via session cookie
components/dashboard/    # all UI components
lib/
  analytics.ts           # all data-fetching/aggregation queries
  auth.ts                # Node-only: timing-safe comparisons, rate limiting
  session.ts             # Edge-safe: JWT create/verify (used by middleware)
  prisma.ts              # Prisma client singleton
mql/
  JournalSync.mq5         # the MT5 Expert Advisor
prisma/
  schema.prisma
```

---

## License

MIT — see [LICENSE](./LICENSE).