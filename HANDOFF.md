# HANDOFF — 말씀과 함께 걷기

## 프로젝트 목표

로그인 없이 스마트폰 웹주소로 사용하는 개인 오프라인 성경통독 앱이다. 성경 66권·1,189장의 장별 반복 읽기 기록, 오늘 읽기, 진행률, 월간 달력, 향후 통독 계획과 백업을 제공한다. 저작권 성경 본문은 저장소에 넣지 않는다.

## 운영 위치

- GitHub: https://github.com/kimisjun/bible-reading-tracker-web
- Pages: https://kimisjun.github.io/bible-reading-tracker-web/
- 로컬: `C:\Users\User\Documents\bible-reading-tracker-web`
- 배포 브랜치: `master`
- Vite base: `/bible-reading-tracker-web/`

## 현재 사용자 기능

- 오늘 읽을 다음 장 추천
- `읽었어요` 기록과 새로고침 후 복원
- 실제 최근 유효 읽기 기준 다음 장 계산
- 성경 66권 통독표
- 정식 이름·약칭 검색과 전체·구약·신약·읽는 중 필터
- 책 접기·장 그리드·장별 반복 횟수
- 장별 `+ 읽었어요`·`− 1회`
- 전체·구약·신약 진행률과 반복 읽기 합계
- 일~토 실제 월간 달력과 읽은 날
- 최근 기록 실제 시각순 정렬과 개별 취소
- 오늘·통독표·진행·설정 4탭
- 최초 방문 3단계 튜토리얼과 설정의 `튜토리얼 다시 보기`

## 저장·무결성

- `localStorage` 기반 `schemaVersion: 1`
- 기록 원본은 합계가 아니라 `ReadingEvent`
- 이벤트 ID, 책·장, ISO 날짜, 취소 참조, 누적 음수를 검증
- 저장 직전 최신 durable state를 재조회해 다른 탭 기록 덮어쓰기를 줄임
- `storage` 이벤트로 다른 브라우저 탭 변경 반영
- 손상 데이터나 저장 용량 부족 시 원본을 자동 삭제하지 않고 `role=alert` 안내

## 현재 검증 기준

```bash
npm ci
npm run lint
npm run test:run
npm run build
npm audit
```

최근 기준:

- 테스트 파일 15개
- 테스트 101개 통과
- ESLint 통과
- TypeScript/Vite 빌드 성공
- npm audit 취약점 0건
- GitHub Actions Pages 배포 성공
- 공개 URL 기록·새로고침 복원 확인

## 핵심 파일

- `src/data/bibleBooks.ts` — 성경 66권 단일 메타데이터 출처
- `src/domain/reading.ts` — 이벤트 추가·취소·최근 기록
- `src/domain/progress.ts` — 진행률·월간 활동일
- `src/storage/**` — 버전형 저장·마이그레이션·검증
- `src/app/useReadingState.ts` — 저장소와 React 상태 연결
- `src/features/today/**` — 오늘 추천
- `src/features/tracker/**` — 66권 통독표
- `src/features/progress/**` — 진행률·월간 달력·최근 기록
- `src/features/tutorial/**` — 최초 실행 안내와 완료 상태 저장
- `src/app/App.tsx` — 4탭 통합

## 다음 우선순위

1. 통독 계획 도메인 계약과 테스트
2. 1년·6개월·90일 계획 생성
3. 읽는 요일·범위·구약/신약 병행 설정
4. 놓친 일정 누적·재분배·오늘부터 재계산
5. 계획 설정 UI와 오늘 계획 분량
6. JSON 백업·복원·초기화
7. 서비스 워커·오프라인·Playwright

## 통합 절차

1. 별도 worktree와 브랜치에서 작업한다.
2. RED → GREEN 테스트 증거를 남긴다.
3. 전체 lint/test/build/audit를 통과한다.
4. 독립 검토 후 차단사항을 수정한다.
5. `master`에 통합하고 Push한다.
6. GitHub Actions 성공을 확인한다.
7. Pages에서 실제 사용자 흐름과 콘솔 오류를 확인한다.

## 금지 사항

- 성경 번역문·오디오·비허가 데이터를 Git에 넣지 않는다.
- 토큰, 비밀번호, 개인정보, `.env`를 커밋하지 않는다.
- 기록 합계를 원본으로 저장하지 않는다.
- 손상 데이터를 사용자 확인 없이 자동 초기화하지 않는다.
- 테스트나 실제 브라우저 검증 없이 완료로 보고하지 않는다.
