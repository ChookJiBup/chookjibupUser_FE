# chookjibupUser_FE

AI 기반 축제 대기열 배치 설계 및 대기시간 안내 플랫폼 — 방문자용 웹앱(모바일 사이즈) 프론트엔드.

## 스택

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Zustand · TanStack Query · Axios · ESLint/Prettier

레이아웃은 모바일 웹앱 사이즈(`max-w-md`)로 고정되어, 데스크탑에서도 모바일 폭으로 중앙 정렬되어 보입니다.

## 시작하기

```bash
pnpm install
pnpm dev
```

http://localhost:3000 에서 확인.

## 폴더 구조

```
src/app/
└── (방문자 화면 — 스펙 확정 후 추가 예정)
```

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

```
feat: 대기열 조회 화면 추가
fix: 대기시간 계산 오류 수정
design: 디자인 토큰 적용
chore: 설정 업데이트
```

PR을 올릴 때는 `.github/pull_request_template.md` 체크리스트를 확인하고, `lint`·`typecheck`가 통과하는지 확인 후 올립니다.
