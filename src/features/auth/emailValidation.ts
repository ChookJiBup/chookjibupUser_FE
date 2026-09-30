/** 이메일 형식 검증. 공백 제거 후 기본적인 local@domain.tld 형태인지 확인한다. */
export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export const EMAIL_FORMAT_ERROR = "올바른 이메일 형식이 아닙니다.";
