# Repository Guidelines

## 프로젝트 구조와 모듈 구성

`app/`은 Expo Router의 파일 기반 화면을 담으며, `elderly/`와 `guardian/` 역할별 라우트로 나뉩니다. 공통 애플리케이션 코드는 `src/`에 위치합니다. 도메인 규칙은 `src/domain/`, 상태와 영속화는 `src/mocks/db/`, 디자인 토큰은 `src/theme/`, 재사용 UI는 `src/components/`를 사용하세요. 정적 이미지와 Pretendard 폰트는 `assets/`, 스모크 테스트와 실행기는 `scripts/`에 있습니다. 세부 디렉터리를 수정하기 전 해당 위치의 `AGENTS.md`도 확인하세요.

## 개발, 빌드 및 테스트 명령어

- `npm install`: 잠금 파일 기준으로 의존성을 설치합니다.
- `npm start`: Expo 개발 서버를 시작합니다.
- `npm run android`, `npm run ios`, `npm run web`: 대상 플랫폼에서 앱을 실행합니다.
- `npx tsc --noEmit`: strict TypeScript 타입 검사를 수행합니다.
- `npm run smoke:meal`: 식사 기록 도메인과 mock DB 흐름을 검증합니다. `meal` 대신 `db`, `onboarding`, `checkin`, `medication`, `guardian`, `consent` 등 변경 영역에 맞는 스위트를 실행하세요.

## 코딩 스타일과 이름 규칙

TypeScript/TSX와 2칸 들여쓰기를 사용하고 기존 파일의 세미콜론 및 따옴표 스타일을 따릅니다. 컴포넌트는 `PascalCase`, 함수·변수는 `camelCase`, 상수는 의미가 분명한 이름으로 작성하세요. 화면 스타일에서 색상, 간격, 글꼴을 직접 하드코딩하지 말고 `src/theme/tokens.ts`를 사용합니다. 아이콘은 기존 방식대로 로컬 `react-native-svg` 컴포넌트로 구현합니다. 사용자 문구는 따뜻하고 정중한 한국어를 유지하세요.

## 테스트 지침

Jest 테스트 러너는 없습니다. `scripts/smoke-*.ts`가 `tsconfig.smoke.json`으로 컴파일된 뒤 `.cjs` 실행기로 검증됩니다. 도메인 로직, mock DB 컬렉션 또는 MSW 설정을 수정했다면 관련 스모크 스위트를 반드시 실행하고, 실패 시 생성되는 `.smoke-tmp/` 산출물을 커밋하지 마세요.

## 커밋 및 Pull Request 지침

최근 이력의 형식처럼 `[feat] 기능 설명`, `[design] 가독성 변경` 등 짧은 한국어 제목을 사용합니다. 커밋 하나에는 한 가지 논리적 변경만 담으세요. PR에는 변경 목적, 영향받는 역할과 화면, 실행한 검증 명령을 적고 UI 변경에는 전후 스크린샷을 첨부합니다. 관련 이슈가 있다면 연결하고, 의료·영양 안내 변경은 “참고용” 고지와 119/의료진 안내가 유지되는지 명시하세요.

## 아키텍처 및 안전 주의사항

현재 백엔드는 AsyncStorage와 MSW 기반 mock입니다. 화면에서는 존재하지 않는 실제 API를 가정하지 마세요. Expo 코드를 변경할 때는 프로젝트 버전인 Expo 57 문서를 기준으로 확인하고, 노인과 보호자 역할 간 데이터 수정 권한을 혼동하지 마세요.
