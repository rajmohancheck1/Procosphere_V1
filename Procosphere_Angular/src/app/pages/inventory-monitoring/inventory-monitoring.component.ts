import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService, ProductResponse } from '../../services/product.service';

interface InventoryItem {
  id: string; name: string; currentStock: number;
  minRequired: number; suggestedReorder: number; status: string;
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

  constructor(private productService: ProductService) {}

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
    const status = !inStock || stock === 0 ? 'Critical'
                 : stock <= minRequired ? 'Low Stock'
                 : 'In Stock';
    const suggestedReorder = status === 'In Stock' ? 0 : Math.max(0, minRequired * 3 - stock);
    return {
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
  get totalItems(): number { return this.inventoryItems.length; }

  stockBarClass(item: InventoryItem): string {
    const pct = (item.currentStock / item.minRequired) * 100;
    if (pct < 50) return 'bg-red-500';
    if (pct < 100) return 'bg-yellow-500';
    return 'bg-green-500';
  }

  stockBarWidth(item: InventoryItem): number {
    return Math.min((item.currentStock / item.minRequired) * 100, 100);
  }
}
