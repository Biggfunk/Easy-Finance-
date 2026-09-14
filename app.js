// FundTrack — Personal Finance Tracker
// All data is stored locally in the browser (localStorage). No server, no signup.

const STORAGE_KEY = "fundtrack.entries.v1";

const CATEGORIES = {
  expense: [
    "Housing / Rent",
    "Utilities",
    "Groceries",
    "Dining Out",
    "Transportation",
    "Gas / Fuel",
    "Insurance",
    "Health / Medical",
    "Debt Payment",
    "Subscriptions",
    "Entertainment",
    "Shopping",
    "Education",
    "Savings / Investing",
    "Travel",
    "Personal Care",
    "Gifts / Donations",
    "Other Expense",
  ],
  income: [
    "Salary",
    "Freelance / Contract",
    "Business Income",
    "Investment / Dividends",
    "Rental Income",
    "Gift",
    "Refund",
    "Other Income",
  ],
};

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const EXAMPLE_SEED = [
  { type: "income", description: "Paycheck", category: "Salary", amount: 3200, date: daysAgo(2) },
  { type: "expense", description: "Rent", category: "Housing / Rent", amount: 1450, date: daysAgo(4) },
  { type: "expense", description: "Trader Joe's run", category: "Groceries", amount: 86.40, date: daysAgo(3) },
  { type: "income", description: "Logo design gig", category: "Freelance / Contract", amount: 450, date: daysAgo(6) },
  { type: "expense", description: "Netflix", category: "Subscriptions", amount: 15.49, date: daysAgo(5) },
  { type: "expense", description: "Gas station", category: "Gas / Fuel", amount: 42.10, date: daysAgo(1) },
  { type: "expense", description: "Coffee with Sam", category: "Dining Out", amount: 8.75, date: daysAgo(1) },
  { type: "income", description: "Dividend payout", category: "Investment / Dividends", amount: 32.18, date: daysAgo(7) },
].map((t, i) => ({ id: `ex${i}`, example: true, ...t }));

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return EXAMPLE_SEED.slice();
    return JSON.parse(raw);
  } catch {
    return EXAMPLE_SEED.slice();
  }
}

function saveEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

let entries = loadEntries();
let currentType = "expense";

function formatMoney(n) {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function getTotals() {
  let income = 0;
  let expense = 0;
  for (const t of entries) {
    if (t.type === "income") income += t.amount;
    else expense += t.amount;
  }
  return { income, expense, balance: income - expense };
}

function hasExamples() {
  return entries.some((t) => t.example);
}

// ---------- Merchant category memory ----------
// Shared with bank-sync.js: once you recategorize an entry, the same
// description auto-categorizes correctly next time it's imported.

const MERCHANT_MEMORY_KEY = "fundtrack.merchant_memory";

function normalizeDescription(str) {
  return str.trim().toLowerCase().replace(/\s+/g, " ");
}

function getMerchantMemory() {
  try {
    return JSON.parse(localStorage.getItem(MERCHANT_MEMORY_KEY)) || {};
  } catch {
    return {};
  }
}

function rememberMerchantCategory(description, category) {
  const memory = getMerchantMemory();
  memory[normalizeDescription(description)] = category;
  localStorage.setItem(MERCHANT_MEMORY_KEY, JSON.stringify(memory));
}

// ---------- Navigation ----------

const railButtons = document.querySelectorAll(".rail-btn");
const views = document.querySelectorAll(".view");

railButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    railButtons.forEach((b) => b.classList.remove("active"));
    views.forEach((v) => v.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`view-${btn.dataset.view}`).classList.add("active");
    if (btn.dataset.view === "ledger") renderLedger();
    if (btn.dataset.view === "add") updateAutoCalc();
  });
});

// ---------- Add Transaction form ----------

const segButtons = document.querySelectorAll(".seg-btn");
const categorySelect = document.getElementById("fCategory");
const amountInput = document.getElementById("fAmount");
const dateInput = document.getElementById("fDate");
const form = document.getElementById("txForm");

