export type PolicySlug = "terms" | "privacy";

export interface PolicyContent {
  title: string;
  body: string;
}

const POLICY_TITLES: Record<PolicySlug, string> = {
  terms: "축지법 서비스 이용약관",
  privacy: "개인정보 처리방침",
};

export function getPolicyPath(slug: PolicySlug) {
  return `/policy/${slug}` as const;
}

export const POLICY_TERMS_PATH = getPolicyPath("terms");
export const POLICY_PRIVACY_PATH = getPolicyPath("privacy");

/** 회원가입 동의 목록 (보기 링크 포함). */
export const POLICY_AGREEMENTS = [
  {
    slug: "terms" as const,
    label: POLICY_TITLES.terms,
    path: POLICY_TERMS_PATH,
  },
  {
    slug: "privacy" as const,
    label: POLICY_TITLES.privacy,
    path: POLICY_PRIVACY_PATH,
  },
] as const;

/**
 * 약관 본문·제목.
 * `terms.md` / `privacy.md`를 읽어 반환한다. 서버 전용.
 */
export function getPolicyContent(slug: PolicySlug): PolicyContent {
  // 동적 require로 클라이언트 번들에서 fs 정적 해석을 피한다.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { readFileSync } = require("node:fs") as typeof import("node:fs");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require("node:path") as typeof import("node:path");
  const fileName = slug === "terms" ? "terms.md" : "privacy.md";
  const body = readFileSync(
    path.join(process.cwd(), "src/features/policy", fileName),
    "utf8",
  );

  return {
    title: POLICY_TITLES[slug],
    body,
  };
}

export const POLICY_CONTENT: Record<PolicySlug, PolicyContent> = {
  get terms() {
    return getPolicyContent("terms");
  },
  get privacy() {
    return getPolicyContent("privacy");
  },
};
