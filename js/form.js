// 새 기록 / 수정 / 블라인드 정답 공개 화면
import { SAT, LEXICON, GRAPES, COUNTRIES, COLORS, STYLES, VINTAGE_BANDS, PRICE_BANDS } from '../data/wset-l2-sat.js';
import { db } from './db.js';
import { emptyRecord, normalize, isHidden, autoScore, BLIND_KEYS, bandKo } from './model.js';
import { esc, $, $$, toast, resizeImage } from './util.js';

const getPath = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj);
const setPath = (obj, path, v) => {
  const keys = path.split('.');
  const last = keys.pop();
  keys.reduce((o, k) => o[k], obj)[last] = v;
};

// koOnly: 값은 영문 키로 저장하고 화면에는 한글만 표시 (색·스타일 등)
function chips(path, scale, value, { koOnly = false } = {}) {
  return `<div class="chips" data-path="${path}">${scale.map(([en, ko]) => `
    <button type="button" class="chip${value === en ? ' on' : ''}" data-v="${esc(en)}">${koOnly
      ? esc(ko) : `${esc(en)}${ko ? `<small>${esc(ko)}</small>` : ''}`}</button>`).join('')}</div>`;
}

function field(label, ko, inner) {
  return `<div class="field"><div class="flabel">${esc(label)}${ko ? ` <span class="ko">${esc(ko)}</span>` : ''}</div>${inner}</div>`;
}

function input(path, value, { type = 'text', placeholder = '', list = '', inputmode = '' } = {}) {
  return `<input type="${type}" data-path="${path}" value="${esc(value)}" placeholder="${esc(placeholder)}"
    ${list ? `list="${list}"` : ''} ${inputmode ? `inputmode="${inputmode}"` : ''}>`;
}

function textarea(path, value, placeholder = '') {
  return `<textarea data-path="${path}" rows="3" placeholder="${esc(placeholder)}">${esc(value)}</textarea>`;
}

function lexiconPicker(path, selected) {
  const sel = new Set(selected);
  return `<div class="lexicon" data-path="${path}">
    <div class="selected">${selected.length ? selected.map((t) => `
      <button type="button" class="chip on small" data-remove="${esc(t)}">${esc(t)} ✕</button>`).join('')
      : '<span class="muted">아래에서 고르거나 직접 입력하세요</span>'}</div>
    <div class="row">
      <input type="text" class="custom-term" placeholder="직접 입력 (예: wet slate)">
      <button type="button" class="btn small" data-add-term>추가</button>
    </div>
    ${LEXICON.map((g) => `
      <details class="lex-group"><summary>${esc(g.group)} <span class="ko">${esc(g.ko)}</span></summary>
      ${g.clusters.map((c) => `
        <div class="cluster"><div class="cluster-name">${esc(c.name)} <span class="ko">${esc(c.ko)}</span></div>
        <div class="chips">${c.terms.map(([en, ko]) => `
          <button type="button" class="chip small${sel.has(en) ? ' on' : ''}" data-term="${esc(en)}">${esc(en)}<small>${esc(ko)}</small></button>`).join('')}
        </div></div>`).join('')}
      </details>`).join('')}
  </div>`;
}

