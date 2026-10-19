// 라우터와 목록·상세·설정 화면
import { db, requestPersist } from './db.js';
import {
  normalize, isHidden, title, colorLabel, styleLabel, satLines, blindScore, BLIND_KEYS, blindKeyLabel, bandLabel,
} from './model.js';
import { renderForm } from './form.js';
import { renderStats, renderCompare } from './stats.js';
import { exportJSON, importJSON, exportCSV, lastBackup, needsBackupReminder } from './backup.js';
import { t, getLang, setLang, locale, LANGS } from './i18n.js';
import { CURRENCIES, getCurrency, setCurrency, fxInfo, refreshRates, priceText, formatMoney } from './currency.js';
import { COLOR_KEYS } from '../data/wset-l2-sat.js';
import { esc, $, $$, toast } from './util.js';

const view = $('#view');
let leaveGuard = null; // 수정 중 이탈 확인
let lastHash = location.hash;

// 목록 필터 상태 (화면을 오가도 유지)
const filter = { q: '', color: '', blind: '', compare: false, picked: new Set() };

async function renderList() {
  const all = (await db.all()).map(normalize);
  const q = filter.q.toLowerCase();
  const rows = all.filter((r) => {
    if (filter.color && r.info.color !== filter.color) return false;
    if (filter.blind === 'only' && !r.blind.enabled) return false;
    if (filter.blind === 'pending' && !isHidden(r)) return false;
    if (!q) return true;
    const hay = isHidden(r) ? [r.info.place, r.personal.notes] : [
      r.info.name, r.info.producer, r.info.region, r.info.country, r.info.vintage, ...r.info.grapes,
      ...r.sat.nose.aromas, r.personal.notes, r.info.place,
    ];
    return hay.join(' ').toLowerCase().includes(q);
  });

  const banner = needsBackupReminder(all.length)
    ? `<div class="banner">💾 ${esc(t(lastBackup() ? 'backup.overdue' : 'backup.never'))} ${esc(t('backup.onlyHere'))}
        <button class="btn small" id="quick-backup">${esc(t('backup.now'))}</button></div>` : '';

  view.innerHTML = `
    ${banner}
    <div class="list-head">
      <input type="search" id="q" placeholder="${esc(t('search.ph'))}" value="${esc(filter.q)}">
      <div class="chips filters">
        ${[['', t('filter.all')], ...COLOR_KEYS.map((k) => [k, colorLabel(k)])].map(([k, l]) => `
          <button class="chip small${filter.color === k ? ' on' : ''}" data-color="${k}">${esc(l)}</button>`).join('')}
        <button class="chip small${filter.blind === 'only' ? ' on' : ''}" data-blind="only">${esc(t('filter.blind'))}</button>
        <button class="chip small${filter.blind === 'pending' ? ' on' : ''}" data-blind="pending">${esc(t('filter.pending'))}</button>
        <button class="chip small${filter.compare ? ' on' : ''}" id="compare-toggle">${esc(t('filter.compare'))}</button>
      </div>
    </div>
    ${filter.compare ? `<div class="compare-bar">${esc(t('compare.pick', filter.picked.size))}
      <button class="btn small primary" id="compare-go" ${filter.picked.size < 2 ? 'disabled' : ''}>${esc(t('compare.go'))}</button></div>` : ''}
    ${rows.length ? `<ul class="cards">${rows.map((r) => {
      const hidden = isHidden(r);
      const sc = r.blind.enabled && r.blind.revealed ? blindScore(r) : null;
      return `<li><a class="wine-card ${r.info.color}${filter.picked.has(r.id) ? ' picked' : ''}" href="#/view/${r.id}" data-id="${r.id}">
        ${r.photo ? `<img src="${r.photo}" alt="" loading="lazy">` : `<div class="swatch"></div>`}
        <div class="wc-body">
          <div class="wc-title">${esc(title(r))} ${!hidden && r.info.vintage ? `<span class="muted">${esc(r.info.vintage)}</span>` : ''}</div>
          <div class="wc-sub">${hidden ? esc(t('list.unrevealed')) : esc([r.info.grapes.join(', '), r.info.region || r.info.country].filter(Boolean).join(' · '))}</div>
          <div class="wc-meta">${esc(r.info.date)} · ${esc(colorLabel(r.info.color))}
            ${r.sat.conclusion.quality ? ` · ${esc(r.sat.conclusion.quality)}` : ''}
            ${r.personal.rating ? ` · ${'★'.repeat(r.personal.rating)}` : ''}
            ${sc ? ` · <span class="badge">${esc(t('list.blindScore', `${sc.correct}/${sc.total}`))}</span>` : ''}</div>
        </div></a></li>`;
    }).join('')}</ul>`
      : `<div class="empty">${all.length ? esc(t('list.noMatch'))
        : `🍷<br>${esc(t('list.emptyTitle'))}<br><small>${esc(t('list.emptyHint'))}</small>`}</div>`}`;

  $('#q').oninput = (e) => {
    filter.q = e.target.value;
    clearTimeout(renderList.t);
    renderList.t = setTimeout(async () => { await renderList(); const el = $('#q'); el.focus(); el.setSelectionRange(el.value.length, el.value.length); }, 250);
  };
  view.onclick = async (e) => {
    const el = e.target.closest('button, a');
    if (!el) return;
    if (el.dataset.color !== undefined) { filter.color = el.dataset.color; renderList(); }
    else if (el.dataset.blind) { filter.blind = filter.blind === el.dataset.blind ? '' : el.dataset.blind; renderList(); }
    else if (el.id === 'compare-toggle') { filter.compare = !filter.compare; filter.picked.clear(); renderList(); }
    else if (el.id === 'compare-go') { location.hash = `#/compare?ids=${[...filter.picked].join(',')}`; }
    else if (el.id === 'quick-backup') { await doBackup(); renderList(); }
    else if (filter.compare && el.dataset.id) {
      e.preventDefault();
      if (filter.picked.has(el.dataset.id)) filter.picked.delete(el.dataset.id);
      else if (filter.picked.size < 4) filter.picked.add(el.dataset.id);
      else toast(t('compare.max'));
      renderList();
    }
  };
}

