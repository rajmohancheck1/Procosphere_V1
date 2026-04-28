import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ProductService, ProductResponse } from '../../services/product.service';

interface InventoryItem {
  productId: number;
  id: string;
  name: string;
  currentStock: number;
  minRequired: number;
  suggestedReorder: number;
  status: 'Critical' | 'Low Stock' | 'In Stock';
}

@Component({
  selector: 'app-inventory-monitoring',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inventory-monitoring.component.html',
})
export class InventoryMonitoringComponent implements OnInit {
  isLoading = true;
  errorMsg = '';

  statusColors: Record<string, string> = {
    Critical:   'bg-red-100 text-red-800',
    'Low Stock':'bg-yellow-100 text-yellow-800',
    'In Stock': 'bg-green-100 text-green-800',
  };

  inventoryItems: InventoryItem[] = [];

  constructor(
    private productService: ProductService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.productService.getAll().subscribe({
      next: (res) => {
        if (res.success) this.inventoryItems = res.data.map(p => this.mapProduct(p));
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMsg = err?.error?.message || 'Failed to load inventory. Is the backend running on port 8090?';
      }
    });
  }

  private mapProduct(p: ProductResponse): InventoryItem {
    const stock = p.stockQuantity ?? 0;
    const minRequired = 10;
    const inStock = !!(p.inStock ?? p.isInStock);
    const status: InventoryItem['status'] =
      !inStock || stock === 0 ? 'Critical'
      : stock <= minRequired ? 'Low Stock'
      : 'In Stock';
    const suggestedReorder = status === 'In Stock' ? 0 : Math.max(0, minRequired * 3 - stock);
    return {
      productId: p.productId,
      id: 'PROD-' + p.productId,
      name: p.productName,
      currentStock: stock,
      minRequired,
      suggestedReorder,
      status,
    };
  }

  get criticalCount(): number { return this.inventoryItems.filter(i => i.status === 'Critical').length; }
  get lowStockCount(): number { return this.inventoryItems.filter(i => i.status === 'Low Stock').length; }
  get inStockCount(): number  { return this.inventoryItems.filter(i => i.status === 'In Stock').length; }
  get totalItems(): number    { return this.inventoryItems.length; }

  stockBarClass(item: InventoryItem): string {
    const pct = (item.currentStock / item.minRequired) * 100;
    if (pct < 50) return 'bg-red-500';
    if (pct < 100) return 'bg-yellow-500';
    return 'bg-green-500';
  }

  stockBarWidth(item: InventoryItem): number {
    return Math.min((item.currentStock / item.minRequired) * 100, 100);
  }

  /** Trigger a reorder by jumping to Create Order with this product preselected. */
  createReorder(item: InventoryItem) {
    this.router.navigate(['/app/create-order'], {
      queryParams: { productId: item.productId },
    });
  }

  /** Aggregated breakdown for the Stock Level Overview chart. */
  get overviewBuckets(): { label: string; count: number; percent: number; barClass: string; badgeClass: string }[] {
    const total = this.totalItems || 1;
    return [
      { label: 'In Stock',  count: this.inStockCount,  percent: Math.round((this.inStockCount  / total) * 100), barClass: 'bg-green-500',  badgeClass: 'bg-green-100 text-green-800' },
      { label: 'Low Stock', count: this.lowStockCount, percent: Math.round((this.lowStockCount / total) * 100), barClass: 'bg-yellow-500', badgeClass: 'bg-yellow-100 text-yellow-800' },
      { label: 'Critical',  count: this.criticalCount, percent: Math.round((this.criticalCount / total) * 100), barClass: 'bg-red-500',    badgeClass: 'bg-red-100 text-red-800' },
    ];
  }

  /** Top 5 lowest-stock items, for a mini bar chart at the bottom. */
  get topLowStock(): InventoryItem[] {
    return [...this.inventoryItems]
      .sort((a, b) => a.currentStock - b.currentStock)
      .slice(0, 5);
  }

  /** Width of the per-item bar in the bottom chart, scaled to the largest stock in the top-5. */
  topBarWidth(item: InventoryItem): number {
    const max = Math.max(...this.topLowStock.map(i => i.currentStock), 1);
    return Math.max(4, Math.round((item.currentStock / max) * 100));
  }
}
