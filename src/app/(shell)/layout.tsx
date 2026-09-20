import { Header } from "@/components/layout/Header";

/**
 * 전역 헤더(햄버거 + 로고 + 검색 + 로그인/사용자)를 쓰는 화면들의 레이아웃.
 * 시안에서 홈·축제상세·리뷰·검색·찜·마이페이지·로그인/회원가입 화면은 모두 이 헤더를 달고 있다.
 * 라우트 그룹 이름은 URL에 들어가지 않으므로 주소는 그대로 유지된다.
 */
export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mobile-app-shell mx-auto flex flex-col bg-white shadow-sm">
      <Header />
      <main className="relative isolate z-0 flex min-w-0 flex-1 flex-col px-5 py-4">
        {children}
      </main>
    </div>
  );
}
