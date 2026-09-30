const LOGIN_RETURN_KEY = "chookjibup:login-return";

export function safeLoginReturn(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/";
  }
  return value;
}

export function saveLoginReturn(value: string) {
  window.sessionStorage.setItem(LOGIN_RETURN_KEY, safeLoginReturn(value));
}

export function takeLoginReturn(oauthState: string | null = null): string {
  const storedValue = window.sessionStorage.getItem(LOGIN_RETURN_KEY);
  window.sessionStorage.removeItem(LOGIN_RETURN_KEY);

  // 도메인 전환 중 sessionStorage가 유실될 수 있어 OAuth state를 우선한다.
  return safeLoginReturn(oauthState ?? storedValue);
}
