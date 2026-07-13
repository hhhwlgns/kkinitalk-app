# 끼니톡 프론트엔드 MVP 구현 계획

**Status: pending approval**

- Source spec: `.omc/specs/deep-interview-kkinitalk-frontend-mvp.md`
- Source of truth for UI/기능: `끼니톡 prd.md`, Claude Design 프로토타입 "끼니톡 Prototype.dc.html" (project `4db7d8ee-d830-499c-9a51-51dfd5b06d9c`)
- Mode: Direct plan (사용자가 이미 deep-interview로 스택/구조/스코프를 확정함)

## 1. Requirements Summary

- Expo(React Native) 단일 프로젝트, 노인 역할 + 보호자 역할, 역할 전환은 앱 내부 네비게이션.
- 요양시설 웹 대시보드는 이번 범위 제외.
- 백엔드/AI는 전부 목업. 나중에 실제 백엔드로 전환 시 코드 변경을 최소화해야 함(MSW 제거 + baseURL 교체 정도).
- 기록(식사/복약/체크인)은 앱 재시작 후에도 유지되어야 함 (로컬 영속화).
- PRD 5개 기능 전부(수용 기준 포함)를 노인+보호자 범위로 구현.
- 리스크 섹션의 컴플라이언스 문구(의료행위 아님, 119 안내, 고위험 공유 동의)는 UI에 반드시 반영.

## 2. 아키텍처 개요

레이어를 분리해서, "지금은 목업이지만 나중에 실제 백엔드로 바꿔도 UI/훅 코드는 그대로 두는" 것이 핵심 설계 목표다.

```
화면(screens) → 훅(react-query hooks) → API 클라이언트(axios) → [MSW가 가로챔] → 목업 DB(AsyncStorage 기반 JSON 저장소)
```

- **화면**은 훅만 호출한다. API 클라이언트나 MSW의 존재를 모른다.
- **API 클라이언트**는 실제 백엔드가 있다고 가정하고 `/api/v1/...` 형태의 REST 호출을 한다.
- **MSW(Mock Service Worker)**가 이 HTTP 호출을 가로채서 응답한다. 나중에 실제 백엔드가 생기면 MSW 초기화 코드(`if (__DEV__ && USE_MOCKS)` 블록)만 제거하고 `EXPO_PUBLIC_API_BASE_URL`만 실제 서버로 바꾸면 된다.
- **목업 DB**는 MSW 핸들러 내부에서 읽고 쓰는 AsyncStorage 기반 JSON 저장소다. 이게 있어야 "앱을 재시작해도 기록이 유지된다"는 요구사항이 충족된다 (MSW 핸들러가 메모리에만 응답을 만들면 앱 재시작 시 사라짐).

### 기술적 리스크: MSW가 React Native에서 동작하는가

MSW v2는 브라우저의 Service Worker API에 의존하는 것이 기본이라 React Native에는 그대로 쓸 수 없다. MSW는 `msw/native` 진입점으로 React Native 환경을 공식 지원하며 `@mswjs/interceptors`를 통해 global `fetch`/`XMLHttpRequest`를 가로챈다. 이것을 Phase 1에서 스파이크(개념 증명)로 먼저 검증하고, 만약 이번 Expo SDK/RN 버전에서 문제가 있으면 대체 수단(`axios-mock-adapter` 또는 커스텀 fetch 래퍼)으로 전환한다. → **Risks 섹션 참고**.

## 3. 폴더 구조

