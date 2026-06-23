import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { fadeSlideIn } from '../../shared/animations';

@Component({
    selector: 'app-auth-card',
    standalone: true,
    imports: [RouterModule],
    animations: [fadeSlideIn],
    template: `
    <div class="auth-bg">
      <div class="auth-card" [@fadeSlideIn]>
        <div class="auth-logo">
          <div class="logo-icon">school</div>
          <h1>Secure<span>LMS</span></h1>
        </div>
        <h2 class="auth-title">{{ title }}</h2>
        @if (subtitle) {
          <p class="auth-subtitle">{{ subtitle }}</p>
        }
        <ng-content />
      </div>
    </div>
  `,
    styles: [`
    .auth-bg {
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      background: linear-gradient(135deg, #e0e7ff 0%, #f0f9ff 50%, #ede9fe 100%);
      padding: 20px;
    }
    .auth-card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 20px; padding: 44px; width: 100%; max-width: 480px;
      box-shadow: 0 8px 40px rgba(79,70,229,.1);
    }
    .auth-logo {
      display: flex; align-items: center; gap: 12px;
      margin-bottom: 32px; justify-content: center;
      .logo-icon {
        width: 46px; height: 46px; background: var(--primary);
        border-radius: 12px; display: flex; align-items: center;
        justify-content: center; font-size: 22px;
        box-shadow: 0 4px 12px rgba(79,70,229,.3);
      }
      h1 { font-size: 22px; font-weight: 800; color: var(--text); }
      span { color: var(--primary); }
    }
    .auth-title { font-size: 22px; font-weight: 700; margin-bottom: 6px; }
    .auth-subtitle { color: var(--text-muted); font-size: 14px; margin-bottom: 28px; }
  `]
})
export class AuthCardComponent {
    @Input() title = '';
    @Input() subtitle = '';
}