import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface LoginRequest { email: string; password: string; }
export interface RegisterRequest {
  firstName: string; lastName: string; email: string; password: string;
  phone?: string; department?: string; company?: string;
  address?: string; avatarUrl?: string;
  // Note: role is intentionally omitted — backend always assigns USER on self-registration.
}
export type Role = 'ADMIN' | 'MANAGER' | 'USER' | 'SUPPLIER';
export interface AuthResponse {
  token: string; tokenType: string; userId: number;
  firstName: string; lastName: string; email: string; role: Role;
}
export interface ApiResponse<T> { success: boolean; message: string; data: T; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private base = environment.apiUrl + '/api/auth';

  constructor(private http: HttpClient) {}

  login(req: LoginRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.base}/login`, req).pipe(
      tap(res => {
        if (res.success && res.data) {
          localStorage.setItem('token', res.data.token);
          localStorage.setItem('user', JSON.stringify(res.data));
        }
      })
    );
  }

  register(req: RegisterRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${this.base}/register`, req);
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  getToken(): string | null { return localStorage.getItem('token'); }

  isLoggedIn(): boolean { return !!this.getToken(); }

  getCurrentUser(): AuthResponse | null {
    const u = localStorage.getItem('user');
    if (!u) return null;
    try { return JSON.parse(u); }
    catch { localStorage.removeItem('user'); return null; }
  }

  getCurrentUserId(): number | null {
    return this.getCurrentUser()?.userId ?? null;
  }
}
