import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UserResponse {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: 'ADMIN' | 'MANAGER' | 'USER' | 'SUPPLIER';
  department: string | null;
  company: string | null;
}
export interface ApiResponse<T> { success: boolean; message: string; data: T; }

@Injectable({ providedIn: 'root' })
export class UserService {
  private base = environment.apiUrl + '/api/users';
  constructor(private http: HttpClient) {}

  getMe(): Observable<ApiResponse<UserResponse>> {
    return this.http.get<ApiResponse<UserResponse>>(`${this.base}/me`);
  }

  getAll(): Observable<ApiResponse<UserResponse[]>> {
    return this.http.get<ApiResponse<UserResponse[]>>(this.base);
  }

  updateRole(id: number, role: string): Observable<ApiResponse<UserResponse>> {
    return this.http.patch<ApiResponse<UserResponse>>(`${this.base}/${id}/role`, { role });
  }

  delete(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.base}/${id}`);
  }
}
