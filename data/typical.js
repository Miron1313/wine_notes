// 8대 주요 품종의 교과서적 대표 프로필 (Level 2 수준 요약)
// 구조감: 이 범위 안이면 "전형적". 기후·양조에 따라 벗어날 수 있음
// aromas: 전형성 비교용 대표 향 (Wine-Lexicon 용어), signature: 퀴즈 정답으로 쓰는 특징적인 향
export const TYPICAL = {
  Chardonnay: {
    color: 'white',
    sweetness: ['dry'], acidity: ['medium', 'high'], body: ['medium', 'full'], alcohol: ['medium', 'high'],
    aromas: ['apple', 'pear', 'lemon', 'peach', 'pineapple', 'banana', 'melon', 'butter', 'vanilla', 'toast'],
    signature: ['melon', 'butter', 'vanilla'],
  },
  'Pinot Grigio/Gris': {
    color: 'white',
    sweetness: ['dry', 'off-dry'], acidity: ['medium', 'high'], body: ['light', 'medium'], alcohol: ['medium'],
    aromas: ['pear', 'apple', 'lemon', 'peach', 'blossom', 'honey'],
    signature: ['pear'],
  },
  'Sauvignon Blanc': {
    color: 'white',
    sweetness: ['dry'], acidity: ['high'], body: ['light', 'medium'], alcohol: ['medium'],
    aromas: ['gooseberry', 'grass', 'green bell pepper', 'asparagus', 'elderflower', 'grapefruit', 'lime', 'passion fruit', 'flint'],
    signature: ['gooseberry', 'grass', 'green bell pepper', 'passion fruit', 'elderflower'],
  },
  Riesling: {
    color: 'white',
    sweetness: ['dry', 'off-dry', 'medium', 'sweet'], acidity: ['high'], body: ['light', 'medium'], alcohol: ['low', 'medium'],
    aromas: ['lime', 'lemon', 'apple', 'peach', 'apricot', 'blossom', 'wet stones', 'petrol', 'honey'],
    signature: ['lime', 'apricot', 'wet stones', 'petrol'],
  },
  'Cabernet Sauvignon': {
    color: 'red',
    sweetness: ['dry'], acidity: ['medium', 'high'], tannin: ['high'], body: ['medium', 'full'], alcohol: ['medium', 'high'],
    aromas: ['blackcurrant', 'black cherry', 'blackberry', 'green bell pepper', 'mint', 'eucalyptus', 'cedar', 'vanilla', 'smoke'],
    signature: ['blackcurrant', 'cedar', 'mint'],
  },
  Merlot: {
    color: 'red',
    sweetness: ['dry'], acidity: ['medium'], tannin: ['medium'], body: ['medium', 'full'], alcohol: ['medium', 'high'],
    aromas: ['red plum', 'black plum', 'red cherry', 'blackberry', 'cloves', 'chocolate', 'vanilla'],
    signature: ['red plum', 'black plum'],
  },
  'Pinot Noir': {
    color: 'red',
    sweetness: ['dry'], acidity: ['medium', 'high'], tannin: ['low', 'medium'], body: ['light', 'medium'], alcohol: ['medium'],
    aromas: ['strawberry', 'raspberry', 'red cherry', 'cranberry', 'mushroom', 'forest floor', 'earth', 'vanilla'],
    signature: ['strawberry', 'raspberry', 'cranberry', 'mushroom'],
  },
  'Syrah/Shiraz': {
    color: 'red',
    sweetness: ['dry'], acidity: ['medium', 'high'], tannin: ['medium', 'high'], body: ['medium', 'full'], alcohol: ['medium', 'high'],
    aromas: ['blackberry', 'black plum', 'black pepper', 'violet', 'liquorice', 'smoke', 'jam', 'chocolate', 'vanilla'],
    signature: ['black pepper', 'liquorice', 'violet'],
  },
};

// 산지 → 대표 품종 퀴즈. 오답 보기는 그 산지에서 대표적이지 않은 품종만
export const REGION_QUIZ = [
  ['Marlborough (New Zealand)', 'Sauvignon Blanc', ['Cabernet Sauvignon', 'Syrah/Shiraz', 'Merlot']],
  ['Sancerre (Loire, France)', 'Sauvignon Blanc', ['Riesling', 'Cabernet Sauvignon', 'Syrah/Shiraz']],
  ['Chablis (Burgundy, France)', 'Chardonnay', ['Sauvignon Blanc', 'Riesling', 'Pinot Grigio/Gris']],
  ['Mosel (Germany)', 'Riesling', ['Chardonnay', 'Sauvignon Blanc', 'Cabernet Sauvignon']],
  ['Clare Valley (Australia)', 'Riesling', ['Merlot', 'Pinot Grigio/Gris', 'Pinot Noir']],
  ['Médoc (Bordeaux, France)', 'Cabernet Sauvignon', ['Pinot Noir', 'Syrah/Shiraz', 'Riesling']],
  ['Napa Valley (USA)', 'Cabernet Sauvignon', ['Riesling', 'Pinot Grigio/Gris', 'Syrah/Shiraz']],
  ['Coonawarra (Australia)', 'Cabernet Sauvignon', ['Pinot Grigio/Gris', 'Riesling', 'Pinot Noir']],
  ['Saint-Émilion / Pomerol (Bordeaux, France)', 'Merlot', ['Pinot Noir', 'Syrah/Shiraz', 'Riesling']],
  ['Côte de Nuits (Burgundy, France)', 'Pinot Noir', ['Cabernet Sauvignon', 'Merlot', 'Syrah/Shiraz']],
  ['Central Otago (New Zealand)', 'Pinot Noir', ['Cabernet Sauvignon', 'Merlot', 'Syrah/Shiraz']],
  ['Northern Rhône (France)', 'Syrah/Shiraz', ['Pinot Noir', 'Merlot', 'Cabernet Sauvignon']],
  ['Barossa Valley (Australia)', 'Syrah/Shiraz', ['Pinot Noir', 'Sauvignon Blanc', 'Pinot Grigio/Gris']],
  ['Veneto / Friuli (Italy)', 'Pinot Grigio/Gris', ['Riesling', 'Syrah/Shiraz', 'Pinot Noir']],
];
