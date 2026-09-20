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

export function takeLoginReturn(): string {
  const value = window.sessionStorage.getItem(LOGIN_RETURN_KEY);
  window.sessionStorage.removeItem(LOGIN_RETURN_KEY);
  return safeLoginReturn(value);
}
