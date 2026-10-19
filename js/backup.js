// 백업·복원·CSV 내보내기
import { db } from './db.js';
import { normalize, isHidden, title, colorKo } from './model.js';
import { download, today } from './util.js';

const LAST_BACKUP = 'wine-log:lastBackup';
const REMIND_DAYS = 14;

export function lastBackup() {
  try { return Number(localStorage.getItem(LAST_BACKUP)) || 0; } catch { return 0; }
}

export function needsBackupReminder(count) {
  if (!count) return false;
  const last = lastBackup();
  return !last || Date.now() - last > REMIND_DAYS * 864e5;
}

export async function exportJSON() {
  const rows = await db.all();
  const payload = { app: 'wine-log', version: 1, exportedAt: new Date().toISOString(), tastings: rows };
  const name = `${today()}-wine-log-backup.json`;
  const text = JSON.stringify(payload);

  // iOS 홈 화면 앱에서는 다운로드 대신 공유 시트로 파일 앱/드라이브에 저장
  const file = typeof File !== 'undefined' ? new File([text], name, { type: 'application/json' }) : null;
  if (file && navigator.canShare?.({ files: [file] }) && /iPhone|iPad/.test(navigator.userAgent)) {
    try { await navigator.share({ files: [file], title: name }); } catch (e) { if (e.name === 'AbortError') return false; throw e; }
  } else {
    download(name, text, 'application/json');
  }
  try { localStorage.setItem(LAST_BACKUP, String(Date.now())); } catch { /* 무시 */ }
  return rows.length;
}

// 같은 id는 더 최근에 수정된 쪽을 남김
export async function importJSON(file) {
  const data = JSON.parse(await file.text());
  const rows = Array.isArray(data) ? data : data.tastings;
  if (!Array.isArray(rows)) throw new Error('와인 기록 백업 파일이 아닙니다');
  let added = 0; let updated = 0; let skipped = 0;
  for (const raw of rows) {
    if (!raw?.id) { skipped++; continue; }
    const r = normalize(raw);
    const cur = await db.get(r.id);
    if (!cur) { await db.put(r); added++; } else if ((r.updatedAt || 0) > (cur.updatedAt || 0)) { await db.put(r); updated++; } else skipped++;
  }
  return { added, updated, skipped };
}

export async function exportCSV() {
  const rows = await db.all();
  const cols = [
    ['날짜', (r) => r.info.date], ['와인', (r) => title(r)], ['빈티지', (r) => r.info.vintage],
    ['색', (r) => colorKo(r.info.color)], ['품종', (r) => r.info.grapes.join(' / ')], ['국가', (r) => r.info.country],
    ['산지', (r) => r.info.region], ['가격', (r) => r.info.price], ['구매처', (r) => r.info.shop],
    ['장소', (r) => r.info.place], ['함께', (r) => r.info.companions],
    ['Clarity', (r) => r.sat.appearance.clarity], ['Intensity(외관)', (r) => r.sat.appearance.intensity], ['Colour', (r) => r.sat.appearance.colour],
    ['Condition', (r) => r.sat.nose.condition], ['Intensity(향)', (r) => r.sat.nose.intensity], ['Aromas', (r) => r.sat.nose.aromas.join(', ')],
    ['Sweetness', (r) => r.sat.palate.sweetness], ['Acidity', (r) => r.sat.palate.acidity], ['Tannin', (r) => r.sat.palate.tannin],
    ['Alcohol', (r) => r.sat.palate.alcohol], ['Body', (r) => r.sat.palate.body], ['Flavour intensity', (r) => r.sat.palate.flavourIntensity],
    ['Flavours', (r) => r.sat.palate.flavours.join(', ')], ['Finish', (r) => r.sat.palate.finish],
    ['Quality', (r) => r.sat.conclusion.quality], ['품질 근거', (r) => r.sat.conclusion.reason],
    ['블라인드', (r) => (r.blind.enabled ? (isHidden(r) ? '진행 중' : '완료') : '')],
    ['추론 품종', (r) => r.blind.guess.grape], ['추론 국가', (r) => r.blind.guess.country],
    ['별점', (r) => r.personal.rating || ''], ['재구매', (r) => r.personal.rebuy], ['메모', (r) => r.personal.notes],
  ];
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [cols.map(([h]) => cell(h)).join(',')]
    .concat(rows.map((r) => cols.map(([, f]) => cell(f(normalize(r)))).join(',')));
  // 엑셀에서 한글이 깨지지 않도록 BOM 추가
  download(`${today()}-wine-log.csv`, `﻿${lines.join('\r\n')}`, 'text/csv;charset=utf-8');
  return rows.length;
}
