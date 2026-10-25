// 퀴즈: 앱 데이터(라벨 용어·산지·아로마·원인→결과·내 기록)로 객관식 문제를 만들고
// 틀린 문제는 맞힐 때까지 복습 목록에 남김
import {
  CLIMATE_KEYS, WINEMAKING_KEYS, AGEING_KEYS, PRINCIPAL_GRAPES, GRAPES, COUNTRIES,
} from '../data/wset-l2-sat.js';
import { LABEL_TERMS, termNote } from '../data/label-terms.js';
import { TYPICAL, REGION_QUIZ } from '../data/typical.js';
import { db } from './db.js';
import { normalize, isHidden, title } from './model.js';
import { grapeName } from './progress.js';
import { t, getLang } from './i18n.js';
import { esc, today } from './util.js';

const QUIZ_KEY = 'wine-log:quiz';
const ROUND = 10;
export const MODES = ['all', 'label', 'grape', 'ce', 'mine', 'review'];

export function getQuizState() {
  try {
    const s = JSON.parse(localStorage.getItem(QUIZ_KEY) || 'null');
    return { wrong: s?.wrong && typeof s.wrong === 'object' ? s.wrong : {}, history: Array.isArray(s?.history) ? s.history : [] };
  } catch { return { wrong: {}, history: [] }; }
}
function saveQuizState(s) {
  try { localStorage.setItem(QUIZ_KEY, JSON.stringify(s)); } catch { /* 무시 */ }
}
export const restoreQuizState = (s) => { if (s?.wrong && Array.isArray(s.history)) saveQuizState(s); };

const shuffle = (a) => {
  const arr = a.slice();
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
};
const pick = (arr, n) => shuffle(arr).slice(0, n);
const grapeLabel = (key) => { const g = PRINCIPAL_GRAPES.find((x) => x.key === key); return g ? grapeName(g) : key; };
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

// 원인 라벨과 결과 문장 (ce.* 문구의 "→" 뒤)
const CAUSES = [...CLIMATE_KEYS, ...WINEMAKING_KEYS, ...AGEING_KEYS];
const causeLabel = (k) => (CLIMATE_KEYS.includes(k) ? `${t('f.climate')}: ${t(`climate.${k}`)}`
  : WINEMAKING_KEYS.includes(k) ? t(`wm.${k}`) : t(`ag.${k}`));
const effectOf = (k) => t(`ce.${k}`).split('→').slice(1).join('→').trim();
const CE_CONFLICT = { stainless: ['young'], young: ['stainless'] }; // 결과가 비슷해 서로 오답 보기로 쓰지 않음

// 문제 씨앗: id로 언제든 다시 만들 수 있게 (복습용)
function seeds(records) {
  const out = [];
  for (const row of LABEL_TERMS) {
    out.push({ id: `term:${row[0]}`, mode: 'label' }, { id: `termRev:${row[0]}`, mode: 'label' });
  }
  REGION_QUIZ.forEach((q, i) => out.push({ id: `region:${i}`, mode: 'grape' }));
  for (const [g, p] of Object.entries(TYPICAL)) for (const a of p.signature) out.push({ id: `aroma:${g}:${a}`, mode: 'grape' });
  for (const k of CAUSES) out.push({ id: `ce:${k}`, mode: 'ce' });
  for (const r of records) {
    if (isHidden(r)) continue;
    if (r.info.grapes.length) out.push({ id: `myGrape:${r.id}`, mode: 'mine' });
    if (r.info.country) out.push({ id: `myCountry:${r.id}`, mode: 'mine' });
  }
  return out;
}

