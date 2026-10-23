// 새 기록 / 수정 / 블라인드 정답 공개 화면
import {
  SAT, LEXICON, GRAPES, COUNTRIES, COLOR_KEYS, STYLE_KEYS, VINTAGE_BAND_KEYS, PRICE_BAND_KEYS, CLIMATE_KEYS, METHOD_KEYS,
} from '../data/wset-l2-sat.js';
import { db } from './db.js';
import {
  emptyRecord, normalize, isHidden, autoScore, BLIND_KEYS, VERDICT_KEYS, blindKeyLabel, bandLabel,
} from './model.js';
import { classifyMonth, monthOf } from './budget.js';
import { t, hint } from './i18n.js';
import { priceBandLabel, formatKRW } from './money.js';
import { esc, $, $$, toast, resizeImage } from './util.js';

const getPath = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj);
const setPath = (obj, path, v) => {
  const keys = path.split('.');
  const last = keys.pop();
  keys.reduce((o, k) => o[k], obj)[last] = v;
};

// SAT 칩: 영문 용어 + 언어별 작은 힌트. 항목 [en, ko, ru]
function chips(path, scale, value) {
  return `<div class="chips" data-path="${path}">${scale.map((item) => {
    const h = hint(item);
    return `<button type="button" class="chip${value === item[0] ? ' on' : ''}" data-v="${esc(item[0])}">${esc(item[0])}${h ? `<small>${esc(h)}</small>` : ''}</button>`;
  }).join('')}</div>`;
}

// 선택지 칩: 값은 키로 저장하고 화면에는 번역 라벨만 표시 (색·스타일 등). 항목 [key, label]
function optionChips(path, options, value) {
  return `<div class="chips" data-path="${path}">${options.map(([k, label]) => `
    <button type="button" class="chip${value === k ? ' on' : ''}" data-v="${esc(k)}">${esc(label)}</button>`).join('')}</div>`;
}

function field(label, sub, inner) {
  return `<div class="field"><div class="flabel">${esc(label)}${sub ? ` <span class="ko">${esc(sub)}</span>` : ''}</div>${inner}</div>`;
}

// SAT 항목 라벨 (영문 + 언어별 힌트)
const satField = (f, inner) => field(f.label, hint(f), inner);

function input(path, value, { type = 'text', placeholder = '', list = '', inputmode = '' } = {}) {
  return `<input type="${type}" data-path="${path}" value="${esc(value)}" placeholder="${esc(placeholder)}"
    ${list ? `list="${list}"` : ''} ${inputmode ? `inputmode="${inputmode}"` : ''}>`;
}

function textarea(path, value, placeholder = '') {
  return `<textarea data-path="${path}" rows="3" placeholder="${esc(placeholder)}">${esc(value)}</textarea>`;
}

function lexiconPicker(path, selected) {
  const sel = new Set(selected);
  const sub = (x) => (hint(x) ? ` <span class="ko">${esc(hint(x))}</span>` : '');
  return `<div class="lexicon" data-path="${path}">
    <div class="selected">${selected.length ? selected.map((term) => `
      <button type="button" class="chip on small" data-remove="${esc(term)}">${esc(term)} ✕</button>`).join('')
      : `<span class="muted">${esc(t('lex.empty'))}</span>`}</div>
    <div class="row">
      <input type="text" class="custom-term" placeholder="${esc(t('lex.custom'))}">
      <button type="button" class="btn small" data-add-term>${esc(t('btn.add'))}</button>
    </div>
    ${LEXICON.map((g) => `
      <details class="lex-group"><summary>${esc(g.group)}${sub(g)}</summary>
      ${g.clusters.map((c) => `
        <div class="cluster"><div class="cluster-name">${esc(c.name)}${sub(c)}</div>
        <div class="chips">${c.terms.map((term) => {
          const h = hint(term);
          return `<button type="button" class="chip small${sel.has(term[0]) ? ' on' : ''}" data-term="${esc(term[0])}">${esc(term[0])}${h ? `<small>${esc(h)}</small>` : ''}</button>`;
        }).join('')}
        </div></div>`).join('')}
      </details>`).join('')}
  </div>`;
}

