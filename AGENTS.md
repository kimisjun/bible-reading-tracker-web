# AGENTS.md

## 시작 순서

이 저장소에서 작업하는 모든 에이전트는 다음 문서를 순서대로 읽는다.

1. `HANDOFF.md`
2. `docs/PROJECT-STATUS.md`
3. `docs/AGENT-COLLABORATION.md`
4. `.hermes/plans/2026-07-30_220501-screen-design.md`
5. 관련 소스와 테스트

## 제품 제약

- 1차 제품은 로그인 없는 개인 오프라인 웹앱이다.
- 성경 본문·오디오를 저장소에 넣지 않는다.
- 기록 원본은 합계가 아니라 `ReadingEvent`다.
- 1회 통독 진행률과 반복 읽기 횟수를 분리한다.
- 모바일 우선, 최소 터치 영역 44px, 한국어 UI를 사용한다.
- 공개 GitHub 저장소이므로 비밀정보·개인정보를 절대 커밋하지 않는다.

## 개발 방식

- 동작 변경은 테스트 우선 RED → GREEN → REFACTOR로 진행한다.
- 한 번에 하나의 수직 기능만 구현한다.
- 지정된 브랜치/worktree/파일 범위 밖을 수정하지 않는다.
- 에이전트 브랜치는 `master`에 직접 병합하거나 Push하지 않는다. 통합자가 검토 후 cherry-pick한다.

## 필수 검증

```bash
npm ci
npm run lint
npm run test:run
npm run build
npm audit
```

E2E가 구성된 뒤에는 `npm run e2e`도 필수다.

## 완료 보고

절대 worktree 경로, 브랜치, 커밋 SHA, 변경 파일, RED 실패 증거, 집중/전체 검증 결과, 남은 위험을 보고한다.
