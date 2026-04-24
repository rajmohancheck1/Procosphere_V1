import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProductService, ProductResponse } from '../../services/product.service';
import { OrderService } from '../../services/order.service';

@Component({
  selector: 'app-create-order',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-order.component.html',
})
export class CreateOrderComponent implements OnInit {
  currentStep = 0;
  errors: Record<string, string> = {};
  serverValidating = false;
  successMessage = '';
  isLoading = true;

  steps = ['Order Details', 'Select Products', 'Enter Quantities', 'Delivery Information', 'Review & Submit'];

  products: ProductResponse[] = [];

  // Suppliers are derived from products' supplierId values at runtime.
  suppliers: number[] = [];
  paymentMethods = ['Purchase Order', 'Credit Card', 'Bank Transfer', 'Net 30'];
  deliveryMethods = ['Standard Delivery', 'Express Delivery', 'Pickup'];

  formData = {
    orderTitle: '', supplierId: 0, department: '', priority: 'medium',
    paymentMethod: '', budgetCode: '', expectedDeliveryDate: '', notes: '',
    selectedProducts: [] as number[],
    quantities: {} as Record<number, number>,
    deliveryMethod: '', deliveryAddress: '', deliveryCity: '',
    deliveryState: '', deliveryZip: '', contactPerson: '',
    contactPhone: '', contactEmail: '', specialInstructions: '',
  };

  constructor(private router: Router, private productService: ProductService, private orderService: OrderService) {}