export async function renderForm(root, { id, blind = false, reveal = false } = {}) {
  const raw = id ? await db.get(id) : null;
  if (id && !raw) { root.innerHTML = '<p class="empty">기록을 찾을 수 없습니다.</p>'; return null; }
  const rec = raw ? normalize(raw) : emptyRecord({ blind });
  const isNew = !id;
  const manual = new Set(); // 사용자가 직접 바꾼 채점 항목
  let dirty = false;

  const showAnswers = () => !isHidden(rec) || reveal;

  function scoreBox() {
    const g = rec.blind.guess;
    return `<div class="score-list">${BLIND_KEYS.map(([k, ko]) => {
      const v = rec.blind.result[k];
      const guess = k.endsWith('Band') ? bandKo(g[k]) : g[k];
      const cls = v === true ? 'ok' : v === false ? 'ng' : 'na';
      const mark = v === true ? '✓ 정답' : v === false ? '✗ 오답' : '– 미채점';
      return `<div class="score-row"><div><b>${ko}</b><div class="muted">내 추론: ${esc(guess || '—')}</div></div>
        <button type="button" class="score ${cls}" data-score="${k}">${mark}</button></div>`;
    }).join('')}</div><p class="muted small">자동 채점 결과입니다. 버튼을 누르면 정답 → 오답 → 미채점 순서로 바뀝니다.</p>`;
  }

  function rescore() {
    if (!reveal) return;
    const auto = autoScore(rec);
    for (const [k] of BLIND_KEYS) if (!manual.has(k)) rec.blind.result[k] = auto[k];
    const box = $('#score-box', root);
    if (box) box.innerHTML = scoreBox();
  }

  function render() {
    const i = rec.info;
    const s = rec.sat;
    const hidden = !showAnswers();
    const colourScale = SAT.appearance.fields.colour.byColor[i.color] || [];
    const pf = SAT.palate.fields;

    root.innerHTML = `
    <form class="form" autocomplete="off" onsubmit="return false">
      <h1>${reveal ? '블라인드 정답 공개' : isNew ? (rec.blind.enabled ? '새 블라인드 테이스팅' : '새 테이스팅') : '기록 수정'}</h1>

      ${isNew ? `<label class="toggle"><input type="checkbox" id="blind-toggle" ${rec.blind.enabled ? 'checked' : ''}>
        <span>블라인드 모드 <small class="muted">품종·산지를 가리고 먼저 추론합니다</small></span></label>` : ''}

      <section id="sec-info"><h2>기본 정보</h2>
        ${field('색', '', chips('info.color', COLORS, i.color, { koOnly: true }))}
        ${field('스타일', '', chips('info.style', STYLES, i.style, { koOnly: true }))}
        ${hidden ? '<p class="note">🙈 블라인드 중이라 이름·품종·산지·빈티지·가격은 정답 공개 때 입력합니다.</p>' : `
          ${field('와인 이름', '', input('info.name', i.name, { placeholder: '예: Chablis Premier Cru' }))}
          ${field('생산자', '', input('info.producer', i.producer, { placeholder: '예: William Fèvre' }))}
          ${field('빈티지', '', input('info.vintage', i.vintage, { type: 'number', placeholder: '예: 2021', inputmode: 'numeric' }))}
          ${field('품종', '', `<div class="selected" id="grape-list">${i.grapes.map((gname) => `
              <button type="button" class="chip on small" data-remove-grape="${esc(gname)}">${esc(gname)} ✕</button>`).join('')}</div>
            <div class="row"><input type="text" id="grape-input" list="dl-grapes" placeholder="품종 입력 후 추가">
            <button type="button" class="btn small" id="grape-add">추가</button></div>`)}
          ${field('국가', '', input('info.country', i.country, { list: 'dl-countries', placeholder: '예: France' }))}
          ${field('산지', '', input('info.region', i.region, { placeholder: '예: Chablis, Burgundy' }))}
          ${field('가격', '', input('info.price', i.price, { type: 'number', placeholder: '원', inputmode: 'numeric' }))}
          ${field('구매처', '', input('info.shop', i.shop, { placeholder: '예: 이마트, 와인앤모어' }))}`}
        ${field('날짜', '', input('info.date', i.date, { type: 'date' }))}
        ${field('장소', '', input('info.place', i.place, { placeholder: '예: 집, WSET 수업' }))}
        ${field('함께한 사람', '', input('info.companions', i.companions))}
        ${field('라벨 사진', '', `<div class="photo">
            ${rec.photo ? `<img src="${rec.photo}" alt="라벨 사진"><button type="button" class="btn small ghost" id="photo-del">사진 삭제</button>` : ''}
            <label class="btn small"><input type="file" accept="image/*" capture="environment" class="photo-input" hidden>📷 ${rec.photo ? '다시 찍기' : '촬영'}</label>
            <label class="btn small"><input type="file" accept="image/*" class="photo-input" hidden>🖼️ 갤러리에서 선택</label>
          </div>`)}
      </section>

      <section id="sec-appearance"><h2>Appearance <span class="ko">외관</span></h2>
        ${field('Clarity', '투명도', chips('sat.appearance.clarity', SAT.appearance.fields.clarity.scale, s.appearance.clarity))}
        ${field('Intensity', '색의 농도', chips('sat.appearance.intensity', SAT.appearance.fields.intensity.scale, s.appearance.intensity))}
        ${field('Colour', '색', chips('sat.appearance.colour', colourScale, s.appearance.colour))}
      </section>

      <section id="sec-nose"><h2>Nose <span class="ko">향</span></h2>
        ${field('Condition', '상태', chips('sat.nose.condition', SAT.nose.fields.condition.scale, s.nose.condition))}
        ${field('Intensity', '강도', chips('sat.nose.intensity', SAT.nose.fields.intensity.scale, s.nose.intensity))}
        ${field('Aroma characteristics', '아로마', lexiconPicker('sat.nose.aromas', s.nose.aromas))}
        ${field('메모', '', textarea('sat.nose.notes', s.nose.notes, '자유롭게 느낀 점'))}
      </section>

      <section id="sec-palate"><h2>Palate <span class="ko">맛</span></h2>
        ${['sweetness', 'acidity', 'tannin', 'alcohol', 'body', 'flavourIntensity'].map((k) => {
          if (k === 'tannin' && i.color !== 'red' && !s.palate.tannin) return '';
          return field(pf[k].label, pf[k].ko, chips(`sat.palate.${k}`, pf[k].scale, s.palate[k]));
        }).join('')}
        ${field('Flavour characteristics', '풍미', `
          <button type="button" class="btn small ghost" id="copy-aromas">↓ 향에서 고른 것 가져오기</button>
          ${lexiconPicker('sat.palate.flavours', s.palate.flavours)}`)}
        ${field(pf.finish.label, pf.finish.ko, chips('sat.palate.finish', pf.finish.scale, s.palate.finish))}
        ${field('메모', '', textarea('sat.palate.notes', s.palate.notes))}
      </section>

      <section id="sec-conclusion"><h2>Conclusions <span class="ko">결론</span></h2>
        ${field('Quality level', '품질', chips('sat.conclusion.quality', SAT.conclusion.fields.quality.scale, s.conclusion.quality))}
        ${field('품질 판단 근거', '', textarea('sat.conclusion.reason', s.conclusion.reason, '예: balance 좋음, finish long, 풍미 강도 pronounced → very good'))}
      </section>

      ${rec.blind.enabled ? `<section id="sec-blind"><h2>🕵️ 블라인드 추론</h2>
        ${reveal || rec.blind.revealed ? `<div id="score-box">${scoreBox()}</div>` : `
          ${field('품종', '', input('blind.guess.grape', rec.blind.guess.grape, { list: 'dl-grapes', placeholder: '예: Chardonnay' }))}
          ${field('국가', '', input('blind.guess.country', rec.blind.guess.country, { list: 'dl-countries' }))}
          ${field('산지', '', input('blind.guess.region', rec.blind.guess.region, { placeholder: '예: Burgundy' }))}
          ${field('빈티지대', '수확 후 경과 연수', chips('blind.guess.vintageBand', VINTAGE_BANDS, rec.blind.guess.vintageBand, { koOnly: true }))}
          ${field('가격대', '', chips('blind.guess.priceBand', PRICE_BANDS, rec.blind.guess.priceBand, { koOnly: true }))}`}
      </section>` : ''}

      <section id="sec-personal"><h2>나의 평가</h2>
        ${field('별점', '', `<div class="stars" data-path="personal.rating">${[1, 2, 3, 4, 5].map((n) => `
          <button type="button" data-star="${n}" class="${n <= rec.personal.rating ? 'on' : ''}" aria-label="${n}점">★</button>`).join('')}</div>`)}
        ${field('재구매 의사', '', chips('personal.rebuy', [['yes', '살래요'], ['maybe', '글쎄'], ['no', '안 사요']], rec.personal.rebuy, { koOnly: true }))}
        ${field('메모', '', textarea('personal.notes', rec.personal.notes, '페어링, 기억할 점'))}
      </section>

      <div class="actions">
        ${!isNew ? '<button type="button" class="btn danger ghost" id="delete">삭제</button>' : ''}
        <button type="button" class="btn primary" id="save">${reveal ? '채점 결과 저장' : '저장'}</button>
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
      } catch (err) { toast(err.message); }
    }
  };

  root.onclick = (e) => {
    const t = e.target.closest('button');
    if (!t) return;

    // 단일 선택 칩 (같은 칩을 다시 누르면 해제)
    const group = t.closest('.chips[data-path]');
    if (group && t.dataset.v !== undefined) {
      const p = group.dataset.path;
      const v = getPath(rec, p) === t.dataset.v && !p.startsWith('info.') ? '' : t.dataset.v;
      setPath(rec, p, v);
      dirty = true;
      if (p === 'info.color') {
        if (!SAT.appearance.fields.colour.byColor[v]?.some(([en]) => en === rec.sat.appearance.colour)) rec.sat.appearance.colour = '';
        rerender();
      } else {
        $$('.chip', group).forEach((b) => b.classList.toggle('on', b.dataset.v === v));
      }
      return;
    }

    // 아로마/풍미 용어
    const lex = t.closest('.lexicon');
    if (lex) {
      const arr = getPath(rec, lex.dataset.path);
      if (t.dataset.term) {
        const idx = arr.indexOf(t.dataset.term);
        if (idx >= 0) arr.splice(idx, 1); else arr.push(t.dataset.term);
      } else if (t.dataset.remove) {
        arr.splice(arr.indexOf(t.dataset.remove), 1);
      } else if (t.hasAttribute('data-add-term')) {
        const inp = $('.custom-term', lex);
        const v = inp.value.trim();
        if (v && !arr.includes(v)) arr.push(v);
      }
      dirty = true;
      rerender();
      return;
    }

    if (t.dataset.star) {
      const n = Number(t.dataset.star);
      rec.personal.rating = rec.personal.rating === n ? 0 : n;
      dirty = true;
      $$('.stars button', root).forEach((b) => b.classList.toggle('on', Number(b.dataset.star) <= rec.personal.rating));
      return;
    }

    if (t.dataset.score) {
      const k = t.dataset.score;
      const cur = rec.blind.result[k];
      rec.blind.result[k] = cur === true ? false : cur === false ? null : true;
      manual.add(k);
      dirty = true;
      $('#score-box', root).innerHTML = scoreBox();
      return;
    }

    if (t.dataset.removeGrape) {
      rec.info.grapes = rec.info.grapes.filter((g) => g !== t.dataset.removeGrape);
      dirty = true;
      rerender();
      return;
    }

    switch (t.id) {
      case 'grape-add': {
        const v = $('#grape-input', root).value.trim();
        if (v && !rec.info.grapes.includes(v)) rec.info.grapes.push(v);
        dirty = true;
        rerender();
        rescore();
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
        if (confirm('이 기록을 삭제할까요? 되돌릴 수 없습니다.')) {
          db.remove(rec.id).then(() => { dirty = false; toast('삭제했습니다'); location.hash = '#/'; });
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
        toast('정답(품종이나 국가)을 하나 이상 입력해 주세요');
        return;
      }
      rec.blind.revealed = true;
    }
    rec.updatedAt = Date.now();
    try {
      await db.put(rec);
      dirty = false;
      toast(reveal ? '채점 결과를 저장했습니다' : '저장했습니다');
      location.hash = `#/view/${rec.id}`;
    } catch (err) {
      toast(`저장 실패: ${err.message}`);
    }
  }

  // 저장하지 않고 나갈 때 확인
  return () => !dirty || confirm('저장하지 않은 내용이 있습니다. 나갈까요?');
}
