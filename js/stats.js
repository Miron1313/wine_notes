// 통계와 나란히 비교
import { SAT, SCALE_INDEX } from '../data/wset-l2-sat.js';
import { db } from './db.js';
import { normalize, isHidden, BLIND_KEYS, blindScore, title, colorKo } from './model.js';
import { esc } from './util.js';

const bar = (label, value, max, text) => `
  <div class="bar-row"><div class="bar-label">${label}</div>
    <div class="bar"><span style="width:${max ? Math.round((value / max) * 100) : 0}%"></span></div>
    <div class="bar-val">${text ?? value}</div></div>`;

const STRUCT = [['sweetness', 'Sweet', 4], ['acidity', 'Acid', 3], ['tannin', 'Tannin', 3], ['alcohol', 'Alc', 3], ['body', 'Body', 3]];

export async function renderStats(root) {
  const all = (await db.all()).map(normalize);
  if (!all.length) {
    root.innerHTML = '<h1>통계</h1><p class="empty">아직 기록이 없습니다. 첫 와인을 기록해 보세요.</p>';
    return;
  }
  const open = all.filter((r) => !isHidden(r));
  const blinds = all.filter((r) => r.blind.enabled && r.blind.revealed);

  // 색상 분포
  const byColor = ['white', 'rose', 'red'].map((c) => [c, all.filter((r) => r.info.color === c).length]);

  // 블라인드 항목별 적중률
  const acc = BLIND_KEYS.map(([k, ko]) => {
    const vals = blinds.map((r) => r.blind.result?.[k]).filter((v) => v === true || v === false);
    return [ko, vals.filter(Boolean).length, vals.length];
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
  for (const r of all) for (const t of new Set([...r.sat.nose.aromas, ...r.sat.palate.flavours])) counts[t] = (counts[t] || 0) + 1;
  const topAromas = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 15);

  // 품질 분포
  const qScale = SAT.conclusion.fields.quality.scale;
  const qCounts = qScale.map(([en, ko]) => [en, ko, all.filter((r) => r.sat.conclusion.quality === en).length]);
  const qMax = Math.max(1, ...qCounts.map((q) => q[2]));

  root.innerHTML = `
    <h1>통계</h1>
    <div class="kpis">
      <div class="kpi"><b>${all.length}</b><span>전체 기록</span></div>
      <div class="kpi"><b>${blinds.length}</b><span>블라인드 완료</span></div>
      <div class="kpi"><b>${Object.keys(groups).length}</b><span>품종 수</span></div>
    </div>

    <section class="card"><h2>색상</h2>
      ${byColor.map(([c, n]) => bar(colorKo(c), n, all.length)).join('')}</section>

    <section class="card"><h2>🕵️ 블라인드 적중률</h2>
      ${blinds.length ? acc.map(([ko, ok, n]) => bar(ko, ok, n, n ? `${Math.round((ok / n) * 100)}% (${ok}/${n})` : '—')).join('')
        + `<h3>최근 블라인드</h3><div class="trend">${recent.map((r) => {
          const { correct, total } = blindScore(r);
          const pct = total ? correct / total : 0;
          return `<a href="#/view/${r.id}" class="trend-col" title="${esc(title(r))}">
            <span style="height:${Math.max(6, pct * 100)}%"></span><small>${correct}/${total}</small></a>`;
        }).join('')}</div>`
        : '<p class="muted">정답을 공개한 블라인드 기록이 생기면 표시됩니다.</p>'}
    </section>

    <section class="card"><h2>품종별 구조감 평균</h2>
      ${grapeRows.length ? `<p class="muted small">low=1 · medium=2 · high=3 (sweetness는 dry=1 ~ sweet=4). 내 평가가 품종 교과서 특징과 맞는지 확인해 보세요.</p>
      <div class="table-wrap"><table class="grid">
        <thead><tr><th>품종</th><th>n</th>${STRUCT.map(([, l]) => `<th>${l}</th>`).join('')}</tr></thead>
        <tbody>${grapeRows.map(({ g, n, avg }) => `<tr><td><a href="#/compare?grape=${encodeURIComponent(g)}">${esc(g)}</a></td><td>${n}</td>
          ${avg.map((v, i) => `<td class="heat" style="--h:${v ? v / STRUCT[i][2] : 0}">${v ? v.toFixed(1) : '·'}</td>`).join('')}</tr>`).join('')}
        </tbody></table></div>` : '<p class="muted">품종을 입력한 기록이 생기면 표시됩니다.</p>'}
    </section>

    <section class="card"><h2>자주 쓴 아로마·풍미</h2>
      ${topAromas.length ? topAromas.map(([t, n]) => bar(esc(t), n, topAromas[0][1])).join('') : '<p class="muted">아직 없습니다.</p>'}
    </section>

    <section class="card"><h2>품질 평가 분포</h2>
      ${qCounts.map(([en, ko, n]) => bar(`${esc(en)} <small>${esc(ko)}</small>`, n, qMax)).join('')}
    </section>`;
}

export async function renderCompare(root, params) {
  const all = (await db.all()).map(normalize);
  let rows;
  let heading;
  if (params.get('grape')) {
    const g = params.get('grape');
    rows = all.filter((r) => !isHidden(r) && r.info.grapes.includes(g)).slice(0, 6);
    heading = `${esc(g)} 비교`;
  } else {
    const ids = (params.get('ids') || '').split(',');
    rows = ids.map((id) => all.find((r) => r.id === id)).filter(Boolean);
    heading = '나란히 비교';
  }
  if (rows.length < 2) {
    root.innerHTML = `<h1>${heading}</h1><p class="empty">비교할 기록이 2개 이상 필요합니다. 목록에서 "비교"를 눌러 골라 주세요.</p>`;
    return;
  }

  const fieldRows = [];
  for (const [sk, sec] of Object.entries(SAT)) {
    fieldRows.push(`<tr class="sec"><th colspan="${rows.length + 1}">${sec.label} <span class="ko">${sec.ko}</span></th></tr>`);
    for (const [fk, f] of Object.entries(sec.fields)) {
      const vals = rows.map((r) => r.sat[sk][fk]);
      if (vals.every((v) => !v || (Array.isArray(v) && !v.length))) continue;
      const differ = new Set(vals.map((v) => JSON.stringify(v))).size > 1;
      fieldRows.push(`<tr class="${differ ? 'diff' : ''}"><th>${f.label}</th>${vals.map((v) => `<td>${esc(Array.isArray(v) ? v.join(', ') : v || '·')}</td>`).join('')}</tr>`);
    }
  }

  root.innerHTML = `<h1>${heading}</h1>
    <p class="muted small">값이 서로 다른 행은 강조됩니다.</p>
    <div class="table-wrap"><table class="grid compare">
      <thead><tr><th></th>${rows.map((r) => `<th><a href="#/view/${r.id}">${esc(title(r))}</a>
        <div class="muted small">${esc([r.info.vintage, r.info.region || r.info.country].filter(Boolean).join(' · '))}</div></th>`).join('')}</tr></thead>
      <tbody>${fieldRows.join('')}</tbody></table></div>`;
}
