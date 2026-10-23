// Level 2 진도 집계와 Claude 프로젝트용 시음기록.md 만들기
import { PRINCIPAL_GRAPES, PROGRESS_STYLES, OAK_TERMS } from '../data/wset-l2-sat.js';
import { isHidden, title } from './model.js';
import { t, getLang } from './i18n.js';
import { formatKRW } from './money.js';

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const aliases = (g) => norm(g).split('/').map((x) => x.trim());

export const grapeName = (g) => (getLang() === 'ko' ? g.ko : g.key);
export const subLabel = (k) => t(['cool', 'warm', 'oak'].includes(k) ? `sub.${k}` : `method.${k}`);

const principalOf = (name) => PRINCIPAL_GRAPES.find((g) => aliases(name).some((a) => g.match.includes(a)));

// 블라인드 공개 전 기록은 품종·스타일을 모르므로 제외
export function computeProgress(records) {
  const open = records.filter((r) => !isHidden(r));

  const grapes = PRINCIPAL_GRAPES.map((g) => {
    const rs = open.filter((r) => r.info.grapes.some((n) => principalOf(n) === g));
    const subs = (g.subs || []).map((k) => {
      let done;
      if (k === 'oak') done = rs.some((r) => [...r.sat.nose.aromas, ...r.sat.palate.flavours].some((x) => OAK_TERMS.includes(x)));
      else done = rs.some((r) => r.info.climate === k);
      return { key: k, done };
    });
    return { grape: g, count: rs.length, done: rs.length > 0, subs };
  });

  const styles = PROGRESS_STYLES.map(({ style, subs }) => {
    const rs = open.filter((r) => r.info.style === style);
    return { style, count: rs.length, done: rs.length > 0, subs: subs.map((k) => ({ key: k, done: rs.some((r) => r.info.method === k) })) };
  });

  // 8대 품종 외에 마신 품종 (기록에 적힌 이름 그대로)
  const regional = {};
  for (const r of open) {
    for (const n of r.info.grapes) if (!principalOf(n)) regional[n] = (regional[n] || 0) + 1;
  }

  const items = [...grapes, ...styles];
  return {
    grapes, styles,
    regional: Object.entries(regional).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
    done: items.filter((x) => x.done).length,
    total: items.length,
  };
}

const cell = (v) => String(v ?? '').replace(/\|/g, '/').replace(/\s*\n\s*/g, ' ').trim();
const box = (done) => (done ? '[x]' : '[ ]');
const withSubs = (label, subs) => (subs.length ? `${label} (${subs.map((s) => `${subLabel(s.key)}${s.done ? ' ✓' : ''}`).join(' / ')})` : label);

// 붙여넣기용 기록 파일. 형식: 진도 체크 → 스타일 → 지역 주요 품종 → 기록 표
export function progressMarkdown(records) {
  const p = computeProgress(records);
  const rows = records.filter((r) => !isHidden(r))
    .sort((a, b) => (a.info.date || '').localeCompare(b.info.date || '') || (a.createdAt || 0) - (b.createdAt || 0));
  const cols = t('md.cols').split('|');
  return [
    `# ${t('md.title')}`, '',
    `## ${t('md.grapes')}`,
    ...p.grapes.map((g) => `- ${box(g.done)} ${withSubs(grapeName(g.grape), g.subs)}`), '',
    `## ${t('md.styles')}`,
    ...p.styles.map((s) => `- ${box(s.done)} ${withSubs(t(`style.${s.style}`), s.subs)}`), '',
    `## ${t('md.regional')}`,
    ...(p.regional.length ? p.regional.map(([n, c]) => `- ${n}${c > 1 ? ` (${c})` : ''}`) : ['-']), '',
    `## ${t('md.log')}`,
    `| ${cols.join(' | ')} |`,
    `|${cols.map(() => '---').join('|')}|`,
    ...rows.map((r) => `| ${[
      r.info.date,
      [title(r), r.info.vintage].filter(Boolean).join(' '),
      r.info.grapes.join(', '),
      [r.info.region, r.info.country].filter(Boolean).join(', '),
      formatKRW(r.info.spent || r.info.price),
      r.personal.verdict ? t(`verdict.${r.personal.verdict}`) : '',
      r.personal.learning,
    ].map(cell).join(' | ')} |`),
    '',
  ].join('\n');
}
