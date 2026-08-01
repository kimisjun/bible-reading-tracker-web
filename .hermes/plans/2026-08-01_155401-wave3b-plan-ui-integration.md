# Wave 3B Plan UI Integration Implementation Plan

> **For Hermes:** Use multi-agent-software-delivery and strict RED → GREEN → REFACTOR to implement task-by-task. Existing UI commits are candidates, not trusted artifacts; reuse only after independent review.

**Goal:** Let a user create one common and one personal Bible-reading plan in Settings, see both plans' actionable assignments on Today, record individual or batch completion, undo the most recent batch, and keep everything durable in the existing offline event log.

**Architecture:** Preserve `ReadingEvent` as the source of truth and derive plan completion from chapter counts. Reuse the reviewed settings and today-plan components as presentation layers. Add a small app-level view-model seam that combines `ReadingPlan`, recalculation, Bible metadata, active reading events, and the current calendar date. Extend `useReadingState` with atomic batch append/undo operations using existing `batchId` and `undoReadingBatch`; no schema-version change and no stored completion flags.

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, Vite, localStorage repository, existing plan engine/recalculation domain.

---

## Scope and contracts

- Keep `schemaVersion: 1` and existing `ReadingEvent` fields.
- Completion input is the set of chapters whose active event sum is at least one, per `docs/PLAN-CONTRACT.md`.
- One `commonPlan` and one `personalPlan` may be active simultaneously.
- Existing free-reading recommendation and whole-Bible tracker remain available.
- A batch completes only chapters still incomplete in the freshly reloaded durable state.
- All events in one completion batch share a non-empty batch ID containing the plan ID plus a unique suffix.
- Undo targets only the active events in that batch and preserves the append-only event log.
- Plan UI uses Korean labels, 44px minimum touch targets, visible text/check completion states, dark tokens, and no 320px horizontal overflow.
- No Bible translation text/audio, credentials, account server, or remote synchronization in this wave.

## Candidate commits

- Settings UI: `95ad16910d8e9b3e889681c316eb49c38efd6cf3`
- Today plan cards: `0987e6afc991c80a9a3b837d92460abe3edf0c23`

These commits must pass independent review and current-master focused tests before integration. Review findings are fixed in separate commits; never amend an approved SHA.

---

### Task 1: Preserve coordination state

**Files:**
- Create: `.hermes/plans/2026-08-01_155401-wave3b-plan-ui-integration.md`
- Modify: `docs/WORKSTREAMS.md`

**Steps:**
1. Record branch, worktree, candidate commits, ownership, integration order, and gates.
2. Run `git diff --check`.
3. Commit: `docs: start wave three B plan UI integration`.

### Task 2: Integrate and harden plan settings UI

**Files:**
- Create/modify: `src/features/settings/PlanSettingsPage.tsx`
- Create/modify: `src/features/settings/PlanSettingsPage.css`
- Create/modify: `src/features/settings/PlanSettingsPage.test.tsx`
- Create/modify: `src/features/settings/PlanSettingsPage.styles.test.ts`

**Acceptance:**
- Common presets: one year, six months, 90 days.
- Common fields: start date, weekdays, order, missed-day policy.
- Personal fields: name, all/old/new/books range, start/end, weekdays, order, policy.
- Preview shows total chapters, reading days, average, last date, first seven days, and heavy-day warning.
- Invalid name/date/range/weekdays produce a Korean alert and disable saving.
- Existing plan summary and delete action are visible.
- At least 44px controls, labeled fields, `aria-pressed` weekdays, polite preview updates, 320px-safe layout.

**TDD / verification:**
1. Cherry-pick candidate `95ad169`.
2. Run `npm run test:run -- src/features/settings/PlanSettingsPage.test.tsx src/features/settings/PlanSettingsPage.styles.test.ts`.
3. For every review defect, write a failing boundary test first, confirm feature-level RED, implement minimal fix, then confirm GREEN.
4. Run `npm run build` after TypeScript/CSS changes.
5. Commit review fixes separately if needed.