async function renderView(id) {
  const raw = await db.get(id);
  if (!raw) { view.innerHTML = `<p class="empty">${esc(t('notFound'))}</p>`; return; }
  const r = normalize(raw);
  const hidden = isHidden(r);
  const i = r.info;
  const sc = r.blind.enabled && r.blind.revealed ? blindScore(r) : null;
  const info = hidden ? [] : [
    [t('f.grapes'), i.grapes.join(', ')], [t('f.region'), [i.region, i.country].filter(Boolean).join(', ')],
    [t('f.price'), [priceText(i.price, i.currency), i.shop].filter(Boolean).join(' · ')],
  ];
  info.push([t('f.style'), `${colorLabel(i.color)} · ${styleLabel(i.style)}`], [t('f.date'), i.date],
    [t('f.place'), i.place], [t('f.companions'), i.companions]);

  view.innerHTML = `
    <article class="detail">
      ${r.photo ? `<img class="hero" src="${r.photo}" alt="${esc(t('photo.alt'))}">` : ''}
      <h1>${esc(title(r))} ${!hidden && i.vintage ? `<span class="muted">${esc(i.vintage)}</span>` : ''}</h1>
      <dl class="info">${info.filter(([, v]) => v).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>

      ${hidden ? `<div class="banner">${esc(t('blind.inProgress'))}
        <a class="btn small primary" href="#/edit/${r.id}?reveal=1">${esc(t('blind.reveal'))}</a></div>` : ''}
      ${sc ? `<section class="card"><h2>${esc(t('blind.result', `${sc.correct}/${sc.total}`))}</h2>
        <ul class="score-summary">${BLIND_KEYS.map((k) => {
          const v = r.blind.result[k];
          const g = k.endsWith('Band') ? (r.blind.guess[k] && bandLabel(r.blind.guess[k])) : r.blind.guess[k];
          return `<li class="${v === true ? 'ok' : v === false ? 'ng' : 'na'}">${v === true ? '✓' : v === false ? '✗' : '–'} ${esc(blindKeyLabel(k))}: ${esc(g || '—')}</li>`;
        }).join('')}</ul></section>` : ''}

      <section class="card sat"><h2>${esc(t('sat.note'))} <button class="btn small ghost" id="copy-sat">${esc(t('btn.copy'))}</button></h2>
        ${satLines(r).map((s) => `<h3>${s.label}${s.hint ? ` <span class="ko">${esc(s.hint)}</span>` : ''}</h3>
          ${s.rows.length ? `<dl>${s.rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>` : `<p class="muted small">${esc(t('notEntered'))}</p>`}`).join('')}
        ${r.sat.nose.notes ? `<p class="note">${esc(t('note.nose', r.sat.nose.notes))}</p>` : ''}
        ${r.sat.palate.notes ? `<p class="note">${esc(t('note.palate', r.sat.palate.notes))}</p>` : ''}
        ${r.sat.conclusion.reason ? `<p class="note">${esc(t('note.reason', r.sat.conclusion.reason))}</p>` : ''}
      </section>

      ${r.personal.rating || r.personal.rebuy || r.personal.notes ? `<section class="card"><h2>${esc(t('sec.personal'))}</h2>
        ${r.personal.rating ? `<div class="stars static">${'★'.repeat(r.personal.rating)}${'☆'.repeat(5 - r.personal.rating)}</div>` : ''}
        ${r.personal.rebuy ? `<p>${esc(t('note.rebuy', t(`rebuy.${r.personal.rebuy}`)))}</p>` : ''}
        ${r.personal.notes ? `<p class="note">${esc(r.personal.notes)}</p>` : ''}</section>` : ''}

      <div class="actions">
        ${!hidden && i.grapes[0] ? `<a class="btn ghost" href="#/compare?grape=${encodeURIComponent(i.grapes[0])}">${esc(t('compareSameGrape'))}</a>` : ''}
        <a class="btn primary" href="#/edit/${r.id}">${esc(t('btn.edit'))}</a>
      </div>
    </article>`;

  $('#copy-sat').onclick = async () => {
    const text = [title(r), ...satLines(r).map((s) => `${s.label}: ${s.rows.map(([k, v]) => `${k} ${v}`).join('; ')}`)].join('\n');
    try { await navigator.clipboard.writeText(text); toast(t('toast.copied')); } catch { toast(t('toast.copyFail')); }
  };
}

