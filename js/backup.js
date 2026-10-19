// 백업·복원·CSV 내보내기
import { db } from './db.js';
import { normalize, isHidden, title, colorLabel } from './model.js';
import { t } from './i18n.js';
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
  if (!Array.isArray(rows)) throw new Error(t('import.invalid'));
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
    [t('f.date'), (r) => r.info.date], [t('csv.wine'), (r) => title(r)], [t('f.vintage'), (r) => r.info.vintage],
    [t('f.color'), (r) => colorLabel(r.info.color)], [t('f.grapes'), (r) => r.info.grapes.join(' / ')], [t('f.country'), (r) => r.info.country],
    [t('f.region'), (r) => r.info.region], [t('f.price'), (r) => r.info.price], [t('f.currency'), (r) => (r.info.price ? r.info.currency : '')],
    [t('f.shop'), (r) => r.info.shop], [t('f.place'), (r) => r.info.place], [t('f.companions'), (r) => r.info.companions],
    ['Clarity', (r) => r.sat.appearance.clarity], ['Intensity (appearance)', (r) => r.sat.appearance.intensity], ['Colour', (r) => r.sat.appearance.colour],
    ['Condition', (r) => r.sat.nose.condition], ['Intensity (nose)', (r) => r.sat.nose.intensity], ['Aromas', (r) => r.sat.nose.aromas.join(', ')],
    ['Sweetness', (r) => r.sat.palate.sweetness], ['Acidity', (r) => r.sat.palate.acidity], ['Tannin', (r) => r.sat.palate.tannin],
    ['Alcohol', (r) => r.sat.palate.alcohol], ['Body', (r) => r.sat.palate.body], ['Flavour intensity', (r) => r.sat.palate.flavourIntensity],
    ['Flavours', (r) => r.sat.palate.flavours.join(', ')], ['Finish', (r) => r.sat.palate.finish],
    ['Quality', (r) => r.sat.conclusion.quality], [t('f.qualityReason'), (r) => r.sat.conclusion.reason],
    [t('csv.blind'), (r) => (r.blind.enabled ? t(isHidden(r) ? 'csv.inProgress' : 'csv.done') : '')],
    [t('csv.guessGrape'), (r) => r.blind.guess.grape], [t('csv.guessCountry'), (r) => r.blind.guess.country],
    [t('f.rating'), (r) => r.personal.rating || ''], [t('f.rebuy'), (r) => (r.personal.rebuy ? t(`rebuy.${r.personal.rebuy}`) : '')],
    [t('f.notes'), (r) => r.personal.notes],
  ];
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [cols.map(([h]) => cell(h)).join(',')]
    .concat(rows.map((r) => cols.map(([, f]) => cell(f(normalize(r)))).join(',')));
  // 엑셀에서 한글·러시아어가 깨지지 않도록 BOM 추가
  download(`${today()}-wine-log.csv`, `﻿${lines.join('\r\n')}`, 'text/csv;charset=utf-8');
  return rows.length;
}
