"use client";

import Link from "next/link";
import { POLICY_PRIVACY_PATH, POLICY_TERMS_PATH } from "@/features/policy/policyContent";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

export interface FooterProps {
  className?: string;
}

/** 홈(`/`)과 축제 상세(`/festivals/:id`)에서만 Footer를 노출한다. */
function shouldShowFooter(pathname: string) {
  if (pathname === "/") return true;
  return /^\/festivals\/[^/]+$/.test(pathname);
}

export function Footer({ className }: FooterProps) {
  const pathname = usePathname();

  if (!shouldShowFooter(pathname)) return null;

  return (
    <footer
      className={cn(
        "flex flex-col items-start gap-4 border-t border-zinc-200 bg-white px-5 py-6 sm:px-6",
        className,
      )}
    >
      <p className="body-caption break-keep text-zinc-500">
        © {new Date().getFullYear()} 축지법 ·{" "}
        <a href="mailto:chookjibup@gmail.com" className="hover:text-zinc-950">
          chookjibup@gmail.com
        </a>
        <br />
        한국관광공사 OpenAPI 데이터 활용
      </p>
      <nav aria-label="정책" className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <Link href={POLICY_TERMS_PATH} className="body-caption text-zinc-600 hover:text-zinc-950">
          이용약관
        </Link>
        <Link href={POLICY_PRIVACY_PATH} className="body-caption text-zinc-600 hover:text-zinc-950">
          개인정보처리방침
        </Link>
      </nav>
    </footer>
  );
}
