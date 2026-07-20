import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { API_BASE_URL } from '../config/api.config';
import { ApiResponse } from '../models/api-response.model';
import { PageResponse } from '../models/page-response.model';
import { UserResponse } from '../models/user/user-response.model';
import { UserUpdateRequest } from '../models/user/user-update-request.model';
import { Role } from '../models/enums/role.enum';

const USER_API = `${API_BASE_URL}/users`;

@Injectable({
  providedIn: 'root',
})
export class UserService {
  constructor(private http: HttpClient) {}

  getAllUsers(
    name?: string,
    email?: string,
    role?: Role,
    page = 0,
    size = 10,
    sortBy = 'createdAt',
    sortDirection = 'desc'
  ): Observable<PageResponse<UserResponse>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sortBy', sortBy)
      .set('sortDirection', sortDirection);

    if (name) params = params.set('name', name);
    if (email) params = params.set('email', email);
    if (role) params = params.set('role', role);

    return this.http
      .get<ApiResponse<PageResponse<UserResponse>>>(USER_API, { params })
      .pipe(map((response) => response.data));
  }

  getCurrentUser(): Observable<UserResponse> {
    return this.http
      .get<ApiResponse<UserResponse>>(`${USER_API}/me`)
      .pipe(map((response) => response.data));
  }

  updateCurrentUser(request: UserUpdateRequest): Observable<UserResponse> {
    return this.http
      .put<ApiResponse<UserResponse>>(`${USER_API}/me`, request)
      .pipe(map((response) => response.data));
  }

  deleteUser(userId: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${USER_API}/${userId}`)
      .pipe(map(() => {}));
  }
}
