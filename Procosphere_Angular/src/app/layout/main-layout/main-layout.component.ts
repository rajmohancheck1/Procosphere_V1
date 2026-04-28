import { Component, OnInit } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { filter } from 'rxjs/operators';
import { AuthService, Role } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { UserService } from '../../services/user.service';
import { SettingsService } from '../../services/settings.service';

interface MenuItem {
  path: string;
  label: string;
  badge?: number;
  icon: string;
  roles: Role[];          // which roles see this item
  section?: string;       // section header above this item (first occurrence wins)
}

interface Theme {
  brand: string;          // brand label
  logoBg: string;         // logo bg color
  activeBg: string;
  activeText: string;
  activeBorder: string;
  accentBtn: string;      // primary button bg
  accentBtnHover: string;
  roleBadgeBg: string;
  roleBadgeText: string;
  avatarBg: string;
  focusRing: string;
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
  chatOpen = false;
  chatMessage = '';
  currentPath = '/app';
  unreadCount = 0;

  private allMenuItems: MenuItem[] = [
    // Common main
    { path: '/app',                label: 'Dashboard',            icon: 'layout-dashboard', roles: ['ADMIN','MANAGER','USER','SUPPLIER'], section: 'MAIN' },

    // Supplier / user shared
    { path: '/app/products',       label: 'Product Catalog',      icon: 'package',          roles: ['USER','SUPPLIER'], section: 'MAIN' },
    { path: '/app/my-products',    label: 'My Products',          icon: 'package',          roles: ['SUPPLIER'],        section: 'MAIN' },
    { path: '/app/create-order',   label: 'Create Order',         icon: 'shopping-cart',    roles: ['USER','SUPPLIER'], section: 'MAIN' },
    { path: '/app/orders',         label: 'Order History',        icon: 'history',          roles: ['USER','SUPPLIER'], section: 'ORDERS' },
    { path: '/app/delivery',       label: 'Delivery Tracking',    icon: 'truck',            roles: ['USER','SUPPLIER'], section: 'ORDERS' },

    // Manager items
    { path: '/app/orders',         label: 'Pending Approvals',    icon: 'check-circle',     roles: ['MANAGER'],         section: 'ORDERS' },
    { path: '/app/inventory',      label: 'Inventory Overview',   icon: 'database',         roles: ['MANAGER'],         section: 'INVENTORY' },

    // Admin items
    { path: '/app/users',          label: 'User Management',      icon: 'users',            roles: ['ADMIN'],           section: 'CONTROL' },
    { path: '/app/products',       label: 'Product Management',   icon: 'package',          roles: ['ADMIN'],           section: 'CONTROL' },
    { path: '/app/orders',         label: 'All Orders',           icon: 'history',          roles: ['ADMIN'],           section: 'CONTROL' },
    { path: '/app/inventory',      label: 'Inventory Monitoring', icon: 'database',         roles: ['ADMIN'],           section: 'CONTROL' },

    // Account section (all)
    { path: '/app/notifications',  label: 'Notifications',        icon: 'bell',             roles: ['ADMIN','MANAGER','USER','SUPPLIER'], section: 'ACCOUNT' },
    { path: '/app/profile',        label: 'My Profile',           icon: 'user',             roles: ['ADMIN','MANAGER','USER','SUPPLIER'], section: 'ACCOUNT' },
  ];

