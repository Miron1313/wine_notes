// 기록 데이터 구조와 블라인드 채점
import { SAT, vintageBand } from '../data/wset-l2-sat.js';
import { priceBand, priceBandLabel } from './money.js';
import { t, hint } from './i18n.js';
import { newId } from './db.js';
import { today } from './util.js';

export function emptyRecord({ blind = false } = {}) {
  const now = Date.now();
  return {
    id: newId(),
    createdAt: now,
    updatedAt: now,
    info: {
      name: '', producer: '', vintage: '', color: 'red', style: 'still', method: '', climate: '',
      grapes: [], country: '', region: '',
      price: '', shop: '', date: today(), place: '', companions: '',
    },
    photo: '',
    sat: {
      appearance: { clarity: 'clear', intensity: '', colour: '' },
      nose: { condition: 'clean', intensity: '', openness: '', openedAfter: '', aromas: [], notes: '' },
      palate: {
        sweetness: '', acidity: '', tannin: '', alcohol: '', body: '',
        flavourIntensity: '', flavours: [], finish: '', notes: '',
      },
      conclusion: { quality: '', reason: '' },
    },
    blind: {
      enabled: blind, revealed: false,
      guess: { grape: '', country: '', region: '', vintageBand: '', priceBand: '' },
      result: {},
    },
    personal: { rating: 0, rebuy: '', verdict: '', learning: '', notes: '' },
  };
}

// 이전 버전 기록이나 가져온 파일에 빠진 필드를 채움
export function normalize(r) {
  const base = emptyRecord();
  const merge = (a, b) => {
    const out = { ...a };
    for (const k of Object.keys(b || {})) {
      out[k] = a[k] && typeof a[k] === 'object' && !Array.isArray(a[k]) ? merge(a[k], b[k]) : b[k];
    }
    return out;
  };
  return merge(base, r);
}

export const isHidden = (r) => r.blind.enabled && !r.blind.revealed;

// 구매 판정 등급 (Claude 프로젝트의 채점 기준: 80+ / 65~79 / 50~64 / ~49)
export const VERDICT_KEYS = ['strong', 'buy', 'conditional', 'no'];

export const BLIND_KEYS = ['grape', 'country', 'region', 'vintageBand', 'priceBand'];

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

// 정답 공개 시 자동 채점 (true/false, 판단 불가 시 null). 사용자가 화면에서 고칠 수 있음.
export function autoScore(r) {
  const g = r.blind.guess;
  const i = r.info;
  const res = {};
  if (g.grape && i.grapes.length) {
    const guess = norm(g.grape).split('/');
    res.grape = i.grapes.some((x) => norm(x).split('/').some((p) => guess.includes(p)));
  } else res.grape = null;
  res.country = g.country && i.country ? norm(g.country) === norm(i.country) : null;
  res.region = g.region && i.region
    ? norm(i.region).includes(norm(g.region)) || norm(g.region).includes(norm(i.region)) : null;
  const vb = vintageBand(i.vintage, i.date);
  res.vintageBand = g.vintageBand && vb ? g.vintageBand === vb : null;
  const pb = priceBand(i.price);
  res.priceBand = g.priceBand && pb ? g.priceBand === pb : null;
  return res;
}

export function blindScore(r) {
  const vals = Object.values(r.blind.result || {}).filter((v) => v !== null && v !== undefined);
  return { correct: vals.filter(Boolean).length, total: vals.length };
}

// 표시용 라벨
export const colorLabel = (c) => t(`color.${c}`);
export const styleLabel = (s) => t(`style.${s}`);
export const blindKeyLabel = (k) => t(`bk.${k}`);
export const bandLabel = (k) => (k.includes('k') ? priceBandLabel(k) : t(`vb.${k}`));

export function title(r) {
  if (isHidden(r)) return t('blindNo', r.id.slice(0, 4));
  return [r.info.producer, r.info.name].filter(Boolean).join(' ') || t('untitled');
}

// SAT 결과를 시험 답안처럼 한 줄씩 정리
export function satLines(r) {
  const out = [];
  for (const [sk, sec] of Object.entries(SAT)) {
    const rows = [];
    for (const [fk, f] of Object.entries(sec.fields)) {
      const v = r.sat[sk]?.[fk];
      if (f.redOnly && r.info.color !== 'red' && !v) continue;
      if (Array.isArray(v)) { if (v.length) rows.push([f.label, v.join(', ')]); } else if (v) rows.push([f.label, v]);
    }
    out.push({ key: sk, label: sec.label, hint: hint(sec), rows });
  }
  return out;
}
