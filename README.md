# FundTrack

A simple, no-signup spending tracker. Log expenses (and income, for a full
net balance) with category dropdowns, a live auto-calculating preview, and a
clean dashboard focused on where your money is going — all in a single page,
no build step or server required.

## Features

- **Dashboard** — total spending, total income, net balance, and a
  spending-by-category breakdown (with a matching income breakdown below it)
  at a glance.
- **Add Transaction** — defaults to Expense, with a category dropdown
  tailored to the type (switch to Income when needed), and a live "auto
  calculator" that previews your new balance before you save.
- **History** — search and filter every transaction by description, type,
  or category.
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

- `index.html` — page structure and views (Dashboard / Add / History / Categories)
- `style.css` — styling
- `app.js` — app logic, categories, calculations, and local storage persistence
