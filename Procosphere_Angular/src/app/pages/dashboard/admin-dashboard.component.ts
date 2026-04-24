import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { UserService, UserResponse } from '../../services/user.service';
import { DashboardService, DashboardSummaryResponse } from '../../services/dashboard.service';
import { AuthService, Role } from '../../services/auth.service';

type Tab = 'users' | 'audit' | 'settings';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.component.html',
})
export class AdminDashboardComponent implements OnInit {
  activeTab: Tab = 'users';

  users: UserResponse[] = [];
  summary: DashboardSummaryResponse | null = null;

  isLoading = true;
  errorMsg = '';
  successMsg = '';
  savingId: number | null = null;

  searchQuery = '';
  filterRole: 'All' | Role = 'All';
  filterStatus: 'All' | 'Active' | 'Inactive' = 'All';

  readonly roles: Role[] = ['ADMIN', 'MANAGER', 'USER', 'SUPPLIER'];

  roleBadgeClass: Record<Role, string> = {
    ADMIN:    'bg-rose-100 text-rose-800',
    MANAGER:  'bg-purple-100 text-purple-800',
    USER:     'bg-blue-100 text-blue-800',
    SUPPLIER: 'bg-amber-100 text-amber-800',
  };
  roleLabel: Record<Role, string> = {
    ADMIN: 'Admin', MANAGER: 'Manager', USER: 'User', SUPPLIER: 'Supplier',
  };

  constructor(
    private userService: UserService,
    private dashboardService: DashboardService,
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit() { this.load(); }

  load() {
    this.isLoading = true;
    this.errorMsg = '';
    forkJoin({
      users: this.userService.getAll(),
      summary: this.dashboardService.getSummary(),
    }).subscribe({
      next: (res) => {
        if (res.users.success) this.users = res.users.data;
        if (res.summary.success) this.summary = res.summary.data;
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMsg = err?.status === 403
          ? 'Admin access required.'
          : (err?.error?.message || 'Failed to load admin data.');
      }
    });
  }

  get today(): string {
    return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  get totalUsers(): number { return this.users.length; }
  get distinctRoleCount(): number { return new Set(this.users.map(u => u.role)).size; }
  get supplierUserCount(): number { return this.users.filter(u => u.role === 'SUPPLIER').length; }
  get totalProducts(): number { return this.summary?.totalProducts ?? 0; }
  get totalCategories(): number { return this.summary?.totalCategories ?? 0; }

  get filteredUsers(): UserResponse[] {
    const q = this.searchQuery.toLowerCase();
    return this.users.filter(u => {
      const matchesSearch = !q ||
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q);
      const matchesRole = this.filterRole === 'All' || u.role === this.filterRole;
      // Status filter is informational — backend has no "active" flag; treat all as Active.
      const matchesStatus = this.filterStatus === 'All' || this.filterStatus === 'Active';
      return matchesSearch && matchesRole && matchesStatus;
    });
  }

  resetFilters() {
    this.searchQuery = '';
    this.filterRole = 'All';
    this.filterStatus = 'All';
  }

  isSelf(u: UserResponse): boolean {
    return u.userId === this.authService.getCurrentUserId();
  }

  changeRole(u: UserResponse, newRole: string) {
    const role = newRole as Role;
    if (u.role === role) return;
    if (this.isSelf(u) && u.role === 'ADMIN') {
      this.flashError('You cannot change your own admin role.');
      return;
    }
    if (!confirm(`Change ${u.firstName} ${u.lastName}'s role to ${this.roleLabel[role]}?`)) return;

    this.savingId = u.userId;
    this.userService.updateRole(u.userId, role).subscribe({
      next: (res) => {
        this.savingId = null;
        if (res.success && res.data) {
          this.users = this.users.map(x => x.userId === u.userId ? res.data : x);
          this.flashSuccess(`Updated ${u.firstName}'s role to ${this.roleLabel[role]}.`);
        }
      },
      error: (err) => {
        this.savingId = null;
        this.flashError(err?.error?.message || 'Failed to update role.');
      }
    });
  }

  deleteUser(u: UserResponse) {
    if (this.isSelf(u)) { this.flashError('You cannot delete your own account.'); return; }
    if (!confirm(`Permanently delete ${u.firstName} ${u.lastName} (${u.email})?`)) return;

    this.savingId = u.userId;
    this.userService.delete(u.userId).subscribe({
      next: () => {
        this.savingId = null;
        this.users = this.users.filter(x => x.userId !== u.userId);
        this.flashSuccess(`Deleted ${u.firstName} ${u.lastName}.`);
      },
      error: (err) => {
        this.savingId = null;
        this.flashError(err?.error?.message || 'Failed to delete user.');
      }
    });
  }

  initials(u: UserResponse): string {
    return ((u.firstName?.[0] ?? '') + (u.lastName?.[0] ?? '')).toUpperCase() || 'U';
  }

  private flashSuccess(msg: string) { this.successMsg = msg; setTimeout(() => this.successMsg = '', 3500); }
  private flashError(msg: string) { this.errorMsg = msg; setTimeout(() => this.errorMsg = '', 4000); }

  navigateTo(path: string) { this.router.navigate([path]); }
}
