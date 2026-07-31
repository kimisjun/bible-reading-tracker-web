# HANDOFF — 말씀과 함께 걷기

## 프로젝트 목표

로그인 없이 스마트폰 웹주소로 사용하는 개인 오프라인 성경통독 앱을 완성한다. 성경 66권·1,189장의 장별 반복 읽기 기록, 오늘 읽기, 계획, 진행률, 달력, 백업을 제공한다. 저작권 성경 본문은 저장소에 넣지 않고 공식 서비스로 연결한다.

## 현재 운영 주소

- GitHub: https://github.com/kimisjun/bible-reading-tracker-web
- Pages: https://kimisjun.github.io/bible-reading-tracker-web/
- 로컬: `C:\Users\User\Documents\bible-reading-tracker-web`
- 기본 브랜치: `master`

## 현재 구현

- React + TypeScript + Vite 앱 셸
- 성경 66권·1,189장 검증 데이터
- 이벤트 기반 장별 읽기 누적·감소·개별 취소·묶음 취소·최근순 정렬
- Vitest/Testing Library/ESLint
- GitHub Actions: lint → test → build → Pages deploy

## 현재 검증 기준

```bash
npm ci
npm run lint
npm run test:run
npm run build
npm audit
```

최근 기준: 테스트 10개 통과, 빌드 성공, npm 취약점 0건.

## 아직 사용자에게 보이는 상태

현재 Pages에는 제목과 안내 문구만 보인다. 도메인 코드는 있으나 UI와 저장소가 연결되지 않았다. 다음 통합 목표는 실제로 눌러 볼 수 있는 4탭 앱과 브라우저 저장 기반을 만드는 것이다.

## Wave 1 병렬 작업

| 브랜치 | 담당 | 변경 범위 |
|---|---|---|
| `agent/storage` | 버전형 브라우저 저장소 | `src/storage/**` |
| `agent/progress` | 진행률·달력 계산 | `src/domain/progress*` |
| `agent/ui-shell` | 접근 가능한 4탭 UI 셸 | `src/components/**`, `src/pages/**`, `src/app/App*`, `src/styles/**` |

각 에이전트는 별도 worktree에서 작업하고 자신의 브랜치에 커밋한다. `master`에 직접 Push하지 않는다.

## 통합 절차

1. 에이전트가 절대 경로, 브랜치, 커밋 SHA, 변경 파일, RED/GREEN 증거를 보고한다.
2. 통합자는 diff를 검토한다.
3. `master`에서 커밋을 하나씩 cherry-pick한다.
4. 충돌 또는 계약 불일치는 통합자가 수정한다.
5. 전체 lint/test/build/audit를 실행한다.
6. `master`에 Push하고 GitHub Actions 성공을 확인한다.
7. Pages를 실제 브라우저로 열어 JavaScript 오류와 모바일 레이아웃을 확인한다.

## 다음 Wave 후보

- 오늘 추천 장과 읽기 완료 UI
- 실제 장별 통독표와 상세 시트
- 계획 생성 엔진과 놓친 일정 처리
- 설정·JSON 백업·복원
- 대한성서공회 링크 어댑터
- Playwright 모바일·접근성 E2E

## 금지 사항

- 성경 번역문·오디오·비허가 데이터를 Git에 넣지 않는다.
- 테스트를 나중에 붙이지 않는다. 동작 변경은 RED → GREEN 순서로 한다.
- 다른 에이전트의 변경 범위를 임의로 수정하지 않는다.
- 토큰, 비밀번호, 개인 데이터, `.env`를 커밋하지 않는다.
- 검증하지 않은 결과를 완료로 보고하지 않는다.
