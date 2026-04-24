import { Component, OnInit } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { UserService } from '../../services/user.service';

interface MenuItem {
  path: string;
  label: string;
  badge?: number;
  icon: string;
  adminOnly?: boolean;
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, CommonModule, FormsModule],
  templateUrl: './main-layout.component.html',
})
export class MainLayoutComponent implements OnInit {
  sidebarCollapsed = false;
  showUserMenu = false;
  searchQuery = '';
  showSearchResults = false;
  chatOpen = false;
  chatMessage = '';
  currentPath = '/app';
  unreadCount = 0;

  menuItems: MenuItem[] = [
    { path: '/app', label: 'Dashboard', icon: 'layout-dashboard' },
    { path: '/app/products', label: 'Product Catalog', icon: 'package' },
    { path: '/app/create-order', label: 'Create Order', icon: 'shopping-cart' },
    { path: '/app/orders', label: 'Order History', icon: 'history' },
    { path: '/app/delivery', label: 'Delivery Tracking', icon: 'truck' },
    { path: '/app/inventory', label: 'Inventory Monitoring', icon: 'database' },
    { path: '/app/notifications', label: 'Notifications', icon: 'bell' },
    { path: '/app/users', label: 'User Management', icon: 'users', adminOnly: true },
    { path: '/app/profile', label: 'My Profile', icon: 'user' },
    { path: '/app/settings', label: 'Settings', icon: 'settings' },
  ];

  get visibleMenuItems(): MenuItem[] {
    const isAdmin = this.authService.getCurrentUser()?.role === 'ADMIN';
    return this.menuItems.filter(item => !item.adminOnly || isAdmin);
  }

  quickActions = [
    'Show low stock items',
    'Create procurement order',
    'Open product catalog',
    'Track delivery',
  ];

  constructor(
    private router: Router,
    private authService: AuthService,
    private notificationService: NotificationService,
    private userService: UserService
  ) {
    router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        this.currentPath = e.urlAfterRedirects;
      });
    this.currentPath = router.url;
  }

  ngOnInit() {
    this.loadUnreadCount();
    this.refreshCurrentUser();
  }

  /** Refresh the cached user (role may have been changed by an admin since last login). */
  refreshCurrentUser() {
    this.userService.getMe().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const existing = this.authService.getCurrentUser();
          if (existing) {
            // Preserve token; overwrite the mutable profile/role fields from server of record.
            const updated = {
              ...existing,
              userId: res.data.userId,
              firstName: res.data.firstName,
              lastName: res.data.lastName,
              email: res.data.email,
              role: res.data.role,
            };
            localStorage.setItem('user', JSON.stringify(updated));
          }
        }
      },
      error: () => { /* non-fatal; stale role info simply persists until next login */ }
    });
  }

  loadUnreadCount() {
    const userId = this.authService.getCurrentUserId();
    const obs$ = userId
      ? this.notificationService.getUnreadByUserId(userId)
      : this.notificationService.getAll();
    obs$.subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.unreadCount = userId
            ? res.data.length
            : res.data.filter(n => !(n.read ?? n.isRead)).length;
        }
      },
      error: () => { this.unreadCount = 0; }
    });
  }

  getBadge(item: MenuItem): number | undefined {
    if (item.path === '/app/notifications' && this.unreadCount > 0) return this.unreadCount;
    return item.badge;
  }

  isActive(path: string): boolean {
    return this.currentPath === path;
  }

  navigate(path: string) {
    this.router.navigate([path]);
  }

  handleLogout() {
    this.authService.logout();
    this.router.navigate(['/']);
  }

  get currentUserName(): string {
    const u = this.authService.getCurrentUser();
    return u ? `${u.firstName} ${u.lastName}` : 'User';
  }

  get currentUserRole(): string {
    const role = this.authService.getCurrentUser()?.role ?? '';
    // Title case "ADMIN" -> "Administrator", "MANAGER" -> "Manager", "USER" -> "User"
    const map: Record<string, string> = { ADMIN: 'Administrator', MANAGER: 'Manager', USER: 'User', SUPPLIER: 'Supplier' };
    return map[role] || role;
  }

  get currentUserInitial(): string {
    const u = this.authService.getCurrentUser();
    return (u?.firstName?.[0] || 'U').toUpperCase();
  }

  onSearchInput(val: string) {
    this.searchQuery = val;
    this.showSearchResults = false;
  }

  hideSearch() {
    setTimeout(() => (this.showSearchResults = false), 200);
  }
}
