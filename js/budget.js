// 월 예산 기준과 이번 달 지출 판정
const BUDGET_KEY = 'wine-log:budget';
export const DEFAULT_BUDGET = { limit: 30000, excLimit: 50000, excCount: 1 };

export function getBudget() {
  try {
    const saved = JSON.parse(localStorage.getItem(BUDGET_KEY) || 'null');
    return { ...DEFAULT_BUDGET, ...(saved || {}) };
  } catch { return { ...DEFAULT_BUDGET }; }
}

export function setBudget(b) {
  const clean = {
    limit: Math.max(0, Number(b.limit) || 0),
    excLimit: Math.max(0, Number(b.excLimit) || 0),
    excCount: Math.max(0, Math.floor(Number(b.excCount) || 0)),
  };
  try { localStorage.setItem(BUDGET_KEY, JSON.stringify(clean)); } catch { /* 무시 */ }
  return clean;
}

export const monthOf = (date) => String(date || '').slice(0, 7);

// 한 달 기록을 날짜순으로 보고 병마다 ok / exception / over 판정
// 병당 한도 이하 → ok, 예외 한도 이하 → 남은 예외 횟수가 있으면 exception, 그 외 → over
export function classifyMonth(records, month, budget = getBudget()) {
  const rows = records
    .filter((r) => monthOf(r.info.date) === month && Number(r.info.price) > 0)
    .sort((a, b) => (a.info.date || '').localeCompare(b.info.date || '') || (a.createdAt || 0) - (b.createdAt || 0));
  const status = {};
  let used = 0;
  let total = 0;
  for (const r of rows) {
    const p = Number(r.info.price);
    total += p;
    if (p <= budget.limit) status[r.id] = 'ok';
    else if (p <= budget.excLimit && used < budget.excCount) { status[r.id] = 'exception'; used++; } else status[r.id] = 'over';
  }
  const count = (s) => Object.values(status).filter((v) => v === s).length;
  return { rows, status, used, total, ok: count('ok'), over: count('over'), budget };
}
