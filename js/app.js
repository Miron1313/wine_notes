// 라우터와 목록·상세·설정 화면
import { db, requestPersist } from './db.js';
import { normalize, isHidden, title, colorKo, styleKo, satLines, blindScore, BLIND_KEYS, bandKo } from './model.js';
import { renderForm } from './form.js';
import { renderStats, renderCompare } from './stats.js';
import { exportJSON, importJSON, exportCSV, lastBackup, needsBackupReminder } from './backup.js';
import { esc, $, $$, toast, won } from './util.js';

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
    ? `<div class="banner">💾 ${lastBackup() ? '마지막 백업 후 2주가 지났어요.' : '아직 백업한 적이 없어요.'} 기록은 이 폰에만 있습니다.
        <button class="btn small" id="quick-backup">지금 백업</button></div>` : '';

  view.innerHTML = `
    ${banner}
    <div class="list-head">
      <input type="search" id="q" placeholder="와인, 품종, 산지, 아로마 검색" value="${esc(filter.q)}">
      <div class="chips filters">
        ${[['', '전체'], ['white', '화이트'], ['rose', '로제'], ['red', '레드']].map(([k, l]) => `
          <button class="chip small${filter.color === k ? ' on' : ''}" data-color="${k}">${l}</button>`).join('')}
        <button class="chip small${filter.blind === 'only' ? ' on' : ''}" data-blind="only">🕵️ 블라인드</button>
        <button class="chip small${filter.blind === 'pending' ? ' on' : ''}" data-blind="pending">공개 전</button>
        <button class="chip small${filter.compare ? ' on' : ''}" id="compare-toggle">⇆ 비교</button>
      </div>
    </div>
    ${filter.compare ? `<div class="compare-bar">비교할 와인을 2~4개 고르세요 (${filter.picked.size}개 선택)
      <button class="btn small primary" id="compare-go" ${filter.picked.size < 2 ? 'disabled' : ''}>비교하기</button></div>` : ''}
    ${rows.length ? `<ul class="cards">${rows.map((r) => {
      const hidden = isHidden(r);
      const sc = r.blind.enabled && r.blind.revealed ? blindScore(r) : null;
      return `<li><a class="wine-card ${r.info.color}${filter.picked.has(r.id) ? ' picked' : ''}" href="#/view/${r.id}" data-id="${r.id}">
        ${r.photo ? `<img src="${r.photo}" alt="" loading="lazy">` : `<div class="swatch"></div>`}
        <div class="wc-body">
          <div class="wc-title">${esc(title(r))} ${!hidden && r.info.vintage ? `<span class="muted">${esc(r.info.vintage)}</span>` : ''}</div>
          <div class="wc-sub">${hidden ? '🕵️ 정답 공개 전' : esc([r.info.grapes.join(', '), r.info.region || r.info.country].filter(Boolean).join(' · '))}</div>
          <div class="wc-meta">${esc(r.info.date)} · ${colorKo(r.info.color)}
            ${r.sat.conclusion.quality ? ` · ${esc(r.sat.conclusion.quality)}` : ''}
            ${r.personal.rating ? ` · ${'★'.repeat(r.personal.rating)}` : ''}
            ${sc ? ` · <span class="badge">블라인드 ${sc.correct}/${sc.total}</span>` : ''}</div>
        </div></a></li>`;
    }).join('')}</ul>`
      : `<div class="empty">${all.length ? '조건에 맞는 기록이 없습니다.' : '🍷<br>첫 와인을 기록해 보세요.<br><small>아래 + 버튼을 누르세요</small>'}</div>`}`;

  $('#q').oninput = (e) => {
    filter.q = e.target.value;
    clearTimeout(renderList.t);
    renderList.t = setTimeout(async () => { await renderList(); const el = $('#q'); el.focus(); el.setSelectionRange(el.value.length, el.value.length); }, 250);
  };
  view.onclick = async (e) => {
    const t = e.target.closest('button, a');
    if (!t) return;
    if (t.dataset.color !== undefined) { filter.color = t.dataset.color; renderList(); }
    else if (t.dataset.blind) { filter.blind = filter.blind === t.dataset.blind ? '' : t.dataset.blind; renderList(); }
    else if (t.id === 'compare-toggle') { filter.compare = !filter.compare; filter.picked.clear(); renderList(); }
    else if (t.id === 'compare-go') { location.hash = `#/compare?ids=${[...filter.picked].join(',')}`; }
    else if (t.id === 'quick-backup') { await doBackup(); renderList(); }
    else if (filter.compare && t.dataset.id) {
      e.preventDefault();
      if (filter.picked.has(t.dataset.id)) filter.picked.delete(t.dataset.id);
      else if (filter.picked.size < 4) filter.picked.add(t.dataset.id);
      else toast('최대 4개까지 비교할 수 있어요');
      renderList();
    }
  };
}

