// FundTrack — Bank Sync (Plaid)
//
// Talks to the small backend in /server (never directly to Plaid — the
// browser never sees the Plaid secret key). Loaded after app.js, and
// reuses its globals: entries, saveEntries, renderDashboard, renderLedger,
// escapeHtml, formatMoney, CATEGORIES, normalizeDescription, getMerchantMemory.

const SERVER_URL_KEY = "fundtrack.server_url";
const IMPORTED_IDS_KEY = "fundtrack.plaid_imported_ids";

// Keyword rules run before falling back to Plaid's own category, so a
// merchant you'd recognize gets FundTrack's own category names.
const KEYWORD_RULES = [
  { pattern: /uber|lyft|transit|metro|parking/i, category: "Transportation" },
  { pattern: /shell|chevron|exxon|arco|76 |conoco|gas station/i, category: "Gas / Fuel" },
  { pattern: /netflix|spotify|hulu|disney\+|apple\.com\/bill|prime video/i, category: "Subscriptions" },
  { pattern: /trader joe|safeway|kroger|whole foods|grocery|aldi|costco/i, category: "Groceries" },
  { pattern: /starbucks|doordash|grubhub|restaurant|cafe|coffee/i, category: "Dining Out" },
  { pattern: /rent|landlord|property management/i, category: "Housing / Rent" },
  { pattern: /electric|water utility|comcast|internet|pg&e|utility/i, category: "Utilities" },
  { pattern: /cvs|walgreens|pharmacy|doctor|medical|dental/i, category: "Health / Medical" },
  { pattern: /amazon|target|walmart|best buy/i, category: "Shopping" },
  { pattern: /gym|planet fitness|salon|barber/i, category: "Personal Care" },
  { pattern: /airline|hotel|airbnb|delta |united /i, category: "Travel" },
  { pattern: /payroll|salary|direct dep/i, category: "Salary" },
  { pattern: /dividend|interest earned/i, category: "Investment / Dividends" },
];

// Plaid's personal_finance_category.primary values, mapped onto FundTrack's
// own category list, for anything the keyword rules above don't catch.
const PLAID_CATEGORY_MAP = {
  RENT_AND_UTILITIES: "Housing / Rent",
  FOOD_AND_DRINK: "Dining Out",
  GROCERIES: "Groceries",
  TRANSPORTATION: "Transportation",
  TRAVEL: "Travel",
  ENTERTAINMENT: "Entertainment",
  GENERAL_MERCHANDISE: "Shopping",
  MEDICAL: "Health / Medical",
  PERSONAL_CARE: "Personal Care",
  LOAN_PAYMENTS: "Debt Payment",
  GENERAL_SERVICES: "Other Expense",
  GOVERNMENT_AND_NON_PROFIT: "Gifts / Donations",
  BANK_FEES: "Other Expense",
  INCOME: "Other Income",
  TRANSFER_IN: "Other Income",
  TRANSFER_OUT: "Other Expense",
};

function getServerUrl() {
  return (localStorage.getItem(SERVER_URL_KEY) || "").replace(/\/$/, "");
}

function getImportedIds() {
  try {
    return new Set(JSON.parse(localStorage.getItem(IMPORTED_IDS_KEY)) || []);
  } catch {
    return new Set();
  }
}

function saveImportedIds(idSet) {
  localStorage.setItem(IMPORTED_IDS_KEY, JSON.stringify([...idSet]));
}

function categorize(description, type, plaidCategory) {
  const memory = getMerchantMemory();
  const key = normalizeDescription(description);
  if (memory[key]) return memory[key];

  const rule = KEYWORD_RULES.find((r) => r.pattern.test(description));
  if (rule && CATEGORIES[type].includes(rule.category)) return rule.category;

  const mapped = plaidCategory && PLAID_CATEGORY_MAP[plaidCategory];
  if (mapped && CATEGORIES[type].includes(mapped)) return mapped;

  return type === "income" ? "Other Income" : "Other Expense";
}

// ---------- Setup ----------

