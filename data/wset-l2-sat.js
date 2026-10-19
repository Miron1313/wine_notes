// WSET Level 2 Systematic Approach to Tasting Wine (SAT) 용어 데이터.
// 기준: WSET L2 Wines SAT (2023 Issue 2) 구조. 가지고 계신 교재와 다르면 이 파일만 고치면 됩니다.
// 각 항목: [영문 용어(시험용), 한글 힌트]

export const SAT = {
  appearance: {
    label: 'Appearance', ko: '외관',
    fields: {
      clarity: { label: 'Clarity', ko: '투명도', scale: [['clear', '맑음'], ['hazy (faulty?)', '탁함·결함?']] },
      intensity: { label: 'Intensity', ko: '색의 농도', scale: [['pale', '옅음'], ['medium', '중간'], ['deep', '진함']] },
      colour: {
        label: 'Colour', ko: '색',
        byColor: {
          white: [['lemon', '레몬'], ['gold', '골드'], ['amber', '앰버']],
          rose: [['pink', '핑크'], ['salmon', '살몬'], ['orange', '오렌지']],
          red: [['purple', '퍼플'], ['ruby', '루비'], ['garnet', '가넷'], ['tawny', '토니']],
        },
      },
    },
  },
  nose: {
    label: 'Nose', ko: '향',
    fields: {
      condition: { label: 'Condition', ko: '상태', scale: [['clean', '깨끗함'], ['unclean (faulty?)', '이취·결함?']] },
      intensity: { label: 'Intensity', ko: '강도', scale: [['light', '약함'], ['medium', '중간'], ['pronounced', '강함']] },
      aromas: { label: 'Aroma characteristics', ko: '아로마 특징', lexicon: true },
    },
  },
  palate: {
    label: 'Palate', ko: '맛',
    fields: {
      sweetness: { label: 'Sweetness', ko: '당도', scale: [['dry', '드라이'], ['off-dry', '오프드라이'], ['medium', '미디엄'], ['sweet', '스위트']] },
      acidity: { label: 'Acidity', ko: '산도', scale: [['low', '낮음'], ['medium', '중간'], ['high', '높음']] },
      tannin: { label: 'Tannin', ko: '타닌', scale: [['low', '낮음'], ['medium', '중간'], ['high', '높음']], redOnly: true },
      alcohol: { label: 'Alcohol', ko: '알코올', scale: [['low', '낮음'], ['medium', '중간'], ['high', '높음']] },
      body: { label: 'Body', ko: '바디', scale: [['light', '가벼움'], ['medium', '중간'], ['full', '무거움']] },
      flavourIntensity: { label: 'Flavour intensity', ko: '풍미 강도', scale: [['light', '약함'], ['medium', '중간'], ['pronounced', '강함']] },
      flavours: { label: 'Flavour characteristics', ko: '풍미 특징', lexicon: true },
      finish: { label: 'Finish', ko: '여운', scale: [['short', '짧음'], ['medium', '중간'], ['long', '김']] },
    },
  },
  conclusion: {
    label: 'Conclusions', ko: '결론',
    fields: {
      quality: { label: 'Quality level', ko: '품질', scale: [['faulty', '결함'], ['poor', '나쁨'], ['acceptable', '무난'], ['good', '좋음'], ['very good', '매우 좋음'], ['outstanding', '탁월']] },
    },
  },
};

// 통계용 수치 변환 (구조감 평균 계산)
export const SCALE_INDEX = (section, field, value) => {
  const f = SAT[section]?.fields?.[field];
  if (!f?.scale || !value) return null;
  const i = f.scale.findIndex(([en]) => en === value);
  return i < 0 ? null : i + 1;
};

