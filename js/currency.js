// 통화 선택과 실시간 환율
import { PRICE_BAND_KEYS, PRICE_BOUNDS_KRW, priceBandKRW } from '../data/wset-l2-sat.js';
import { locale } from './i18n.js';

export const CURRENCIES = ['KRW', 'USD', 'RUB'];
const CUR_KEY = 'wine-log:currency';
const FX_KEY = 'wine-log:fx';
const MAX_AGE = 6 * 3600e3; // 6시간마다 새로 받음

// 네트워크가 없을 때 쓰는 기본 환율 (1원당 외화). 2026-10-19 시장 환율 기준:
// 1 USD ≈ 1,330원, 1 RUB ≈ 16.1원
const FALLBACK = { rates: { KRW: 1, USD: 1 / 1330, RUB: 1 / 16.1 }, date: '2026-10-19', source: 'built-in', fetchedAt: 0 };

// 무료 환율 소스 (위에서부터 시도)
const SOURCES = [
  {
    name: 'open.er-api.com',
    url: 'https://open.er-api.com/v6/latest/KRW',
    parse: (j) => j.result === 'success' && {
      USD: j.rates?.USD, RUB: j.rates?.RUB,
      date: new Date(j.time_last_update_unix * 1000).toISOString().slice(0, 10),
    },
  },
  {
    name: 'currency-api (jsDelivr)',
    url: 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/krw.json',
    parse: (j) => ({ USD: j.krw?.usd, RUB: j.krw?.rub, date: j.date }),
  },
  {
    name: 'currency-api (pages.dev)',
    url: 'https://latest.currency-api.pages.dev/v1/currencies/krw.json',
    parse: (j) => ({ USD: j.krw?.usd, RUB: j.krw?.rub, date: j.date }),
  },
];

let fx = FALLBACK;
try { const saved = JSON.parse(localStorage.getItem(FX_KEY)); if (saved?.rates?.USD > 0) fx = saved; } catch { /* 무시 */ }

let currency = 'KRW';
try { const saved = localStorage.getItem(CUR_KEY); if (CURRENCIES.includes(saved)) currency = saved; } catch { /* 무시 */ }

export const getCurrency = () => currency;
export function setCurrency(c) {
  if (!CURRENCIES.includes(c)) return;
  currency = c;
  try { localStorage.setItem(CUR_KEY, c); } catch { /* 무시 */ }
}

export const fxInfo = () => fx;

// 환율 갱신. 새 값을 받았으면 true
export async function refreshRates({ force = false } = {}) {
  if (!force && fx.fetchedAt && Date.now() - fx.fetchedAt < MAX_AGE) return false;
  for (const src of SOURCES) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(src.url, { signal: ctrl.signal, cache: 'no-store' });
      clearTimeout(timer);
      if (!res.ok) continue;
      const r = src.parse(await res.json());
      if (!(r && r.USD > 0 && r.RUB > 0)) continue;
      fx = { rates: { KRW: 1, USD: r.USD, RUB: r.RUB }, date: r.date || '', source: src.name, fetchedAt: Date.now() };
      try { localStorage.setItem(FX_KEY, JSON.stringify(fx)); } catch { /* 무시 */ }
      return true;
    } catch { /* 다음 소스 시도 */ }
  }
  return false;
}

export function convert(amount, from, to) {
  const a = Number(amount);
  if (!a || !fx.rates[from] || !fx.rates[to]) return NaN;
  return (a / fx.rates[from]) * fx.rates[to];
}

export const toKRW = (amount, from) => convert(amount, from || 'KRW', 'KRW');

export function formatMoney(amount, cur, { compact = false } = {}) {
  const a = Number(amount);
  if (!Number.isFinite(a) || !a) return '';
  const opts = compact
    ? { style: 'currency', currency: cur, currencyDisplay: 'narrowSymbol', notation: 'compact', maximumSignificantDigits: 2 }
    : { style: 'currency', currency: cur, currencyDisplay: 'narrowSymbol', maximumFractionDigits: cur === 'USD' ? 2 : 0 };
  return new Intl.NumberFormat(locale(), opts).format(a);
}

// 기록 가격 표시: 원래 통화 + (선택 통화가 다르면) 환산값
export function priceText(amount, cur) {
  const from = cur || 'KRW';
  const main = formatMoney(amount, from);
  if (!main || from === currency) return main;
  const conv = formatMoney(convert(amount, from, currency), currency);
  return conv ? `${main} (≈ ${conv})` : main;
}

// 블라인드 가격대 라벨: 원화 경계를 선택 통화로 환산
export function priceBandLabel(key) {
  const i = PRICE_BAND_KEYS.indexOf(key);
  if (i < 0) return key;
  const b = PRICE_BOUNDS_KRW.map((k) => formatMoney(convert(k, 'KRW', currency), currency, { compact: true }));
  if (i === 0) return `< ${b[0]}`;
  if (i === b.length) return `${b[b.length - 1]}+`;
  return `${b[i - 1]} – ${b[i]}`;
}

export const priceBand = (amount, cur) => priceBandKRW(toKRW(amount, cur));