```
kkinitalk-app/
  app/                          # Expo Router (file-based routing)
    _layout.tsx                 # 루트: RoleProvider, QueryClientProvider, MSW 초기화
    index.tsx                   # 역할 선택 화면 (role 뷰)
    elderly/
      _layout.tsx                # 노인 역할 하단 탭 네비게이션
      onboarding/
        index.tsx                # 음성 상담 온보딩 (ob)
        done.tsx                 # 프로필 생성 완료 (obDone)
      home.tsx                   # 홈 (home)
      checkin.tsx                # 아침 체크인 (checkin)
      camera.tsx                 # 사진 촬영 + 분석중 (cam/analyzing)
      result.tsx                 # 분석 결과 (result)
      medications.tsx            # 오늘의 약 (meds)
      history.tsx                # 기록/캘린더 (hist)
      profile.tsx                # 내 정보 (profile)
    guardian/
      _layout.tsx                # 보호자 역할 하단 탭 네비게이션
      connect.tsx                 # 초대코드 연결 (g-connect)
      home.tsx                    # 홈 (g-home)
      alerts.tsx                  # 알림 (g-alerts)
      report.tsx                   # 주간 리포트 (g-report)
      medications.tsx              # 복약 관리 (g-meds)
  src/
    api/
      client.ts                   # axios 인스턴스 (baseURL, 인터셉터)
      endpoints/
        healthProfile.ts
        meals.ts
        medications.ts
        checkins.ts
        guardian.ts
        onboarding.ts              # 음성 상담 API 계약 (외부 음성 AI 연동 지점)
    hooks/
      useHealthProfile.ts
      useMeals.ts
      useMedications.ts
      useCheckins.ts
      useGuardian.ts
    mocks/
      setup.native.ts              # msw/native 초기화, __DEV__ 게이팅
      handlers/
        healthProfile.ts
        meals.ts
        medications.ts
        checkins.ts
        guardian.ts
      db/
        store.ts                   # AsyncStorage 기반 collection get/set 유틸
        seed.ts                    # 최초 시드 데이터 (프로토타입 medList/foods 참고)
    domain/
      types.ts                     # HealthProfile, Meal, Medication, CheckIn, GuardianLink 등 (실제 백엔드 계약처럼 정의)
      conflictRules.ts              # 약-식단 충돌 룰 (자몽-혈압약 등)
    state/
      RoleContext.tsx               # 현재 역할(elderly|guardian) + 활성 사용자/연결 상태
      ConsentContext.tsx            # 고위험 공유 동의 상태
    components/
      BigButton.tsx
      VoiceBubble.tsx
      NutrientBar.tsx
      FoodChip.tsx
      RiskBadge.tsx
      DisclaimerBanner.tsx          # "의료행위 아님", 119 안내 등 공통 배너
    theme/
      tokens.ts                     # 노인 친화적 큰 글씨/고대비 색상 토큰
  .env                              # EXPO_PUBLIC_API_BASE_URL, EXPO_PUBLIC_USE_MOCKS
```

## 4. 구현 순서 (Phases)

| Phase | 내용 | 완료 기준 |
|---|---|---|
| 0 | 프로젝트 스캐폴딩: Expo + TypeScript + Expo Router, ESLint/Prettier, 테마 토큰, 역할 선택 화면 껍데기 | `npx expo start`로 역할 선택 화면이 뜬다 |
| 1 | MSW-in-RN 스파이크: `msw/native` 셋업, 더미 엔드포인트 하나로 가로채기 검증 | fetch 호출이 목업 응답을 받는다 (실패 시 대체안으로 전환) |
| 2 | 목업 DB 계층: AsyncStorage 기반 `store.ts` + `seed.ts`, domain types 정의 | 앱 재시작 후에도 시드 데이터가 유지된다 |
| 3 | 노인 온보딩: 음성 상담 목업(질문 4개 시뮬레이션) → 건강 프로필 생성 | 온보딩 완료 시 프로필이 저장되고 조회된다 |
| 4 | 노인 홈 + 아침 체크인 | 체크인 시 프로필 이력이 갱신·저장된다 |
| 5 | 카메라 촬영 + 목업 영양 분석 + 결과 화면(음식 편집, 적합도) | 사진 촬영 mock → 분석 결과 표시 → 기록 저장 |
| 6 | 식단 추천(다음 끼니) | 최근 식사 기록을 반영한 추천 3종 순환 |
| 7 | 복약: 목록/알림(expo-notifications)/이행 기록/충돌 경고(자몽 등) | 복약 시간 알림, '먹었어요' 기록, 충돌 경고 표시 |
| 8 | 기록 히스토리 + 캘린더 | 날짜별 식사/복약/체크인 조회 |
| 9 | 내 정보(프로필 편집) + 보호자 초대코드 생성 | 프로필 수정 저장, 초대코드로 보호자 연결 가능 |
| 10 | 보호자: 연결 → 홈 요약 → 알림+코멘트 → 주간 리포트(차트) → 복약 관리 | 보호자 화면에서 노인 데이터가 실시간(폴링) 반영 |
| 11 | 컴플라이언스: 고위험 공유 동의 플로우, 의료행위 아님/119 배너 전역 삽입 | 동의 없이는 고위험 경고가 보호자에게 공유되지 않음 |
| 12 | 접근성/폴리싱: 큰 글씨/고대비, 빈 상태/에러 상태 | 노인 화면 전반 큰 버튼/큰 글씨 확인 |
| 13 | 검증: 전체 플로우 수동 스모크 테스트 (Expo Go 또는 시뮬레이터) | PRD 5개 기능의 수용 기준을 한 번씩 직접 실행하여 확인 |

