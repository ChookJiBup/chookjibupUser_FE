/**
 * 전역 헤더 없이 화면이 자기 헤더(예: "< 축제 실시간 현황")를 직접 그리는 화면들의 레이아웃.
 * 시안에서 상태바 바로 아래가 화면 제목인 축제 실시간 현황이 여기에 해당한다.
 *
 * 화면 컴포넌트들은 `-mx-5 -my-4`로 main의 여백을 되돌리고
 * `100dvh - var(--app-header-height)`로 높이를 잡는 관례를 쓰고 있다. 이 그룹에는 전역 헤더가
 * 없으므로 --app-header-height를 노치 높이로 재정의해서, 같은 계산식이 "노치 아래 전체 높이"가
 * 되도록 한다. 위쪽 여백도 노치만큼만 남기려고 pt에 --app-safe-top을 더해 둔다
 * (화면 쪽 -my-4가 기본 py-4만 상쇄한다).
 */
export default function BareLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mobile-app-shell mx-auto flex flex-col bg-white shadow-sm [--app-header-height:var(--app-safe-top)]">
      <main className="relative isolate z-0 flex min-w-0 flex-1 flex-col px-5 py-4 pt-[calc(16px+var(--app-safe-top))]">
        {children}
      </main>
    </div>
  );
}
