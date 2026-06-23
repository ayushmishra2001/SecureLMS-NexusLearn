import { Component, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, switchMap } from 'rxjs';
import { AuthCardComponent } from '../auth-card.component';
import { AuthService } from '../../../core/services/auth.service';
import { ApiService } from '../../../core/services/api.service';
import { MenuService } from '../../../core/services/menu.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, RouterModule, ReactiveFormsModule, AuthCardComponent],
    template: `
    <app-auth-card title="Welcome back" subtitle="Sign in to your learning account">
      @if (error) {
        <div class="alert alert-error">{{ error }}</div>
      }

      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div class="form-group">
          <label>Email address</label>
          <input type="email" class="form-control" formControlName="email"
                 placeholder="you@example.com" autocomplete="email" />
          @if (f['email'].touched && f['email'].errors?.['required']) {
            <div class="field-error">Email is required</div>
          }
          @if (f['email'].touched && f['email'].errors?.['email']) {
            <div class="field-error">Enter a valid email address</div>
          }
        </div>

        <div class="form-group">
          <label>Password</label>
          <div class="password-wrap">
            <input [type]="showPw ? 'text' : 'password'" class="form-control"
                   formControlName="password" placeholder="Your password"
                   autocomplete="current-password" />
            <button type="button" class="toggle-pw" (click)="showPw = !showPw">
              {{ showPw ? 'Hide' : 'Show' }}
            </button>
          </div>
          @if (f['password'].touched && f['password'].errors?.['required']) {
            <div class="field-error">Password is required</div>
          }
        </div>

        <div class="forgot-link">
          <a routerLink="/forgot-password">Forgot password?</a>
        </div>

        <button type="submit" class="btn btn-primary btn-full"
                [disabled]="loading" style="margin-top: 8px">
          @if (loading) { <span class="spinner"></span> } @else { Sign in }
        </button>
      </form>

      <div class="divider"><span>or</span></div>
      <button type="button" class="btn btn-secondary btn-full oauth-btn"
              [disabled]="loading" (click)="loginWithProvider('google')">
        Continue with Google
      </button>

      <button type="button" class="btn btn-secondary btn-full oauth-btn"
              [disabled]="loading" (click)="loginWithProvider('securelms-local')">
        Continue with SecureLMS SSO
      </button>

      <div class="divider"><span>Don't have an account?</span></div>
      <a routerLink="/register" style="display:block; text-align:center; font-size:14px">
        Create an account ->
      </a>
    </app-auth-card>
  `,
    styles: [`
    .forgot-link { text-align: right; margin-top: -10px; margin-bottom: 16px;
      a { font-size: 13px; } }
    .oauth-btn { margin-top: 6px; }
  `]
})
export class LoginComponent implements OnInit {
    private fb = inject(FormBuilder);
    private auth = inject(AuthService);
    private api = inject(ApiService);
    private toast = inject(ToastService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private menu = inject(MenuService);
    private platformId = inject(PLATFORM_ID);

    form = this.fb.group({
        email: ['', [Validators.required, Validators.email]],
        password: ['', Validators.required]
    });

    showPw = false;
    loading = false;
    error = '';

    get f() {
        return this.form.controls;
    }

    ngOnInit(): void {
        if (this.auth.isLoggedIn()) {
            this.auth.redirectByRole();
            return;
        }

        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        const oauthStatus = this.route.snapshot.queryParamMap.get('oauth2');
        const oauthMessage = this.route.snapshot.queryParamMap.get('message');

        if (oauthStatus === 'success') {
            this.completeOauthLogin();
            return;
        }

        if (oauthStatus === 'error') {
            this.error = oauthMessage ? decodeURIComponent(oauthMessage) : 'OAuth sign-in failed. Please try again.';
            this.clearOauthQueryParams();
        }

        this.api.getCsrf().subscribe({
            error: () => {
                // If this fails, login submit will request a fresh token again.
            }
        });
    }

    submit(): void {
        this.form.markAllAsTouched();
        if (this.form.invalid) return;

        this.error = '';
        this.loading = true;

        const { email, password } = this.form.value;
        const normalizedEmail = email!.toLowerCase().trim();

        this.api.getCsrf().pipe(
            switchMap(() => this.api.login(normalizedEmail, password!)),
            finalize(() => (this.loading = false))
        ).subscribe({
            next: res => {
                this.auth.saveUser(res.data);
                this.menu.refreshMenu(true).subscribe({ complete: () => {
                    this.toast.success('Welcome back!');
                    this.auth.redirectByRole();
                }});
            },
            error: err => {
                this.error = err.error?.message ||
                    (err.status === 403
                        ? 'Session token expired. Please try signing in again.'
                        : 'Invalid email or password');
            }
        });
    }

    loginWithProvider(registrationId: 'google' | 'securelms-local'): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }
        window.location.href = `/api/auth/oauth2/authorization/${registrationId}`;
    }

    private completeOauthLogin(): void {
        this.loading = true;
        this.error = '';
        this.api.getAuthSession().pipe(
            finalize(() => (this.loading = false))
        ).subscribe({
            next: res => {
                this.auth.saveUser(res.data);
                this.menu.refreshMenu(true).subscribe({ complete: () => {
                    this.clearOauthQueryParams();
                    this.toast.success('Signed in successfully');
                    this.auth.redirectByRole();
                }});
            },
            error: err => {
                this.error = err.error?.message || 'OAuth sign-in could not be completed. Please try again.';
                this.clearOauthQueryParams();
            }
        });
    }

    private clearOauthQueryParams(): void {
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {},
            replaceUrl: true
        });
    }
}
