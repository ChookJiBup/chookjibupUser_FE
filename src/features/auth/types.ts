export interface KakaoLoginRequest {
  code: string;
  redirectUri?: string;
}

export interface UserLoginResponse {
  accessToken: string;
  accessTokenExpiresInSeconds: number;
  newUser: boolean;
  nickname: string;
  email: string | null;
  profileImageUrl: string | null;
}

export interface EmailVerificationRequest {
  email: string;
}

export interface EmailVerificationConfirmRequest extends EmailVerificationRequest {
  code: string;
}

export interface EmailLoginRequest extends EmailVerificationRequest {
  password: string;
}

export interface EmailSignupRequest extends EmailLoginRequest {
  passwordConfirm: string;
  nickname: string;
  phoneNumber?: string;
  birthDate?: string;
}
