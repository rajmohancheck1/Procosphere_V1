import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { OrderService, OrderResponse } from '../../services/order.service';
import { ProductService, ProductResponse } from '../../services/product.service';
import { DashboardService, DashboardSummaryResponse } from '../../services/dashboard.service';
import { AuthService } from '../../services/auth.service';
import { forkJoin } from 'rxjs';

type Tab = 'approvals' | 'stock' | 'suppliers';

@Component({
  selector: 'app-manager-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './manager-dashboard.component.html',
})
export class ManagerDashboardComponent implements OnInit {
  activeTab: Tab = 'approvals';

  orders: OrderResponse[] = [];
  products: ProductResponse[] = [];
  summary: DashboardSummaryResponse | null = null;

  selectedIds = new Set<number>();
  isLoading = true;
  errorMsg = '';
  successMsg = '';
  busyId: number | null = null;
  bulkBusy = false;

  priorityColor: Record<string, string> = {
    LOW: 'bg-green-100 text-green-800',
    MEDIUM: 'bg-yellow-100 text-yellow-800',
    HIGH: 'bg-red-100 text-red-800',
    URGENT: 'bg-red-200 text-red-900',
  };

  constructor(
    private orderService: OrderService,
    private productService: ProductService,
    private dashboardService: DashboardService,
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit() { this.load(); }

  load() {
    this.isLoading = true;
    this.errorMsg = '';
    forkJoin({
      orders: this.orderService.getAll(),
      products: this.productService.getAll(),
      summary: this.dashboardService.getSummary(),
    }).subscribe({
      next: (res) => {
        if (res.orders.success) this.orders = res.orders.data;
        if (res.products.success) this.products = res.products.data;
        if (res.summary.success) this.summary = res.summary.data;
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMsg = err?.error?.message || 'Failed to load dashboard data.';
      }
    });
  }

  get firstName(): string { return this.authService.getCurrentUser()?.firstName || 'Manager'; }
  get today(): string { return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); }

  get pendingOrders(): OrderResponse[] {
    return this.orders.filter(o => o.status === 'PENDING');
  }
  get pendingCount(): number { return this.pendingOrders.length; }

  get approvedThisWeek(): number {
    const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
    return this.orders.filter(o => o.status === 'APPROVED' && o.createdAt && new Date(o.createdAt).getTime() > weekAgo).length;
  }

  get totalPOValue(): number {
    return this.orders.filter(o => o.status === 'APPROVED').reduce((sum, o) => sum + (o.totalAmount ?? 0), 0);
  }

  get totalPOFormatted(): string {
    const v = this.totalPOValue;
    if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
    if (v >= 1000)   return `₹${(v / 1000).toFixed(1)}K`;
    return `₹${v.toFixed(0)}`;
  }

  get criticalStockCount(): number {
    return this.products.filter(p => !((p as any).inStock ?? (p as any).isInStock) || (p.stockQuantity ?? 0) === 0).length;
  }
  get lowStockCount(): number {
    return this.products.filter(p => (p.stockQuantity ?? 0) > 0 && (p.stockQuantity ?? 0) <= 10).length;
  }
  get stockAlertCount(): number { return this.criticalStockCount + this.lowStockCount; }

  get lowStockProducts(): ProductResponse[] {
    return this.products
      .filter(p => (p.stockQuantity ?? 0) <= 10)
      .sort((a, b) => (a.stockQuantity ?? 0) - (b.stockQuantity ?? 0));
  }

  // Selection
  toggleSelect(id: number) {
    if (this.selectedIds.has(id)) this.selectedIds.delete(id);
    else this.selectedIds.add(id);
  }
  isSelected(id: number): boolean { return this.selectedIds.has(id); }
  toggleSelectAll() {
    if (this.allSelected) this.selectedIds.clear();
    else this.pendingOrders.forEach(o => this.selectedIds.add(o.orderId));
  }
  get allSelected(): boolean {
    return this.pendingOrders.length > 0 && this.pendingOrders.every(o => this.selectedIds.has(o.orderId));
  }

  // Actions
  approve(id: number) {
    this.busyId = id;
    this.orderService.approve(id).subscribe({
      next: (res) => {
        this.busyId = null;
        if (res.success) {
          this.orders = this.orders.map(o => o.orderId === id ? res.data : o);
          this.selectedIds.delete(id);
          this.flashSuccess(`Order #ORD-${id} approved.`);
        }
      },
      error: (err) => {
        this.busyId = null;
        this.flashError(err?.error?.message || 'Failed to approve order.');
      }
    });
  }

  reject(id: number) {
    if (!confirm(`Reject order #ORD-${id}?`)) return;
    this.busyId = id;
    this.orderService.reject(id).subscribe({
      next: (res) => {
        this.busyId = null;
        if (res.success) {
          this.orders = this.orders.map(o => o.orderId === id ? res.data : o);
          this.selectedIds.delete(id);
          this.flashSuccess(`Order #ORD-${id} rejected.`);
        }
      },
      error: (err) => {
        this.busyId = null;
        this.flashError(err?.error?.message || 'Failed to reject order.');
      }
    });
  }

