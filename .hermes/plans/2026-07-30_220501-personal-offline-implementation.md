# 말씀과 함께 걷기 개인 오프라인판 구현 계획

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** React + TypeScript로 로그인 없는 개인 성경 통독 웹앱을 완성하고 GitHub Pages에 배포한다.

**Architecture:** Vite 기반 React SPA로 새로 구성한다. 읽기 이벤트를 원본으로 저장하고 장별 횟수·진행률·달력을 파생 계산한다. 브라우저 저장소는 버전이 있는 저장소 계층으로 격리하며, UI는 오늘·통독표·진행·설정의 모바일 우선 4탭으로 구성한다.

**Tech Stack:** React, TypeScript, Vite, React Router, date-fns, Zod, Vitest, React Testing Library, Playwright, GitHub Actions/Pages

**Design spec:** `.hermes/plans/2026-07-30_220501-screen-design.md`

---

## 현재 상태와 결정

- 작업 경로: `C:\Users\User\Documents\bible-reading-tracker-web`
- 현재 파일: `index.html`, `styles.css`, `sw.js`, `manifest.webmanifest`, 문서 2개
- 현재 `index.html`과 서비스 워커가 참조하는 핵심 `app.js`가 존재하지 않아 기존 앱은 완전한 실행 상태가 아니다.
- 현재 폴더는 Git 저장소가 아니다.
- 1차는 개인 오프라인판만 완성한다.
- 교회 서버판은 별도 프로젝트/배포로 후속 계획을 작성한다.
- 성경 본문은 포함하지 않고 대한성서공회 공식 페이지로 연결한다.

## 목표 폴더 구조

```text
bible-reading-tracker-web/
  .github/workflows/deploy-pages.yml
  .hermes/plans/
  docs/
  public/
    icons/
  src/
    app/
      App.tsx
      routes.tsx
    components/
    data/
      bibleBooks.ts
      commonPlans.ts
    domain/
      reading.ts
      plans.ts
      progress.ts
      reminders.ts
    pages/
      TodayPage.tsx
      TrackerPage.tsx
      ProgressPage.tsx
      SettingsPage.tsx
    storage/
      schema.ts
      repository.ts
      backup.ts
      migrations.ts
    styles/
      tokens.css
      global.css
    test/
      setup.ts
    main.tsx
  tests/e2e/
  package.json
  vite.config.ts
  vitest.config.ts
  playwright.config.ts
```

## 작업 원칙

- 모든 도메인 동작은 **실패하는 테스트를 먼저 실행**한 뒤 구현한다.
- 한 번에 하나의 수직 기능 조각만 RED → GREEN → REFACTOR 한다.
- 각 작업 후 집중 테스트와 전체 테스트를 실행한다.
- 기존 정적 파일은 첫 커밋에 보존한 뒤 React 구조로 교체한다.
- 저작권 성경 본문이나 비허가 데이터는 저장소에 넣지 않는다.

---

### Task 1: 기존 상태 보존과 Git 초기화

**Objective:** 현재 자료를 잃지 않고 변경 이력을 시작한다.

**Files:** 기존 전체 파일

**Steps:**
1. `git init` 후 기본 브랜치를 `master`로 설정한다.
2. `.gitignore`에 `node_modules/`, `dist/`, `playwright-report/`, `test-results/`, `.env*`를 추가한다.
3. 현재 파일과 두 설계 문서를 첫 기준 커밋으로 저장한다.
4. `git status --short`가 비어 있는지 확인한다.

**Commit:** `chore: preserve initial bible tracker prototype`

### Task 2: Vite React TypeScript 프로젝트 구성

**Objective:** 테스트 가능한 React 앱 셸을 만든다.

