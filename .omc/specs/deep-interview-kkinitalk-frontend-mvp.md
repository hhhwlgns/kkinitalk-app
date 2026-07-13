# 끼니톡 프론트엔드 MVP 구현 스펙

- **Interview ID**: kkinitalk-design-impl-2026-07-12
- **Threshold**: 20% (source: default)
- **Final ambiguity**: 15%
- **Type**: Greenfield (소스코드 없음, PRD.md + Claude Design 프로토타입이 authoritative source)

## 목표

끼니톡 AI 식단·복약 관리 앱을 React Native(Expo) 기반 단일 프로젝트로 구현한다. 사용자(개발자 본인)는 프론트엔드 전문이며, 백엔드/AI는 이번 범위에서 목업으로 대체하되 나중에 실제 백엔드로 쉽게 전환 가능한 구조로 만든다.

## Topology (확정된 구현 범위)

### 1. 노인 역할 (elderly-app) — active
단일 Expo 앱 내부의 노인 역할 플로우. PRD 기능 1~4 전범위:
- 온보딩 음성 건강 상담 (mock: 외부 음성 AI 응답을 시뮬레이션)
- 매일 아침 체크인
- 식사 사진 촬영 → 음식/영양 분석 (mock 분석 결과)
- 식단 적합도 피드백 및 다음 끼니 추천
- 복약 알림·이행 기록, 약-식단 충돌 경고 (자몽 등)
- 기록 히스토리 (날짜별/캘린더)
- 내 정보(건강 프로필) 조회/수정

참조: Claude Design 프로토타입의 `role`/`ob`/`obDone`/`home`/`checkin`/`cam`/`result`/`meds`/`hist`/`profile` 뷰 전체.

### 2. 보호자 역할 (guardian-app) — active
동일 Expo 앱 내부의 보호자 역할 플로우. PRD 기능 5 범위:
- 초대코드로 어르신 연결
- 홈(요약 카드, 알림 배너, 타임라인)
- 알림 리스트 + 코멘트 전송
- 주간 리포트(차트, 통계, AI 요약)
- 복약 일정 관리(추가/삭제)

참조: 프로토타입의 `g-connect`/`g-home`/`g-alerts`/`g-report`/`g-meds` 뷰.

### 3. 목업 데이터 계층 (mock-data-layer) — active
- MSW(Mock Service Worker)로 실제 HTTP 요청을 가로채서 응답.
- 앱 코드는 fetch/axios 기반 정상적인 API 클라이언트로 작성 — 백엔드 유무를 모르는 것처럼 작성.
- 나중에 실제 백엔드 연결 시 MSW 핸들러만 제거하고 base URL만 바꾸면 되는 구조.
- 음성 상담 AI, 사진→영양분석 AI, 알림 발송, 약-식단 충돌 룰 모두 이 계층에서 목업으로 응답.

### Deferred (이번 범위 제외)
- **요양시설 웹 대시보드**: 사용자가 명시적으로 이번 스코프에서 제외 확인.

## 확정된 기술적 제약 (Constraints)

| 항목 | 결정 |
|---|---|
| 플랫폼 | React Native (Expo) — 실제 모바일 앱으로 빌드 |
| 앱 구조 | 단일 Expo 프로젝트, 역할(노인/보호자) 선택 시 내부 네비게이션으로 전환 |
| 백엔드 통신 | fetch/axios + MSW 목업 (나중에 MSW 제거만으로 실제 백엔드 전환) |
| 데이터 영속성 | 앱 재시작 후에도 기록 유지 — AsyncStorage 또는 SQLite 기반 로컬 저장 |
| AI 연동(음성 상담) | 외부 API 사용 예정이나 이번 범위는 목업 |
| AI 연동(영양 분석) | 직접 구현 예정이나 이번 범위는 목업 |

## 완성 기준 (Success Criteria)

- PRD.md의 5개 핵심 기능 전부(노인 역할 + 보호자 역할 범위)의 수용 기준을 프론트엔드 관점에서 만족.
- 요양시설 웹 대시보드는 이번 범위에 없음(명시적 제외).
- 모든 백엔드/AI 응답은 MSW 목업으로 처리되지만, 실제 백엔드 연결로 전환 시 코드 수정 최소화(API 클라이언트/타입 정의는 실제 계약처럼 설계).
- 기록(식사/복약/체크인)은 로컬 저장소에 영속화되어 앱 재시작 후에도 유지.

## 리스크/컴플라이언스 (PRD에서 이어짐 — UI/UX에 반드리 반영)

- 서비스는 의료행위가 아님을 명시. 모든 추천/경고는 참고용.
- 복약 중단/변경은 경고만으로 하지 않도록 안내 문구 필요.
- 응급 상황 시 119 우선 고지.
- 고위험 경고의 보호자/시설 공유는 사용자 동의 기반이어야 함 (온보딩/설정에서 동의 플로우 필요).

## 참조 자료

- `끼니톡 prd.md` (프로젝트 루트) — 기능 요구사항 및 수용 기준의 authoritative source.
- Claude Design 프로토타입 "끼니톡 Prototype.dc.html" (project 4db7d8ee-d830-499c-9a51-51dfd5b06d9c) — UI/UX 및 상태 흐름의 authoritative source. ~15개 view, 노인/보호자 역할별 컴포넌트 구조 참고.
