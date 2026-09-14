# FundTrack

A simple, no-signup spending tracker with a ledger-book identity: red for
debits, green for credits, tabular figures throughout. Log expenses (and
income, for a full net balance) with category dropdowns, a live
auto-calculating preview, and a clean dashboard focused on where your money
is going — all in a single page, no build step or server required.

## Features

- **Dashboard** — total spending, total income, net balance, and a
  spending-by-category breakdown (with a matching income breakdown below it)
  at a glance. Opens with a few clearly-marked example entries so you can
  see it in action; clear them with one click.
- **Add Transaction** — defaults to Expense, with a category dropdown
  tailored to the type (switch to Income when needed), and a live "auto
  calculator" that previews your new balance before you save.
- **Ledger** — search and filter every entry by description, type, or
  category.
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

- `index.html` — page structure and views (Dashboard / Add Transaction / Ledger / Categories)
- `style.css` — styling, including light and dark theme tokens
- `app.js` — app logic, categories, calculations, and local storage persistence
