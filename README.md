# chookjibupUser_FE

AI 기반 축제 대기열 배치 설계 및 대기시간 안내 플랫폼 — 방문자용 웹앱(모바일 사이즈) 프론트엔드.

관리자/운영자/스태프용 화면은 별도 저장소 [`chookjibupAdmin_FE`](https://github.com/ChookJiBup/chookjibupAdmin_FE)에서 다룹니다.

## 스택

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Zustand · TanStack Query · Axios · ESLint/Prettier

레이아웃은 모바일 웹앱 사이즈(`max-w-md`)로 고정되어, 데스크탑에서도 모바일 폭으로 중앙 정렬되어 보입니다.

## 시작하기

Node 22 이상이 필요합니다 (`package.json`의 `engines.node` 기준). `pnpm` 실행 자체가 Node 22+ 를 요구하니, 버전이 다르면 먼저 맞춰주세요.

```bash
nvm use 22   # 또는 사용 중인 버전 매니저로 Node 22 이상으로 전환
pnpm install
pnpm dev
```

http://localhost:3000 에서 확인합니다.

## 폴더 구조

```
src/app/
└── (방문자 화면 — 스펙 확정 후 추가 예정)
```

방문자 화면 스펙과 API 연동은 아직 시작 전입니다. 관리자 쪽 인증/API 연동 패턴(axios 인스턴스,
zustand persist 세션, 라우트 가드 등)은 `chookjibupAdmin_FE`의 `src/lib/api/`, `src/store/`,
`src/components/auth/`를 참고해 동일한 방식으로 맞출 예정입니다.

## 디자인 토큰

`src/app/globals.css`에 Figma "축지법" 파일의 Colors/Typography 토큰이 반영되어 있습니다
(zinc 색상 스케일, `primary`/`secondary`/`error`/`dimmed` 시맨틱 색상, `heading-large` 같은
텍스트 스타일 유틸리티). 본문 서체는 Pretendard Variable을 로컬 폰트로 로드합니다.

## 스크립트

| 명령어           | 설명            |
| ---------------- | --------------- |
| `pnpm dev`       | 개발 서버 실행  |
| `pnpm build`     | 프로덕션 빌드   |
| `pnpm lint`      | ESLint 검사     |
| `pnpm typecheck` | 타입 체크       |
| `pnpm format`    | Prettier 포맷팅 |

## Git

| 브랜치      | 용도             |
| ----------- | ---------------- |
| `main`      | 배포 기준        |
| `develop`   | 통합 개발 브랜치 |
| `feature/*` | 기능 개발        |
| `fix/*`     | 버그 수정        |
| `chore/*`   | 설정, 기타       |

커밋 메시지는 Conventional Commits 형식(한국어)을 따릅니다. 자세한 규칙은
`chookjibupAdmin_FE/docs/commit-message-guide.md`와 동일합니다.

```
feat: 대기열 조회 화면 추가
fix: 대기시간 계산 오류 수정
chore: 설정 업데이트
```

PR을 올릴 때는 `.github/pull_request_template.md` 체크리스트를 확인하고, `lint`·`typecheck`가 통과하는지 확인 후 올립니다.
