import { Component, inject, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { fadeSlideIn, cardPop } from '../../shared/animations';

@Component({
    selector: 'app-landing',
    standalone: true,
    imports: [RouterModule],
    animations: [fadeSlideIn, cardPop],
    template: `
    <div class="landing-bg">
      <div class="hero" [@fadeSlideIn]>
        <div class="hero-logo">
          <div class="logo-icon">school</div>
          <span>Secure<strong>LMS</strong></span>
        </div>
        <h1>Learn. Teach.<br /><span class="accent">Grow Securely.</span></h1>
        <p>A role-based Learning Management System secured with AES-256 encryption,
           CSRF/OAuth2, and full RBAC — built for admins, trainers, and students.</p>
        <div class="hero-btns">
          <a routerLink="/register" class="btn btn-primary btn-lg">Get Started →</a>
          <a routerLink="/login" class="btn btn-secondary btn-lg">Sign in</a>
        </div>
      </div>

      <div class="features">
        @for (f of features; track f.title; let i = $index) {
          <div class="feature-card" [@cardPop] [style.animation-delay]="(i * 80) + 'ms'">
            <span class="feature-icon">{{ f.icon }}</span>
            <h3>{{ f.title }}</h3>
            <p>{{ f.desc }}</p>
          </div>
        }
      </div>
    </div>
  `,
    styles: [`
    .landing-bg {
      min-height: 100vh; display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      background: linear-gradient(135deg, #e0e7ff 0%, #f0f9ff 50%, #ede9fe 100%);
      padding: 40px 20px; gap: 40px;
    }
    .hero {
      text-align: center; max-width: 620px;
    }
    .hero-logo {
      display: inline-flex; align-items: center; gap: 10px;
      margin-bottom: 28px; font-size: 20px; font-weight: 700;
      .logo-icon {
        width: 48px; height: 48px; background: var(--primary);
        border-radius: 12px; display: flex; align-items: center;
        justify-content: center; font-size: 24px;
        box-shadow: 0 4px 16px rgba(79,70,229,.3);
      }
      strong { color: var(--primary); }
    }
    h1 {
      font-size: clamp(32px, 5vw, 52px); font-weight: 800;
      line-height: 1.15; margin-bottom: 18px;
      .accent { color: var(--primary); }
    }
    p {
      font-size: 16px; color: var(--text-muted);
      margin-bottom: 36px; line-height: 1.75;
    }
    .hero-btns { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }
    .btn-lg { padding: 13px 28px; font-size: 15px; border-radius: 12px; }
    .features {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px; max-width: 860px; width: 100%;
    }
    .feature-card {
      background: rgba(255,255,255,.85); backdrop-filter: blur(8px);
      border: 1px solid rgba(255,255,255,.7); border-radius: 16px;
      padding: 26px 22px; text-align: center;
      transition: transform .25s, box-shadow .25s;
      &:hover { transform: translateY(-4px); box-shadow: 0 8px 32px rgba(79,70,229,.12); }
      .feature-icon { font-size: 36px; display: block; margin-bottom: 12px; }
      h3 { font-size: 14px; font-weight: 700; margin-bottom: 6px; }
      p { font-size: 12px; color: var(--text-muted); margin: 0; }
    }
  `]
})
export class LandingComponent implements OnInit {
    private auth = inject(AuthService);

    features = [
        { icon: 'shield', title: 'AES-256 Encrypted', desc: 'Sensitive data encrypted at rest with GCM authenticated encryption.' },
        { icon: 'vpn_key', title: 'CSRF + OAuth2', desc: 'Auth with access & refresh token rotation.' },
        { icon: 'groups', title: 'Role-Based Access', desc: 'Admin, Trainer, and Student roles with distinct permissions.' },
        { icon: 'menu_book', title: 'Course Management', desc: 'Full CRUD on courses and modules with enrollment tracking.' }
    ];

    ngOnInit(): void {
        if (this.auth.isLoggedIn()) this.auth.redirectByRole();
    }
}