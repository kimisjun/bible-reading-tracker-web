# Wave A Reading Summary Implementation Plan

> **For Hermes:** Implement task-by-task with strict RED → GREEN → REFACTOR and an independent review before integration.

**Goal:** Add accurate Korea-time daily reading counts and Monday–Sunday weekly totals to the existing Today page without changing the persisted ReadingEvent schema.

**Architecture:** Derive summaries from the immutable ReadingEvent log in a new pure domain module. The Today page consumes that summary and renders accessible cards for today, the weekly total, and seven day values. Existing localStorage persistence and recommendation behavior remain unchanged.

**Tech Stack:** React, TypeScript, Vite, Vitest, Testing Library, CSS.

---

## Scope and contracts

- Worktree: `C:\Users\User\Documents\bible-reading-tracker-web-wave-a`
- Branch: `feature/wave-a-reading-summary`
- Week: Monday 00:00 through Sunday 23:59 in `Asia/Seoul`.
- Count only active positive reading events:
  - `delta === 1`
  - not itself an undo event (`undoneEventId === undefined`)
  - not targeted by another event's `undoneEventId`
- Invalid timestamps are ignored.
- Existing manual `-1회` events are not counted as reading activity and do not create negative daily totals.
- Overall unique-chapter progress remains unchanged.
- No persisted schema migration in Wave A.
- No account/backend work in Wave A.

## Task 1: Daily and weekly summary domain

**Files:**
- Create: `src/domain/readingSummary.ts`
- Create: `src/domain/readingSummary.test.ts`

**RED 1:** Write a test proving an event at `2026-07-31T15:00:00.000Z` belongs to Friday 2026-08-01 in Korea and increments today's count.

Run:
```bash
npm run test:run -- src/domain/readingSummary.test.ts
```
Expected: FAIL because `calculateReadingSummary` does not exist.

**GREEN 1:** Implement a pure `calculateReadingSummary(events, now, timeZone = 'Asia/Seoul')` function returning:

```ts
type DailyReadingAmount = {
  date: string
  label: '월' | '화' | '수' | '목' | '금' | '토' | '일'
  count: number
  isFuture: boolean
  isToday: boolean
}

type ReadingSummary = {
  todayDate: string
  todayCount: number
  weekStartDate: string
  weekEndDate: string
  weekTotal: number
  days: readonly DailyReadingAmount[]
}
```

Run the focused test and confirm PASS.

**RED 2:** Add Monday/Sunday boundary tests:
- Sunday 23:59:59 KST stays in the current week.
- Monday 00:00:00 KST starts the next week.
- Seven entries are always returned in Monday–Sunday order.

Run and confirm expected feature failures.

**GREEN 2:** Add timezone calendar-key and UTC-safe calendar arithmetic helpers. Run focused tests.

**RED 3:** Add tests for:
- active reads summed across days;
- repeated positive reads counted separately;
- undone reads excluded from their original day;
- undo-of-minus positive events excluded;
- raw negative corrections ignored;
- invalid timestamps ignored;
- input array not mutated.

**GREEN 3:** Implement the minimal active-event filtering and aggregation. Refactor only after focused tests are green.

## Task 2: Today page summary cards

**Files:**
- Modify: `src/features/today/TodayPage.tsx`
- Modify: `src/features/today/TodayPage.test.tsx`
- Modify: `src/features/today/TodayPage.css`

**RED 1:** Add a deterministic `now` prop to the test render and assert:
- heading `오늘 읽은 분량`;
- `오늘 4장` or an equivalent unambiguous accessible value;
- heading `이번 주 통독`;
- text `이번 주 총 18장`;
- Monday through Sunday numeric values.

Run:
```bash
npm run test:run -- src/features/today/TodayPage.test.tsx
```
Expected: FAIL because summary cards are absent.

**GREEN 1:** Add optional `now?: Date`, compute the domain summary, and render two accessible cards below the recommendation card.

**RED 2:** Add tests that future weekdays display `-`, past no-reading weekdays display `0장`, and today is marked with accessible text.

**GREEN 2:** Render a semantic seven-item list with day label, count, and `오늘` marker.

**RED 3:** Add static style hooks and accessible landmark/card assertions for mobile presentation.

**GREEN 3:** Extend `TodayPage.css` with:
- stacked mobile cards;
- 48px-friendly values and legible 18px text;
- seven equal weekday columns with no horizontal overflow;
- dark-mode tokens;
- desktop two-column summary layout;
- no color-only status.

## Task 3: App integration journey

**Files:**
- Modify: `src/app/App.integration.test.tsx`
- Production modification to `src/app/App.tsx` only if required by the public TodayPage API.

**RED:** Freeze system time in an integration test, record `읽었어요`, and assert the Today page changes from `오늘 0장` to `오늘 1장` and `이번 주 총 1장`.

**GREEN:** Wire only the minimal prop/API change if needed. Ensure persistence and recommendation tests remain green.

## Task 4: Documentation and coordination

**Files:**
- Add approved design docs `docs/02-혼합형-첫페이지-설계.md` through `docs/05-최종-제품-설계서.md` if they are not already tracked.
- Update `docs/PROJECT-STATUS.md` and `HANDOFF.md` only after implementation and verification.
- Update `AGENTS.md` only to describe the staged evolution without removing the current offline-product constraints.

Document that Wave A is still the personal offline app; account/server functionality remains future scope.

## Task 5: Fresh verification

Run after the final source edit:

```bash
npm ci
npm run test:run -- src/domain/readingSummary.test.ts src/features/today/TodayPage.test.tsx src/app/App.integration.test.tsx
npm run lint
npm run test:run
npm run build
npm audit
```

Then run a local Vite server and verify in a real browser:
- exact server URL from Vite output;
- Today summary cards exist;
- clicking `읽었어요` increments both today and weekly totals;
- reload preserves the totals;
- Monday–Sunday order is visible;
- no console errors;
- mobile viewport has no horizontal overflow;
- existing tutorial and tab navigation still work.

## Task 6: Commit and independent review

Before commit:

```bash
git status -sb
git diff --check
git diff --stat
```

Commit on `feature/wave-a-reading-summary`. Dispatch an independent read-only reviewer against the immutable commit SHA. Fix blocking findings with new RED tests, rerun all gates, create a follow-up commit, and review the new final SHA.

Only after approval:
- integrate into the designated integration branch;
- run full gates again;
- push;
- verify GitHub Actions and the live Pages URL before reporting deployment.
