// FundTrack bank-sync server
//
// Holds the Plaid secret and makes the calls that require it. The browser
// never sees PLAID_SECRET — it only ever talks to this server, and this
// server is the only thing that talks to Plaid directly.
//
// Storage is a single local JSON file (data/items.json) since this is a
// personal, single-user app. Each linked bank ("item") keeps its Plaid
// access_token and transactions-sync cursor there.

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const { Configuration, PlaidApi, PlaidEnvironments } = require("plaid");

const PORT = process.env.PORT || 4000;
const PLAID_ENV = process.env.PLAID_ENV || "sandbox";
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "*";
const DATA_FILE = path.join(__dirname, "data", "items.json");

if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET) {
  console.error(
    "Missing PLAID_CLIENT_ID / PLAID_SECRET. Copy server/.env.example to server/.env and fill in your Plaid sandbox keys."
  );
  process.exit(1);
}

const plaidClient = new PlaidApi(
  new Configuration({
    basePath: PlaidEnvironments[PLAID_ENV],
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
        "PLAID-SECRET": process.env.PLAID_SECRET,
      },
    },
  })
);

function loadItems() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch {
    return [];
  }
}

function saveItems(items) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2));
}

const app = express();
app.use(cors({ origin: ALLOWED_ORIGIN }));
app.use(express.json());

// 1. Frontend calls this first to get a token for launching Plaid Link.
app.post("/api/create_link_token", async (req, res) => {
  try {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: "fundtrack-local-user" },
      client_name: "FundTrack",
      products: ["transactions"],
      country_codes: ["US"],
      language: "en",
    });
    res.json({ link_token: response.data.link_token });
  } catch (err) {
    console.error(err.response?.data || err);
    res.status(500).json({ error: "Failed to create link token" });
  }
});

// 2. After the user finishes Plaid Link in the browser, it hands back a
//    public_token. Exchange it here for a long-lived access_token, which
//    never leaves this server.
app.post("/api/exchange_public_token", async (req, res) => {
  const { public_token, institution_name } = req.body;
  if (!public_token) return res.status(400).json({ error: "Missing public_token" });

  try {
    const exchange = await plaidClient.itemPublicTokenExchange({ public_token });
    const items = loadItems();
    items.push({
      item_id: exchange.data.item_id,
      access_token: exchange.data.access_token,
      institution_name: institution_name || "Connected bank",
      cursor: null,
      linked_at: new Date().toISOString(),
    });
    saveItems(items);
    res.json({ ok: true, institution_name: institution_name || "Connected bank" });
  } catch (err) {
    console.error(err.response?.data || err);
    res.status(500).json({ error: "Failed to link account" });
  }
});

// 3. List which banks are currently linked (so the frontend can show them
//    without ever seeing an access_token).
app.get("/api/items", (req, res) => {
  const items = loadItems();
  res.json(items.map((i) => ({ item_id: i.item_id, institution_name: i.institution_name, linked_at: i.linked_at })));
});

app.delete("/api/items/:itemId", (req, res) => {
  const items = loadItems().filter((i) => i.item_id !== req.params.itemId);
  saveItems(items);
  res.json({ ok: true });
});

// 4. Pull new transactions since the last sync, across every linked bank.
//    Uses Plaid's /transactions/sync, which is cursor-based: each response
//    carries a `next_cursor` we store and pass in next time so we only ever
//    fetch what's new.
app.get("/api/transactions", async (req, res) => {
  const items = loadItems();
  if (items.length === 0) return res.json({ transactions: [] });

  const allTransactions = [];

  for (const item of items) {
    try {
      let cursor = item.cursor;
      let hasMore = true;

      while (hasMore) {
        const response = await plaidClient.transactionsSync({
          access_token: item.access_token,
          cursor: cursor || undefined,
        });
        const data = response.data;

        for (const t of data.added) {
          allTransactions.push({
            plaid_transaction_id: t.transaction_id,
            institution_name: item.institution_name,
            description: t.merchant_name || t.name,
            amount: Math.abs(t.amount),
            // Plaid's convention: positive amount = money out (expense).
            type: t.amount > 0 ? "expense" : "income",
            date: t.date,
            plaid_category: t.personal_finance_category?.primary || null,
          });
        }

        cursor = data.next_cursor;
        hasMore = data.has_more;
      }

      item.cursor = cursor;
    } catch (err) {
      console.error(`Sync failed for ${item.institution_name}:`, err.response?.data || err);
    }
  }

  saveItems(items);
  res.json({ transactions: allTransactions });
});

app.listen(PORT, () => {
  console.log(`FundTrack server listening on http://localhost:${PORT} (Plaid env: ${PLAID_ENV})`);
});