async function renderView(id) {
  const raw = await db.get(id);
  if (!raw) { view.innerHTML = '<p class="empty">기록을 찾을 수 없습니다.</p>'; return; }
  const r = normalize(raw);
  const hidden = isHidden(r);
  const i = r.info;
  const sc = r.blind.enabled && r.blind.revealed ? blindScore(r) : null;
  const info = hidden ? [] : [
    ['품종', i.grapes.join(', ')], ['산지', [i.region, i.country].filter(Boolean).join(', ')],
    ['가격', [won(i.price), i.shop].filter(Boolean).join(' · ')],
  ];
  info.push(['스타일', `${colorKo(i.color)} · ${styleKo(i.style)}`], ['날짜', i.date], ['장소', i.place], ['함께', i.companions]);

  view.innerHTML = `
    <article class="detail">
      ${r.photo ? `<img class="hero" src="${r.photo}" alt="라벨 사진">` : ''}
      <h1>${esc(title(r))} ${!hidden && i.vintage ? `<span class="muted">${esc(i.vintage)}</span>` : ''}</h1>
      <dl class="info">${info.filter(([, v]) => v).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>

      ${hidden ? `<div class="banner">🕵️ 블라인드 진행 중입니다. 추론을 마쳤으면 정답을 공개하세요.
        <a class="btn small primary" href="#/edit/${r.id}?reveal=1">정답 공개</a></div>` : ''}
      ${sc ? `<section class="card"><h2>🕵️ 블라인드 결과 ${sc.correct}/${sc.total}</h2>
        <ul class="score-summary">${BLIND_KEYS.map(([k, ko]) => {
          const v = r.blind.result[k];
          const g = k.endsWith('Band') ? bandKo(r.blind.guess[k]) : r.blind.guess[k];
          return `<li class="${v === true ? 'ok' : v === false ? 'ng' : 'na'}">${v === true ? '✓' : v === false ? '✗' : '–'} ${ko}: ${esc(g || '—')}</li>`;
        }).join('')}</ul></section>` : ''}

      <section class="card sat"><h2>SAT 노트 <button class="btn small ghost" id="copy-sat">복사</button></h2>
        ${satLines(r).map((s) => `<h3>${s.label} <span class="ko">${s.ko}</span></h3>
          ${s.rows.length ? `<dl>${s.rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>` : '<p class="muted small">미입력</p>'}`).join('')}
        ${r.sat.nose.notes ? `<p class="note">향 메모: ${esc(r.sat.nose.notes)}</p>` : ''}
        ${r.sat.palate.notes ? `<p class="note">맛 메모: ${esc(r.sat.palate.notes)}</p>` : ''}
        ${r.sat.conclusion.reason ? `<p class="note">품질 근거: ${esc(r.sat.conclusion.reason)}</p>` : ''}
      </section>

      ${r.personal.rating || r.personal.rebuy || r.personal.notes ? `<section class="card"><h2>나의 평가</h2>
        ${r.personal.rating ? `<div class="stars static">${'★'.repeat(r.personal.rating)}${'☆'.repeat(5 - r.personal.rating)}</div>` : ''}
        ${r.personal.rebuy ? `<p>재구매: ${{ yes: '살래요', maybe: '글쎄', no: '안 사요' }[r.personal.rebuy]}</p>` : ''}
        ${r.personal.notes ? `<p class="note">${esc(r.personal.notes)}</p>` : ''}</section>` : ''}

      <div class="actions">
        ${!hidden && i.grapes[0] ? `<a class="btn ghost" href="#/compare?grape=${encodeURIComponent(i.grapes[0])}">같은 품종 비교</a>` : ''}
        <a class="btn primary" href="#/edit/${r.id}">수정</a>
      </div>
    </article>`;

  $('#copy-sat').onclick = async () => {
    const text = [title(r), ...satLines(r).map((s) => `${s.label}: ${s.rows.map(([k, v]) => `${k} ${v}`).join('; ')}`)].join('\n');
    try { await navigator.clipboard.writeText(text); toast('SAT 노트를 복사했습니다'); } catch { toast('복사할 수 없습니다'); }
  };
}