// 문제 만들기: { id, prompt, sub, options:[{text, ok}], explain }
function build(id, records) {
  const lang = getLang();
  const [kind, ...rest] = id.split(':');
  const key = rest.join(':');
  const opts = (right, wrongs) => shuffle([{ text: right, ok: true }, ...wrongs.map((x) => ({ text: x, ok: false }))]);

  if (kind === 'term' || kind === 'termRev') {
    const row = LABEL_TERMS.find((x) => x[0] === key);
    if (!row) return null;
    const same = LABEL_TERMS.filter((x) => x[0] !== key && x[1] === row[1]);
    const pool = same.length >= 3 ? same : LABEL_TERMS.filter((x) => x[0] !== key);
    const others = pick(pool, 3);
    if (kind === 'term') {
      return { id, prompt: t('quiz.q.termMeaning', row[0]), options: opts(termNote(row, lang), others.map((x) => termNote(x, lang))), explain: `${row[0]}: ${termNote(row, lang)}` };
    }
    return { id, prompt: t('quiz.q.meaningTerm'), sub: termNote(row, lang), options: opts(row[0], others.map((x) => x[0])), explain: `${row[0]}: ${termNote(row, lang)}` };
  }
  if (kind === 'region') {
    const q = REGION_QUIZ[Number(key)];
    if (!q) return null;
    const g = PRINCIPAL_GRAPES.find((x) => x.key === q[1]);
    return { id, prompt: t('quiz.q.region', q[0]), options: opts(grapeLabel(q[1]), q[2].map(grapeLabel)),
      explain: t('quiz.regionExp', { g: grapeLabel(q[1]), r: g.pair.join(' vs ') }) };
  }
  if (kind === 'aroma') {
    const i = key.lastIndexOf(':');
    const g = key.slice(0, i); const a = key.slice(i + 1);
    const p = TYPICAL[g];
    if (!p) return null;
    const wrongs = [...new Set(Object.entries(TYPICAL).filter(([h, q]) => h !== g && q.color === p.color)
      .flatMap(([, q]) => q.signature).filter((x) => !p.aromas.includes(x)))];
    return { id, prompt: t('quiz.q.aroma', grapeLabel(g)), options: opts(a, pick(wrongs, 3)),
      explain: t('quiz.sigList', { g: grapeLabel(g), a: p.signature.join(', ') }) };
  }
  if (kind === 'ce') {
    if (!CAUSES.includes(key)) return null;
    const pool = CAUSES.filter((k) => k !== key && !(CE_CONFLICT[key] || []).includes(k));
    return { id, prompt: t('quiz.q.ce', causeLabel(key)), options: opts(effectOf(key), pick(pool, 3).map(effectOf)), explain: t(`ce.${key}`) };
  }
  if (kind === 'myGrape' || kind === 'myCountry') {
    const r = records.find((x) => x.id === key);
    if (!r || isHidden(r)) return null;
    const label = `${title(r)}${r.info.vintage ? ` ${r.info.vintage}` : ''} (${r.info.date})`;
    const link = `<a href="#/view/${r.id}">${esc(t('quiz.openRecord'))}</a>`;
    if (kind === 'myGrape' && r.info.grapes.length) {
      // Pinot Grigio/Gris처럼 별칭이 있는 품종은 별칭 하나라도 겹치면 같은 품종으로 봄
      const aliases = (x) => norm(x).split('/').map((y) => y.trim());
      const mine = new Set(r.info.grapes.flatMap(aliases));
      const wrongs = pick(GRAPES.filter((x) => !aliases(x).some((y) => mine.has(y))), 3);
      return { id, prompt: t('quiz.q.myGrape', label), options: opts(r.info.grapes.join(', '), wrongs), explain: '', link };
    }
    if (kind === 'myCountry' && r.info.country) {
      const wrongs = pick(COUNTRIES.filter((c) => norm(c) !== norm(r.info.country)), 3);
      return { id, prompt: t('quiz.q.myCountry', label), options: opts(r.info.country, wrongs), explain: '', link };
    }
  }
  return null;
}

function poolFor(mode, records, state) {
  const all = seeds(records);
  if (mode === 'review') return all.filter((s) => state.wrong[s.id] > 0);
  return mode === 'all' ? all : all.filter((s) => s.mode === mode);
}

