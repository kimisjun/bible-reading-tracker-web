# 개발 진행 현황

마지막 기준 브랜치: `master`

## 완료

- [x] 초기 정적 프로토타입 보존
- [x] React + TypeScript + Vite 전환
- [x] 성경 66권·1,189장 메타데이터
- [x] 이벤트 기반 읽기 기록 도메인
- [x] 테스트·린트·빌드 기반
- [x] GitHub 저장소 및 Pages 자동 배포

## 진행 중 — Wave 1

- [ ] 버전형 브라우저 저장소
- [ ] 진행률·월간 활동 계산
- [ ] 모바일 우선 4탭 앱 셸
- [ ] Wave 1 통합·Pages 배포

## 대기 — Wave 2

- [ ] 오늘 추천 장·완료·되돌리기
- [ ] 66권 통독표·검색·필터·장 상세
- [ ] 저장소와 UI 실제 연결

## 대기 — Wave 3

- [ ] 1년·6개월·90일 계획 엔진
- [ ] 개인 계획 생성
- [ ] 놓친 일정 누적·재분배·오늘부터 재계산
- [ ] 계획 설정 UI

## 대기 — 완성도

- [ ] 진행 화면과 달력
- [ ] 앱 내부 알림
- [ ] JSON 백업·복원·초기화
- [ ] 라이트·다크 테마
- [ ] 대한성서공회 연결 검증
- [ ] 아이콘·서비스 워커·오프라인 자산
- [ ] Playwright 핵심 흐름
- [ ] 320/375/430px·200% 확대·axe 접근성 검증
- [ ] Android Chrome·Samsung Internet·iPhone Safari 수동 확인

## 완료 판정 명령

```bash
npm ci
npm run lint
npm run test:run
npm run build
npm run e2e
npm audit
```
