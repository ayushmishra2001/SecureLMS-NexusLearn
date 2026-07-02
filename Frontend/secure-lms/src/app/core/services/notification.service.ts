import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ApiService, AuditLogEntry } from './api.service';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';
import { PasswordExpiryStatus } from '../models';

export type NotificationType = 'PASSWORD_EXPIRY' | 'AUDIT_LOG';

export interface AppNotification {
  id: string;
  type: NotificationType;
  timestamp: string;
  isUnread: boolean;
  data: any; 
}

const PWD_SESSION_DISMISS_KEY = 'pwd_expiry_dismissed';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private platformId = inject(PLATFORM_ID);
  private toast = inject(ToastService);

  readonly notifications = signal<AppNotification[]>([]);
  readonly loading = signal(false);
  private toastsShown = false;

  loadNotifications() {
    if (!isPlatformBrowser(this.platformId) || !this.auth.isLoggedIn()) return;
    
    this.loading.set(true);
    let pendingReqs = 1;
    const loadedNotifs: AppNotification[] = [];

    const checkComplete = () => {
      pendingReqs--;
      if (pendingReqs <= 0) {
        loadedNotifs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        this.notifications.set(loadedNotifs);
        this.loading.set(false);

        if (!this.toastsShown) {
          loadedNotifs.filter(n => n.isUnread).forEach((notif, index) => {
            setTimeout(() => {
              if (notif.type === 'PASSWORD_EXPIRY') {
                 this.toast.warning('Your password will expire soon! Check notifications.');
              } else if (notif.type === 'AUDIT_LOG') {
                 const outcome = notif.data.outcome;
                 const action = notif.data.eventType.toLowerCase().replace('_', ' ');
                 const msg = `Audit: ${notif.data.username || notif.data.fullName || 'System'} ${action}`;
                 if (outcome === 'SUCCESS') this.toast.success(msg);
                 else this.toast.error(msg);
              }
            }, index * 250); 
          });
          this.toastsShown = true;
        }
      }
    };

    if (this.auth.role() === 'SUPER_ADMIN') {
      pendingReqs++;
      this.api.getAuditLogs('all', 0, 5).subscribe({
        next: (res) => {
          const logs = res.data?.content || [];
          logs.forEach((log: AuditLogEntry) => {
            loadedNotifs.push({
              id: `audit_${log.id}`,
              type: 'AUDIT_LOG',
              timestamp: log.createdAt,
              isUnread: true,
              data: log
            });
          });
          checkComplete();
        },
        error: () => checkComplete()
      });
    }

    if (sessionStorage.getItem(PWD_SESSION_DISMISS_KEY) !== 'true') {
      pendingReqs++;
      this.api.getPasswordExpiryStatus().subscribe({
        next: (res) => {
          if (res?.success && res.data?.warningRequired) {
            loadedNotifs.push({
              id: 'pwd_expiry',
              type: 'PASSWORD_EXPIRY',
              timestamp: new Date().toISOString(), // Always float to top
              isUnread: true,
              data: res.data
            });
          }
          checkComplete();
        },
        error: () => checkComplete()
      });
    }

    checkComplete();
  }

  dismissPasswordWarning() {
    sessionStorage.setItem(PWD_SESSION_DISMISS_KEY, 'true');
    this.notifications.update(list => list.filter(n => n.type !== 'PASSWORD_EXPIRY'));
  }

  clearAuditLogs() {
    this.notifications.update(list => list.filter(n => n.type !== 'AUDIT_LOG'));
  }

  clearAll() {
    this.dismissPasswordWarning();
    this.clearAuditLogs();
  }

  get hasUnread() {
    return this.notifications().some(n => n.isUnread);
  }

  markAllAsRead() {
    this.notifications.update(list => list.map(n => ({ ...n, isUnread: false })));
  }
}