## 5. Acceptance Criteria (테스트 가능한 기준)

1. 노인 온보딩 완료 후 건강 프로필(지병/복약/연하/기피음식/체중·식욕)이 생성되고, 앱을 재시작해도 유지된다.
2. 아침 체크인 시 이력이 날짜별로 저장되고 조회 가능하다.
3. 사진 촬영(mock) 1회로 음식 항목·영양소가 계산되어 화면에 표시되고, 히스토리에 누적된다.
4. 분석 완료 후 적합도(적합/주의) 피드백과 다음 끼니 추천이 표시된다.
5. 복약 일정 등록 후 지정 시간에 로컬 알림이 울리고, '먹었어요' 클릭 시 날짜/시간이 저장된다.
6. 자몽 등 룰에 등록된 충돌 식품 섭취 시 경고가 표시된다.
7. 보호자가 초대코드로 연결하면 노인의 최신 데이터(식사/복약/체크인)를 조회할 수 있다.
8. 식사 누락/영양 위험/복약 미이행 시 보호자에게 알림이 뜬다(로컬 폴링 기반 시뮬레이션).
9. 앱을 완전히 종료(kill) 후 재시작해도 모든 기록이 남아있다.
10. 고위험 경고를 보호자와 공유하기 전에 동의를 받은 적이 없으면 공유되지 않는다.

## 6. Risks and Mitigations

| 리스크 | 영향 | 완화 방안 |
|---|---|---|
| MSW가 이번 Expo/RN 버전에서 fetch를 제대로 가로채지 못함 | 목업 레이어 전체 재설계 필요 | Phase 1에 전용 스파이크 배치. 실패 시 `axios-mock-adapter` 또는 자체 fetch 래퍼(`if (USE_MOCKS) return mockDb...`)로 대체. API 클라이언트 인터페이스는 동일하게 유지되므로 상위 코드 변경 없음 |
| AsyncStorage만으로 관계형 데이터(여러 사용자, 다대다 연결)를 다루기 복잡해짐 | 코드 복잡도 증가, 버그 가능성 | 목업 DB를 컬렉션 단위 JSON(`users`, `healthProfiles`, `meals`, `medications`, `checkins`, `guardianLinks`)으로 정규화하고 단순 CRUD 유틸로 감싼다. 데이터 규모가 커지면 이후 `expo-sqlite`로 교체 가능하도록 store.ts 인터페이스를 추상화 |
| 로컬 알림(expo-notifications)이 iOS/Android 권한·백그라운드 정책에 따라 신뢰성이 다름 | 복약 알림 누락 | PRD 리스크 섹션에도 "알림 수신 실패/지연 등 기술적 한계"가 명시되어 있으므로, 앱 내 UI에도 이를 고지하고 알림 외 오늘의 약 화면에서 시각적으로 미이행을 표시 |
| 컴플라이언스 문구(의료행위 아님/119/동의)가 화면마다 빠짐 | 법적/신뢰 리스크 | 공통 `DisclaimerBanner` 컴포넌트를 만들어 온보딩/결과/충돌경고/보호자 알림 화면에 강제 배치 |
| 프로토타입의 방대한 상태(캘린더 31일 생성, 7일 차트 등)를 그대로 옮기면 과도한 초기 구현량 | 일정 지연 | Phase 3~9까지 순서대로 진행하며, 각 Phase 완료 시점마다 동작 확인 후 다음으로 진행 (한 번에 다 만들지 않음) |

## 7. Verification Steps

- 각 Phase 종료 시 `npx expo start`로 실제 기기/시뮬레이터에서 해당 플로우를 수동 실행.
- Phase 13에서 Acceptance Criteria 10개를 순서대로 직접 실행하며 체크.
- 앱 강제 종료 후 재실행하여 데이터 영속성(AC #9) 확인.
- MSW 스파이크(Phase 1) 실패 시 대체안 적용 후 나머지 Phase는 동일하게 진행(API 클라이언트 인터페이스 불변).

## 8. Non-Goals (이번 범위 제외 — 명시적 확인됨)

- 요양시설 웹 대시보드.
- 실제 백엔드 서버, 실제 음성 AI/영양분석 AI 연동 (계약/타입만 정의, 구현은 목업).
