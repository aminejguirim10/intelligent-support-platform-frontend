export interface AuthenticationResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  id: number;
  email: string;
  role: string;
  name: string;
  profilePhotoUrl: string;
}
