# 🍷 와인노트: WSET Level 2 테이스팅 기록장

WSET Level 2 SAT(Systematic Approach to Tasting) 기준으로 마신 와인을 기록하고 공부하는 모바일 웹앱(PWA)입니다.
서버 없이 폰 안(IndexedDB)에 저장되고, 홈 화면에 설치하면 오프라인에서도 동작합니다.

## 기능
- **SAT 선택형 입력**: Appearance, Nose, Palate, Conclusions를 WSET 영문 용어 칩으로 입력 (한글 힌트 포함)
- **Wine-Lexicon 아로마 칩**: 1차/2차/3차 분류 + 직접 입력, 향에서 고른 것을 풍미로 가져오기
- **블라인드 모드**: 품종·국가·산지·빈티지대·가격대를 추론 → 정답 공개 → 자동 채점(직접 수정 가능)
- **통계**: 블라인드 항목별 적중률과 추이, 품종별 구조감 평균, 자주 쓴 아로마, 품질 분포
- **비교**: 2~4개 기록 또는 같은 품종 기록을 나란히 비교 (다른 값 강조)
- **부가 정보**: 라벨 사진(자동 압축), 가격·구매처, 날짜·장소·함께한 사람, 별점·재구매 의사
- **백업**: JSON 백업/복원(병합), CSV 내보내기, 2주마다 백업 알림

## 사용 방법
1. GitHub Pages 주소를 폰에서 엽니다.
2. 홈 화면에 추가합니다.
   - iPhone: Safari 공유 버튼 → "홈 화면에 추가" (**iPhone은 꼭 추가해야 데이터가 오래 보존됩니다**)
   - Android: Chrome 메뉴 → "앱 설치"
3. 하단 ＋ 버튼 → 새 테이스팅 또는 블라인드 테이스팅
4. 백업 탭에서 정기적으로 JSON 백업 → 파일 앱/구글 드라이브에 보관

## GitHub Pages 배포 (최초 1회)
1. 레포 Settings → General → Danger Zone → **Change visibility → Public**
   (무료 플랜 Pages 조건. 공개되는 것은 코드뿐이고, 기록 데이터는 각자의 폰에만 있습니다.)
2. Settings → **Pages** → Build and deployment → Source: **GitHub Actions**
3. 이 브랜치를 `main`에 병합하면 `.github/workflows/pages.yml`이 자동 배포합니다.
4. 주소: `https://miron1313.github.io/Claude_code_mobile/`

## 로컬 실행
```bash
python3 -m http.server 8000
# 브라우저에서 http://localhost:8000
```
빌드 도구는 필요 없습니다 (순수 HTML/CSS/JS 모듈).

## 파일 구조
| 경로 | 역할 |
|---|---|
| `index.html` | 앱 화면 틀 |
| `css/app.css` | 스타일 (라이트/다크 모드) |
| `data/wset-l2-sat.js` | **SAT 용어·Wine-Lexicon·품종·국가 목록**: 교재와 다르면 여기만 수정 |
| `js/app.js` | 라우터, 목록·상세·설정 화면 |
| `js/form.js` | 기록 입력·수정·정답 공개 화면 |
| `js/stats.js` | 통계·비교 화면 |
| `js/backup.js` | JSON/CSV 백업·복원 |
| `js/model.js` | 데이터 구조, 블라인드 자동 채점 |
| `js/db.js` | IndexedDB 저장소 |
| `sw.js` | 오프라인 캐시 (앱 파일 수정 시 `VERSION` 올리기) |

## 참고
- SAT 용어는 WSET L2 Wines SAT 2023 Issue 2 구조를 기준으로 정리했습니다. 공식 원문: <https://www.wsetglobal.com/media/13156/wset_l2wines_sat_en_may2023_issue2.pdf>
- 상세 사양: [`docs/2026-10-19-wine-log-spec.md`](docs/2026-10-19-wine-log-spec.md)
