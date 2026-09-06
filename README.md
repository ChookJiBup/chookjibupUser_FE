# chookjibupUser_FE

AI 기반 축제 대기열 배치 설계 및 대기시간 안내 플랫폼 — 방문자용 웹앱(모바일 사이즈) 프론트엔드

관리자/운영자/스태프용 화면은 별도 저장소 [`chookjibupAdmin_FE`](https://github.com/ChookJiBup/chookjibupAdmin_FE)에서 다룹니다.

## Tech Stack

| Category       | Technology            |
| -------------- | --------------------- |
| Framework      | Next.js App Router 16 |
| UI Library     | React 19              |
| Language       | TypeScript            |
| Styling        | Tailwind CSS v4       |
| State (Client) | Zustand               |
| State (Server) | TanStack Query        |
| HTTP Client    | Axios                 |
| Font           | Pretendard Variable   |
| Code Quality   | ESLint, Prettier      |

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm

### Installation

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

http://localhost:3000 에서 확인합니다.

### Build

```bash
pnpm build
pnpm start
```

## Scripts

| Script              | Description          |
| ------------------- | -------------------- |
| `pnpm dev`          | 개발 서버 실행       |
| `pnpm build`        | 프로덕션 빌드        |
| `pnpm start`        | 프로덕션 서버 실행   |
| `pnpm lint`         | ESLint 검사          |
| `pnpm typecheck`    | TypeScript 타입 검사 |
| `pnpm format`       | Prettier 포맷팅      |
| `pnpm format:check` | 포맷팅 검사          |

## Project Structure

```txt
src/
└── app/
    ├── layout.tsx      # 루트 레이아웃 (폰트)
    ├── page.tsx        # 홈
    └── globals.css     # 디자인 토큰
```

방문자 화면 스펙과 라우트는 아직 확정 전입니다. 인증/API 연동 패턴(axios 인스턴스,
zustand persist 세션, 라우트 가드)은 `chookjibupAdmin_FE`의 `src/lib/api/`, `src/store/`,
`src/components/auth/`와 동일한 구조로 맞출 예정입니다.

## Layout Policy

| Setting     | Value                                  |
| ----------- | -------------------------------------- |
| Layout Type | Mobile Web App                         |
| App Width   | `max-width: 28rem` (`max-w-md`)        |
| Alignment   | 데스크탑에서도 모바일 폭으로 중앙 정렬 |

## Path Alias

`@/` → `src/`

## Design System

File: `src/app/globals.css` — Figma "축지법" 파일의 Colors/Typography 프레임 기준
(`chookjibupAdmin_FE`와 동일한 토큰)

### Colors

| Token              | Name     | Hex       |
| ------------------ | -------- | --------- |
| `--color-zinc-50`  | Zinc 50  | `#fafafa` |
| `--color-zinc-100` | Zinc 100 | `#f4f4f5` |
| `--color-zinc-200` | Zinc 200 | `#e4e4e7` |
| `--color-zinc-300` | Zinc 300 | `#d4d4d8` |
| `--color-zinc-400` | Zinc 400 | `#9f9fa9` |
| `--color-zinc-500` | Zinc 500 | `#71717b` |
| `--color-zinc-600` | Zinc 600 | `#52525c` |
| `--color-zinc-700` | Zinc 700 | `#3f3f46` |
| `--color-zinc-800` | Zinc 800 | `#27272a` |
| `--color-zinc-900` | Zinc 900 | `#18181b` |
| `--color-zinc-950` | Zinc 950 | `#09090b` |
| `--color-red-500`  | Red 500  | `#fb2c36` |

### Semantic Tokens

```css
var(--color-primary)    /* zinc-900 */
var(--color-secondary)  /* zinc-700 */
var(--color-error)      /* red-500 */
var(--color-dimmed)     /* rgb(0 0 0 / 25%) */
```

### Typography Utilities

```
heading-large  heading-regular  heading-small
body-large     body-regular     body-small     body-caption
body-large-bold  body-regular-bold  body-small-bold  body-mono
```

## Git Convention

### Branch Strategy

| Branch      | Description      |
| ----------- | ---------------- |
| `main`      | 배포 기준        |
| `develop`   | 통합 개발 브랜치 |
| `feature/*` | 기능 개발        |
| `fix/*`     | 버그 수정        |
| `chore/*`   | 설정, 기타       |

### Commit Convention

`chookjibupAdmin_FE/docs/commit-message-guide.md`와 동일한 규칙(Conventional Commits, 한국어)을 따른다.

```txt
<type>(scope): <한국어 설명>
```

| Type       | Description      |
| ---------- | ---------------- |
| `feat`     | 새로운 기능      |
| `fix`      | 버그 수정        |
| `docs`     | 문서 변경        |
| `style`    | 코드 포맷팅      |
| `refactor` | 코드 리팩토링    |
| `perf`     | 성능 개선        |
| `test`     | 테스트 추가/수정 |
| `chore`    | 빌드, 설정 변경  |
| `ci`       | CI 설정 변경     |

### PR Process

1. `develop` 또는 `feature/*` 작업 브랜치에서 작업
2. 커밋 컨벤션에 맞춰 커밋
3. `main` 브랜치로 PR 생성 (`.github/pull_request_template.md` 사용)
4. Lint, Typecheck, Build(CI) 통과 확인
5. 리뷰 후 머지