function populateCategoryDropdown(type) {
  categorySelect.innerHTML = "";
  CATEGORIES[type].forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    categorySelect.appendChild(opt);
  });
}

segButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    segButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentType = btn.dataset.type;
    populateCategoryDropdown(currentType);
    updateAutoCalc();
  });
});

amountInput.addEventListener("input", updateAutoCalc);

function updateAutoCalc() {
  const { balance } = getTotals();
  const amount = parseFloat(amountInput.value) || 0;
  const delta = currentType === "income" ? amount : -amount;

  document.getElementById("calcCurrent").textContent = formatMoney(balance);
  document.getElementById("calcLabel").textContent =
    currentType === "income" ? "This income" : "This expense";
  const deltaEl = document.getElementById("calcDelta");
  deltaEl.textContent = `${delta >= 0 ? "+" : "-"}${formatMoney(Math.abs(delta))}`;
  deltaEl.style.color = delta >= 0 ? "var(--positive)" : "var(--negative)";
  document.getElementById("calcNew").textContent = formatMoney(balance + delta);
}

dateInput.valueAsDate = new Date();

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const description = document.getElementById("fDescription").value.trim();
  const category = categorySelect.value;
  const amount = parseFloat(amountInput.value);
  const date = dateInput.value;

  if (!description || !category || !amount || amount <= 0 || !date) return;

  entries.unshift({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    type: currentType,
    description,
    category,
    amount,
    date,
  });

  saveEntries();
  form.reset();
  dateInput.valueAsDate = new Date();
  updateAutoCalc();
  renderDashboard();

  // Jump back to dashboard so the user sees the result immediately.
  document.querySelector('.rail-btn[data-view="dashboard"]').click();
});

// ---------- Dashboard ----------

function renderExampleBanner() {
  const el = document.getElementById("exampleBanner");
  if (!hasExamples()) {
    el.innerHTML = "";
    return;
  }
  el.innerHTML = `
    <div class="example-banner">
      <span>These entries are examples so you can see FundTrack in action.</span>
      <button type="button" id="clearExamplesBtn">Clear examples</button>
    </div>`;
  document.getElementById("clearExamplesBtn").addEventListener("click", () => {
    entries = entries.filter((t) => !t.example);
    saveEntries();
    renderDashboard();
    renderLedger();
  });
}

function renderDashboard() {
  const { income, expense, balance } = getTotals();
  document.getElementById("totalExpense").textContent = formatMoney(expense);
  document.getElementById("totalIncome").textContent = formatMoney(income);
  const balanceEl = document.getElementById("netBalance");
  balanceEl.textContent = formatMoney(balance);
  balanceEl.style.color = balance >= 0 ? "var(--ink)" : "var(--negative)";

  renderExampleBanner();
  renderBreakdown("expense", document.getElementById("expenseBreakdown"), "No spending logged yet.");
  renderBreakdown("income", document.getElementById("incomeBreakdown"), "No income logged yet.");
  renderEntryList(document.getElementById("recentEntries"), entries.slice(0, 6), "Nothing here yet.");
}

function renderBreakdown(type, container, emptyMessage) {
  const relevant = entries.filter((t) => t.type === type);
  if (relevant.length === 0) {
    container.innerHTML = `<p class="empty-note">${emptyMessage}</p>`;
    return;
  }

  const sums = {};
  for (const t of relevant) {
    sums[t.category] = (sums[t.category] || 0) + t.amount;
  }

  const total = getTotals()[type === "income" ? "income" : "expense"];

  const rows = Object.entries(sums)
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount]) => {
      const pct = total > 0 ? Math.round((amount / total) * 100) : 0;
      return `
        <div class="cat-row">
          <div class="cat-row-top">
            <span class="cat-row-name">${escapeHtml(category)}</span>
            <span class="cat-row-amount tnum">${formatMoney(amount)} &middot; ${pct}%</span>
          </div>
          <div class="track">
            <div class="fill ${type}" style="width:${pct}%"></div>
          </div>
        </div>`;
    })
    .join("");

  container.innerHTML = rows;
}