export async function renderForm(root, { id, blind = false, reveal = false } = {}) {
  const raw = id ? await db.get(id) : null;
  if (id && !raw) { root.innerHTML = `<p class="empty">${esc(t('notFound'))}</p>`; return null; }
  const rec = raw ? normalize(raw) : emptyRecord({ blind });
  const isNew = !id;
  const manual = new Set(); // 사용자가 직접 바꾼 채점 항목
  let dirty = false;

  const showAnswers = () => !isHidden(rec) || reveal;
  const others = (await db.all()).map(normalize).filter((r) => r.id !== rec.id); // 예산 판정용

  // 가격 입력 아래 예산 안내 (이번 달 다른 기록과 함께 판정)
  function budgetNote() {
    if (!(Number(rec.info.price) > 0)) return '';
    const m = classifyMonth([...others, rec], monthOf(rec.info.date));
    const st = m.status[rec.id];
    const { limit, excCount } = m.budget;
    if (st === 'ok') return `<span class="ok-text">${esc(t('budget.ok', formatKRW(limit)))}</span>`;
    if (st === 'exception') return `<span class="warn-text">${esc(t('budget.useExc', { u: m.used, a: excCount }))}</span>`;
    return `<span class="ng-text">${esc(t('budget.overNote'))}</span>`;
  }

  function scoreBox() {
    const g = rec.blind.guess;
    return `<div class="score-list">${BLIND_KEYS.map((k) => {
      const v = rec.blind.result[k];
      const guess = k.endsWith('Band') ? (g[k] && bandLabel(g[k])) : g[k];
      const cls = v === true ? 'ok' : v === false ? 'ng' : 'na';
      const mark = t(v === true ? 'score.correct' : v === false ? 'score.wrong' : 'score.none');
      return `<div class="score-row"><div><b>${esc(blindKeyLabel(k))}</b><div class="muted">${esc(t('score.myGuess', guess || '—'))}</div></div>
        <button type="button" class="score ${cls}" data-score="${k}">${esc(mark)}</button></div>`;
    }).join('')}</div><p class="muted small">${esc(t('score.help'))}</p>`;
  }

  function rescore() {
    if (!reveal) return;
    const auto = autoScore(rec);
    for (const k of BLIND_KEYS) if (!manual.has(k)) rec.blind.result[k] = auto[k];
    const box = $('#score-box', root);
    if (box) box.innerHTML = scoreBox();
  }

  function render() {
    const i = rec.info;
    const s = rec.sat;
    const hidden = !showAnswers();
    const af = SAT.appearance.fields;
    const nf = SAT.nose.fields;
    const pf = SAT.palate.fields;
    const qf = SAT.conclusion.fields.quality;
    const eg = (x) => t('eg', x);
    const formTitle = reveal ? 'form.titleReveal'
      : isNew ? (rec.blind.enabled ? 'form.titleNewBlind' : 'form.titleNew') : 'form.titleEdit';

    root.innerHTML = `
    <form class="form" autocomplete="off" onsubmit="return false">
      <h1>${esc(t(formTitle))}</h1>

      ${isNew ? `<label class="toggle"><input type="checkbox" id="blind-toggle" ${rec.blind.enabled ? 'checked' : ''}>
        <span>${esc(t('form.blindMode'))} <small class="muted">${esc(t('form.blindModeHint'))}</small></span></label>` : ''}

      <section id="sec-info"><h2>${esc(t('sec.info'))}</h2>
        ${field(t('f.color'), '', optionChips('info.color', COLOR_KEYS.map((k) => [k, t(`color.${k}`)]), i.color))}
        ${field(t('f.style'), '', optionChips('info.style', STYLE_KEYS.map((k) => [k, t(`style.${k}`)]), i.style))}
        ${METHOD_KEYS[i.style] ? field(t(`f.method.${i.style}`), t('optional'),
          optionChips('info.method', METHOD_KEYS[i.style].map((k) => [k, t(`method.${k}`)]), i.method)) : ''}
        ${hidden ? `<p class="note">${esc(t('form.hiddenNote'))}</p>` : `
          ${field(t('f.name'), '', input('info.name', i.name, { placeholder: eg('Chablis Premier Cru') }))}
          ${field(t('f.producer'), '', input('info.producer', i.producer, { placeholder: eg('William Fèvre') }))}
          ${field(t('f.vintage'), '', input('info.vintage', i.vintage, { type: 'number', placeholder: eg('2021'), inputmode: 'numeric' }))}
          ${field(t('f.grapes'), '', `<div class="selected" id="grape-list">${i.grapes.map((gname) => `
              <button type="button" class="chip on small" data-remove-grape="${esc(gname)}">${esc(gname)} ✕</button>`).join('')}</div>
            <div class="row"><input type="text" id="grape-input" list="dl-grapes" placeholder="${esc(t('ph.grapeInput'))}">
            <button type="button" class="btn small" id="grape-add">${esc(t('btn.add'))}</button></div>`)}
          ${field(t('f.country'), '', input('info.country', i.country, { list: 'dl-countries', placeholder: eg('France') }))}
          ${field(t('f.region'), '', input('info.region', i.region, { placeholder: eg('Chablis, Burgundy') }))}
          ${field(t('f.climate'), t('optional'), optionChips('info.climate', CLIMATE_KEYS.map((k) => [k, t(`climate.${k}`)]), i.climate))}
          ${field(t('f.price'), '₩', `${input('info.price', i.price, { type: 'number', placeholder: '₩', inputmode: 'numeric' })}
            <div class="small budget-note" id="budget-note">${budgetNote()}</div>`)}
          ${field(t('f.shop'), '', input('info.shop', i.shop, { placeholder: t('ph.shop') }))}`}
        ${field(t('f.date'), '', input('info.date', i.date, { type: 'date' }))}
        ${field(t('f.place'), '', input('info.place', i.place, { placeholder: t('ph.place') }))}
        ${field(t('f.companions'), '', input('info.companions', i.companions))}
        ${field(t('f.photo'), '', `<div class="photo">
            ${rec.photo ? `<img src="${rec.photo}" alt="${esc(t('photo.alt'))}"><button type="button" class="btn small ghost" id="photo-del">${esc(t('photo.del'))}</button>` : ''}
            <label class="btn small"><input type="file" accept="image/*" capture="environment" class="photo-input" hidden>📷 ${esc(t(rec.photo ? 'photo.retake' : 'photo.take'))}</label>
            <label class="btn small"><input type="file" accept="image/*" class="photo-input" hidden>🖼️ ${esc(t('photo.gallery'))}</label>
          </div>`)}
      </section>

      <section id="sec-appearance"><h2>${SAT.appearance.label}${hint(SAT.appearance) ? ` <span class="ko">${esc(hint(SAT.appearance))}</span>` : ''}</h2>
        ${satField(af.clarity, chips('sat.appearance.clarity', af.clarity.scale, s.appearance.clarity))}
        ${satField(af.intensity, chips('sat.appearance.intensity', af.intensity.scale, s.appearance.intensity))}
        ${satField(af.colour, chips('sat.appearance.colour', af.colour.byColor[i.color] || [], s.appearance.colour))}
      </section>

      <section id="sec-nose"><h2>${SAT.nose.label}${hint(SAT.nose) ? ` <span class="ko">${esc(hint(SAT.nose))}</span>` : ''}</h2>
        ${satField(nf.condition, chips('sat.nose.condition', nf.condition.scale, s.nose.condition))}
        ${satField(nf.intensity, chips('sat.nose.intensity', nf.intensity.scale, s.nose.intensity))}
        ${satField(nf.openness, chips('sat.nose.openness', nf.openness.scale, s.nose.openness))}
        ${s.nose.openness === 'closed' || s.nose.openness === 'opening' || s.nose.openedAfter
          ? satField(nf.openedAfter, chips('sat.nose.openedAfter', nf.openedAfter.scale, s.nose.openedAfter)) : ''}
        ${satField(nf.aromas, lexiconPicker('sat.nose.aromas', s.nose.aromas))}
        ${field(t('f.notes'), '', textarea('sat.nose.notes', s.nose.notes, t('ph.noseNotes')))}
      </section>

      <section id="sec-palate"><h2>${SAT.palate.label}${hint(SAT.palate) ? ` <span class="ko">${esc(hint(SAT.palate))}</span>` : ''}</h2>
        ${['sweetness', 'acidity', 'tannin', 'alcohol', 'body', 'flavourIntensity'].map((k) => {
          if (k === 'tannin' && i.color !== 'red' && !s.palate.tannin) return '';
          return satField(pf[k], chips(`sat.palate.${k}`, pf[k].scale, s.palate[k]));
        }).join('')}
        ${satField(pf.flavours, `
          <button type="button" class="btn small ghost" id="copy-aromas">${esc(t('copyAromas'))}</button>
          ${lexiconPicker('sat.palate.flavours', s.palate.flavours)}`)}
        ${satField(pf.finish, chips('sat.palate.finish', pf.finish.scale, s.palate.finish))}
        ${field(t('f.notes'), '', textarea('sat.palate.notes', s.palate.notes))}
      </section>

      <section id="sec-conclusion"><h2>${SAT.conclusion.label}${hint(SAT.conclusion) ? ` <span class="ko">${esc(hint(SAT.conclusion))}</span>` : ''}</h2>
        ${satField(qf, chips('sat.conclusion.quality', qf.scale, s.conclusion.quality))}
        ${field(t('f.qualityReason'), '', textarea('sat.conclusion.reason', s.conclusion.reason, t('ph.qualityReason')))}
      </section>

      ${rec.blind.enabled ? `<section id="sec-blind"><h2>${esc(t('sec.blind'))}</h2>
        ${reveal || rec.blind.revealed ? `<div id="score-box">${scoreBox()}</div>` : `
          ${field(t('bk.grape'), '', input('blind.guess.grape', rec.blind.guess.grape, { list: 'dl-grapes', placeholder: eg('Chardonnay') }))}
          ${field(t('bk.country'), '', input('blind.guess.country', rec.blind.guess.country, { list: 'dl-countries' }))}
          ${field(t('bk.region'), '', input('blind.guess.region', rec.blind.guess.region, { placeholder: eg('Burgundy') }))}
          ${field(t('f.vintageBand'), t('f.vintageBandHint'), optionChips('blind.guess.vintageBand', VINTAGE_BAND_KEYS.map((k) => [k, t(`vb.${k}`)]), rec.blind.guess.vintageBand))}
          ${field(t('f.priceBand'), '₩', optionChips('blind.guess.priceBand', PRICE_BAND_KEYS.map((k) => [k, priceBandLabel(k)]), rec.blind.guess.priceBand))}`}
      </section>` : ''}

      <section id="sec-personal"><h2>${esc(t('sec.personal'))}</h2>
        ${field(t('f.verdict'), '', optionChips('personal.verdict', VERDICT_KEYS.map((k) => [k, t(`verdict.${k}`)]), rec.personal.verdict))}
        ${field(t('f.learning'), '', input('personal.learning', rec.personal.learning, { placeholder: t('ph.learning') }))}
        ${field(t('f.rating'), '', `<div class="stars" data-path="personal.rating">${[1, 2, 3, 4, 5].map((n) => `
          <button type="button" data-star="${n}" class="${n <= rec.personal.rating ? 'on' : ''}" aria-label="${n}">★</button>`).join('')}</div>`)}
        ${field(t('f.rebuy'), '', optionChips('personal.rebuy', ['yes', 'maybe', 'no'].map((k) => [k, t(`rebuy.${k}`)]), rec.personal.rebuy))}
        ${field(t('f.notes'), '', textarea('personal.notes', rec.personal.notes, t('ph.personalNotes')))}
      </section>

      <div class="actions">
        ${!isNew ? `<button type="button" class="btn danger ghost" id="delete">${esc(t('btn.delete'))}</button>` : ''}
        <button type="button" class="btn primary" id="save">${esc(t(reveal ? 'btn.saveScore' : 'btn.save'))}</button>
      </div>
    </form>
    <datalist id="dl-grapes">${GRAPES.map((g) => `<option value="${esc(g)}">`).join('')}</datalist>
    <datalist id="dl-countries">${COUNTRIES.map((c) => `<option value="${esc(c)}">`).join('')}</datalist>`;
  }

  function rerender() {
    const y = window.scrollY;
    const open = $$('details[open]', root).map((d) => [...$$('details', root)].indexOf(d));
    render();
    $$('details', root).forEach((d, idx) => { if (open.includes(idx)) d.open = true; });
    if (reveal) rescore();
    window.scrollTo(0, y);
  }

  render();
  if (reveal) rescore();

  root.oninput = (e) => {
    const p = e.target.dataset.path;
    if (!p) return;
    setPath(rec, p, e.target.value);
    dirty = true;
    if (p.startsWith('info.')) rescore();
    if (p === 'info.price' || p === 'info.date') { const el = $('#budget-note', root); if (el) el.innerHTML = budgetNote(); }
  };

  root.onchange = async (e) => {
    if (e.target.id === 'blind-toggle') {
      rec.blind.enabled = e.target.checked;
      rerender();
    } else if (e.target.classList.contains('photo-input') && e.target.files[0]) {
      try {
        rec.photo = await resizeImage(e.target.files[0]);
        dirty = true;
        rerender();
      } catch { toast(t('photo.readFail')); }
    }
  };

  root.onclick = (e) => {
    const b = e.target.closest('button');
    if (!b) return;

    // 단일 선택 칩 (같은 칩을 다시 누르면 해제)
    const group = b.closest('.chips[data-path]');
    if (group && b.dataset.v !== undefined) {
      const p = group.dataset.path;
      // 색·스타일은 항상 하나가 선택되어 있어야 함. 나머지는 다시 누르면 해제
      const required = p === 'info.color' || p === 'info.style';
      const v = getPath(rec, p) === b.dataset.v && !required ? '' : b.dataset.v;
      setPath(rec, p, v);
      dirty = true;
      if (p === 'sat.nose.openness') {
        rerender(); // 닫힘·열리는 중일 때만 '열린 시점' 표시
      } else if (p === 'info.style') {
        if (!METHOD_KEYS[v]?.includes(rec.info.method)) rec.info.method = '';
        rerender(); // 스파클링·주정강화일 때만 방식 선택 표시
      } else if (p === 'info.color') {
        if (!SAT.appearance.fields.colour.byColor[v]?.some(([en]) => en === rec.sat.appearance.colour)) rec.sat.appearance.colour = '';
        rerender();
      } else {
        $$('.chip', group).forEach((c) => c.classList.toggle('on', c.dataset.v === v));
      }
      return;
    }

    // 아로마/풍미 용어
    const lex = b.closest('.lexicon');
    if (lex) {
      const arr = getPath(rec, lex.dataset.path);
      if (b.dataset.term) {
        const idx = arr.indexOf(b.dataset.term);
        if (idx >= 0) arr.splice(idx, 1); else arr.push(b.dataset.term);
      } else if (b.dataset.remove) {
        arr.splice(arr.indexOf(b.dataset.remove), 1);
      } else if (b.hasAttribute('data-add-term')) {
        const inp = $('.custom-term', lex);
        const v = inp.value.trim();
        if (v && !arr.includes(v)) arr.push(v);
      }
      dirty = true;
      rerender();
      return;
    }

    if (b.dataset.star) {
      const n = Number(b.dataset.star);
      rec.personal.rating = rec.personal.rating === n ? 0 : n;
      dirty = true;
      $$('.stars button', root).forEach((s) => s.classList.toggle('on', Number(s.dataset.star) <= rec.personal.rating));
      return;
    }

    if (b.dataset.score) {
      const k = b.dataset.score;
      const cur = rec.blind.result[k];
      rec.blind.result[k] = cur === true ? false : cur === false ? null : true;
      manual.add(k);
      dirty = true;
      $('#score-box', root).innerHTML = scoreBox();
      return;
    }

    if (b.dataset.removeGrape) {
      rec.info.grapes = rec.info.grapes.filter((g) => g !== b.dataset.removeGrape);
      dirty = true;
      rerender();
      return;
    }

    switch (b.id) {
      case 'grape-add': {
        const v = $('#grape-input', root).value.trim();
        if (v && !rec.info.grapes.includes(v)) rec.info.grapes.push(v);
        dirty = true;
        rerender();
        break;
      }
      case 'copy-aromas':
        for (const a of rec.sat.nose.aromas) if (!rec.sat.palate.flavours.includes(a)) rec.sat.palate.flavours.push(a);
        dirty = true;
        rerender();
        break;
      case 'photo-del':
        rec.photo = '';
        dirty = true;
        rerender();
        break;
      case 'delete':
        if (confirm(t('confirm.delete'))) {
          db.remove(rec.id).then(() => { dirty = false; toast(t('toast.deleted')); location.hash = '#/'; });
        }
        break;
      case 'save':
        save();
        break;
      default:
    }
  };

  // 품종 입력창에서 엔터로 추가
  root.onkeydown = (e) => {
    if (e.key !== 'Enter') return;
    if (e.target.id === 'grape-input') { e.preventDefault(); $('#grape-add', root).click(); }
    if (e.target.classList.contains('custom-term')) { e.preventDefault(); $('[data-add-term]', e.target.closest('.lexicon')).click(); }
  };

  async function save() {
    if (reveal) {
      if (!rec.info.grapes.length && !rec.info.country) {
        toast(t('toast.needAnswer'));
        return;
      }
      rec.blind.revealed = true;
    }
    rec.updatedAt = Date.now();
    try {
      await db.put(rec);
      dirty = false;
      toast(t(reveal ? 'toast.scoreSaved' : 'toast.saved'));
      location.hash = `#/view/${rec.id}`;
    } catch (err) {
      toast(t('toast.saveFail', err.message));
    }
  }

  // 저장하지 않고 나갈 때 확인. 언어를 바꾸면 입력 내용을 유지한 채 다시 그림
  const guard = () => !dirty || confirm(t('confirm.leave'));
  guard.rerender = rerender;
  return guard;
}
