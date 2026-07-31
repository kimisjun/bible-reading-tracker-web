# 병렬 작업 현황

## Wave 1 — 완료

- 버전형 브라우저 저장소
- 진행률 계산
- 접근 가능한 4탭 앱 셸

## Wave 2 — 완료·배포

- 오늘 읽기와 실제 최근 기록 기준 추천
- 66권 통독표·검색·필터·장별 +/−
- 진행률·실제 월간 달력·최근 기록 취소
- 브라우저 저장·다중 탭 동기화·오류 안내
- 최초 실행 3단계 튜토리얼
- 테스트 15개 파일·101개 테스트 통과

## Wave 3A — 공통 계약 확정

권위 있는 계약:

- `docs/PLAN-CONTRACT.md`
- `src/domain/planTypes.ts`

## Wave 3A — 병렬 개발

| 작업 | 브랜치 | 소유 범위 | 상태 |
|---|---|---|---|
| 계획 생성 엔진 | `agent/wave3-plan-engine` | `src/domain/plans*`, `src/data/commonPlans*` | 준비 중 |
| 놓친 일정 정책 | `agent/wave3-plan-recalculation` | `src/domain/planRecalculation*` | 준비 중 |
| 계획 저장 계층 | `agent/wave3-plan-storage` | `src/storage/planValidation*`, `src/app/usePlanState*` | 준비 중 |

## Wave 3B — 다음 병렬 개발

Wave 3A 타입과 동작을 통합한 뒤 시작한다.

| 작업 | 주요 범위 |
|---|---|
| 계획 설정 UI | 기간·범위·요일·순서·정책·첫 7일 미리보기 |
| 오늘 계획 카드 | 공통·개인 계획 동시 표시, 장별/전체 완료 |
| 계획 통합 | 저장·재계산·오늘 분량을 App에 연결 |

## 통합 규칙

- RED → GREEN 증거
- 지정 범위 준수
- 집중/전체 테스트, lint, build, audit 통과
- 독립 코드 리뷰 차단사항 0
- 통합 후 실제 브라우저 스모크 테스트
