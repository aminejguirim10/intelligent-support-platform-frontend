import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_BASE_URL } from '../config/api.config';
import { ApiResponse } from '../models/api-response.model';
import { AuthenticationRequest } from '../models/auth/authentication-request.model';
import { AuthenticationResponse } from '../models/auth/authentication-response.model';
import { RegisterRequest } from '../models/auth/register-request.model';
import { ForgotPasswordRequest } from '../models/auth/forgot-password-request.model';
import { ResetPasswordRequest } from '../models/auth/reset-password-request.model';
import { UserResponse } from '../models/user/user-response.model';

const AUTH_API = `${API_BASE_URL}/auth`;

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private tokenKey = 'auth_token';
  private refreshTokenKey = 'refresh_token';
  private userKey = 'auth_user';
  private userSubject = new BehaviorSubject<{ id: number; email: string; role: string; name: string; profilePhotoUrl: string } | null>(null);

  constructor(private http: HttpClient) {
    // Initialize user from localStorage on service creation
    this.userSubject.next(this.getUser());
  }

  register(request: RegisterRequest): Observable<AuthenticationResponse> {
    return this.http
      .post<ApiResponse<AuthenticationResponse>>(`${AUTH_API}/register`, request)
      .pipe(
        map((response) => {
          this.saveAuthData(response.data);
          return response.data;
        }),
      );
  }

  registerAdmin(request: RegisterRequest): Observable<AuthenticationResponse> {
    return this.http
      .post<ApiResponse<AuthenticationResponse>>(`${AUTH_API}/register-admin`, request)
      .pipe(
        map((response) => {
          this.saveAuthData(response.data);
          return response.data;
        }),
      );
  }

  login(request: AuthenticationRequest): Observable<AuthenticationResponse> {
    return this.http.post<ApiResponse<AuthenticationResponse>>(`${AUTH_API}/login`, request).pipe(
      map((response) => {
        this.saveAuthData(response.data);
        return response.data;
      }),
    );
  }

  refreshToken(): Observable<AuthenticationResponse> {
    const refreshToken = this.getRefreshToken();
    return this.http
      .post<ApiResponse<AuthenticationResponse>>(
        `${AUTH_API}/refresh-token`,
        {},
        {
          headers: {
            'X-Refresh-Token': refreshToken || '',
          },
        },
      )
      .pipe(
        map((response) => {
          this.saveAuthData(response.data);
          return response.data;
        }),
      );
  }

  forgotPassword(request: ForgotPasswordRequest): Observable<void> {
    return this.http
      .post<ApiResponse<void>>(`${AUTH_API}/forgot-password`, request)
      .pipe(map(() => {}));
  }

  resetPassword(request: ResetPasswordRequest): Observable<void> {
    return this.http
      .post<ApiResponse<void>>(`${AUTH_API}/reset-password`, request)
      .pipe(map(() => {}));
  }

  public saveAuthData(data: AuthenticationResponse): void {
    localStorage.setItem(this.tokenKey, data.access_token);
    localStorage.setItem(this.refreshTokenKey, data.refresh_token);
    const userData = {
      id: data.id,
      email: data.email,
      role: data.role,
      name: data.name,
      profilePhotoUrl: data.profilePhotoUrl,
    };
    localStorage.setItem(this.userKey, JSON.stringify(userData));
    this.userSubject.next(userData);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshTokenKey);
  }

  getUser(): { id: number; email: string; role: string; name: string; profilePhotoUrl: string } | null {
    const user = localStorage.getItem(this.userKey);
    return user ? JSON.parse(user) : null;
  }

  user$ = this.userSubject.asObservable();

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  isAdmin(): boolean {
    const user = this.getUser();
    return user?.role === 'ADMIN';
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshTokenKey);
    localStorage.removeItem(this.userKey);
    this.userSubject.next(null);
  }

  updateUser(userData: Partial<{ id: number; email: string; role: string; name: string; profilePhotoUrl: string }>): void {
    const currentUser = this.getUser();
    if (currentUser) {
      const updatedUser = { ...currentUser, ...userData };
      localStorage.setItem(this.userKey, JSON.stringify(updatedUser));
      this.userSubject.next(updatedUser);
    }
  }
}
