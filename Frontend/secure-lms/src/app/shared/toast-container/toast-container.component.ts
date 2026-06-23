import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../core/services/toast.service';
import { toastAnim } from '../animations';

@Component({
    selector: 'app-toast-container',
    standalone: true,
    imports: [CommonModule],
    animations: [toastAnim],
    template: `
    <div class="toast-container">
      @for (t of toast.toasts(); track t.id) {
        <div class="toast toast-{{ t.type }}" [@toastAnim]>
          <span class="toast-icon">{{ icons[t.type] }}</span>
          <span class="toast-message">{{ t.message }}</span>
          <button class="toast-close" (click)="toast.dismiss(t.id)">×</button>
        </div>
      }
    </div>
  `,
    styles: [`
    .toast-container {
      position: fixed; top: 20px; right: 20px;
      z-index: 9999; display: flex; flex-direction: column; gap: 10px;
      pointer-events: none;
    }
    .toast {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 16px; border-radius: 12px;
      font-size: 13px; font-weight: 500;
      min-width: 280px; max-width: 400px;
      background: #fff; box-shadow: 0 8px 32px rgba(0,0,0,.12);
      border: 1px solid var(--border);
      pointer-events: all;
    }
    .toast-success { border-left: 3px solid var(--success); }
    .toast-error   { border-left: 3px solid var(--danger);  }
    .toast-info    { border-left: 3px solid var(--info);    }
    .toast-warning { border-left: 3px solid var(--warning); }
    .toast-icon { font-size: 16px; flex-shrink: 0; }
    .toast-message { flex: 1; line-height: 1.4; }
    .toast-close {
      background: none; border: none; cursor: pointer;
      color: var(--text-muted); font-size: 18px; line-height: 1;
      padding: 0 2px; margin-left: 4px; flex-shrink: 0;
      transition: color .2s;
      &:hover { color: var(--text); }
    }
  `]
})
export class ToastContainerComponent {
    toast = inject(ToastService);
    icons: Record<string, string> = {
        success: 'check_circle', error: 'cancel', info: 'info', warning: 'warning'
    };
}