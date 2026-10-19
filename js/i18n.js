// 언어 선택과 번역 도우미
import { STRINGS, LANGS } from '../data/i18n.js';

const LANG_KEY = 'wine-log:lang';
const LOCALES = { ko: 'ko-KR', en: 'en-US', ru: 'ru-RU' };
let lang = 'ko';
try { const saved = localStorage.getItem(LANG_KEY); if (STRINGS[saved]) lang = saved; } catch { /* 무시 */ }

export { LANGS };
export const getLang = () => lang;
export const locale = () => LOCALES[lang];

export function setLang(l) {
  if (!STRINGS[l]) return;
  lang = l;
  try { localStorage.setItem(LANG_KEY, l); } catch { /* 무시 */ }
}

// t('key', 'value') → {x} 치환, t('key', { n, d }) → {n}, {d} 치환
export function t(key, vars) {
  const s = STRINGS[lang][key] ?? STRINGS.ko[key] ?? key;
  if (vars === undefined) return s;
  const map = typeof vars === 'object' ? vars : { x: vars };
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in map ? map[k] : m));
}

// SAT 용어 옆 작은 힌트: 한국어·러시아어는 번역을, 영어는 표시하지 않음
// 항목 형식: [en, ko, ru] 배열 또는 { ko, ru } 객체
export function hint(item) {
  if (lang === 'en' || !item) return '';
  if (Array.isArray(item)) return item[lang === 'ko' ? 1 : 2] || '';
  return item[lang] || '';
}