// #/quiz 화면: 모드 선택 → 10문제 → 결과
export async function renderQuiz(root) {
  const records = (await db.all()).map(normalize);
  let state = getQuizState();
  let mode = 'all';
  let round = null; // { qs, i, answered, correct, wrongIds }

  function home() {
    const counts = Object.fromEntries(MODES.map((m) => [m, poolFor(m, records, state).length]));
    const hist = state.history.slice(-5).reverse();
    root.innerHTML = `<h1>${esc(t('quiz.title'))}</h1>
      <section class="card">
        <div class="chips" id="quiz-modes">${MODES.map((m) => `
          <button class="chip${mode === m ? ' on' : ''}" data-mode="${m}" ${counts[m] ? '' : 'disabled'}>${esc(t(`quiz.mode.${m}`, counts[m]))}</button>`).join('')}</div>
        ${counts[mode] ? '' : `<p class="muted small">${esc(t(mode === 'mine' ? 'quiz.mineHint' : 'quiz.empty'))}</p>`}
        <button class="btn primary block" id="quiz-start" ${counts[mode] ? '' : 'disabled'}>${esc(t('quiz.start', Math.min(ROUND, counts[mode])))}</button>
        <p class="muted small">${esc(t('quiz.reviewNote'))}</p>
      </section>
      <section class="card"><h2>${esc(t('quiz.history'))}</h2>
        ${hist.length ? `<ul class="plain small">${hist.map((h) => `<li>${esc(h.date)} · ${esc(t(`quiz.mode.${h.mode}`, '').replace(/\s*\(\)\s*$/, ''))} · <b>${h.score}/${h.total}</b></li>`).join('')}</ul>`
          : `<p class="muted small">${esc(t('stats.none'))}</p>`}
      </section>`;
  }

  function question() {
    const q = round.qs[round.i];
    const ans = round.answered;
    root.innerHTML = `<h1>${esc(t('quiz.title'))} <small class="muted">${round.i + 1}/${round.qs.length}</small></h1>
      <div class="bar quiz-bar"><span style="width:${Math.round((round.i / round.qs.length) * 100)}%"></span></div>
      <section class="card quiz">
        <p class="q">${esc(q.prompt)}</p>
        ${q.sub ? `<p class="note">${esc(q.sub)}</p>` : ''}
        <div class="options">${q.options.map((o, idx) => {
          const cls = ans === null ? '' : o.ok ? ' right' : ans === idx ? ' wrong' : ' dim';
          return `<button class="opt${cls}" data-opt="${idx}" ${ans === null ? '' : 'disabled'}>${esc(o.text)}</button>`;
        }).join('')}</div>
        ${ans === null ? '' : `<div class="feedback ${q.options[ans].ok ? 'ok-text' : 'ng-text'}"><b>${esc(t(q.options[ans].ok ? 'quiz.correct' : 'quiz.wrong'))}</b>
          ${q.options[ans].ok ? '' : `<div>${esc(t('quiz.answer', q.options.find((o) => o.ok).text))}</div>`}</div>
          ${q.explain ? `<p class="note small">${esc(q.explain)}</p>` : ''}${q.link ? `<p class="small">${q.link}</p>` : ''}
          <button class="btn primary block" id="quiz-next">${esc(t(round.i + 1 < round.qs.length ? 'quiz.next' : 'quiz.finish'))}</button>`}
      </section>`;
    // 답을 고르면 '다음' 버튼이 보이게, 새 문제는 맨 위부터
    if (ans === null) window.scrollTo(0, 0);
    else root.querySelector('#quiz-next')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  function result() {
    const n = round.qs.length;
    root.innerHTML = `<h1>${esc(t('quiz.title'))}</h1>
      <section class="card center"><div class="score-big">${round.correct}/${n}</div>
        <p>${esc(t('quiz.result', { c: round.correct, n }))}</p>
        ${round.wrongQs.length ? `<h3>${esc(t('quiz.wrongList'))}</h3><ul class="plain small left-align">${round.wrongQs.map((q) => `
          <li>✗ ${esc(q.prompt)}${q.sub ? ` <span class="muted">${esc(q.sub.slice(0, 40))}…</span>` : ''}<br><span class="ok-text">→ ${esc(q.options.find((o) => o.ok).text)}</span></li>`).join('')}</ul>` : ''}
        <div class="stack">
          <button class="btn primary" id="quiz-again">${esc(t('quiz.again'))}</button>
          ${Object.keys(state.wrong).length ? `<button class="btn" id="quiz-review">${esc(t('quiz.reviewBtn', Object.keys(state.wrong).length))}</button>` : ''}
          <button class="btn ghost" id="quiz-home">${esc(t('quiz.home'))}</button>
        </div></section>`;
  }

  function start(m) {
    mode = m;
    const qs = [];
    for (const s of shuffle(poolFor(m, records, state))) {
      const q = build(s.id, records);
      if (q) qs.push(q);
      if (qs.length >= ROUND) break;
    }
    if (!qs.length) { home(); return; }
    round = { qs, i: 0, answered: null, correct: 0, wrongQs: [] };
    question();
  }

  root.onclick = (e) => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    if (b.dataset.mode) { mode = b.dataset.mode; home(); return; }
    if (b.id === 'quiz-start') { start(mode); return; }
    if (b.dataset.opt !== undefined && round && round.answered === null) {
      const q = round.qs[round.i];
      round.answered = Number(b.dataset.opt);
      // 틀리면 복습 목록에 추가, 복습 중 맞히면 하나 줄임 (0이 되면 목록에서 빠짐)
      if (q.options[round.answered].ok) {
        round.correct++;
        if (state.wrong[q.id]) { state.wrong[q.id]--; if (!state.wrong[q.id]) delete state.wrong[q.id]; }
      } else {
        round.wrongQs.push(q);
        state.wrong[q.id] = (state.wrong[q.id] || 0) + 1;
      }
      saveQuizState(state);
      question();
      return;
    }
    if (b.id === 'quiz-next') {
      if (round.i + 1 < round.qs.length) { round.i++; round.answered = null; question(); return; }
      state.history.push({ date: today(), mode, score: round.correct, total: round.qs.length });
      state.history = state.history.slice(-50);
      saveQuizState(state);
      state = getQuizState();
      result();
      return;
    }
    if (b.id === 'quiz-again') { start(mode); return; }
    if (b.id === 'quiz-review') { start('review'); return; }
    if (b.id === 'quiz-home') { round = null; home(); }
  };

  home();
}