async function doBackup() {
  try {
    const n = await exportJSON();
    if (n !== false) toast(t('toast.backedUp', n));
  } catch (e) { toast(t('toast.backupFail', e.message)); }
}

function ratesLine() {
  const fx = fxInfo();
  const per = (c) => formatMoney(1 / fx.rates[c], 'KRW');
  const when = fx.source === 'built-in' ? `${fx.date} · ${t('fx.builtin')}` : `${fx.date} · ${fx.source}`;
  return `1 USD = ${per('USD')} · 1 RUB = ${per('RUB')}<br><span class="muted">${esc(t('fx.asOf', when))}</span>`;
}

async function renderSettings() {
  const count = (await db.all()).length;
  const last = lastBackup();
  let persisted = null;
  try { persisted = await navigator.storage?.persisted?.(); } catch { /* 무시 */ }
  const est = await navigator.storage?.estimate?.().catch(() => null);
  const storage = t(persisted ? 'storage.on' : persisted === false ? 'storage.off' : 'storage.unknown');

  view.innerHTML = `
    <h1>${esc(t('settings.title'))}</h1>
    <section class="card"><h2>${esc(t('settings.lang'))}</h2>
      <div class="chips" id="lang-chips">${LANGS.map(([k, l]) => `
        <button class="chip${getLang() === k ? ' on' : ''}" data-lang="${k}">${esc(l)}</button>`).join('')}</div>
    </section>
    <section class="card"><h2>${esc(t('settings.currency'))}</h2>
      <div class="chips" id="cur-chips">${CURRENCIES.map((c) => `
        <button class="chip${getCurrency() === c ? ' on' : ''}" data-cur="${c}">${c}</button>`).join('')}</div>
      <p class="muted small">${esc(t('settings.currencyHint'))}</p>
      <p class="small"><b>${esc(t('fx.rates'))}</b><br><span id="fx-line">${ratesLine()}</span></p>
      <button class="btn small" id="fx-refresh">↻ ${esc(t('fx.refresh'))}</button>
    </section>
    <section class="card"><h2>${esc(t('settings.backup'))}</h2>
      <p>${t('backup.summary', { n: count, d: esc(last ? new Date(last).toLocaleDateString(locale()) : t('backup.none')) })}</p>
      <p class="muted small">${esc(t('backup.explain'))}</p>
      <div class="stack">
        <button class="btn primary" id="backup">${esc(t('backup.save'))}</button>
        <label class="btn"><input type="file" accept="application/json,.json" id="restore" hidden>${esc(t('backup.restore'))}</label>
        <button class="btn" id="csv">${esc(t('backup.csv'))}</button>
      </div>
    </section>
    <section class="card"><h2>${esc(t('install.title'))}</h2>
      <p class="small">${t('install.how')}</p>
      <p class="muted small">${esc(t('install.note'))}</p>
      <p class="small">${esc(t('storage.label'))}: <b>${esc(storage)}</b>
        ${est ? ` · ${esc(t('storage.usage', (est.usage / 1048576).toFixed(1)))}` : ''}</p>
    </section>
    <section class="card"><h2>${esc(t('danger.title'))}</h2>
      <button class="btn danger" id="wipe">${esc(t('danger.wipe'))}</button>
    </section>
    <p class="muted small center">${esc(t('footer'))}</p>`;

  $('#lang-chips').onclick = (e) => { const b = e.target.closest('[data-lang]'); if (b) changeLang(b.dataset.lang); };
  $('#cur-chips').onclick = (e) => {
    const b = e.target.closest('[data-cur]');
    if (!b) return;
    setCurrency(b.dataset.cur);
    renderSettings();
  };
  $('#fx-refresh').onclick = async () => {
    const ok = await refreshRates({ force: true });
    toast(t(ok ? 'fx.updated' : 'fx.failed'), 3000);
    $('#fx-line').innerHTML = ratesLine();
  };
  $('#backup').onclick = async () => { await doBackup(); renderSettings(); };
  $('#csv').onclick = async () => { const n = await exportCSV(); toast(t('toast.csv', n)); };
  $('#restore').onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const { added, updated, skipped } = await importJSON(f);
      toast(t('toast.restored', { a: added, u: updated, s: skipped }), 4000);
      renderSettings();
    } catch (err) { toast(t('toast.restoreFail', err.message), 4000); }
  };
  $('#wipe').onclick = async () => {
    if (!confirm(t('confirm.wipe', count))) return;
    const word = t('wipe.word');
    if (prompt(t('prompt.wipe', word)) !== word) return;
    await db.clear();
    toast(t('toast.wiped'));
    renderSettings();
  };
}

