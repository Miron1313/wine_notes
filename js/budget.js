// 월 예산 · 이월 · 지출 집계
// 지출 = 기록의 "구매 금액(info.spent)". 남은 예산은 다음 달로 이월되고,
// 지출은 가장 오래된 이월금액부터 차감합니다. 예산을 넘긴 금액은 그 달의 초과로만 표시합니다.
import { today } from './util.js';
import { locale } from './i18n.js';

const BUDGET_KEY = 'wine-log:budget-v2';

export const monthOf = (date) => String(date || '').slice(0, 7);
export const thisMonth = () => monthOf(today());
export const spentOf = (r) => Math.max(0, Number(r.info.spent) || 0);

// 2026-09 → "2026년 9월" / "September 2026" / "сентябрь 2026 г."
export function monthLabel(m) {
  const [y, mo] = m.split('-').map(Number);
  return new Intl.DateTimeFormat(locale(), { year: 'numeric', month: 'long' }).format(new Date(y, mo - 1, 1));
}

const nextMonth = (m) => {
  const [y, mo] = m.split('-').map(Number);
  return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}`;
};

// { history: [{ from: 'YYYY-MM', amount }] } — 금액을 바꾸면 그 달부터 적용
export function getBudget() {
  try {
    const saved = JSON.parse(localStorage.getItem(BUDGET_KEY) || 'null');
    if (Array.isArray(saved?.history)) return { history: saved.history.filter((h) => /^\d{4}-\d{2}$/.test(h.from)) };
  } catch { /* 무시 */ }
  return { history: [] };
}

function saveBudget(b) {
  const history = b.history
    .map((h) => ({ from: h.from, amount: Math.max(0, Math.round(Number(h.amount) || 0)) }))
    .sort((a, c) => a.from.localeCompare(c.from));
  try { localStorage.setItem(BUDGET_KEY, JSON.stringify({ history })); } catch { /* 무시 */ }
  return { history };
}

export function setMonthlyBudget(amount, from = thisMonth()) {
  const history = getBudget().history.filter((h) => h.from !== from);
  history.push({ from, amount });
  return saveBudget({ history });
}

// 백업 파일에서 복원
export function restoreBudget(b) {
  if (Array.isArray(b?.history)) saveBudget({ history: b.history.filter((h) => /^\d{4}-\d{2}$/.test(h?.from)) });
}

export function budgetFor(month, b = getBudget()) {
  let amount = 0;
  for (const h of b.history) if (h.from <= month) amount = h.amount;
  return amount;
}

// 예산 시작 월부터 upto까지 한 달씩 계산
// 각 달: lots(이월금액 + 그 달 예산, 오래된 순) → 지출을 오래된 것부터 차감
export function ledger(records, upto = thisMonth(), b = getBudget()) {
  if (!b.history.length) return null;
  const start = b.history[0].from;
  const spentBy = {};
  for (const r of records) {
    const m = monthOf(r.info.date);
    if (m) spentBy[m] = (spentBy[m] || 0) + spentOf(r);
  }
  const months = [];
  let lots = [];
  for (let m = start; m <= upto; m = nextMonth(m)) {
    const budget = budgetFor(m, b);
    if (budget > 0) lots.push({ month: m, amount: budget });
    const rows = lots.map((l) => ({ month: l.month, start: l.amount, used: 0, left: l.amount }));
    let s = spentBy[m] || 0;
    for (const row of rows) {
      const take = Math.min(row.left, s);
      row.used = take; row.left -= take; s -= take;
    }
    lots = rows.filter((row) => row.left > 0).map((row) => ({ month: row.month, amount: row.left }));
    months.push({
      month: m, budget, spent: spentBy[m] || 0, rows, over: s,
      available: rows.reduce((a, row) => a + row.start, 0),
      left: lots.reduce((a, l) => a + l.amount, 0),
    });
  }
  return { start, months };
}

// 지출 합계: 이번 달 / 올해 / 전체, 월별(최근 12개월)
export function spendingSummary(records) {
  const m = thisMonth();
  const y = m.slice(0, 4);
  const paid = records.filter((r) => spentOf(r) > 0);
  const sum = (rs) => rs.reduce((a, r) => a + spentOf(r), 0);
  const inMonth = paid.filter((r) => monthOf(r.info.date) === m);
  const inYear = paid.filter((r) => monthOf(r.info.date).startsWith(`${y}-`));
  const recent = [];
  let cur = m;
  for (let i = 0; i < 12; i++) {
    recent.unshift(cur);
    const [yy, mo] = cur.split('-').map(Number);
    cur = mo === 1 ? `${yy - 1}-12` : `${yy}-${String(mo - 1).padStart(2, '0')}`;
  }
  const monthly = recent.map((mm) => [mm, sum(paid.filter((r) => monthOf(r.info.date) === mm))]);
  return {
    month: { total: sum(inMonth), n: inMonth.length },
    year: { total: sum(inYear), n: inYear.length },
    all: { total: sum(paid), n: paid.length },
    monthly,
  };
}