**Files:** `package.json`, `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `src/main.tsx`, `src/app/App.tsx`, `src/test/setup.ts`

**Steps:**
1. Vite React TypeScript 구성과 스크립트 `dev`, `build`, `test`, `test:run`, `lint`, `e2e`를 정의한다.
2. Vitest + jsdom + Testing Library와 Playwright를 설치한다.
3. 앱 제목 렌더링 테스트를 먼저 작성하고 실패를 확인한다.
4. 최소 App 컴포넌트로 테스트를 통과시킨다.
5. `npm run test:run && npm run build`를 실행한다.

**Commit:** `chore: scaffold react typescript app`

### Task 3: 성경 66권 메타데이터

**Objective:** 66권·1,189장과 구약/신약 구분을 검증된 데이터로 제공한다.

**Files:** `src/data/bibleBooks.ts`, `src/data/bibleBooks.test.ts`

**RED tests:**
- 책 수 66
- 구약 39, 신약 27
- 장 수 합계 1,189
- 고유 ID와 한국어 이름 중복 없음

**GREEN:** `BibleBook` 타입과 정적 메타데이터를 구현한다.

**Verification:** `npm run test:run -- src/data/bibleBooks.test.ts`

**Commit:** `feat: add verified bible book metadata`

### Task 4: 이벤트 기반 읽기 기록 도메인

**Objective:** 모든 장의 읽은 횟수를 누적·감소·취소할 수 있게 한다.

**Files:** `src/domain/reading.ts`, `src/domain/reading.test.ts`

**Core types:**
```ts
type ReadingEvent = {
  id: string
  bookId: string
  chapter: number
  delta: 1 | -1
  occurredAt: string
  batchId?: string
  undoneEventId?: string
}
```

**RED tests:** +1 누적, −1 처리, 0 미만 방지, 이벤트 취소, 전체 완료 batch 취소, 최신 기록 정렬.

**GREEN:** 이벤트를 직접 삭제하지 않고 반대 이벤트로 취소하여 달력과 이력을 보존한다.

**Commit:** `feat: add event-based reading records`

### Task 5: 버전형 브라우저 저장소

**Objective:** 앱 데이터를 안전하게 저장하고 이후 마이그레이션할 수 있게 한다.

**Files:** `src/storage/schema.ts`, `repository.ts`, `migrations.ts` 및 테스트

**RED tests:** 빈 저장소 기본값, 저장/재로드, 손상 JSON 복구 안내, 알 수 없는 미래 버전 거부, v1 마이그레이션.

**Data root:**
```ts
type AppState = {
  schemaVersion: 1
  readingEvents: ReadingEvent[]
  commonPlan: PlanState | null
  personalPlan: PlanState | null
  settings: AppSettings
}
```

**Commit:** `feat: persist versioned reading data`

### Task 6: 통독 계획 생성 엔진

**Objective:** 범위·요일·기간·순서에 따라 읽기 분량을 균등 배분한다.

**Files:** `src/domain/plans.ts`, `src/domain/plans.test.ts`, `src/data/commonPlans.ts`

**RED tests:**
- 선택한 요일만 일정 생성
- 모든 선택 장이 정확히 한 번 배분
- 하루 분량 차이가 최대 1장
- 1년·6개월·90일 기본 계획
- 성경 순서와 구약+신약 병행 순서
- 유효한 기간/범위가 없을 때 오류

연대기 순서는 신뢰할 수 있는 별도 데이터 출처를 확보한 뒤 제공한다. 출처가 없으면 UI에 `준비 중`으로 노출하지 말고 선택지에서 제외한다.

**Commit:** `feat: generate common and personal reading plans`

### Task 7: 놓친 일정 처리

**Objective:** 계획별로 누적·재분배·오늘부터 다시 계산을 선택할 수 있게 한다.

**Files:** `src/domain/plans.ts`, `src/domain/plans.test.ts`

각 정책마다 실패 테스트를 하나씩 추가하고 구현한다. 완료된 분량은 재계산해도 바뀌지 않아야 한다.

**Commit:** `feat: support flexible missed-day policies`

### Task 8: 진행률과 월간 달력 계산

**Objective:** 반복 횟수와 1회 통독 진행률을 혼동하지 않고 표시한다.

**Files:** `src/domain/progress.ts`, `src/domain/progress.test.ts`

**RED tests:**
- 고유 완료 장 수 / 1,189
- 같은 장 3회 읽어도 진행률에는 1장
- 구약·신약 별도 진행률
- 월별 활동 날짜
- 취소된 기록은 합계에 반영되지 않음

**Commit:** `feat: calculate progress and calendar activity`

### Task 9: 앱 내부 알림 규칙

**Objective:** 설정한 요일·시간 이후 앱을 열면 미완료 알림 배너를 보여준다.

**Files:** `src/domain/reminders.ts`, `src/domain/reminders.test.ts`

시간대는 기기 로컬 시간으로 처리한다. 외부 푸시 권한이나 서비스 워커 알림은 구현하지 않는다.

**Commit:** `feat: add in-app reading reminders`

### Task 10: 로열 블루 디자인 시스템과 앱 셸

**Objective:** 라이트·다크 모드와 모바일 4탭 내비게이션을 구현한다.

**Files:** `src/styles/tokens.css`, `global.css`, `src/components/AppShell.tsx`, `BottomNavigation.tsx`, 관련 테스트

**Acceptance:** 320px 폭에서도 잘림 없음, 터치 대상 44px 이상, 현재 탭 텍스트/아이콘 동시 표시, 시스템 글자 확대 대응.

**Commit:** `feat: add accessible mobile app shell`

### Task 11: 첫 방문과 오늘 화면

**Objective:** 로그인 없이 시작하고 계획 유무에 맞는 오늘 카드를 보여준다.

**Files:** `src/pages/TodayPage.tsx`, `src/components/TodayReadingCard.tsx`, 관련 테스트

**RED tests:**
- 기록이 없으면 창세기 1장
- 마지막 장 다음 장 추천
- 책 마지막 장 다음에는 다음 책 1장
- 요한계시록 22장 다음에는 창세기 1장
- 공통/개인 계획 카드 동시 표시
- 전체 완료 batch와 되돌리기

**Commit:** `feat: build today reading experience`

### Task 12: 통독표 화면과 장 상세 시트

**Objective:** 66권을 탐색하고 장별 횟수를 안전하게 조정한다.

**Files:** `src/pages/TrackerPage.tsx`, `BookCard.tsx`, `ChapterGrid.tsx`, `ChapterDetailSheet.tsx`, 관련 테스트

**Acceptance:** 검색, 전체/구약/신약/읽는 중 필터, 횟수 배지, +/−, 0 미만 방지, 최근 변경 되돌리기.

**Performance:** 책 단위 접기 또는 지연 렌더링으로 1,189개 버튼의 초기 부담을 줄인다.

**Commit:** `feat: build repeat-reading tracker`

### Task 13: 대한성서공회 연결 검증과 어댑터

**Objective:** 확인되지 않은 URL을 하드코딩하지 않고 공식 페이지 연결을 구현한다.

**Files:** `src/services/bibleTextLink.ts`, 테스트, `docs/02-대한성서공회-연결검증.md`

**Steps:**
1. 현재 공식 사이트를 브라우저로 직접 확인한다.
2. 장별 직접 링크와 모바일 동작을 검증한다.
3. 안정적인 규칙이 있으면 어댑터와 URL 생성 테스트를 작성한다.
4. 규칙이 불안정하면 공식 읽기 첫 화면 링크로 안전하게 대체한다.

**Commit:** `feat: link to official bible reading service`

### Task 14: 진행 화면

**Objective:** 전체·구약·신약 진행률, 월간 달력, 최근 기록과 취소를 표시한다.

**Files:** `src/pages/ProgressPage.tsx`, `ProgressSummary.tsx`, `ReadingCalendar.tsx`, `RecentActivity.tsx`, 관련 테스트

월 변경과 빈 달력 상태, 다크 모드 대비를 검증한다.

**Commit:** `feat: build progress calendar`

### Task 15: 계획 설정 UI

**Objective:** 공통 계획 1개와 개인 계획 1개를 만들고 관리한다.

**Files:** `src/pages/SettingsPage.tsx`, `PlanSettings.tsx`, `PersonalPlanForm.tsx`, `PlanPreview.tsx`, 관련 테스트

**Acceptance:** 1년·6개월·90일 선택, 범위·요일·기간·순서 선택, 첫 7일 미리보기, 과도한 일일 분량 경고, 놓친 일정 정책 선택.

**Commit:** `feat: add reading plan settings`

### Task 16: 테마와 데이터 설정

**Objective:** 라이트·다크 전환, JSON 백업·복원, 보호된 초기화를 구현한다.

**Files:** `src/storage/backup.ts`, `backup.test.ts`, `DataSettings.tsx`, `ThemeSettings.tsx`

**RED tests:** 유효 백업 생성, 손상 파일 거부, 미래 버전 거부, 복원 전 요약, 기존 데이터 교체, 초기화 확인.

JSON만 지원하며 인쇄·PDF·이미지 공유는 추가하지 않는다.

**Commit:** `feat: add backup restore and theme settings`

### Task 17: 아이콘·메타데이터·오프라인 자산

**Objective:** 십자가+성경책 브랜드와 기본 웹 메타데이터를 적용한다.

**Files:** `public/icons/*`, `index.html`, 필요 시 `public/manifest.webmanifest`

사용자는 웹주소 사용을 선택했으므로 설치 유도 UI는 넣지 않는다. 서비스 워커가 필요하다면 앱 정적 자산 캐시만 담당하고 알림 기능은 넣지 않는다.

**Commit:** `feat: apply word-walk branding`

### Task 18: 접근성·반응형 검증

**Objective:** 다양한 연령과 스마트폰에서 핵심 흐름을 사용할 수 있게 한다.

**Checks:**
- 키보드 탐색과 포커스 표시
- 200% 글자 확대
- 색상 대비
- 320/375/430px 뷰포트
- `prefers-reduced-motion`
- 버튼 accessible name
- TalkBack/VoiceOver를 고려한 상태 문구

axe 기반 자동 검사와 Playwright 모바일 뷰포트 테스트를 추가한다.

**Commit:** `test: verify responsive accessibility`

### Task 19: 핵심 E2E 흐름

**Objective:** 실제 브라우저에서 데이터가 유지되는 주요 사용자 여정을 증명한다.

**E2E scenarios:**
1. 첫 방문 → 창세기 1장 기록 → 새로고침 후 유지
2. 장 +/− → 최근 기록 취소
3. 개인 계획 생성 → 오늘 분량 전체 완료
4. 월간 달력 반영
5. JSON 내보내기 → 초기화 → 불러오기 복원
6. 라이트/다크 전환 유지

**Verification:** `npm run e2e`

**Commit:** `test: cover personal tracker journeys`

### Task 20: GitHub Pages 배포

**Objective:** `master` 푸시 시 정적 앱을 자동 배포한다.

**Files:** `.github/workflows/deploy-pages.yml`, `vite.config.ts`, `README.md`

**Steps:**
1. 저장소명에 맞는 Vite `base`를 설정한다.
2. Actions에서 install → lint → test → build → Pages deploy 순으로 실행한다.
3. GitHub Pages URL에서 첫 화면과 직접 새로고침을 확인한다.
4. Android Chrome, Samsung Internet, iPhone Safari에서 수동 스모크 테스트한다.

**Commit:** `ci: deploy bible tracker to github pages`

### Task 21: 최종 검증과 사용자 확인

**Objective:** 사용자가 직접 살펴볼 수 있는 완성본을 제공한다.

**Commands:**
```bash
npm ci
npm run lint
npm run test:run
npm run build
npm run e2e
```

**Manual checklist:**
- 4탭 이동
- 모든 장 횟수 기록
- 공통+개인 계획 동시 표시
- 세 가지 일정 처리
- 진행률·달력
- 대한성서공회 링크
- JSON 백업·복원
- 다크 모드
- 모바일 글자 확대

사용자가 먼저 시험 사용한 뒤 수정 목록을 별도 문서로 만든다.

**Commit:** `docs: record personal tracker acceptance results`

---

## 검증 기준

- 단위/컴포넌트 테스트 모두 통과
- Playwright 핵심 흐름 통과
- TypeScript와 프로덕션 빌드 오류 0
- 1,189장 데이터 합계 테스트 통과
- 모바일 320px 가로 스크롤 없음
- JSON 백업 왕복 후 기록·계획·설정 동일
- GitHub Pages 실제 URL 접속 정상

## 위험과 대응

| 위험 | 대응 |
|---|---|
| 브라우저 데이터 삭제 시 기록 손실 | 설정에서 JSON 백업을 눈에 띄게 안내 |
| 대한성서공회 URL 변경 | 링크 어댑터 격리, 직접 링크 사전 검증 |
| 반복 횟수와 진행률 혼동 | 진행률은 고유 완료 장, 반복은 별도 숫자 |
| 일정 재분배 복잡성 | 정책별 순수 함수와 경계 테스트 |
| 기능이 많아 첫 완성 지연 | 위 Task 순서로 수직 기능을 완성하며 매 단계 실행 가능 유지 |
| 향후 서버판과 구조 불일치 | 도메인 타입과 UI를 저장소 구현에서 분리 |

## 후속 단계

개인판이 실제 GitHub Pages에서 검증된 뒤 별도 계획을 작성한다.

- 계정과 서버 동기화
- 관리자 공통 계획 생성·배포
- 계획별 이름·진행률 공개 선택
- 교회 공동체 화면
- 개인정보·보안·운영 배포
