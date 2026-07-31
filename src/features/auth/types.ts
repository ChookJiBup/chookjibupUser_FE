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