async function doBackup() {
  try {
    const n = await exportJSON();
    if (n !== false) toast(`${n}개 기록을 백업했습니다`);
  } catch (e) { toast(`백업 실패: ${e.message}`); }
}

async function renderSettings() {
  const count = (await db.all()).length;
  const last = lastBackup();
  let persisted = null;
  try { persisted = await navigator.storage?.persisted?.(); } catch { /* 무시 */ }
  const est = await navigator.storage?.estimate?.().catch(() => null);

  view.innerHTML = `
    <h1>설정 · 백업</h1>
    <section class="card"><h2>💾 백업</h2>
      <p>기록 <b>${count}</b>개 · 마지막 백업: <b>${last ? new Date(last).toLocaleDateString('ko-KR') : '없음'}</b></p>
      <p class="muted small">기록은 이 폰의 브라우저 안에만 저장됩니다. 기기를 바꾸거나 브라우저 데이터를 지우기 전에 꼭 백업하세요. 백업 파일은 사진까지 포함합니다.</p>
      <div class="stack">
        <button class="btn primary" id="backup">백업 파일 저장 (JSON)</button>
        <label class="btn"><input type="file" accept="application/json,.json" id="restore" hidden>백업에서 복원 (병합)</label>
        <button class="btn" id="csv">CSV로 내보내기 (엑셀·구글 시트)</button>
      </div>
    </section>
    <section class="card"><h2>📱 홈 화면에 설치</h2>
      <p class="small"><b>iPhone</b>: Safari 공유 버튼 → "홈 화면에 추가"<br><b>Android</b>: Chrome 메뉴 → "앱 설치" 또는 "홈 화면에 추가"</p>
      <p class="muted small">iPhone은 홈 화면에 추가해야 데이터가 오래 보존됩니다. 설치 후에는 오프라인에서도 동작합니다.</p>
      <p class="small">저장소 보호: <b>${persisted ? '켜짐 ✓' : persisted === false ? '꺼짐 (브라우저가 공간 부족 시 지울 수 있음)' : '확인 불가'}</b>
        ${est ? ` · 사용량 ${(est.usage / 1048576).toFixed(1)}MB` : ''}</p>
    </section>
    <section class="card"><h2>⚠️ 위험 구역</h2>
      <button class="btn danger" id="wipe">모든 기록 삭제</button>
    </section>
    <p class="muted small center">WSET Level 2 SAT 기준 · 용어는 data/wset-l2-sat.js에서 수정</p>`;

  $('#backup').onclick = async () => { await doBackup(); renderSettings(); };
  $('#csv').onclick = async () => { const n = await exportCSV(); toast(`${n}개 기록을 CSV로 내보냈습니다`); };
  $('#restore').onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const { added, updated, skipped } = await importJSON(f);
      toast(`복원 완료: 추가 ${added} · 갱신 ${updated} · 건너뜀 ${skipped}`, 4000);
      renderSettings();
    } catch (err) { toast(`복원 실패: ${err.message}`, 4000); }
  };
  $('#wipe').onclick = async () => {
    if (!confirm(`기록 ${count}개를 모두 삭제할까요?`)) return;
    if (prompt('되돌릴 수 없습니다. 계속하려면 "삭제"라고 입력하세요') !== '삭제') return;
    await db.clear();
    toast('모두 삭제했습니다');
    renderSettings();
  };
}

async function route() {
  if (leaveGuard && !leaveGuard()) {
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
  window.scrollTo(0, 0);

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
    view.innerHTML = `<p class="empty">문제가 생겼습니다: ${esc(err.message)}</p>`;
  }
}

window.addEventListener('hashchange', route);

$('#fab').onclick = (e) => {
  e.preventDefault();
  $('#new-menu').hidden = !$('#new-menu').hidden;
};
$('#new-menu').onclick = () => { $('#new-menu').hidden = true; };

requestPersist();
route();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
