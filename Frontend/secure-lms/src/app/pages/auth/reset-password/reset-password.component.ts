import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { AuthCardComponent } from '../auth-card.component';
import { ApiService } from '../../../core/services/api.service';

function passwordValidator(c: AbstractControl): ValidationErrors | null {
    const v = c.value || '';
    return v && /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])/.test(v) ? null : { passwordStrength: true };
}

function matchPasswords(c: AbstractControl): ValidationErrors | null {
    const pw = c.get('newPassword')?.value;
    const cp = c.get('confirmNewPassword')?.value;
    return pw && cp && pw !== cp ? { mismatch: true } : null;
}

@Component({
    selector: 'app-reset-password',
    standalone: true,
    imports: [CommonModule, RouterModule, ReactiveFormsModule, AuthCardComponent],
    template: `
    <app-auth-card>
      @if (error)   { <div class="alert alert-error" style="margin-bottom: 15px;"><span class="mi">warning</span>{{ error }}</div> }
      @if (success) { <div class="alert alert-success" style="margin-bottom: 15px;"><span class="mi">check_circle</span>{{ success }}</div> }

      @if (tokenValid) {
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <div class="auth-split-input-group">
            <input [type]="showPw ? 'text' : 'password'" class="form-control"
                   formControlName="newPassword"
                   placeholder="New Password"
                   autocomplete="new-password"
                   (input)="updateStrength()" />
            <button type="button" class="toggle-pw" (click)="showPw = !showPw" title="Toggle password visibility">
              <span class="material-symbols-outlined">{{ showPw ? 'visibility' : 'visibility_off' }}</span>
            </button>
            <div class="strength-bar" style="margin-top: 4px; height: 4px; background: #eee; border-radius: 2px; overflow: hidden;">
              <div class="strength-fill" [style.width]="strengthW" [style.background]="strengthC" style="height: 100%; transition: width 0.3s, background 0.3s;"></div>
            </div>
            @if (strengthLabel) { <div class="strength-text" [style.color]="strengthC" style="font-size: 11px; margin-top: 4px;">{{ strengthLabel }}</div> }
            @if (f['newPassword'].touched && f['newPassword'].errors?.['required']) {
              <div class="field-error" style="color: red; font-size: 12px; margin-top: 4px;">Password is required</div>
            }
            @if (f['newPassword'].touched && f['newPassword'].errors?.['passwordStrength']) {
              <div class="field-error" style="color: red; font-size: 12px; margin-top: 4px;">Need uppercase, lowercase, digit & special character</div>
            }
          </div>

          <div class="auth-split-input-group">
            <input [type]="showCp ? 'text' : 'password'" class="form-control"
                   formControlName="confirmNewPassword"
                   placeholder="Confirm new password"
                   autocomplete="new-password" />
            <button type="button" class="toggle-pw" (click)="showCp = !showCp" title="Toggle password visibility">
              <span class="material-symbols-outlined">{{ showCp ? 'visibility' : 'visibility_off' }}</span>
            </button>
            @if (f['confirmNewPassword'].touched && form.errors?.['mismatch']) {
              <div class="field-error" style="color: red; font-size: 12px; margin-top: 4px;">Passwords do not match</div>
            }
          </div>

          <button type="submit" class="auth-split-btn" [disabled]="loading" style="margin-top:8px">
            @if (loading) { <span class="spinner"></span> } @else { RESET PASSWORD }
          </button>
        </form>
      }

      <div class="auth-forgot-link">
        <a routerLink="/login">Back to Sign in</a>
      </div>
    </app-auth-card>
  `
})
export class ResetPasswordComponent implements OnInit {
    private fb = inject(FormBuilder);
    private api = inject(ApiService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);

    token = '';
    tokenValid = false;
    subtitle = 'Checking your reset link…';
    showPw = false; showCp = false;
    loading = false; error = ''; success = '';
    strengthW = '0%'; strengthC = 'transparent'; strengthLabel = '';

    form = this.fb.group({
        newPassword: ['', [Validators.required, passwordValidator]],
        confirmNewPassword: ['', Validators.required]
    }, { validators: matchPasswords });

    get f() { return this.form.controls; }

    ngOnInit(): void {
        this.token = this.route.snapshot.queryParams['token'] || '';
        if (!this.token) {
            this.error = 'Reset link is invalid. Please request a new one.';
            this.subtitle = 'Invalid reset link';
            return;
        }
        this.api.validateResetToken(this.token).subscribe({
            next: res => {
                if (res.data?.valid) {
                    this.tokenValid = true;
                    this.subtitle = 'Enter your new password below.';
                } else {
                    this.error = 'Reset link is invalid or expired.';
                    this.subtitle = 'Reset link is not valid';
                }
            },
            error: () => { this.error = 'Unable to validate reset link.'; this.subtitle = 'Validation failed'; }
        });
    }

    updateStrength(): void {
        const v = this.f['newPassword'].value || '';
        let s = 0;
        if (v.length >= 8) s++; if (/[A-Z]/.test(v)) s++; if (/[a-z]/.test(v)) s++;
        if (/\d/.test(v)) s++; if (/[@$!%*?&#]/.test(v)) s++;
        const lv = [
            { w: '0%', c: 'transparent', l: '' }, { w: '20%', c: '#ef4444', l: 'Very weak' },
            { w: '40%', c: '#f59e0b', l: 'Weak' }, { w: '60%', c: '#eab308', l: 'Fair' },
            { w: '80%', c: '#22c55e', l: 'Strong' }, { w: '100%', c: '#16a34a', l: 'Very strong' }
        ];
        this.strengthW = lv[s].w; this.strengthC = lv[s].c; this.strengthLabel = lv[s].l;
    }

    submit(): void {
        this.form.markAllAsTouched();
        if (this.form.invalid) return;
        this.error = ''; this.loading = true;

        const { newPassword, confirmNewPassword } = this.form.value;
        this.api.resetPassword(this.token, newPassword!, confirmNewPassword!).subscribe({
            next: () => {
                this.success = 'Password reset successful. Redirecting to login…';
                setTimeout(() => this.router.navigate(['/login']), 1500);
            },
            error: err => {
                this.error = err.error?.message || 'Password reset failed.';
                this.loading = false;
            }
        });
    }
}