import { Component, inject, OnInit, PLATFORM_ID, OnDestroy } from '@angular/core';
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
      
      <div class="auth-tabs">
        <div class="auth-tab" [class.active]="activeTab === 'PASSWORD'" (click)="setTab('PASSWORD')">Password Login</div>
        <div class="auth-tab" [class.active]="activeTab === 'OTP'" (click)="setTab('OTP')">OTP Login</div>
      </div>

      @if (error) {
        <div class="alert alert-error">{{ error }}</div>
      }

      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        
        <!-- PASSWORD LOGIN TAB -->
        @if (activeTab === 'PASSWORD') {
          <div class="auth-split-input-group">
            <label class="auth-split-label">Email, Username, or Phone</label>
            <div class="input-wrapper">
              <input type="text" class="form-control" formControlName="identifier"
                     placeholder="Enter your identifier" autocomplete="username" />
              <span class="material-symbols-outlined input-icon">person</span>
            </div>
            @if (f['identifier'].touched && f['identifier'].errors?.['required']) {
              <div class="field-error" style="color: red; font-size: 12px; margin-top: 4px;">Login identifier is required</div>
            }
          </div>

          <div class="auth-split-input-group">
            <label class="auth-split-label">Password</label>
            <div class="input-wrapper">
              <input [type]="showPw ? 'text' : 'password'" class="form-control"
                     formControlName="password" placeholder="******"
                     autocomplete="current-password" />
              <span class="material-symbols-outlined input-icon">lock</span>
              <button type="button" class="toggle-pw" (click)="showPw = !showPw" title="Toggle password visibility">
                <span class="material-symbols-outlined">{{ showPw ? 'visibility' : 'visibility_off' }}</span>
              </button>
            </div>
            @if (f['password'].touched && f['password'].errors?.['required']) {
              <div class="field-error" style="color: red; font-size: 12px; margin-top: 4px;">Password is required</div>
            }
          </div>

          <div class="auth-split-input-group">
            <label class="auth-split-label">Captcha: Solve {{ captchaQuestion }}</label>
            <div class="input-wrapper">
              <input type="text" class="form-control" formControlName="captcha"
                     placeholder="Enter answer" autocomplete="off" />
              <span class="material-symbols-outlined input-icon">calculate</span>
            </div>
            @if (f['captcha'].touched && f['captcha'].errors?.['required']) {
              <div class="field-error" style="color: red; font-size: 12px; margin-top: 4px;">Captcha is required</div>
            }
          </div>

          <button type="submit" class="auth-split-btn" [disabled]="loading">
            @if (loading) {
              <span class="spinner"></span>
            } @else {
              LOGIN
            }
          </button>

          <div class="auth-forgot-link" style="margin-top: 15px;">
            <a routerLink="/forgot-password">Forgot Password?</a>
          </div>
        } 
        
        <!-- OTP LOGIN TAB -->
        @else {
          @if (step === 1) {
            <div class="auth-split-input-group">
              <label class="auth-split-label">Email, Username, or Phone</label>
              <div class="input-wrapper">
                <input type="text" class="form-control" formControlName="identifier"
                       placeholder="Enter your identifier" autocomplete="username" />
                <span class="material-symbols-outlined input-icon">person</span>
              </div>
              @if (f['identifier'].touched && f['identifier'].errors?.['required']) {
                <div class="field-error" style="color: red; font-size: 12px; margin-top: 4px;">Login identifier is required</div>
              }
            </div>

            <button type="submit" class="auth-split-btn" [disabled]="loading">
              @if (loading) {
                <span class="spinner"></span>
              } @else {
                SEND OTP
              }
            </button>
          } @else if (step === 2) {
            <div class="auth-split-input-group">
              <label class="auth-split-label">Enter 6-digit OTP</label>
              <div class="input-wrapper">
                <input type="text" class="form-control" formControlName="otp"
                       placeholder="******" autocomplete="off" />
                <span class="material-symbols-outlined input-icon">lock</span>
              </div>
              @if (f['otp'].touched && f['otp'].errors?.['required']) {
                <div class="field-error" style="color: red; font-size: 12px; margin-top: 4px;">OTP is required</div>
              }
              <div class="resend-link">
                @if (resendTimer > 0) {
                  <span class="disabled">Resend OTP in {{ resendTimer }}s</span>
                } @else {
                  <a (click)="resendOtp()">Resend OTP</a>
                }
              </div>
            </div>

            <div class="auth-split-input-group">
              <label class="auth-split-label">Captcha: Solve {{ captchaQuestion }}</label>
              <div class="input-wrapper">
                <input type="text" class="form-control" formControlName="captcha"
                       placeholder="Enter answer" autocomplete="off" />
                <span class="material-symbols-outlined input-icon">calculate</span>
              </div>
              @if (f['captcha'].touched && f['captcha'].errors?.['required']) {
                <div class="field-error" style="color: red; font-size: 12px; margin-top: 4px;">Captcha is required</div>
              }
            </div>

            <div style="display: flex; gap: 10px;">
              <button type="button" class="auth-split-btn-outline" style="flex: 1" (click)="goBack()" [disabled]="loading">
                BACK
              </button>
              <button type="submit" class="auth-split-btn" style="flex: 1" [disabled]="loading">
                @if (loading) {
                  <span class="spinner"></span>
                } @else {
                  LOGIN
                }
              </button>
            </div>
          }
        }
      </form>
    </app-auth-card>
  `,
    styles: [`
    .auth-tabs { display: flex; margin-bottom: 25px; border-bottom: 2px solid #eee; }
    .auth-tab { flex: 1; padding: 12px 10px; text-align: center; cursor: pointer; font-weight: 600; color: #888; border-bottom: 2px solid transparent; transition: all 0.3s ease; margin-bottom: -2px; }
    .auth-tab.active { color: var(--primary); border-bottom-color: var(--primary); }
    .auth-tab:hover:not(.active) { color: #555; }
    .resend-link { text-align: right; margin-top: 8px; font-size: 12px; }
    .resend-link a { color: var(--primary); cursor: pointer; font-weight: 500; text-decoration: none; }
    .resend-link a:hover { text-decoration: underline; }
    .resend-link .disabled { color: #999; cursor: not-allowed; }
  `]
})
export class LoginComponent implements OnInit, OnDestroy {
    private fb = inject(FormBuilder);
    private auth = inject(AuthService);
    private api = inject(ApiService);
    private toast = inject(ToastService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private menu = inject(MenuService);
    private platformId = inject(PLATFORM_ID);

    activeTab: 'PASSWORD' | 'OTP' = 'PASSWORD';
    step = 1;
    preAuthToken = '';
    captchaQuestion = '';
    captchaAnswer = 0;

    resendTimer = 0;
    resendInterval: any;

    showPw = false;
    loading = false;
    error = '';

    form = this.fb.group({
        identifier: ['', [Validators.required]],
        password: [''],
        otp: [''],
        captcha: ['']
    });

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

        const sessionExpired = this.route.snapshot.queryParamMap.get('sessionExpired');
        if (sessionExpired === 'true') {
            this.toast.info('Your session has expired. Please log in again.');
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

        this.generateCaptcha();

        this.api.getCsrf().subscribe({
            error: () => { }
        });
    }

    ngOnDestroy(): void {
        this.clearTimer();
    }

    setTab(tab: 'PASSWORD' | 'OTP'): void {
        if (this.activeTab === tab) return;
        this.activeTab = tab;
        this.step = 1;
        this.error = '';
        this.form.reset();
        this.clearTimer();
        this.generateCaptcha();
    }

    generateCaptcha(): void {
        const a = Math.floor(Math.random() * 10) + 1;
        const b = Math.floor(Math.random() * 10) + 1;
        this.captchaQuestion = `${a} + ${b} = ?`;
        this.captchaAnswer = a + b;
        this.form.patchValue({ captcha: '' });
    }

    goBack(): void {
        this.step = 1;
        this.error = '';
        this.form.patchValue({ otp: '', captcha: '' });
        this.clearTimer();
    }

    submit(): void {
        this.form.markAllAsTouched();
        
        if (this.activeTab === 'PASSWORD') {
            this.f['password'].setValidators([Validators.required]);
            this.f['captcha'].setValidators([Validators.required]);
            this.f['password'].updateValueAndValidity();
            this.f['captcha'].updateValueAndValidity();
            
            if (this.f['identifier'].invalid || this.f['password'].invalid || this.f['captcha'].invalid) return;
            this.submitPasswordLogin();
        } else {
            this.f['password'].clearValidators();
            this.f['password'].updateValueAndValidity();
            
            if (this.step === 1) {
                if (this.f['identifier'].invalid) return;
                this.submitOtpRequest();
            } else {
                this.f['otp'].setValidators([Validators.required]);
                this.f['captcha'].setValidators([Validators.required]);
                this.f['otp'].updateValueAndValidity();
                this.f['captcha'].updateValueAndValidity();
                
                if (this.f['otp'].invalid || this.f['captcha'].invalid) return;
                this.submitOtpVerify();
            }
        }
    }

    submitPasswordLogin(): void {
        const captchaValue = parseInt(this.form.value.captcha?.trim() || '', 10);
        if (captchaValue !== this.captchaAnswer) {
            this.error = 'Incorrect Captcha. Please try again.';
            this.generateCaptcha();
            return;
        }

        this.error = '';
        this.loading = true;
        const { identifier, password } = this.form.value;
        const normalizedIdentifier = identifier!.trim();

        this.api.getCsrf().pipe(
            switchMap(() => this.api.login(normalizedIdentifier, password!)),
            finalize(() => (this.loading = false))
        ).subscribe({
            next: res => {
                this.auth.saveUser(res.data);
                this.menu.refreshMenu(true).subscribe({ complete: () => {
                    this.toast.success('Signed in successfully');
                    this.auth.redirectByRole();
                }});
            },
            error: err => {
                this.error = err.error?.message ||
                    (err.status === 403
                        ? 'Session token expired. Please try signing in again.'
                        : 'Invalid login credentials');
                this.generateCaptcha();
                this.form.patchValue({ password: '', captcha: '' });
            }
        });
    }

    submitOtpRequest(isResend = false): void {
        if (!isResend) {
            this.error = '';
            this.loading = true;
        }

        const identifier = this.form.value.identifier!.trim();

        this.api.getCsrf().pipe(
            switchMap(() => this.api.requestOtp(identifier)),
            finalize(() => { if (!isResend) this.loading = false; })
        ).subscribe({
            next: res => {
                this.preAuthToken = res.data.preAuthToken;
                this.step = 2;
                this.generateCaptcha();
                if (isResend) {
                    this.toast.success('OTP resent successfully');
                }
                this.startResendTimer();
            },
            error: err => {
                if (!isResend) {
                    this.error = err.error?.message || 'Failed to send OTP';
                } else {
                    this.toast.error(err.error?.message || 'Failed to resend OTP');
                }
            }
        });
    }

    resendOtp(): void {
        if (this.resendTimer > 0) return;
        this.submitOtpRequest(true);
    }

    startResendTimer(): void {
        this.resendTimer = 30;
        this.clearTimer();
        this.resendInterval = setInterval(() => {
            this.resendTimer--;
            if (this.resendTimer <= 0) {
                this.clearTimer();
            }
        }, 1000);
    }

    clearTimer(): void {
        if (this.resendInterval) {
            clearInterval(this.resendInterval);
            this.resendInterval = null;
        }
    }

    submitOtpVerify(): void {
        const otpValue = this.form.value.otp?.trim() || '';
        const captchaValue = parseInt(this.form.value.captcha?.trim() || '', 10);

        if (captchaValue !== this.captchaAnswer) {
            this.error = 'Incorrect Captcha. Please try again.';
            this.generateCaptcha();
            return;
        }

        this.error = '';
        this.loading = true;

        this.api.verifyOtp(this.preAuthToken, otpValue).pipe(
            finalize(() => (this.loading = false))
        ).subscribe({
            next: res => {
                this.auth.saveUser(res.data);
                this.menu.refreshMenu(true).subscribe({ complete: () => {
                    this.toast.success('Signed in successfully');
                    this.auth.redirectByRole();
                }});
            },
            error: err => {
                this.error = err.error?.message || 'Invalid or expired OTP. Please try again.';
                this.form.patchValue({ otp: '' });
                this.generateCaptcha(); 
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