  ngOnInit() {
    this.productService.getAll().subscribe({
      next: (res) => {
        if (res.success) {
          this.products = res.data;
          // Distinct supplierIds sorted ascending
          this.suppliers = Array.from(new Set(res.data.map(p => p.supplierId).filter(id => id != null))).sort((a, b) => a - b);
        }
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  validateStep(step: number): boolean {
    const e: Record<string, string> = {};
    if (step === 0) {
      if (!this.formData.orderTitle) e['orderTitle'] = 'Order title is required';
      if (!this.formData.supplierId) e['supplierId'] = 'Supplier is required';
      if (!this.formData.department) e['department'] = 'Department is required';
      if (!this.formData.paymentMethod) e['paymentMethod'] = 'Payment method is required';
      if (!this.formData.budgetCode) e['budgetCode'] = 'Budget code is required';
      else if (!/^[A-Z]{2}-\d{4}$/.test(this.formData.budgetCode)) e['budgetCode'] = 'Budget code must be in format XX-0000';
      if (!this.formData.expectedDeliveryDate) e['expectedDeliveryDate'] = 'Expected delivery date is required';
    }
    if (step === 1) {
      if (this.formData.selectedProducts.length === 0) e['selectedProducts'] = 'Please select at least one product';
    }
    if (step === 2) {
      this.formData.selectedProducts.forEach(id => {
        const qty = this.formData.quantities[id] || 0;
        if (qty < 1) e[`qty_${id}`] = 'Quantity must be at least 1';
        else if (qty > 100) e[`qty_${id}`] = 'Quantity cannot exceed 100';
      });
    }
    if (step === 3) {
      if (!this.formData.deliveryMethod) e['deliveryMethod'] = 'Delivery method is required';
      if (!this.formData.deliveryAddress) e['deliveryAddress'] = 'Delivery address is required';
      if (!this.formData.deliveryCity) e['deliveryCity'] = 'City is required';
      if (!this.formData.deliveryState) e['deliveryState'] = 'State is required';
      if (!this.formData.deliveryZip) e['deliveryZip'] = 'ZIP code is required';
      else if (!/^\d{5}(-\d{4})?$/.test(this.formData.deliveryZip)) e['deliveryZip'] = 'Invalid ZIP code format';
      if (!this.formData.contactPerson) e['contactPerson'] = 'Contact person is required';
      if (!this.formData.contactPhone) e['contactPhone'] = 'Contact phone is required';
      else if (!/^\(\d{3}\) \d{3}-\d{4}$/.test(this.formData.contactPhone)) e['contactPhone'] = 'Phone must be in format (123) 456-7890';
      if (!this.formData.contactEmail) e['contactEmail'] = 'Contact email is required';
      else if (!/\S+@\S+\.\S+/.test(this.formData.contactEmail)) e['contactEmail'] = 'Invalid email address';
    }
    this.errors = e;
    return Object.keys(e).length === 0;
  }

  handleNext() {
    if (this.validateStep(this.currentStep)) {
      if (this.currentStep < this.steps.length - 1) this.currentStep++;
    }
  }

  handleBack() {
    if (this.currentStep > 0) { this.currentStep--; this.errors = {}; }
  }

  handleSubmit() {
    if (!this.validateStep(this.currentStep)) return;
    this.serverValidating = true;
    this.errors = {};

    const items = this.formData.selectedProducts.map(id => {
      const product = this.products.find(p => p.productId === id);
      return { productId: id, quantity: this.formData.quantities[id] || 1, price: product?.price || 0 };
    });

    // Consolidate delivery + contact details into notes since backend Order doesn't store them.
    const deliveryNotes = [
      this.formData.deliveryMethod && `Method: ${this.formData.deliveryMethod}`,
      (this.formData.deliveryAddress || this.formData.deliveryCity) &&
        `Address: ${this.formData.deliveryAddress}, ${this.formData.deliveryCity}, ${this.formData.deliveryState} ${this.formData.deliveryZip}`,
      this.formData.contactPerson && `Contact: ${this.formData.contactPerson} (${this.formData.contactPhone}, ${this.formData.contactEmail})`,
      this.formData.specialInstructions && `Notes: ${this.formData.specialInstructions}`,
    ].filter(Boolean).join(' | ');

    const orderRequest = {
      supplierId: this.formData.supplierId,
      orderTitle: this.formData.orderTitle,
      department: this.formData.department,
      priority: this.formData.priority.toUpperCase(),
      paymentMethod: this.formData.paymentMethod,
      budgetCode: this.formData.budgetCode,
      expectedDelivery: this.formData.expectedDeliveryDate,
      notes: deliveryNotes || undefined,
      items,
    };

    this.orderService.create(orderRequest).subscribe({
      next: (res) => {
        this.serverValidating = false;
        if (res.success) {
          this.successMessage = 'Order created successfully!';
          setTimeout(() => this.router.navigate(['/app/orders']), 1500);
        } else {
          this.errors['general'] = res.message || 'Failed to create order';
        }
      },
      error: (err) => {
        this.serverValidating = false;
        this.errors['general'] = err?.error?.message || 'Failed to create order. Please try again.';
      }
    });
  }

  handleReset() {
    if (confirm('Are you sure you want to reset the form? All data will be lost.')) {
      this.formData = {
        orderTitle: '', supplierId: 0, department: '', priority: 'medium',
        paymentMethod: '', budgetCode: '', expectedDeliveryDate: '', notes: '',
        selectedProducts: [], quantities: {},
        deliveryMethod: '', deliveryAddress: '', deliveryCity: '',
        deliveryState: '', deliveryZip: '', contactPerson: '',
        contactPhone: '', contactEmail: '', specialInstructions: '',
      };
      this.currentStep = 0; this.errors = {};
    }
  }

  handleCancel() {
    if (confirm('Are you sure you want to cancel? All data will be lost.')) this.router.navigate(['/app']);
  }

  toggleProduct(id: number) {
    if (this.formData.selectedProducts.includes(id))
      this.formData.selectedProducts = this.formData.selectedProducts.filter(p => p !== id);
    else this.formData.selectedProducts = [...this.formData.selectedProducts, id];
  }

  isSelected(id: number): boolean { return this.formData.selectedProducts.includes(id); }

  updateQuantity(id: number, val: string) {
    this.formData.quantities = { ...this.formData.quantities, [id]: Number(val) };
  }

  calculateTotal(): number {
    return this.formData.selectedProducts.reduce((sum, id) => {
      const p = this.products.find(p => p.productId === id);
      return sum + (p?.price || 0) * (this.formData.quantities[id] || 0);
    }, 0);
  }

  getProduct(id: number): ProductResponse | undefined { return this.products.find(p => p.productId === id); }
}
