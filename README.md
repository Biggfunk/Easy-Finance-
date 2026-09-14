# FundTrack

A simple, no-signup spending tracker with a ledger-book identity: red for
debits, green for credits, tabular figures throughout. Log expenses (and
income, for a full net balance) with category dropdowns, a live
auto-calculating preview, and a clean dashboard focused on where your money
is going — all in a single page, no build step or server required.

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
  month, type, or category.
- **Calendar** — a month grid showing each day's spending and income
  totals at a glance; click any day for a full breakdown of everything
  that happened on it.
- **Categories** — see the full list of built-in categories (Salary,
  Freelance, Housing, Groceries, Subscriptions, Savings, and more).

## Usage

Just open `index.html` in a browser — no installation needed. Data is saved
in your browser's local storage, so it persists between visits on the same
device/browser.

```
open index.html
```

## Files

- `index.html` — page structure and views (Dashboard / Add Transaction / Ledger / Categories / Calendar)
- `style.css` — styling, including light and dark theme tokens
- `app.js` — core app logic: categories, calculations, month-scoped dashboard, local storage persistence
- `calendar.js` — the Calendar view: month grid, daily totals, and the day-detail popup
