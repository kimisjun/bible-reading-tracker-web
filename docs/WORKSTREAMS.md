# 병렬 작업 현황

## Wave 1 — 통합 완료

| 작업 | 브랜치 | worktree | 소유 범위 | 상태 |
|---|---|---|---|---|
| 버전형 저장소 | `agent/storage` | `../bible-reading-tracker-worktrees/storage` | `src/storage/**` | `master` 통합 완료 |
| 진행률 계산 | `agent/progress` | `../bible-reading-tracker-worktrees/progress` | `src/domain/progress*` | `master` 통합 완료 |
| 4탭 UI 셸 | `agent/ui-shell` | `../bible-reading-tracker-worktrees/ui-shell` | `src/components/**`, `src/pages/**`, `src/app/App*`, `src/styles/**` | `master` 통합 완료 |

## 통합 대기열

각 작업은 다음 조건을 충족해야 통합한다.

- [x] 지정 브랜치에 커밋 존재
- [x] 작업 범위 준수
- [x] 테스트 우선 RED 증거
- [x] 집중 테스트 통과
- [x] 전체 테스트·린트·빌드 통과
- [x] 통합자 diff 검토

## Wave 1 완료 후 즉시 수행

1. 세 커밋을 독립적으로 검토한다.
2. 의존성이 낮은 순서로 `progress → storage → ui-shell`을 cherry-pick한다.
3. 전체 테스트·빌드·감사를 실행한다.
4. 실제 4탭 화면에서 콘솔 오류와 모바일 레이아웃을 확인한다.
5. `master` Push 후 GitHub Actions와 Pages를 확인한다.
6. 다음 Wave의 작업 범위를 확정한다.

## Wave 2 예정 분할

| 작업 | 주요 범위 | 선행 조건 |
|---|---|---|
| 오늘 읽기 | 추천 장, 읽었어요, 묶음 완료, 되돌리기 | storage + ui-shell |
| 통독표 | 검색, 필터, 책 접기, 장 상세, +/− | storage + ui-shell |
| 진행 화면 | 요약, 달력, 최근 기록 취소 | progress + ui-shell |

Wave 2도 서로 다른 파일 소유권과 worktree를 사용한다.
