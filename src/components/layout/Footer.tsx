import Link from "next/link";
import { cn } from "@/lib/utils";

export interface FooterProps {
  className?: string;
}

export function Footer({ className }: FooterProps) {
  return (
    <footer
      className={cn(
        "flex flex-col items-start gap-4 border-t border-zinc-200 bg-white px-5 py-6 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-10",
        className,
      )}
    >
      <p className="body-caption break-keep text-zinc-500">
        © {new Date().getFullYear()} 축지법 ·{" "}
        <a href="mailto:chookjibup@email.com" className="hover:text-zinc-950">
          chookjibup@email.com
        </a>{" "}
        · 한국관광공사 TourAPI 4.0 OpenAPI 데이터 활용
      </p>
      <nav aria-label="정책" className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <Link href="/policy/terms" className="body-caption text-zinc-600 hover:text-zinc-950">
          이용약관
        </Link>
        <Link href="/policy/privacy" className="body-caption text-zinc-600 hover:text-zinc-950">
          개인정보처리방침
        </Link>
      </nav>
    </footer>
  );
}