### Task 3: Integrate and harden Today plan cards

**Files:**
- Create/modify: `src/features/today-plan/TodayPlanSection.tsx`
- Create/modify: `src/features/today-plan/TodayPlanSection.css`
- Create/modify: `src/features/today-plan/TodayPlanSection.test.tsx`

**Acceptance:**
- Render common and personal cards together in stable common→personal order.
- Show plan name, assignment date, each chapter, completion text/check, and individual `읽었어요`.
- `전체 완료` sends only incomplete chapters and is disabled when none remain.
- Completed assignment displays the approved celebration sentence.
- Recent batch exposes one explicit undo action.
- Empty `views` renders nothing; active plan with no assignment shows a calm no-assignment message rather than a blank card.
- Buttons and status regions are accessible and mobile-safe.

**TDD / verification:**
1. Cherry-pick candidate `0987e6a`.
2. Run `npm run test:run -- src/features/today-plan/TodayPlanSection.test.tsx`.
3. Add failing tests for any review defect before fixes.
4. Run focused tests and `npm run build`.
5. Commit review fixes separately if needed.

### Task 4: Add atomic batch reading operations

**Files:**
- Modify: `src/app/useReadingState.ts`
- Modify: `src/app/useReadingState.test.ts`
- Test existing: `src/domain/reading.test.ts`

**Wished-for API:**

```ts
readBatch(planId: string, chapters: readonly ChapterRef[]): void
undoBatch(batchId: string): void
```

**RED → GREEN slices:**
1. RED: two incomplete chapter refs produce two positive events with unique IDs, one timestamp, and one shared `plan:<planId>:<unique>` batch ID.
2. GREEN: use one fresh repository load and reduce through `appendReadingEvent`.
3. RED: duplicate refs and chapters already complete in the freshly loaded state do not receive another event.
4. GREEN: normalize refs and check current `getReadingCount` before append.
5. RED: undoing a batch appends one inverse event per active target and preserves batch ID.
6. GREEN: call `undoReadingBatch` with a unique undo prefix and one timestamp.
7. RED: malformed/empty inputs and storage failures do not partially persist and expose the existing recoverable error.
8. GREEN: validate before save and keep append/save atomic.

**Commands:**
- `npm run test:run -- src/app/useReadingState.test.ts src/domain/reading.test.ts`
- `npm run build`

**Commit:** `feat: add atomic plan reading batches`.

### Task 5: Build the Today-plan view model

**Files:**
- Create: `src/app/createTodayPlanViews.ts`
- Create: `src/app/createTodayPlanViews.test.ts`
- Reuse: `src/domain/planRecalculation.ts`
- Reuse: `src/domain/progress.ts` or `src/domain/reading.ts` count helpers

**Wished-for API:**

```ts
createTodayPlanViews({
  plans,
  events,
  today,
}): readonly TodayPlanView[]
```

**RED → GREEN slices:**
1. No plans → empty views.
2. Common + personal → two views in stable order.
3. Active positive event sums derive completed chapters; canceled/negative-only/invalid refs do not.
4. `recalculatePlan` supplies actionable assignments for carry/redistribute/restart-today.
5. Today's newly completed assignment remains visible with `completed: true` instead of disappearing immediately.
6. Carry view reports `밀린 분량 N장 포함`; restart/redistribute use the approved status wording and last date.
7. Latest active plan-prefixed batch is exposed as `recentBatchId`; undone/foreign batches are ignored.
8. Bible IDs map to Korean book names from `bibleBooks`.
9. Input arrays remain immutable and malformed events cannot crash the page.

**Commands:**
- `npm run test:run -- src/app/createTodayPlanViews.test.ts src/domain/planRecalculation.test.ts`
- `npm run build`

**Commit:** `feat: derive actionable today plan views`.

