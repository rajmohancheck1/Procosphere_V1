import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { OrderService, OrderResponse } from '../../services/order.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
})
export class ProfileComponent implements OnInit {
  formData = {
    firstName: '', lastName: '', email: '', role: '',
  };

  totalOrders = 0;
  approvedOrders = 0;
  totalSpent = 0;

  constructor(private authService: AuthService, private orderService: OrderService) {}

  ngOnInit() {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.formData.firstName = user.firstName;
      this.formData.lastName = user.lastName;
      this.formData.email = user.email;
      this.formData.role = user.role;
    }

    this.orderService.getAll().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const myId = this.authService.getCurrentUserId();
          const mine: OrderResponse[] = myId ? res.data.filter((o: any) => o.createdBy === myId) : res.data;
          this.totalOrders = mine.length;
          this.approvedOrders = mine.filter(o => o.status === 'APPROVED' || o.status === 'RECEIVED' || o.status === 'ORDERED').length;
          this.totalSpent = mine.reduce((sum, o) => sum + (o.totalAmount ?? 0), 0);
        }
      },
      error: () => {}
    });
  }

  get initials(): string {
    return ((this.formData.firstName?.[0] ?? '') + (this.formData.lastName?.[0] ?? '')).toUpperCase();
  }

  get displayRole(): string {
    const map: Record<string, string> = { ADMIN: 'Administrator', MANAGER: 'Manager', USER: 'User', SUPPLIER: 'Supplier' };
    return map[this.formData.role] || this.formData.role;
  }
}