// index.html의 고정 문구 (탭바, 새 기록 메뉴 등)
function applyStaticText() {
  document.documentElement.lang = getLang();
  document.title = t('app.title');
  $$('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  $$('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
  $('#lang-select').value = getLang();
}

function changeLang(l) {
  setLang(l);
  applyStaticText();
  // 작성 중인 기록은 입력 내용을 유지한 채 다시 그림
  if (leaveGuard?.rerender) leaveGuard.rerender();
  else route({ keepScroll: true });
}

async function route({ keepScroll = false } = {}) {
  if (leaveGuard && !keepScroll && !leaveGuard()) {
    history.replaceState(null, '', lastHash || '#/');
    return;
  }
  leaveGuard = null;
  lastHash = location.hash;
  view.onclick = null; view.oninput = null; view.onchange = null; view.onkeydown = null;

  const [path, query = ''] = (location.hash.slice(1) || '/').split('?');
  const params = new URLSearchParams(query);
  const parts = path.split('/').filter(Boolean);

  $$('.tabbar a').forEach((a) => a.classList.toggle('on', a.getAttribute('href') === `#/${parts[0] || ''}`));
  const y = window.scrollY;

  try {
    switch (parts[0]) {
      case undefined: await renderList(); break;
      case 'new': leaveGuard = await renderForm(view, { blind: params.get('blind') === '1' }); break;
      case 'edit': leaveGuard = await renderForm(view, { id: parts[1], reveal: params.get('reveal') === '1' }); break;
      case 'view': await renderView(parts[1]); break;
      case 'stats': await renderStats(view); break;
      case 'compare': await renderCompare(view, params); break;
      case 'settings': await renderSettings(); break;
      default: location.hash = '#/';
    }
  } catch (err) {
    console.error(err);
    view.innerHTML = `<p class="empty">${esc(t('error.generic', err.message))}</p>`;
  }
  window.scrollTo(0, keepScroll ? y : 0);
}

window.addEventListener('hashchange', () => route());

$('#fab').onclick = (e) => {
  e.preventDefault();
  $('#new-menu').hidden = !$('#new-menu').hidden;
};
$('#new-menu').onclick = () => { $('#new-menu').hidden = true; };
// 상단은 좁아서 짧은 코드(KO/EN/RU)로, 설정 화면에는 전체 이름으로 표시
$('#lang-select').innerHTML = LANGS.map(([k, l]) => `<option value="${k}" aria-label="${esc(l)}">${k.toUpperCase()}</option>`).join('');
$('#lang-select').onchange = (e) => changeLang(e.target.value);

applyStaticText();
requestPersist();
route();

// 환율은 백그라운드에서 갱신하고, 설정 화면을 보고 있으면 바로 반영
refreshRates().then((updated) => {
  if (updated && location.hash.startsWith('#/settings')) $('#fx-line').innerHTML = ratesLine();
});

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
