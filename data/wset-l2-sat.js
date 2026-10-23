// WSET Level 2 Systematic Approach to Tasting Wine (SAT) 용어 데이터.
// 기준: WSET L2 Wines SAT (2023 Issue 2) 구조. 가지고 계신 교재와 다르면 이 파일만 고치면 됩니다.
// 각 항목: [영문 용어(시험용·저장값), 한국어 힌트, 러시아어 힌트]

const LMH_F = [['low', '낮음', 'низкая'], ['medium', '중간', 'средняя'], ['high', '높음', 'высокая']];
const LMP_F = [['light', '약함', 'слабая'], ['medium', '중간', 'средняя'], ['pronounced', '강함', 'выраженная']];

export const SAT = {
  appearance: {
    label: 'Appearance', ko: '외관', ru: 'Внешний вид',
    fields: {
      clarity: { label: 'Clarity', ko: '투명도', ru: 'Прозрачность', scale: [['clear', '맑음', 'прозрачное'], ['hazy (faulty?)', '탁함·결함?', 'мутное (дефект?)']] },
      intensity: { label: 'Intensity', ko: '색의 농도', ru: 'Интенсивность цвета', scale: [['pale', '옅음', 'бледный'], ['medium', '중간', 'средний'], ['deep', '진함', 'насыщенный']] },
      colour: {
        label: 'Colour', ko: '색', ru: 'Цвет',
        byColor: {
          white: [['lemon', '레몬', 'лимонный'], ['gold', '골드', 'золотистый'], ['amber', '앰버', 'янтарный']],
          rose: [['pink', '핑크', 'розовый'], ['salmon', '살몬', 'лососевый'], ['orange', '오렌지', 'оранжевый']],
          red: [['purple', '퍼플', 'пурпурный'], ['ruby', '루비', 'рубиновый'], ['garnet', '가넷', 'гранатовый'], ['tawny', '토니', 'кирпичный']],
        },
      },
    },
  },
  nose: {
    label: 'Nose', ko: '향', ru: 'Аромат',
    fields: {
      condition: { label: 'Condition', ko: '상태', ru: 'Состояние', scale: [['clean', '깨끗함', 'чистый'], ['unclean (faulty?)', '이취·결함?', 'нечистый (дефект?)']] },
      intensity: { label: 'Intensity', ko: '강도', ru: 'Интенсивность', scale: LMP_F },
      // WSET SAT 공식 항목이 아닌 개인 기록용 (첫 향이 닫혀 있다가 시간이 지나 열리는 경우)
      openness: {
        label: 'Openness', ko: '열림 정도 · WSET 외', ru: 'Раскрытость · вне WSET', extra: true,
        scale: [['closed', '닫힘', 'закрытое'], ['opening', '열리는 중', 'раскрывается'], ['open', '열림', 'открытое']],
      },
      openedAfter: {
        label: 'Opened up after', ko: '열린 시점 · WSET 외', ru: 'Раскрылось через · вне WSET', extra: true,
        scale: [['15 min', '15분', '15 мин'], ['30 min', '30분', '30 мин'], ['1 hr', '1시간', '1 ч'],
          ['2 hr+', '2시간 이상', '2 ч и больше'], ['did not open', '끝까지 안 열림', 'так и не раскрылось']],
      },
      aromas: { label: 'Aroma characteristics', ko: '아로마 특징', ru: 'Ароматы', lexicon: true },
    },
  },
  palate: {
    label: 'Palate', ko: '맛', ru: 'Вкус',
    fields: {
      sweetness: { label: 'Sweetness', ko: '당도', ru: 'Сладость', scale: [['dry', '드라이', 'сухое'], ['off-dry', '오프드라이', 'полусухое'], ['medium', '미디엄', 'полусладкое'], ['sweet', '스위트', 'сладкое']] },
      acidity: { label: 'Acidity', ko: '산도', ru: 'Кислотность', scale: LMH_F },
      tannin: { label: 'Tannin', ko: '타닌', ru: 'Танины', scale: [['low', '낮음', 'низкие'], ['medium', '중간', 'средние'], ['high', '높음', 'высокие']], redOnly: true },
      alcohol: { label: 'Alcohol', ko: '알코올', ru: 'Алкоголь', scale: [['low', '낮음', 'низкий'], ['medium', '중간', 'средний'], ['high', '높음', 'высокий']] },
      body: { label: 'Body', ko: '바디', ru: 'Тело', scale: [['light', '가벼움', 'лёгкое'], ['medium', '중간', 'среднее'], ['full', '무거움', 'полное']] },
      flavourIntensity: { label: 'Flavour intensity', ko: '풍미 강도', ru: 'Интенсивность вкуса', scale: LMP_F },
      flavours: { label: 'Flavour characteristics', ko: '풍미 특징', ru: 'Вкусовые характеристики', lexicon: true },
      finish: { label: 'Finish', ko: '여운', ru: 'Послевкусие', scale: [['short', '짧음', 'короткое'], ['medium', '중간', 'среднее'], ['long', '김', 'длинное']] },
    },
  },
  conclusion: {
    label: 'Conclusions', ko: '결론', ru: 'Выводы',
    fields: {
      quality: {
        label: 'Quality level', ko: '품질', ru: 'Качество',
        scale: [['faulty', '결함', 'с дефектом'], ['poor', '나쁨', 'плохое'], ['acceptable', '무난', 'приемлемое'],
          ['good', '좋음', 'хорошее'], ['very good', '매우 좋음', 'очень хорошее'], ['outstanding', '탁월', 'выдающееся']],
      },
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

// WSET Wine-Lexicon (L2 수준 요약). [영문, 한국어, 러시아어]
export const LEXICON = [
  { group: 'Primary', ko: '1차 (포도·발효)', ru: '1-е (виноград, брожение)', clusters: [
    { name: 'Floral', ko: '꽃', ru: 'Цветочные', terms: [['blossom', '꽃', 'цветение'], ['elderflower', '엘더플라워', 'бузина'], ['rose', '장미', 'роза'], ['violet', '제비꽃', 'фиалка']] },
    { name: 'Green fruit', ko: '녹색 과일', ru: 'Зелёные фрукты', terms: [['apple', '사과', 'яблоко'], ['gooseberry', '구스베리', 'крыжовник'], ['pear', '배', 'груша'], ['grape', '포도', 'виноград']] },
    { name: 'Citrus fruit', ko: '시트러스', ru: 'Цитрусовые', terms: [['grapefruit', '자몽', 'грейпфрут'], ['lemon', '레몬', 'лимон'], ['lime', '라임', 'лайм']] },
    { name: 'Stone fruit', ko: '핵과', ru: 'Косточковые', terms: [['peach', '복숭아', 'персик'], ['apricot', '살구', 'абрикос'], ['nectarine', '천도복숭아', 'нектарин']] },
    { name: 'Tropical fruit', ko: '열대 과일', ru: 'Тропические фрукты', terms: [['banana', '바나나', 'банан'], ['lychee', '리치', 'личи'], ['mango', '망고', 'манго'], ['melon', '멜론', 'дыня'], ['passion fruit', '패션프루트', 'маракуйя'], ['pineapple', '파인애플', 'ананас']] },
    { name: 'Red fruit', ko: '붉은 과일', ru: 'Красные ягоды', terms: [['redcurrant', '레드커런트', 'красная смородина'], ['cranberry', '크랜베리', 'клюква'], ['raspberry', '라즈베리', 'малина'], ['strawberry', '딸기', 'клубника'], ['red cherry', '체리', 'вишня'], ['red plum', '자두', 'красная слива']] },
    { name: 'Black fruit', ko: '검은 과일', ru: 'Чёрные ягоды', terms: [['blackcurrant', '블랙커런트', 'чёрная смородина'], ['blackberry', '블랙베리', 'ежевика'], ['blueberry', '블루베리', 'черника'], ['black cherry', '블랙체리', 'чёрная черешня'], ['black plum', '블랙플럼', 'тёмная слива']] },
    { name: 'Dried/cooked fruit', ko: '말린·익힌 과일', ru: 'Сушёные/варёные фрукты', terms: [['fig', '무화과', 'инжир'], ['prune', '건자두', 'чернослив'], ['raisin', '건포도', 'изюм'], ['jam', '잼', 'варенье'], ['baked fruit', '구운 과일', 'печёные фрукты']] },
    { name: 'Herbaceous', ko: '풀 향', ru: 'Травянистые', terms: [['green bell pepper', '피망', 'зелёный перец'], ['grass', '풀', 'трава'], ['tomato leaf', '토마토잎', 'лист томата'], ['asparagus', '아스파라거스', 'спаржа']] },
    { name: 'Herbal', ko: '허브', ru: 'Пряные травы', terms: [['eucalyptus', '유칼립투스', 'эвкалипт'], ['mint', '민트', 'мята'], ['fennel', '펜넬', 'фенхель'], ['dill', '딜', 'укроп'], ['dried herbs', '말린 허브', 'сушёные травы']] },
    { name: 'Spice', ko: '향신료', ru: 'Специи', terms: [['black pepper', '흑후추', 'чёрный перец'], ['white pepper', '백후추', 'белый перец'], ['liquorice', '감초', 'лакрица']] },
    { name: 'Other', ko: '기타', ru: 'Другое', terms: [['wet stones', '젖은 돌', 'мокрые камни'], ['flint', '부싯돌', 'кремень']] },
  ] },
  { group: 'Secondary', ko: '2차 (양조)', ru: '2-е (винификация)', clusters: [
    { name: 'Yeast', ko: '효모', ru: 'Дрожжевые', terms: [['biscuit', '비스킷', 'печенье'], ['bread', '빵', 'хлеб'], ['toast', '토스트', 'тост'], ['pastry', '페이스트리', 'выпечка'], ['brioche', '브리오슈', 'бриошь']] },
    { name: 'Malolactic', ko: '젖산발효', ru: 'Малолактика', terms: [['butter', '버터', 'сливочное масло'], ['cheese', '치즈', 'сыр'], ['cream', '크림', 'сливки']] },
    { name: 'Oak', ko: '오크', ru: 'Дуб', terms: [['vanilla', '바닐라', 'ваниль'], ['cloves', '정향', 'гвоздика'], ['nutmeg', '넛맥', 'мускатный орех'], ['coconut', '코코넛', 'кокос'], ['smoke', '훈연', 'дым'], ['cedar', '삼나무', 'кедр'], ['charred wood', '그을린 나무', 'обугленное дерево'], ['chocolate', '초콜릿', 'шоколад'], ['coffee', '커피', 'кофе']] },
  ] },
  { group: 'Tertiary', ko: '3차 (숙성)', ru: '3-е (выдержка)', clusters: [
    { name: 'Bottle age (white)', ko: '병숙성(화이트)', ru: 'Бутылочная выдержка (белое)', terms: [['petrol', '페트롤', 'бензин'], ['honey', '꿀', 'мёд'], ['nuts', '견과', 'орехи'], ['mushroom', '버섯', 'грибы'], ['hay', '건초', 'сено']] },
    { name: 'Bottle age (red)', ko: '병숙성(레드)', ru: 'Бутылочная выдержка (красное)', terms: [['dried fruit', '말린 과일', 'сухофрукты'], ['leather', '가죽', 'кожа'], ['earth', '흙', 'земля'], ['mushroom', '버섯', 'грибы'], ['meat', '고기', 'мясо'], ['tobacco', '담배', 'табак'], ['forest floor', '숲 바닥', 'лесная подстилка']] },
    { name: 'Oxidation', ko: '산화', ru: 'Окисление', terms: [['almond', '아몬드', 'миндаль'], ['hazelnut', '헤이즐넛', 'фундук'], ['walnut', '호두', 'грецкий орех'], ['caramel', '캐러멜', 'карамель']] },
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

// 저장값 키 (화면 표시는 data/i18n.js의 color.* / style.* / vb.*)
export const COLOR_KEYS = ['white', 'rose', 'red'];
export const STYLE_KEYS = ['still', 'sparkling', 'sweet', 'fortified'];

// 블라인드 추론 구간
export const VINTAGE_BAND_KEYS = ['0-3', '4-7', '8-15', '16+'];
// 가격대는 원화 기준 경계로 채점하고, 화면에는 선택한 통화로 환산해 표시
export const PRICE_BAND_KEYS = ['<30k', '30-60k', '60-100k', '100-200k', '200k+'];
export const PRICE_BOUNDS_KRW = [30000, 60000, 100000, 200000];

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

export function priceBandKRW(krw) {
  const p = Number(krw);
  if (!p || !Number.isFinite(p)) return null;
  const i = PRICE_BOUNDS_KRW.findIndex((b) => p < b);
  return PRICE_BAND_KEYS[i < 0 ? PRICE_BAND_KEYS.length - 1 : i];
}

// ── Level 2 진도 체크 ──
// 기록 입력값 (선택: 기후·양조 방식)
export const CLIMATE_KEYS = ['cool', 'moderate', 'warm'];
export const METHOD_KEYS = { sparkling: ['traditional', 'tank', 'other'], fortified: ['sherry', 'port', 'other'] };

// 8대 주요 품종. match는 기록의 품종명과 비교할 소문자 이름 (슬래시로 나뉜 별칭 포함)
// subs: 샤르도네처럼 스타일별로 따로 체크하는 항목
export const PRINCIPAL_GRAPES = [
  { key: 'Chardonnay', ko: '샤르도네', match: ['chardonnay'], subs: ['cool', 'warm', 'oak'], pair: ['Chablis (France)', 'California (USA)'] },
  { key: 'Pinot Grigio/Gris', ko: '피노 그리지오/그리', match: ['pinot grigio', 'pinot gris'], pair: ['Veneto / Friuli (Italy)', 'Alsace (France)'] },
  { key: 'Sauvignon Blanc', ko: '소비뇽 블랑', match: ['sauvignon blanc'], pair: ['Marlborough (New Zealand)', 'Sancerre (France)'] },
  { key: 'Riesling', ko: '리슬링', match: ['riesling'], pair: ['Mosel (Germany)', 'Clare / Eden Valley (Australia)'] },
  { key: 'Cabernet Sauvignon', ko: '카베르네 소비뇽', match: ['cabernet sauvignon'], pair: ['Médoc (Bordeaux)', 'Napa Valley (USA)'] },
  { key: 'Merlot', ko: '메를로', match: ['merlot'], pair: ['Saint-Émilion / Pomerol (Bordeaux)', 'Chile'] },
  { key: 'Pinot Noir', ko: '피노 누아', match: ['pinot noir'], pair: ['Burgundy (France)', 'Central Otago (New Zealand)'] },
  { key: 'Syrah/Shiraz', ko: '시라/쉬라즈', match: ['syrah', 'shiraz'], pair: ['Northern Rhône (France)', 'Barossa Valley (Australia)'] },
];

// 스타일 진도 (스파클링: 전통/탱크, 주정강화: 셰리/포트)
export const PROGRESS_STYLES = [
  { style: 'sparkling', subs: ['traditional', 'tank'] },
  { style: 'fortified', subs: ['sherry', 'port'] },
];

// 다음 병 추천에 쓰는 대표 산지 예시 (상품명·가격은 넣지 않음)
export const SUB_EXAMPLES = {
  cool: 'Chablis, Côte de Beaune', warm: 'California, South Australia', oak: 'Meursault, Napa Valley',
  traditional: 'Champagne, Cava, Crémant', tank: 'Prosecco',
  sherry: 'Fino, Oloroso (Jerez)', port: 'Ruby, Tawny (Douro)',
};

// 원인 → 결과 입력값 (선택)
export const WINEMAKING_KEYS = ['stainless', 'oak', 'mlf', 'lees', 'carbonic'];
export const AGEING_KEYS = ['young', 'bottle', 'oxidative'];
export const TERTIARY_TERMS = LEXICON.find((g) => g.group === 'Tertiary').clusters.filter((c) => c.name.startsWith('Bottle'))
  .flatMap((c) => c.terms.map(([en]) => en));
export const OXIDATIVE_TERMS = LEXICON.find((g) => g.group === 'Tertiary').clusters.find((c) => c.name === 'Oxidation').terms.map(([en]) => en);
export const YEAST_TERMS = LEXICON.find((g) => g.group === 'Secondary').clusters.find((c) => c.name === 'Yeast').terms.map(([en]) => en);
export const MLF_TERMS = LEXICON.find((g) => g.group === 'Secondary').clusters.find((c) => c.name === 'Malolactic').terms.map(([en]) => en);
// 오크 숙성 판단용 용어 (Lexicon의 Oak 묶음)
export const OAK_TERMS = LEXICON.find((g) => g.group === 'Secondary').clusters.find((c) => c.name === 'Oak').terms.map(([en]) => en);