  bulkApprove() {
    const ids = Array.from(this.selectedIds);
    if (!ids.length) return;
    if (!confirm(`Approve ${ids.length} selected order(s)?`)) return;
    this.bulkBusy = true;
    let done = 0;
    ids.forEach(id => {
      this.orderService.approve(id).subscribe({
        next: (res) => {
          if (res.success) this.orders = this.orders.map(o => o.orderId === id ? res.data : o);
          if (++done === ids.length) this.finishBulk(ids.length, 'approved');
        },
        error: () => { if (++done === ids.length) this.finishBulk(ids.length, 'approved'); }
      });
    });
  }

  bulkReject() {
    const ids = Array.from(this.selectedIds);
    if (!ids.length) return;
    if (!confirm(`Reject ${ids.length} selected order(s)?`)) return;
    this.bulkBusy = true;
    let done = 0;
    ids.forEach(id => {
      this.orderService.reject(id).subscribe({
        next: (res) => {
          if (res.success) this.orders = this.orders.map(o => o.orderId === id ? res.data : o);
          if (++done === ids.length) this.finishBulk(ids.length, 'rejected');
        },
        error: () => { if (++done === ids.length) this.finishBulk(ids.length, 'rejected'); }
      });
    });
  }

  private finishBulk(count: number, verb: string) {
    this.bulkBusy = false;
    this.selectedIds.clear();
    this.flashSuccess(`${count} order(s) ${verb}.`);
  }

  riskLabel(o: OrderResponse): { label: string; cls: string } {
    const amt = o.totalAmount ?? 0;
    if (amt >= 100000) return { label: 'High',   cls: 'bg-red-100 text-red-800' };
    if (amt >= 30000)  return { label: 'Med',    cls: 'bg-yellow-100 text-yellow-800' };
    return                     { label: 'Low',    cls: 'bg-green-100 text-green-800' };
  }

  getItems(o: OrderResponse): string {
    return o.items?.map(i => `${i.productName} x${i.quantity}`).join(', ') || '—';
  }
  getDate(o: OrderResponse): string {
    return o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
  }
  getAmount(amt: number | null): string { return '₹' + (amt ?? 0).toLocaleString(); }
  getSupplierName(o: OrderResponse): string {
    return o.supplierName || ('Supplier #' + o.supplierId);
  }

  stockSeverity(p: ProductResponse): { label: string; cls: string } {
    const q = p.stockQuantity ?? 0;
    if (q === 0) return { label: 'Critical', cls: 'bg-red-100 text-red-800' };
    if (q <= 5)  return { label: 'Critical', cls: 'bg-red-100 text-red-800' };
    return             { label: 'Low',      cls: 'bg-yellow-100 text-yellow-800' };
  }

  /** Width of the per-row stock bar (0–100). 25 units = full bar. */
  stockBarPercent(p: ProductResponse): number {
    const q = p.stockQuantity ?? 0;
    return Math.min(100, Math.round((q / 25) * 100));
  }

  /** Color of the per-row stock bar based on remaining quantity. */
  stockBarClass(p: ProductResponse): string {
    const q = p.stockQuantity ?? 0;
    if (q === 0) return 'bg-red-500';
    if (q <= 5)  return 'bg-red-500';
    if (q <= 10) return 'bg-yellow-500';
    return 'bg-green-500';
  }

  /** Aggregated breakdown for the Stock Level Overview chart. */
  get stockOverviewData(): { label: string; count: number; percent: number; barClass: string }[] {
    const total = this.products.length || 1;
    const out      = this.products.filter(p => (p.stockQuantity ?? 0) === 0).length;
    const critical = this.products.filter(p => { const q = p.stockQuantity ?? 0; return q > 0 && q <= 5; }).length;
    const low      = this.products.filter(p => { const q = p.stockQuantity ?? 0; return q > 5 && q <= 10; }).length;
    const healthy  = this.products.filter(p => (p.stockQuantity ?? 0) > 10).length;
    return [
      { label: 'Healthy (>10)',        count: healthy,  percent: Math.round((healthy  / total) * 100), barClass: 'bg-green-500'  },
      { label: 'Low (6–10)',           count: low,      percent: Math.round((low      / total) * 100), barClass: 'bg-yellow-500' },
      { label: 'Critical (1–5)',       count: critical, percent: Math.round((critical / total) * 100), barClass: 'bg-red-500'    },
      { label: 'Out of Stock (0)',     count: out,      percent: Math.round((out      / total) * 100), barClass: 'bg-gray-700'   },
    ];
  }

  /** Manager triggers a reorder by jumping to Create Order with this product preselected. */
  createReorder(p: ProductResponse) {
    this.router.navigate(['/app/create-order'], { queryParams: { productId: p.productId } });
  }

  private flashSuccess(msg: string) { this.successMsg = msg; setTimeout(() => this.successMsg = '', 3500); }
  private flashError(msg: string) { this.errorMsg = msg; setTimeout(() => this.errorMsg = '', 4000); }

  navigateTo(path: string) { this.router.navigate([path]); }
}
