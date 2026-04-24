import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DeliveryResponse {
  deliveryId: number; orderId: number; orderTitle: string;
  trackingNumber: string; status: string;
  shippedDate: string; deliveredDate: string;
}
export interface DeliveryRequest {
  orderId: number; trackingNumber?: string; status?: string;
  shippedDate?: string; deliveredDate?: string;
}
export interface ApiResponse<T> { success: boolean; message: string; data: T; }

@Injectable({ providedIn: 'root' })
export class DeliveryService {
  private base = environment.apiUrl + '/api/deliveries';
  constructor(private http: HttpClient) {}

  getAll(): Observable<ApiResponse<DeliveryResponse[]>> {
    return this.http.get<ApiResponse<DeliveryResponse[]>>(this.base);
  }

  getByOrderId(orderId: number): Observable<ApiResponse<DeliveryResponse[]>> {
    return this.http.get<ApiResponse<DeliveryResponse[]>>(`${this.base}/order/${orderId}`);
  }
}
