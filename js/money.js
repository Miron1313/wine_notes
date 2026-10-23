// 가격 표시 (원화 전용). 숫자 형식만 언어에 맞춤
import { PRICE_BAND_KEYS, PRICE_BOUNDS_KRW, priceBandKRW } from '../data/wset-l2-sat.js';
import { locale } from './i18n.js';

// zero: true면 0도 "₩0"으로 표시 (기본은 빈 문자열)
export function formatKRW(amount, { compact = false, zero = false } = {}) {
  const a = Number(amount);
  if (!Number.isFinite(a) || (!a && !zero)) return '';
  const opts = { style: 'currency', currency: 'KRW', currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0 };
  if (compact) Object.assign(opts, { notation: 'compact', maximumSignificantDigits: 2 });
  return new Intl.NumberFormat(locale(), opts).format(a);
}

// 블라인드 가격대 라벨 (예: ₩3만 – ₩6만)
export function priceBandLabel(key) {
  const i = PRICE_BAND_KEYS.indexOf(key);
  if (i < 0) return key;
  const b = PRICE_BOUNDS_KRW.map((k) => formatKRW(k, { compact: true }));
  if (i === 0) return `< ${b[0]}`;
  if (i === b.length) return `${b[b.length - 1]}+`;
  return `${b[i - 1]} – ${b[i]}`;
}

export const priceBand = priceBandKRW;