  // Role → Theme
  private themes: Record<Role, Theme> = {
    SUPPLIER: { brand: 'ProcureIQ',       logoBg: 'bg-blue-600',    activeBg: 'bg-blue-50',    activeText: 'text-blue-600',    activeBorder: 'border-blue-600',
                accentBtn: 'bg-blue-600',  accentBtnHover: 'hover:bg-blue-700',
                roleBadgeBg: 'bg-emerald-100', roleBadgeText: 'text-emerald-800',
                avatarBg: 'bg-blue-600', focusRing: 'focus:ring-blue-500' },
    USER:     { brand: 'ProcureSphere',   logoBg: 'bg-blue-600',    activeBg: 'bg-blue-50',    activeText: 'text-blue-600',    activeBorder: 'border-blue-600',
                accentBtn: 'bg-blue-600',  accentBtnHover: 'hover:bg-blue-700',
                roleBadgeBg: 'bg-blue-100',    roleBadgeText: 'text-blue-800',
                avatarBg: 'bg-blue-600', focusRing: 'focus:ring-blue-500' },
    MANAGER:  { brand: 'ProcureIQ',       logoBg: 'bg-purple-600',  activeBg: 'bg-purple-50',  activeText: 'text-purple-700',  activeBorder: 'border-purple-600',
                accentBtn: 'bg-purple-600', accentBtnHover: 'hover:bg-purple-700',
                roleBadgeBg: 'bg-purple-100',  roleBadgeText: 'text-purple-800',
                avatarBg: 'bg-purple-600', focusRing: 'focus:ring-purple-500' },
    ADMIN:    { brand: 'ProcureIQ Admin', logoBg: 'bg-rose-600',    activeBg: 'bg-rose-50',    activeText: 'text-rose-700',    activeBorder: 'border-rose-600',
                accentBtn: 'bg-rose-600',  accentBtnHover: 'hover:bg-rose-700',
                roleBadgeBg: 'bg-rose-100',    roleBadgeText: 'text-rose-800',
                avatarBg: 'bg-rose-600', focusRing: 'focus:ring-rose-500' },
  };

  constructor(
    private router: Router,
    private authService: AuthService,
    private notificationService: NotificationService,
    private userService: UserService,
    private settingsService: SettingsService,
  ) {
    router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe((e: any) => { this.currentPath = e.urlAfterRedirects; });
    this.currentPath = router.url;
  }

  ngOnInit() {
    this.loadUnreadCount();
    this.refreshCurrentUser();
  }

  get role(): Role {
    return (this.authService.getCurrentUser()?.role as Role) || 'USER';
  }

  get theme(): Theme { return this.themes[this.role]; }

  get visibleMenuItems(): MenuItem[] {
    const r = this.role;
    // Dedupe by (path + label) in case of overlaps
    const seen = new Set<string>();
    return this.allMenuItems.filter(item => {
      if (!item.roles.includes(r)) return false;
      const key = item.path + '|' + item.label;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /** Group visible items by section for rendering section headers. */
  get groupedMenu(): { section: string; items: MenuItem[] }[] {
    const groups: { section: string; items: MenuItem[] }[] = [];
    const map = new Map<string, MenuItem[]>();
    for (const item of this.visibleMenuItems) {
      const key = item.section || 'MAIN';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    for (const [section, items] of map.entries()) groups.push({ section, items });
    return groups;
  }

  loadUnreadCount() {
    const userId = this.authService.getCurrentUserId();
    const obs$ = userId
      ? this.notificationService.getUnreadByUserId(userId)
      : this.notificationService.getAll();
    obs$.subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const filtered = res.data
            .filter(n => this.settingsService.shouldShowNotification(n.notificationType))
            .filter(n => !(n.read ?? n.isRead));
          this.unreadCount = filtered.length;
        }
      },
      error: () => { this.unreadCount = 0; }
    });
  }

  refreshCurrentUser() {
    this.userService.getMe().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const existing = this.authService.getCurrentUser();
          if (existing) {
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
      error: () => { /* non-fatal */ }
    });
  }

  getBadge(item: MenuItem): number | undefined {
    if (item.path === '/app/notifications' && this.unreadCount > 0) return this.unreadCount;
    return item.badge;
  }

  isActive(path: string): boolean {
    // Exact match for root app path; prefix match for child paths.
    if (path === '/app') return this.currentPath === '/app' || this.currentPath === '/app/';
    return this.currentPath === path || this.currentPath.startsWith(path + '/');
  }

  navigate(path: string) { this.router.navigate([path]); }

  handleLogout() {
    this.authService.logout();
    this.router.navigate(['/']);
  }

  get currentUserName(): string {
    const u = this.authService.getCurrentUser();
    return u ? `${u.firstName} ${u.lastName}` : 'User';
  }

  get currentUserRole(): string {
    const map: Record<string, string> = { ADMIN: 'System Admin', MANAGER: 'Operations Manager', USER: 'User', SUPPLIER: 'Active Supplier' };
    return map[this.role] || this.role;
  }

  get currentUserEmail(): string {
    return this.authService.getCurrentUser()?.email || '';
  }

  get currentUserInitial(): string {
    const u = this.authService.getCurrentUser();
    return (u?.firstName?.[0] || 'U').toUpperCase();
  }

  onSearchInput(val: string) { this.searchQuery = val; }
}