const serverUrlInput = document.getElementById("serverUrl");
const bankListEl = document.getElementById("bankList");
const connectBankBtn = document.getElementById("connectBankBtn");
const syncBtn = document.getElementById("syncBtn");
const syncStatusEl = document.getElementById("syncStatus");

serverUrlInput.value = getServerUrl();
serverUrlInput.addEventListener("change", () => {
  localStorage.setItem(SERVER_URL_KEY, serverUrlInput.value.trim());
});

function setStatus(message, kind) {
  syncStatusEl.textContent = message;
  syncStatusEl.className = "sync-status" + (kind ? ` ${kind}` : "");
}

async function apiFetch(path, options) {
  const base = getServerUrl();
  if (!base) throw new Error("Set your FundTrack server URL above first.");
  const response = await fetch(base + path, options);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Server error (${response.status})`);
  }
  return response.json();
}

async function renderBankList() {
  if (!getServerUrl()) {
    bankListEl.innerHTML = `<p class="empty-note">Set your server URL above to see linked banks.</p>`;
    return;
  }
  try {
    const items = await apiFetch("/api/items");
    if (items.length === 0) {
      bankListEl.innerHTML = `<p class="empty-note">No banks connected yet.</p>`;
      return;
    }
    bankListEl.innerHTML = items
      .map(
        (i) => `
        <div class="bank-row">
          <div>
            <div class="bank-row-name">${escapeHtml(i.institution_name)}</div>
            <div class="bank-row-meta">Linked ${new Date(i.linked_at).toLocaleDateString()}</div>
          </div>
          <button type="button" class="icon-btn" data-item-id="${i.item_id}" title="Disconnect">
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 5l10 10M15 5L5 15"/></svg>
          </button>
        </div>`
      )
      .join("");

    bankListEl.querySelectorAll(".icon-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await apiFetch(`/api/items/${btn.dataset.itemId}`, { method: "DELETE" });
        renderBankList();
      });
    });
  } catch (err) {
    bankListEl.innerHTML = `<p class="empty-note">Couldn't reach the server: ${escapeHtml(err.message)}</p>`;
  }
}

connectBankBtn.addEventListener("click", async () => {
  setStatus("Creating a secure link...");
  try {
    const { link_token } = await apiFetch("/api/create_link_token", { method: "POST" });

    const handler = Plaid.create({
      token: link_token,
      onSuccess: async (public_token, metadata) => {
        setStatus("Linking account...");
        try {
          const institutionName = metadata.institution ? metadata.institution.name : "Connected bank";
          await apiFetch("/api/exchange_public_token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ public_token, institution_name: institutionName }),
          });
          setStatus(`${institutionName} connected.`, "success");
          renderBankList();
        } catch (err) {
          setStatus(err.message, "error");
        }
      },
      onExit: (err) => {
        if (err) setStatus(err.display_message || "Link closed before finishing.", "error");
      },
    });
    handler.open();
  } catch (err) {
    setStatus(err.message, "error");
  }
});

syncBtn.addEventListener("click", async () => {
  syncBtn.disabled = true;
  setStatus("Syncing transactions...");
  try {
    const { transactions } = await apiFetch("/api/transactions");
    const imported = getImportedIds();
    let added = 0;

    transactions.forEach((t) => {
      if (imported.has(t.plaid_transaction_id)) return;
      imported.add(t.plaid_transaction_id);

      entries.unshift({
        id: "plaid-" + t.plaid_transaction_id,
        type: t.type,
        description: t.description,
        category: categorize(t.description, t.type, t.plaid_category),
        amount: t.amount,
        date: t.date,
        source: t.institution_name,
      });
      added += 1;
    });

    saveImportedIds(imported);
    saveEntries();
    renderDashboard();
    renderLedger();
    setStatus(added > 0 ? `Imported ${added} new transaction${added === 1 ? "" : "s"}.` : "Already up to date.", "success");
  } catch (err) {
    setStatus(err.message, "error");
  } finally {
    syncBtn.disabled = false;
  }
});

document.querySelector('.rail-btn[data-view="bank"]').addEventListener("click", renderBankList);
