import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DashboardService, DashboardSummaryResponse } from '../../services/dashboard.service';
import { OrderService, OrderResponse } from '../../services/order.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  constructor(private router: Router, private dashboardService: DashboardService, private orderService: OrderService) {}

  summary: DashboardSummaryResponse | null = null;
  recentOrders: OrderResponse[] = [];
  isLoading = true;
  errorMsg = '';

  get metrics() {
    return [
      { label: 'Total Products', value: this.summary ? this.summary.totalProducts.toString() : '—', color: 'bg-blue-500', trend: '' },
      { label: 'Total Users', value: this.summary ? this.summary.totalUsers.toString() : '—', color: 'bg-green-500', trend: '' },
      { label: 'Pending Orders', value: this.summary ? this.summary.pendingOrders.toString() : '—', color: 'bg-yellow-500', trend: '' },
      { label: 'Out of Stock', value: this.summary ? this.summary.outOfStockProducts.toString() : '—', color: 'bg-red-500', trend: '' },
    ];
  }

  quickActions = [
    { label: 'Create New Order', path: '/app/create-order', color: 'bg-blue-500' },
    { label: 'Browse Product Catalog', path: '/app/products', color: 'bg-green-500' },
    { label: 'Track Deliveries', path: '/app/delivery', color: 'bg-purple-500' },
    { label: 'View Reports', path: '/app/orders', color: 'bg-orange-500' },
  ];

  statusColors: Record<string, string> = {
    DRAFT:     'bg-gray-100 text-gray-800',
    PENDING:   'bg-yellow-100 text-yellow-800',
    APPROVED:  'bg-green-100 text-green-800',
    REJECTED:  'bg-red-100 text-red-800',
    ORDERED:   'bg-blue-100 text-blue-800',
    RECEIVED:  'bg-emerald-100 text-emerald-800',
    CANCELLED: 'bg-gray-200 text-gray-700',
  };

  statusProgress: Record<string, number> = {
    DRAFT: 10, PENDING: 25, APPROVED: 50, ORDERED: 75, RECEIVED: 100,
    REJECTED: 0, CANCELLED: 0,
  };

  ngOnInit() {
    this.dashboardService.getSummary().subscribe({
      next: (res) => { if (res.success) this.summary = res.data; },
      error: () => {}
    });
    this.orderService.getAll().subscribe({
      next: (res) => {
        if (res.success) this.recentOrders = res.data.slice(0, 5);
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMsg = err?.error?.message || 'Failed to load orders. Is the backend running on port 8090?';
      }
    });
  }

  getOrderProducts(order: OrderResponse): string {
    return order.items?.map(i => i.productName).join(', ') || '—';
  }

  getOrderAmount(order: OrderResponse): string {
    return '$' + (order.totalAmount ?? 0).toFixed(2);
  }

  getOrderDate(order: OrderResponse): string {
    return order.createdAt ? order.createdAt.split('T')[0] : '—';
  }

  navigate(path: string) { this.router.navigate([path]); }
}
