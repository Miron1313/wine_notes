// 학습 도우미: 원인 → 결과, 다음에 마실 병, 라벨 용어 사전
import {
  OAK_TERMS, MLF_TERMS, YEAST_TERMS, TERTIARY_TERMS, OXIDATIVE_TERMS, SUB_EXAMPLES,
} from '../data/wset-l2-sat.js';
import { LABEL_TERMS, LABEL_GROUPS, termNote } from '../data/label-terms.js';
import { computeProgress, grapeName, subLabel } from './progress.js';
import { t, getLang } from './i18n.js';
import { esc } from './util.js';

const termsIn = (r) => [...r.sat.nose.aromas, ...r.sat.palate.flavours];
const found = (r, list) => termsIn(r).filter((x) => list.includes(x));

// 노트에서 근거 찾기: { ok: true/false, evidence } 또는 확인할 것이 없으면 null
const CHECKS = {
  cool: (r) => (r.sat.palate.acidity ? { ok: r.sat.palate.acidity === 'high', evidence: `acidity ${r.sat.palate.acidity}` } : null),
  warm: (r) => {
    const { alcohol, body } = r.sat.palate;
    if (!alcohol && !body) return null;
    return { ok: alcohol === 'high' || body === 'full', evidence: [alcohol && `alcohol ${alcohol}`, body && `body ${body}`].filter(Boolean).join(', ') };
  },
  oak: (r) => ({ ok: found(r, OAK_TERMS).length > 0, evidence: found(r, OAK_TERMS).join(', ') }),
  mlf: (r) => ({ ok: found(r, MLF_TERMS).length > 0, evidence: found(r, MLF_TERMS).join(', ') }),
  lees: (r) => ({ ok: found(r, YEAST_TERMS).length > 0, evidence: found(r, YEAST_TERMS).join(', ') }),
  bottle: (r) => ({ ok: found(r, TERTIARY_TERMS).length > 0, evidence: found(r, TERTIARY_TERMS).join(', ') }),
  oxidative: (r) => ({ ok: found(r, OXIDATIVE_TERMS).length > 0, evidence: found(r, OXIDATIVE_TERMS).join(', ') }),
};

// 기록에 적은 기후·양조·숙성 → 교과서적 결과와 내 노트 비교
export function causeEffects(r) {
  const keys = [r.info.climate, ...r.info.winemaking, r.info.ageing].filter(Boolean);
  return keys.map((k) => ({ key: k, text: t(`ce.${k}`), check: CHECKS[k]?.(r) ?? null }));
}

export function causeEffectHTML(r) {
  const items = causeEffects(r);
  if (!items.length) return '';
  return `<section class="card"><h2>${esc(t('ce.title'))}</h2><ul class="ce">${items.map(({ text, check }) => `
    <li><div>${esc(text)}</div>${check ? `<div class="small ${check.ok ? 'ok-text' : 'warn-text'}">${check.ok
      ? `✓ ${esc(t('ce.match', check.evidence))}` : `△ ${esc(t('ce.miss'))}${check.evidence ? ` (${esc(check.evidence)})` : ''}`}</div>` : ''}</li>`).join('')}
  </ul></section>`;
}

// 다음에 마실 병: 안 마신 8대 품종 → 샤르도네·스타일 빈 칸 → 1병만 마신 품종의 대조 시음
export function nextBottles(records, limit = 3) {
  const p = computeProgress(records);
  const out = [];
  for (const g of p.grapes) {
    if (!g.done) out.push({ kind: 'newGrape', label: grapeName(g.grape), detail: g.grape.pair.join(' vs ') });
  }
  for (const g of p.grapes) {
    if (g.done) for (const s of g.subs) if (!s.done) out.push({ kind: 'sub', label: `${grapeName(g.grape)} · ${subLabel(s.key)}`, detail: SUB_EXAMPLES[s.key] });
  }
  for (const st of p.styles) {
    for (const s of st.subs) if (!s.done) out.push({ kind: 'style', label: `${t(`style.${st.style}`)} · ${subLabel(s.key)}`, detail: SUB_EXAMPLES[s.key] });
  }
  for (const g of p.grapes) {
    if (g.count === 1) out.push({ kind: 'contrast', label: grapeName(g.grape), detail: g.grape.pair.join(' vs ') });
  }
  return out.slice(0, limit);
}

export function nextBottlesHTML(records) {
  const list = nextBottles(records);
  return `<section class="card" id="next"><h2>${esc(t('next.title'))}</h2>
    ${list.length ? `<ol class="next">${list.map((x) => `<li><span class="tag-k">${esc(t(`next.${x.kind}`))}</span>
      <b>${esc(x.label)}</b><div class="muted small">${esc(t('next.where', x.detail))}</div></li>`).join('')}</ol>`
      : `<p class="muted small">${esc(t('next.all'))}</p>`}
    <p class="muted small">${esc(t('next.hint'))}</p></section>`;
}

// 라벨 용어 사전 화면 (#/glossary)
export function renderGlossary(root, params) {
  const lang = getLang();
  const q = (params.get('q') || '').toLowerCase();
  const draw = (query) => LABEL_GROUPS.map((g) => {
    const rows = LABEL_TERMS.filter((row) => row[1] === g
      && (!query || `${row[0]} ${termNote(row, lang)}`.toLowerCase().includes(query)));
    if (!rows.length) return '';
    return `<section class="card"><h2>${esc(t(`lg.${g}`))}</h2><dl class="glossary">${rows.map((row) => `
      <dt>${esc(row[0])}</dt><dd>${esc(termNote(row, lang))}</dd>`).join('')}</dl></section>`;
  }).join('') || `<p class="empty">${esc(t('list.noMatch'))}</p>`;

  root.innerHTML = `<h1>${esc(t('glossary.title'))}</h1>
    <input type="search" id="gq" placeholder="${esc(t('glossary.search'))}" value="${esc(q)}">
    <p class="muted small">${esc(t('glossary.note'))}</p>
    <div id="gl">${draw(q)}</div>`;
  root.querySelector('#gq').oninput = (e) => { root.querySelector('#gl').innerHTML = draw(e.target.value.toLowerCase().trim()); };
}
