# FundTrack

A simple, no-signup spending tracker with a ledger-book identity: red for
debits, green for credits, tabular figures throughout. Log expenses (and
income, for a full net balance) with category dropdowns, a live
auto-calculating preview, and a clean dashboard focused on where your money
is going. Optionally connects to your real bank via Plaid to pull
transactions in automatically instead of typing each one.

## Features

- **Dashboard** — scoped to one month at a time (defaults to the current
  month, with prev/next arrows to browse others), showing that month's
  total spending, total income, net balance, and a spending-by-category
  breakdown (with a matching income breakdown below it). Nothing is ever
  deleted month to month — it's just a different lens on the same ledger.
  Opens with a few clearly-marked example entries so you can see it in
  action; clear them with one click.
- **Add Transaction** — defaults to Expense, with a category dropdown
  tailored to the type (switch to Income when needed), and a live "auto
  calculator" that previews your new balance before you save.
- **Ledger** — every entry ever recorded, searchable and filterable by
  month, type, or category. Click any category tag to recategorize an
  entry on the spot.
- **Calendar** — a month grid showing each day's spending and income
  totals at a glance; click any day for a full breakdown of everything
  that happened on it.
- **Categories** — see the full list of built-in categories (Salary,
  Freelance, Housing, Groceries, Subscriptions, Savings, and more).
- **Bank Sync** — link a bank via Plaid and pull in real transactions.
  They're auto-categorized by merchant keyword rules and Plaid's own
  categories, and every correction you make is remembered for that
  merchant next time. Requires running the small backend in `server/` —
  see [`server/README.md`](server/README.md) — since Plaid's secret key
  can't live in browser code.

## Usage

The core app (`index.html`, `style.css`, `app.js`) needs no build step or
server — open `index.html` in a browser, or host it as a static site (e.g.
GitHub Pages). Data is saved in your browser's local storage, so it
persists between visits on the same device/browser.

```
open index.html
```

Bank Sync is the one feature that needs something running server-side —
see [`server/README.md`](server/README.md) to set it up (free with Plaid's
Sandbox, using their fake test banks).

## Files

- `index.html` — page structure and views (Dashboard / Add Transaction / Ledger / Categories / Bank Sync / Calendar)
- `style.css` — styling, including light and dark theme tokens
- `app.js` — core app logic: categories, calculations, month-scoped dashboard, local storage persistence
- `bank-sync.js` — Plaid Link flow, transaction import, and merchant categorization
- `calendar.js` — the Calendar view: month grid, daily totals, and the day-detail popup
- `server/` — small Node backend that holds the Plaid secret and talks to Plaid's API (see its own README)
