export function getKakaoRedirectUri(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/auth/kakao/callback`;
  }
  return (
    process.env.NEXT_PUBLIC_KAKAO_REDIRECT_URI ??
    "https://user.chookjibup.store/auth/kakao/callback"
  );
}

export function getKakaoAuthorizeUrl(returnTo?: string) {
  const clientId = process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID ?? "";
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getKakaoRedirectUri(),
    response_type: "code",
  });
  if (returnTo) params.set("state", returnTo);
  return `https://kauth.kakao.com/oauth/authorize?${params.toString()}`;
}