function renderEntryList(container, list, emptyMessage) {
  if (list.length === 0) {
    container.innerHTML = `<p class="empty-note">${emptyMessage}</p>`;
    return;
  }
  container.innerHTML = list
    .map(
      (t) => `
      <div class="entry">
        <div class="entry-main">
          <span class="entry-desc">${escapeHtml(t.description)}</span>
          <span class="entry-meta">
            <span class="chip ${t.type} editable" data-id="${t.id}" title="Click to recategorize">${escapeHtml(t.category)}</span>
            ${t.example ? '<span class="chip example">example</span>' : ""}
            ${t.source ? `<span class="chip example">${escapeHtml(t.source)}</span>` : ""}
            <span class="entry-date">${t.date}</span>
          </span>
        </div>
        <div class="entry-right">
          <span class="entry-amount tnum ${t.type}">${t.type === "income" ? "+" : "-"}${formatMoney(t.amount)}</span>
          <button type="button" class="icon-btn" data-id="${t.id}" title="Delete">
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 5l10 10M15 5L5 15"/></svg>
          </button>
        </div>
      </div>`
    )
    .join("");

  container.querySelectorAll(".icon-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      entries = entries.filter((t) => t.id !== btn.dataset.id);
      saveEntries();
      renderDashboard();
      renderLedger();
    });
  });

  container.querySelectorAll(".chip.editable").forEach((chip) => {
    chip.addEventListener("click", () => {
      const entry = entries.find((t) => t.id === chip.dataset.id);
      if (!entry) return;

      const select = document.createElement("select");
      select.className = "chip-select";
      CATEGORIES[entry.type].forEach((cat) => {
        const opt = document.createElement("option");
        opt.value = cat;
        opt.textContent = cat;
        if (cat === entry.category) opt.selected = true;
        select.appendChild(opt);
      });

      select.addEventListener("change", () => {
        entry.category = select.value;
        rememberMerchantCategory(entry.description, select.value);
        saveEntries();
        renderDashboard();
        renderLedger();
      });
      // No change made: re-render on blur just to restore the chip.
      select.addEventListener("blur", () => {
        renderDashboard();
        renderLedger();
      });

      chip.replaceWith(select);
      select.focus();
    });
  });
}

// ---------- Ledger (history) ----------

const searchInput = document.getElementById("searchInput");
const filterType = document.getElementById("filterType");
const filterCategory = document.getElementById("filterCategory");

function populateFilterCategories() {
  const all = [...new Set(entries.map((t) => t.category))].sort();
  filterCategory.innerHTML =
    `<option value="all">All categories</option>` +
    all.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
}

function renderLedger() {
  populateFilterCategories();
  applyFilters();
}

function applyFilters() {
  const q = searchInput.value.toLowerCase();
  const type = filterType.value;
  const cat = filterCategory.value;

  const filtered = entries.filter((t) => {
    const matchesQuery = t.description.toLowerCase().includes(q);
    const matchesType = type === "all" || t.type === type;
    const matchesCat = cat === "all" || t.category === cat;
    return matchesQuery && matchesType && matchesCat;
  });

  renderEntryList(document.getElementById("fullEntries"), filtered, "No entries match.");
}

[searchInput, filterType, filterCategory].forEach((el) =>
  el.addEventListener("input", applyFilters)
);

// ---------- Categories view ----------

function renderCategoriesView() {
  document.getElementById("expenseCatList").innerHTML = CATEGORIES.expense
    .map((c) => `<li>${escapeHtml(c)}</li>`)
    .join("");
  document.getElementById("incomeCatList").innerHTML = CATEGORIES.income
    .map((c) => `<li>${escapeHtml(c)}</li>`)
    .join("");
}

// ---------- Init ----------

populateCategoryDropdown(currentType);
renderDashboard();
renderCategoriesView();
updateAutoCalc();