### Task 6: Integrate settings, plans, and Today in App

**Files:**
- Modify: `src/app/App.tsx`
- Modify: `src/app/App.test.tsx`
- Modify: `src/app/App.integration.test.tsx`
- Modify: `src/features/today/TodayPage.tsx`
- Modify: `src/features/today/TodayPage.test.tsx`
- Reuse: `src/app/usePlanState.ts`

**Integration:**
- Instantiate `usePlanState()` beside `useReadingState()`.
- Combine plan and reading storage errors without hiding either source.
- Render `PlanSettingsPage` in Settings while preserving `튜토리얼 다시 보기`.
- Derive today date deterministically/injectably and build views from current plans/events.
- Place `TodayPlanSection` immediately after the free recommendation and before summary cards via a deliberate TodayPage slot or equivalent accessible structure.
- Wire individual read, complete-all, and undo-batch handlers.

**RED → GREEN journeys:**
1. Settings tab creates a common preset, saves it, and shows the current-plan summary.
2. Reload restores the plan.
3. Today displays the saved plan's current assignment while preserving free recommendation.
4. Individual read changes one task to completed and updates Today/weekly totals.
5. Complete-all records only remaining tasks with one batch ID.
6. Undo-batch restores tasks and reading totals without deleting events.
7. Common and personal plans render together and remain isolated when one is deleted.
8. Another-tab plan storage event refreshes settings/today state.
9. Existing tutorial, tracker, progress, keyboard tab behavior, and storage-error journeys remain green.

**Commands:**
- `npm run test:run -- src/app/App.test.tsx src/app/App.integration.test.tsx src/features/today/TodayPage.test.tsx`
- `npm run build`

**Commit:** `feat: integrate reading plans into the app`.

### Task 7: Update durable handoff and verify workspace

**Files:**
- Modify: `HANDOFF.md`
- Modify: `docs/PROJECT-STATUS.md`
- Modify: `docs/WORKSTREAMS.md`

**Verification:**
1. Focused tests for settings, today-plan, reading batches, view model, App integration.
2. `npm run lint`
3. `npm run test:run`
4. `npm run build`
5. `npm audit`
6. `git diff --check`
7. Secret/copyright scan of changed files.
8. Local browser: create plan → Today assignment → individual completion → batch completion → undo → reload.
9. Chromium CDP at 320px: verify `innerWidth=320`, root `scrollWidth<=320`, no component overflow.
10. Dark mode, 200% zoom diagnostic, console errors, and storage persistence.

**Commit:** `docs: record wave three B completion`.

### Task 8: Independent review, integration, and deployment

1. Dispatch an independent reviewer against the immutable final SHA.
2. Reproduce every blocking finding with a boundary test.
3. Make separate fix commit(s), rerun full gates, and obtain fresh approval.
4. Cherry-pick reviewed commits into local `master`.
5. Rerun full lint/test/build/audit on integrated `master`.
6. Show the exact push range and obtain repository-required push approval.
7. Push `master`, watch the exact GitHub Actions run, and smoke-test the public Pages URL.
8. Never declare deployment before the public flow works and console errors are zero.

## Risks and mitigations

- **Stale UI commits:** independent review plus current-master cherry-pick tests; do not trust old summaries.
- **Plan completion ambiguity:** follow the authoritative global chapter-completion contract; no hidden plan flags.
- **Batch partial writes:** construct the full next event list before one repository save.
- **Same-tab dual hooks:** each write reloads freshest durable `AppState`; App renders plan state from `usePlanState` and reading state from `useReadingState`.
- **Midnight staleness:** use an explicit calendar clock/re-render seam and deterministic tests.
- **Large daily assignments:** retain heavy-day warning and render chapter lists without horizontal scrolling.
- **User data:** preserve schema version and event log; no silent reset or migration.
- **Copyright/security:** no Bible body text, credentials, PII, or account service secrets.