// WSET Wine-Lexicon (L2 수준 요약). [영문, 한글]
export const LEXICON = [
  { group: 'Primary', ko: '1차 (포도·발효)', clusters: [
    { name: 'Floral', ko: '꽃', terms: [['blossom', '꽃'], ['elderflower', '엘더플라워'], ['rose', '장미'], ['violet', '제비꽃']] },
    { name: 'Green fruit', ko: '녹색 과일', terms: [['apple', '사과'], ['gooseberry', '구스베리'], ['pear', '배'], ['grape', '포도']] },
    { name: 'Citrus fruit', ko: '시트러스', terms: [['grapefruit', '자몽'], ['lemon', '레몬'], ['lime', '라임']] },
    { name: 'Stone fruit', ko: '핵과', terms: [['peach', '복숭아'], ['apricot', '살구'], ['nectarine', '천도복숭아']] },
    { name: 'Tropical fruit', ko: '열대 과일', terms: [['banana', '바나나'], ['lychee', '리치'], ['mango', '망고'], ['melon', '멜론'], ['passion fruit', '패션프루트'], ['pineapple', '파인애플']] },
    { name: 'Red fruit', ko: '붉은 과일', terms: [['redcurrant', '레드커런트'], ['cranberry', '크랜베리'], ['raspberry', '라즈베리'], ['strawberry', '딸기'], ['red cherry', '체리'], ['red plum', '자두']] },
    { name: 'Black fruit', ko: '검은 과일', terms: [['blackcurrant', '블랙커런트'], ['blackberry', '블랙베리'], ['blueberry', '블루베리'], ['black cherry', '블랙체리'], ['black plum', '블랙플럼']] },
    { name: 'Dried/cooked fruit', ko: '말린·익힌 과일', terms: [['fig', '무화과'], ['prune', '건자두'], ['raisin', '건포도'], ['jam', '잼'], ['baked fruit', '구운 과일']] },
    { name: 'Herbaceous', ko: '풀 향', terms: [['green bell pepper', '피망'], ['grass', '풀'], ['tomato leaf', '토마토잎'], ['asparagus', '아스파라거스']] },
    { name: 'Herbal', ko: '허브', terms: [['eucalyptus', '유칼립투스'], ['mint', '민트'], ['fennel', '펜넬'], ['dill', '딜'], ['dried herbs', '말린 허브']] },
    { name: 'Spice', ko: '향신료', terms: [['black pepper', '흑후추'], ['white pepper', '백후추'], ['liquorice', '감초']] },
    { name: 'Other', ko: '기타', terms: [['wet stones', '젖은 돌'], ['flint', '부싯돌']] },
  ] },
  { group: 'Secondary', ko: '2차 (양조)', clusters: [
    { name: 'Yeast', ko: '효모', terms: [['biscuit', '비스킷'], ['bread', '빵'], ['toast', '토스트'], ['pastry', '페이스트리'], ['brioche', '브리오슈']] },
    { name: 'Malolactic', ko: '젖산발효', terms: [['butter', '버터'], ['cheese', '치즈'], ['cream', '크림']] },
    { name: 'Oak', ko: '오크', terms: [['vanilla', '바닐라'], ['cloves', '정향'], ['nutmeg', '넛맥'], ['coconut', '코코넛'], ['smoke', '훈연'], ['cedar', '삼나무'], ['charred wood', '그을린 나무'], ['chocolate', '초콜릿'], ['coffee', '커피']] },
  ] },
  { group: 'Tertiary', ko: '3차 (숙성)', clusters: [
    { name: 'Bottle age (white)', ko: '병숙성(화이트)', terms: [['petrol', '페트롤'], ['honey', '꿀'], ['nuts', '견과'], ['mushroom', '버섯'], ['hay', '건초']] },
    { name: 'Bottle age (red)', ko: '병숙성(레드)', terms: [['dried fruit', '말린 과일'], ['leather', '가죽'], ['earth', '흙'], ['mushroom', '버섯'], ['meat', '고기'], ['tobacco', '담배'], ['forest floor', '숲 바닥']] },
    { name: 'Oxidation', ko: '산화', terms: [['almond', '아몬드'], ['hazelnut', '헤이즐넛'], ['walnut', '호두'], ['caramel', '캐러멜']] },
  ] },
];

// L2 주요 품종 (자동완성용, 목록 외 입력 가능)
export const GRAPES = [
  'Chardonnay', 'Sauvignon Blanc', 'Riesling', 'Semillon', 'Chenin Blanc', 'Pinot Grigio/Gris',
  'Gewurztraminer', 'Viognier', 'Albariño', 'Grüner Veltliner', 'Furmint', 'Torrontés', 'Muscat',
  'Garganega', 'Verdicchio', 'Fiano', 'Assyrtiko', 'Glera',
  'Pinot Noir', 'Cabernet Sauvignon', 'Merlot', 'Syrah/Shiraz', 'Grenache/Garnacha', 'Tempranillo',
  'Malbec', 'Pinotage', 'Zinfandel/Primitivo', 'Carmenère', 'Gamay', 'Nebbiolo', 'Sangiovese',
  'Barbera', 'Corvina', 'Montepulciano', "Nero d'Avola", 'Cabernet Franc', 'Touriga Nacional',
];

export const COUNTRIES = [
  'France', 'Italy', 'Spain', 'Portugal', 'Germany', 'Austria', 'Hungary', 'Greece',
  'USA', 'Canada', 'Chile', 'Argentina', 'Australia', 'New Zealand', 'South Africa', 'Korea',
];

export const COLORS = [['white', '화이트'], ['rose', '로제'], ['red', '레드']];
export const STYLES = [['still', '스틸'], ['sparkling', '스파클링'], ['sweet', '스위트'], ['fortified', '주정강화']];

// 블라인드 추론 구간
export const VINTAGE_BANDS = [['0-3', '0–3년 (영)'], ['4-7', '4–7년'], ['8-15', '8–15년'], ['16+', '16년 이상']];
export const PRICE_BANDS = [['<30k', '3만원 미만'], ['30-60k', '3–6만원'], ['60-100k', '6–10만원'], ['100-200k', '10–20만원'], ['200k+', '20만원 이상']];

export function vintageBand(vintage, tastingDate) {
  const v = parseInt(vintage, 10);
  if (!v) return null;
  const y = tastingDate ? new Date(tastingDate).getFullYear() : new Date().getFullYear();
  const age = y - v;
  if (age <= 3) return '0-3';
  if (age <= 7) return '4-7';
  if (age <= 15) return '8-15';
  return '16+';
}

export function priceBand(price) {
  const p = Number(price);
  if (!p) return null;
  if (p < 30000) return '<30k';
  if (p < 60000) return '30-60k';
  if (p < 100000) return '60-100k';
  if (p < 200000) return '100-200k';
  return '200k+';
}
