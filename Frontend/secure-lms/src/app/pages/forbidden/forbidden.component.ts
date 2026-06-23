import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-forbidden',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="forbidden-shell">
      <div class="forbidden-card">
        <div class="forbidden-icon">lock</div>
        <h1>403</h1>
        <p>You do not have permission to access this page.</p>
        <a routerLink="/" class="btn btn-primary btn-sm">Return home</a>
      </div>
    </div>
  `,
  styles: [
    `
    .forbidden-shell {
      min-height: calc(100vh - 60px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .forbidden-card {
      width: 100%;
      max-width: 420px;
      text-align: center;
      padding: 40px;
      border: 1px solid var(--border);
      border-radius: 24px;
      background: var(--surface);
      box-shadow: 0 20px 60px rgba(15,23,42,.12);
    }
    .forbidden-icon {
      font-family: 'Material Icons';
      font-size: 48px;
      display: inline-block;
      margin-bottom: 18px;
      color: var(--danger);
    }
    h1 { font-size: 4rem; margin: 0 0 12px; }
    p { margin-bottom: 24px; color: var(--text-muted); }
    .btn { min-width: 160px; }
  `]
})
export class ForbiddenComponent {}
