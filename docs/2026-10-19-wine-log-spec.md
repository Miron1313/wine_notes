# 와인노트 사양서 (2026-10-19)

## 목표
WSET Level 2 공부용으로 마신 와인을 SAT 형식으로 기록하고, 블라인드 추론·통계로 실력을 점검한다.

## 결정 사항
| 항목 | 결정 |
|---|---|
| 기준 | WSET Level 2 SAT (2023 Issue 2 구조) |
| 형태 | 모바일 웹앱(PWA), 빌드 도구 없는 순수 JS 모듈 |
| 저장 | 폰 IndexedDB + JSON 백업/복원, CSV 내보내기 |
| 언어 | 한국어 UI + 영어 SAT 용어(한글 힌트) |
| 배포 | GitHub Pages (Actions) |
| 부가 정보 | 라벨 사진, 가격·구매처, 날짜·장소·함께한 사람, 별점·재구매 |
| 블라인드 추론 | 품종, 국가, 산지, 빈티지대, 가격대 |
| 아로마 입력 | Wine-Lexicon 칩 + 직접 입력 |

## SAT 항목 (L2)
- **Appearance**: clarity (clear / hazy), intensity (pale / medium / deep), colour (white: lemon·gold·amber / rosé: pink·salmon·orange / red: purple·ruby·garnet·tawny)
- **Nose**: condition (clean / unclean), intensity (light / medium / pronounced), aroma characteristics
- **Palate**: sweetness (dry / off-dry / medium / sweet), acidity·tannin·alcohol (low / medium / high), body (light / medium / full), flavour intensity, flavour characteristics, finish (short / medium / long)
- **Conclusions**: quality (faulty / poor / acceptable / good / very good / outstanding)

> 가정: 공식 PDF에 직접 접근하지 못해 검색 결과와 L2 표준 구조로 정리했다. 교재와 다르면 `data/wset-l2-sat.js`만 수정한다.

## 블라인드 채점 규칙
- 품종: 추론 품종이 정답 품종 목록 중 하나와 일치 (대소문자·악센트 무시, `Syrah/Shiraz`처럼 `/` 별칭 인정)
- 국가: 일치
- 산지: 서로 포함 관계면 정답 (예: Burgundy ⊃ Chablis는 사용자가 수동 판정)
- 빈티지대: 시음일 기준 경과 연수 0–3 / 4–7 / 8–15 / 16+
- 가격대: 3만 미만 / 3–6만 / 6–10만 / 10–20만 / 20만 이상
- 자동 채점 후 사용자가 정답/오답/미채점으로 직접 바꿀 수 있음

## 데이터 보존
- `navigator.storage.persist()` 요청
- 마지막 백업 후 14일 경과 시 목록 상단 배너
- 백업 복원은 id 기준 병합, 수정 시각이 더 최근인 기록을 남김
