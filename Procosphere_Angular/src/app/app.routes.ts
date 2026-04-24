import { Routes } from '@angular/router';
import { authGuard, adminGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/main-layout/main-layout.component').then(
        (m) => m.MainLayoutComponent
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent
          ),
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./pages/product-catalog/product-catalog.component').then(
            (m) => m.ProductCatalogComponent
          ),
      },
      {
        path: 'create-order',
        loadComponent: () =>
          import('./pages/create-order/create-order.component').then(
            (m) => m.CreateOrderComponent
          ),
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./pages/order-history/order-history.component').then(
            (m) => m.OrderHistoryComponent
          ),
      },
      {
        path: 'delivery',
        loadComponent: () =>
          import('./pages/delivery-tracking/delivery-tracking.component').then(
            (m) => m.DeliveryTrackingComponent
          ),
      },
      {
        path: 'inventory',
        loadComponent: () =>
          import(
            './pages/inventory-monitoring/inventory-monitoring.component'
          ).then((m) => m.InventoryMonitoringComponent),
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./pages/notifications/notifications.component').then(
            (m) => m.NotificationsComponent
          ),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./pages/profile/profile.component').then(
            (m) => m.ProfileComponent
          ),
      },
      {
        path: 'users',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./pages/user-management/user-management.component').then(
            (m) => m.UserManagementComponent
          ),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./pages/settings/settings.component').then(
            (m) => m.SettingsComponent
          ),
      },
    ],
  },
  { path: '**', redirectTo: 'app' },
];
