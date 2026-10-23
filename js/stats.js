// 통계와 나란히 비교
import { SAT, SCALE_INDEX, COLOR_KEYS } from '../data/wset-l2-sat.js';
import { db } from './db.js';
import { normalize, isHidden, BLIND_KEYS, blindKeyLabel, blindScore, title, colorLabel } from './model.js';
import { t, hint } from './i18n.js';
import { esc, toast, today } from './util.js';
import { computeProgress, grapeName, subLabel } from './progress.js';
import { ledger, spendingSummary, monthLabel, thisMonth } from './budget.js';
import { nextBottlesHTML } from './study.js';
import { exportMarkdown } from './backup.js';
import { formatKRW } from './money.js';

const subChips = (subs) => (subs.length ? `<span class="subs">${subs.map((x) => `
  <span class="sub${x.done ? ' done' : ''}">${x.done ? '✓ ' : ''}${esc(subLabel(x.key))}</span>`).join('')}</span>` : '');

// 🎓 8대 품종 + 스타일 진도 (기록에서 자동 집계)
function progressCard(all) {
  const p = computeProgress(all);
  const row = (done, label, n, subs, href) => `<li class="${done ? 'done' : ''}">
    <span class="check">${done ? '✓' : ''}</span>
    <span class="pl">${href ? `<a href="${href}">${esc(label)}</a>` : esc(label)}${n ? ` <small class="muted">×${n}</small>` : ''}${subChips(subs)}</span></li>`;
  return `<section class="card" id="progress"><h2>${esc(t('progress.title'))}</h2>
    ${bar(esc(t('progress.core')), p.done, p.total, `${p.done}/${p.total}`)}
    <h3>${esc(t('md.grapes'))}</h3>
    <ul class="progress">${p.grapes.map((g) => row(g.done, grapeName(g.grape), g.count, g.subs,
      g.done ? `#/compare?grape=${encodeURIComponent(g.grape.key)}` : '')).join('')}</ul>
    <h3>${esc(t('md.styles'))}</h3>
    <ul class="progress">${p.styles.map((x) => row(x.done, t(`style.${x.style}`), x.count, x.subs)).join('')}</ul>
    <h3>${esc(t('progress.regional'))}</h3>
    ${p.regional.length ? `<div class="chips">${p.regional.map(([n, c]) => `<span class="chip small on">${esc(n)}${c > 1 ? ` ×${c}` : ''}</span>`).join('')}</div>`
      : `<p class="muted small">${esc(t('stats.none'))}</p>`}
    <p class="muted small">${esc(t('progress.hint'))}</p>
    <div class="row wrap"><button class="btn" id="md-export">${esc(t('md.export'))}</button>
      <a class="btn ghost" href="#/glossary">${esc(t('glossary.open'))}</a></div>
  </section>`;
}

// 💰 예산 (이월금액 포함)과 지출 합계
function budgetCard(all) {
  const m = thisMonth();
  const lg = ledger(all, m);
  const e = lg?.months.at(-1);
  const sp = spendingSummary(all);
  const rowLabel = (row) => t(row.month === m ? 'budget.monthBudget' : 'budget.carry', monthLabel(row.month));
  const mMax = Math.max(1, ...sp.monthly.map(([, v]) => v));
  const kpi = (x, label) => `<div class="kpi"><b>${esc(formatKRW(x.total, { compact: true, zero: true }))}</b><span>${esc(label)}</span>
    <small class="muted">${esc(t('spend.count', x.n))}</small></div>`;

  return `<section class="card" id="budget"><h2>${esc(t('budget.title'))}</h2>
    ${e ? `
      <div class="left ${e.over ? 'ng' : ''}">
        <span>${esc(t('budget.left', monthLabel(m)))}</span>
        <b>${esc(e.over ? t('budget.overBy', formatKRW(e.over)) : formatKRW(e.left, { zero: true }))}</b>
      </div>
      ${bar(esc(t('budget.usedOf')), Math.min(e.spent, e.available), e.available, `${formatKRW(e.spent, { zero: true })} / ${formatKRW(e.available, { zero: true })}`)}
      ${e.rows.length ? `<div class="table-wrap"><table class="grid lots">
        <thead><tr><th>${esc(t('budget.colItem'))}</th><th>${esc(t('budget.colStart'))}</th><th>${esc(t('budget.colUsed'))}</th><th>${esc(t('budget.colLeft'))}</th></tr></thead>
        <tbody>${e.rows.map((row) => `<tr><td>${esc(rowLabel(row))}</td><td>${esc(formatKRW(row.start))}</td>
          <td>${row.used ? `−${esc(formatKRW(row.used))}` : '·'}</td><td><b>${esc(formatKRW(row.left, { zero: true }))}</b></td></tr>`).join('')}</tbody>
      </table></div>` : ''}
      <p class="muted small">${esc(t('budget.order'))}</p>`
      : `<p class="muted small">${esc(t('budget.noBudget'))} <a href="#/settings">${esc(t('budget.set'))}</a></p>`}

    <h3>${esc(t('spend.title'))}</h3>
    <div class="kpis">${kpi(sp.month, t('spend.month'))}${kpi(sp.year, t('spend.year'))}${kpi(sp.all, t('spend.all'))}</div>
    ${sp.all.n ? `<p class="muted small">${esc(t('spend.avg', formatKRW(Math.round(sp.all.total / sp.all.n))))}</p>
      <h3>${esc(t('spend.monthly'))}</h3>
      ${sp.monthly.filter(([, v], idx) => v || idx >= 6).map(([mm, v]) => bar(esc(mm), v, mMax, esc(formatKRW(v, { compact: true }) || '·'))).join('')}`
      : `<p class="muted small">${esc(t('spend.none'))}</p>`}
  </section>`;
}

const bar = (label, value, max, text) => `
  <div class="bar-row"><div class="bar-label">${label}</div>
    <div class="bar"><span style="width:${max ? Math.round((value / max) * 100) : 0}%"></span></div>
    <div class="bar-val">${text ?? value}</div></div>`;

const STRUCT = [['sweetness', 'Sweet', 4], ['acidity', 'Acid', 3], ['tannin', 'Tannin', 3], ['alcohol', 'Alc', 3], ['body', 'Body', 3]];

const withHint = (label, h) => `${esc(label)}${h ? ` <span class="ko">${esc(h)}</span>` : ''}`;

export async function renderStats(root) {
  const all = (await db.all()).map(normalize);
  if (!all.length) {
    root.innerHTML = `<h1>${esc(t('stats.title'))}</h1><p class="empty">${esc(t('stats.empty'))}</p>`;
    return;
  }
  const open = all.filter((r) => !isHidden(r));
  const blinds = all.filter((r) => r.blind.enabled && r.blind.revealed);

  // 색상 분포
  const byColor = COLOR_KEYS.map((c) => [c, all.filter((r) => r.info.color === c).length]);

  // 블라인드 항목별 적중률
  const acc = BLIND_KEYS.map((k) => {
    const vals = blinds.map((r) => r.blind.result?.[k]).filter((v) => v === true || v === false);
    return [blindKeyLabel(k), vals.filter(Boolean).length, vals.length];
  });
  const recent = blinds.slice().sort((a, b) => (a.info.date || '').localeCompare(b.info.date || '')).slice(-12);

  // 품종별 구조감 평균 (첫 번째 품종 기준)
  const groups = {};
  for (const r of open) {
    const g = r.info.grapes[0];
    if (!g) continue;
    (groups[g] ||= []).push(r);
  }
  const grapeRows = Object.entries(groups).sort((a, b) => b[1].length - a[1].length).slice(0, 12).map(([g, rs]) => {
    const avg = STRUCT.map(([k]) => {
      const vals = rs.map((r) => SCALE_INDEX('palate', k, r.sat.palate[k])).filter(Boolean);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    });
    return { g, n: rs.length, avg };
  });

  // 자주 쓴 아로마/풍미
  const counts = {};
  for (const r of all) for (const term of new Set([...r.sat.nose.aromas, ...r.sat.palate.flavours])) counts[term] = (counts[term] || 0) + 1;
  const topAromas = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 15);

  // 품질 분포
  const qScale = SAT.conclusion.fields.quality.scale;
  const qCounts = qScale.map((item) => [item, all.filter((r) => r.sat.conclusion.quality === item[0]).length]);
  const qMax = Math.max(1, ...qCounts.map((q) => q[1]));

  root.innerHTML = `
    <h1>${esc(t('stats.title'))}</h1>
    <div class="kpis">
      <div class="kpi"><b>${all.length}</b><span>${esc(t('kpi.total'))}</span></div>
      <div class="kpi"><b>${blinds.length}</b><span>${esc(t('kpi.blind'))}</span></div>
      <div class="kpi"><b>${Object.keys(groups).length}</b><span>${esc(t('kpi.grapes'))}</span></div>
    </div>

    ${progressCard(all)}
    ${nextBottlesHTML(all)}
    ${budgetCard(all)}

    <section class="card"><h2>${esc(t('stats.colour'))}</h2>
      ${byColor.map(([c, n]) => bar(esc(colorLabel(c)), n, all.length)).join('')}</section>

    <section class="card"><h2>${esc(t('stats.blindAcc'))}</h2>
      ${blinds.length ? acc.map(([label, ok, n]) => bar(esc(label), ok, n, n ? `${Math.round((ok / n) * 100)}% (${ok}/${n})` : '—')).join('')
        + `<h3>${esc(t('stats.recentBlind'))}</h3><div class="trend">${recent.map((r) => {
          const { correct, total } = blindScore(r);
          const pct = total ? correct / total : 0;
          return `<a href="#/view/${r.id}" class="trend-col" title="${esc(title(r))}">
            <span style="height:${Math.max(6, pct * 100)}%"></span><small>${correct}/${total}</small></a>`;
        }).join('')}</div>`
        : `<p class="muted">${esc(t('stats.noBlind'))}</p>`}
    </section>

    <section class="card"><h2>${esc(t('stats.structure'))}</h2>
      ${grapeRows.length ? `<p class="muted small">${esc(t('stats.structureHint'))}</p>
      <div class="table-wrap"><table class="grid">
        <thead><tr><th>${esc(t('bk.grape'))}</th><th>n</th>${STRUCT.map(([, l]) => `<th>${l}</th>`).join('')}</tr></thead>
        <tbody>${grapeRows.map(({ g, n, avg }) => `<tr><td><a href="#/compare?grape=${encodeURIComponent(g)}">${esc(g)}</a></td><td>${n}</td>
          ${avg.map((v, i) => `<td class="heat" style="--h:${v ? v / STRUCT[i][2] : 0}">${v ? v.toFixed(1) : '·'}</td>`).join('')}</tr>`).join('')}
        </tbody></table></div>` : `<p class="muted">${esc(t('stats.noGrape'))}</p>`}
    </section>

    <section class="card"><h2>${esc(t('stats.aromas'))}</h2>
      ${topAromas.length ? topAromas.map(([term, n]) => bar(esc(term), n, topAromas[0][1])).join('') : `<p class="muted">${esc(t('stats.none'))}</p>`}
    </section>

    <section class="card"><h2>${esc(t('stats.quality'))}</h2>
      ${qCounts.map(([item, n]) => bar(`${esc(item[0])}${hint(item) ? ` <small>${esc(hint(item))}</small>` : ''}`, n, qMax)).join('')}
    </section>`;

  root.querySelector('#md-export').onclick = async () => {
    try {
      const n = await exportMarkdown();
      if (n !== false) toast(t('toast.md', n));
    } catch (e) { toast(t('toast.backupFail', e.message)); }
  };
}

export async function renderCompare(root, params) {
  const all = (await db.all()).map(normalize);
  let rows;
  let heading;
  if (params.get('grape')) {
    const g = params.get('grape');
    rows = all.filter((r) => !isHidden(r) && r.info.grapes.includes(g)).slice(0, 6);
    heading = t('compare.grapeTitle', g);
  } else {
    const ids = (params.get('ids') || '').split(',');
    rows = ids.map((id) => all.find((r) => r.id === id)).filter(Boolean);
    heading = t('compare.title');
  }
  if (rows.length < 2) {
    root.innerHTML = `<h1>${esc(heading)}</h1><p class="empty">${esc(t('compare.need'))}</p>`;
    return;
  }

  const fieldRows = [];
  for (const [sk, sec] of Object.entries(SAT)) {
    fieldRows.push(`<tr class="sec"><th colspan="${rows.length + 1}">${withHint(sec.label, hint(sec))}</th></tr>`);
    for (const [fk, f] of Object.entries(sec.fields)) {
      const vals = rows.map((r) => r.sat[sk][fk]);
      if (vals.every((v) => !v || (Array.isArray(v) && !v.length))) continue;
      const differ = new Set(vals.map((v) => JSON.stringify(v))).size > 1;
      fieldRows.push(`<tr class="${differ ? 'diff' : ''}"><th>${f.label}</th>${vals.map((v) => `<td>${esc(Array.isArray(v) ? v.join(', ') : v || '·')}</td>`).join('')}</tr>`);
    }
  }

  root.innerHTML = `<h1>${esc(heading)}</h1>
    <p class="muted small">${esc(t('compare.diffHint'))}</p>
    <div class="table-wrap"><table class="grid compare">
      <thead><tr><th></th>${rows.map((r) => `<th><a href="#/view/${r.id}">${esc(title(r))}</a>
        <div class="muted small">${esc([r.info.vintage, r.info.region || r.info.country].filter(Boolean).join(' · '))}</div></th>`).join('')}</tr></thead>
      <tbody>${fieldRows.join('')}</tbody></table></div>`;
}
