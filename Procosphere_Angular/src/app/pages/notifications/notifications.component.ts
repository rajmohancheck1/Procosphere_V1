import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, NotificationResponse } from '../../services/notification.service';
import { AuthService } from '../../services/auth.service';

interface NotificationView {
  id: number; type: 'alert' | 'success' | 'warning' | 'info';
  title: string; message: string; time: string; read: boolean;
}

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.component.html',
})
export class NotificationsComponent implements OnInit {
  filter: 'all' | 'unread' = 'all';
  isLoading = true;
  errorMsg = '';
  notifications: NotificationView[] = [];

  typeConfig: Record<string, { bg: string; icon: string; border: string }> = {
    alert:   { bg: 'bg-red-50',    icon: 'text-red-600',    border: 'border-red-200' },
    success: { bg: 'bg-green-50',  icon: 'text-green-600',  border: 'border-green-200' },
    warning: { bg: 'bg-yellow-50', icon: 'text-yellow-600', border: 'border-yellow-200' },
    info:    { bg: 'bg-blue-50',   icon: 'text-blue-600',   border: 'border-blue-200' },
  };

  private typeMap: Record<string, 'alert' | 'success' | 'warning' | 'info'> = {
    LOW_STOCK: 'alert', CRITICAL_STOCK: 'alert',
    ORDER_DELIVERED: 'success', ORDER_APPROVED: 'success', ORDER_CREATED: 'success',
    ORDER_REJECTED: 'warning', APPROVAL_REQUIRED: 'warning',
    PRICE_UPDATE: 'info', NEW_SUPPLIER: 'info', GENERAL: 'info',
  };

  constructor(private notificationService: NotificationService, private authService: AuthService) {}

  ngOnInit() {
    const userId = this.authService.getCurrentUserId();
    const obs$ = userId
      ? this.notificationService.getByUserId(userId)
      : this.notificationService.getAll();

    obs$.subscribe({
      next: (res) => {
        if (res.success) this.notifications = res.data.map(n => this.mapNotification(n));
        this.isLoading = false;
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMsg = err?.error?.message || 'Failed to load notifications. Is the backend running on port 8090?';
      }
    });
  }

  private mapNotification(n: NotificationResponse): NotificationView {
    const type = this.typeMap[n.notificationType] ?? 'info';
    const title = n.notificationType.replace(/_/g, ' ')
      .split(' ').map(w => w[0] + w.slice(1).toLowerCase()).join(' ');
    const time = n.createdAt ? new Date(n.createdAt).toLocaleString() : '';
    return { id: n.notificationId, type, title, message: n.message, time, read: !!(n.read ?? n.isRead) };
  }

  get unreadCount(): number { return this.notifications.filter(n => !n.read).length; }

  get filteredNotifications(): NotificationView[] {
    return this.filter === 'unread' ? this.notifications.filter(n => !n.read) : this.notifications;
  }

  markAsRead(id: number) {
    this.notificationService.markAsRead(id).subscribe({
      next: () => { this.notifications = this.notifications.map(n => n.id === id ? { ...n, read: true } : n); },
      error: () => { this.notifications = this.notifications.map(n => n.id === id ? { ...n, read: true } : n); }
    });
  }

  markAllAsRead() {
    const userId = this.authService.getCurrentUserId();
    if (userId) {
      this.notificationService.markAllAsRead(userId).subscribe({
        next: () => { this.notifications = this.notifications.map(n => ({ ...n, read: true })); },
        error: () => { this.notifications = this.notifications.map(n => ({ ...n, read: true })); }
      });
    }
  }

  deleteNotification(id: number) {
    this.notificationService.delete(id).subscribe({
      next: () => { this.notifications = this.notifications.filter(n => n.id !== id); },
      error: () => { this.notifications = this.notifications.filter(n => n.id !== id); }
    });
  }
}
