// FundTrack — Personal Finance Tracker
// All data is stored locally in the browser (localStorage). No server, no signup.

const STORAGE_KEY = "fundtrack.transactions";

const CATEGORIES = {
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
};

let transactions = loadTransactions();
let currentType = "expense";

function loadTransactions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function formatMoney(n) {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}

function getTotals() {
  let income = 0;
  let expense = 0;
  for (const t of transactions) {
    if (t.type === "income") income += t.amount;
    else expense += t.amount;
  }
  return { income, expense, balance: income - expense };
}

// ---------- Navigation ----------

const navButtons = document.querySelectorAll(".nav-btn");
const views = document.querySelectorAll(".view");

navButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    navButtons.forEach((b) => b.classList.remove("active"));
    views.forEach((v) => v.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`view-${btn.dataset.view}`).classList.add("active");
    if (btn.dataset.view === "history") renderHistory();
    if (btn.dataset.view === "add") updateAutoCalc();
  });
});

// ---------- Add Transaction form ----------

const typeButtons = document.querySelectorAll(".type-btn");
const categorySelect = document.getElementById("category");
const amountInput = document.getElementById("amount");
const dateInput = document.getElementById("date");
const form = document.getElementById("transactionForm");

function populateCategoryDropdown(type) {
  categorySelect.innerHTML = "";
  CATEGORIES[type].forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    categorySelect.appendChild(opt);
  });
}

typeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    typeButtons.forEach((b) => b.classList.remove("active"));
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
  const newBalance = balance + delta;

  document.getElementById("calcCurrent").textContent = formatMoney(balance);
  document.getElementById("calcLabel").textContent =
    currentType === "income" ? "This income" : "This expense";
  const deltaEl = document.getElementById("calcDelta");
  deltaEl.textContent = `${delta >= 0 ? "+" : "-"}${formatMoney(Math.abs(delta))}`;
  deltaEl.style.color = delta >= 0 ? "var(--income)" : "var(--expense)";
  document.getElementById("calcNew").textContent = formatMoney(newBalance);
}

dateInput.valueAsDate = new Date();

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const description = document.getElementById("description").value.trim();
  const category = categorySelect.value;
  const amount = parseFloat(amountInput.value);
  const date = dateInput.value;

  if (!description || !category || !amount || amount <= 0 || !date) return;

  transactions.unshift({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    type: currentType,
    description,
    category,
    amount,
    date,
  });

  saveTransactions();
  form.reset();
  dateInput.valueAsDate = new Date();
  updateAutoCalc();
  renderDashboard();

  // Jump back to dashboard so the user sees the result immediately.
  document.querySelector('.nav-btn[data-view="dashboard"]').click();
});

// ---------- Dashboard ----------

function renderDashboard() {
  const { income, expense, balance } = getTotals();
  document.getElementById("totalIncome").textContent = formatMoney(income);
  document.getElementById("totalExpense").textContent = formatMoney(expense);
  const balanceEl = document.getElementById("netBalance");
  balanceEl.textContent = formatMoney(balance);
  balanceEl.style.color = balance >= 0 ? "var(--primary)" : "var(--expense)";

  renderCategoryBreakdown();
  renderTransactionList(document.getElementById("recentList"), transactions.slice(0, 6));
}

function renderCategoryBreakdown() {
  renderBreakdownFor("expense", document.getElementById("categoryBreakdown"), "No spending logged yet. Add an expense to see your breakdown.");
  renderBreakdownFor("income", document.getElementById("incomeBreakdown"), "No income logged yet.");
}

function renderBreakdownFor(type, container, emptyMessage) {
  const relevant = transactions.filter((t) => t.type === type);
  if (relevant.length === 0) {
    container.innerHTML = `<p class="empty-state">${emptyMessage}</p>`;
    return;
  }

  const sums = {};
  for (const t of relevant) {
    sums[t.category] = (sums[t.category] || 0) + t.amount;
  }

  const { income, expense } = getTotals();
  const total = type === "income" ? income : expense;

  const rows = Object.entries(sums)
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount]) => {
      const pct = total > 0 ? Math.round((amount / total) * 100) : 0;
      return `
        <div class="cat-row">
          <div class="cat-row-top">
            <span class="cat-row-name">${escapeHtml(category)}</span>
            <span class="cat-row-amount">${formatMoney(amount)} (${pct}%)</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill ${type}" style="width:${pct}%"></div>
          </div>
        </div>`;
    })
    .join("");

  container.innerHTML = rows;
}

function renderTransactionList(container, list) {
  if (list.length === 0) {
    container.innerHTML = `<p class="empty-state">Nothing here yet.</p>`;
    return;
  }
  container.innerHTML = list
    .map(
      (t) => `
      <div class="tx-item">
        <div class="tx-main">
          <span class="tx-desc">${escapeHtml(t.description)}</span>
          <span class="tx-meta"><span class="tx-tag ${t.type}">${escapeHtml(t.category)}</span>${t.date}</span>
        </div>
        <div class="tx-right">
          <span class="tx-amount ${t.type}">${t.type === "income" ? "+" : "-"}${formatMoney(t.amount)}</span>
          <button class="delete-btn" data-id="${t.id}" title="Delete">✕</button>
        </div>
      </div>`
    )
    .join("");

  container.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      transactions = transactions.filter((t) => t.id !== btn.dataset.id);
      saveTransactions();
      renderDashboard();
      renderHistory();
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---------- History ----------

const searchInput = document.getElementById("searchInput");
const filterType = document.getElementById("filterType");
const filterCategory = document.getElementById("filterCategory");

function populateFilterCategories() {
  const all = [...new Set(transactions.map((t) => t.category))].sort();
  filterCategory.innerHTML =
    `<option value="all">All Categories</option>` +
    all.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
}

function renderHistory() {
  populateFilterCategories();
  applyFilters();
}

function applyFilters() {
  const q = searchInput.value.toLowerCase();
  const type = filterType.value;
  const cat = filterCategory.value;

  const filtered = transactions.filter((t) => {
    const matchesQuery = t.description.toLowerCase().includes(q);
    const matchesType = type === "all" || t.type === type;
    const matchesCat = cat === "all" || t.category === cat;
    return matchesQuery && matchesType && matchesCat;
  });

  renderTransactionList(document.getElementById("fullList"), filtered);
}

[searchInput, filterType, filterCategory].forEach((el) =>
  el.addEventListener("input", applyFilters)
);

// ---------- Categories view ----------

function renderCategoriesView() {
  document.getElementById("incomeCategoryList").innerHTML = CATEGORIES.income
    .map((c) => `<li>${escapeHtml(c)}</li>`)
    .join("");
  document.getElementById("expenseCategoryList").innerHTML = CATEGORIES.expense
    .map((c) => `<li>${escapeHtml(c)}</li>`)
    .join("");
}

// ---------- Init ----------

populateCategoryDropdown(currentType);
renderDashboard();
renderCategoriesView();
updateAutoCalc();
