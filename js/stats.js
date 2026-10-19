// 통계와 나란히 비교
import { SAT, SCALE_INDEX, COLOR_KEYS } from '../data/wset-l2-sat.js';
import { db } from './db.js';
import { normalize, isHidden, BLIND_KEYS, blindKeyLabel, blindScore, title, colorLabel } from './model.js';
import { t, hint } from './i18n.js';
import { esc } from './util.js';

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
