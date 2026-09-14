// FundTrack — Calendar
// Loaded after app.js; reuses its globals (entries, formatMoney, escapeHtml,
// renderEntryList, monthLabel, getTotals).

const calToday = new Date();
let calYear = calToday.getFullYear();
let calMonth = calToday.getMonth();

const calGrid = document.getElementById("calGrid");
const calMonthLabelEl = document.getElementById("calMonthLabel");

document.getElementById("calPrevMonth").addEventListener("click", () => {
  calMonth -= 1;
  if (calMonth < 0) { calMonth = 11; calYear -= 1; }
  renderCalendar();
});
document.getElementById("calNextMonth").addEventListener("click", () => {
  calMonth += 1;
  if (calMonth > 11) { calMonth = 0; calYear += 1; }
  renderCalendar();
});

function isoDate(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function renderCalendar() {
  calMonthLabelEl.textContent = monthLabel(calYear, calMonth);

  const firstWeekday = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const todayIso = isoDate(calToday.getFullYear(), calToday.getMonth(), calToday.getDate());

  // Per-day totals for this month only — cheap enough to recompute on every render.
  const dayTotals = {};
  entries.forEach((t) => {
    if (t.date.slice(0, 7) !== `${calYear}-${String(calMonth + 1).padStart(2, "0")}`) return;
    const day = Number(t.date.slice(8, 10));
    dayTotals[day] = dayTotals[day] || { income: 0, expense: 0 };
    dayTotals[day][t.type] += t.amount;
  });

  let cells = "";
  for (let i = 0; i < firstWeekday; i++) {
    cells += `<div class="cal-cell empty"></div>`;
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const totals = dayTotals[day];
    const iso = isoDate(calYear, calMonth, day);
    const isToday = iso === todayIso;
    cells += `
      <button type="button" class="cal-cell${totals ? " has-data" : ""}${isToday ? " today" : ""}" data-date="${iso}">
        <span class="cal-day-num">${day}</span>
        ${totals && totals.expense > 0 ? `<span class="cal-amount expense tnum">-${formatMoney(totals.expense)}</span>` : ""}
        ${totals && totals.income > 0 ? `<span class="cal-amount income tnum">+${formatMoney(totals.income)}</span>` : ""}
      </button>`;
  }

  calGrid.innerHTML = cells;
  calGrid.querySelectorAll(".cal-cell:not(.empty)").forEach((cell) => {
    cell.addEventListener("click", () => openDayModal(cell.dataset.date));
  });
}

// ---------- Day detail modal ----------

const dayModal = document.getElementById("dayModal");
const dayModalTitle = document.getElementById("dayModalTitle");
const dayModalSummary = document.getElementById("dayModalSummary");

function openDayModal(iso) {
  const dayEntries = entries.filter((t) => t.date === iso);
  const [y, m, d] = iso.split("-").map(Number);
  dayModalTitle.textContent = new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const { income, expense } = getTotals(dayEntries);
  dayModalSummary.innerHTML = `
    <div class="ledger-row"><span>Spent</span><span class="v" style="color:var(--negative)">${formatMoney(expense)}</span></div>
    <div class="ledger-row"><span>Earned</span><span class="v" style="color:var(--positive)">${formatMoney(income)}</span></div>
    <div class="ledger-row total"><span>Net</span><span class="v">${formatMoney(income - expense)}</span></div>`;

  renderEntryList(document.getElementById("dayModalEntries"), dayEntries, "No transactions this day.");

  dayModal.hidden = false;
}

function closeDayModal() {
  dayModal.hidden = true;
}

document.getElementById("dayModalClose").addEventListener("click", closeDayModal);
dayModal.addEventListener("click", (e) => {
  if (e.target === dayModal) closeDayModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !dayModal.hidden) closeDayModal();
});
