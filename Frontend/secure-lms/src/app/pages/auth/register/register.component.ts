import { Component, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { AuthCardComponent } from '../auth-card.component';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { RoleMaster } from '../../../core/models';

function passwordValidator(c: AbstractControl): ValidationErrors | null {
    const v = c.value || '';
    if (!v) return null;
    const ok = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])/.test(v);
    return ok ? null : { passwordStrength: true };
}

function matchPasswords(c: AbstractControl): ValidationErrors | null {
    const pw = c.get('password')?.value;
    const cp = c.get('confirmPassword')?.value;
    return pw && cp && pw !== cp ? { mismatch: true } : null;
}

@Component({
    selector: 'app-register',
    standalone: true,
    imports: [CommonModule, RouterModule, ReactiveFormsModule, AuthCardComponent],

    template: `
    <app-auth-card title="Create account" subtitle="Join Secure LMS and start learning today">
      @if (error) { <div class="alert alert-error"><span class="mi">warning</span>{{ error }}</div> }
      @if (success) { <div class="alert alert-success"><span class="mi">celebration</span>{{ success }}</div> }

      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>

        <div class="auth-split-input-group">
          <select class="form-control" formControlName="role">
            <option value="">— Select your role —</option>
            @for (role of roles; track role.code) {
              <option [value]="role.code">{{ role.displayName }}</option>
            }
          </select>
          @if (rolesLoading) {
            <div class="field-hint" style="font-size: 12px; margin-top: 4px;">Loading roles...</div>
          }
          @if (!rolesLoading && !roles.length) {
            <div class="field-error" style="color: red; font-size: 12px; margin-top: 4px;">No registration roles are available</div>
          }
          @if (f['role'].touched && f['role'].errors?.['required']) {
            <div class="field-error" style="color: red; font-size: 12px; margin-top: 4px;">Please select a role</div>
          }
        </div>

        @if (f['role'].value === 'SUPER_ADMIN') {
          <div class="auth-split-input-group">
            <div class="input-wrapper">
              <input type="password" class="form-control" formControlName="superAdminSecret" placeholder="Super Admin Secret" />
              <span class="material-symbols-outlined input-icon">key</span>
            </div>
          </div>
        }

        <div class="two-col">
          <div class="auth-split-input-group">
            <div class="input-wrapper">
              <input type="text" class="form-control" formControlName="firstName" placeholder="First Name" />
              <span class="material-symbols-outlined input-icon">badge</span>
            </div>
            @if (f['firstName'].touched && f['firstName'].errors?.['required']) {
              <div class="field-error" style="color: red; font-size: 12px; margin-top: 4px;">Required</div>
            }
            @if (f['firstName'].touched && f['firstName'].errors?.['maxlength']) {
              <div class="field-error" style="color: red; font-size: 12px; margin-top: 4px;">Must be at most 50 characters</div>
            }
          </div>
          <div class="auth-split-input-group">
            <div class="input-wrapper">
              <input type="text" class="form-control" formControlName="lastName" placeholder="Last Name" />
              <span class="material-symbols-outlined input-icon">badge</span>
            </div>
            @if (f['lastName'].touched && f['lastName'].errors?.['required']) {
              <div class="field-error" style="color: red; font-size: 12px; margin-top: 4px;">Required</div>
            }
            @if (f['lastName'].touched && f['lastName'].errors?.['maxlength']) {
              <div class="field-error" style="color: red; font-size: 12px; margin-top: 4px;">Must be at most 50 characters</div>
            }
          </div>
        </div>

        <div class="two-col">
          <div class="auth-split-input-group">
            <div class="input-wrapper">
              <input type="tel" class="form-control" formControlName="contactNumber"
                     placeholder="10-digit mobile number" maxlength="10" inputmode="numeric" />
              <span class="material-symbols-outlined input-icon">phone_iphone</span>
            </div>
            @if (f['contactNumber'].touched && f['contactNumber'].errors?.['required']) {
              <div class="field-error" style="color: red; font-size: 12px; margin-top: 4px;">Contact number is required</div>
            }
            @if (f['contactNumber'].touched && f['contactNumber'].errors?.['pattern']) {
              <div class="field-error" style="color: red; font-size: 12px; margin-top: 4px;">Enter a valid 10-digit number starting with 6-9</div>
            }
          </div>
          <div class="auth-split-input-group">
            <div class="input-wrapper">
              <input type="tel" class="form-control" formControlName="aadharNumber"
                     placeholder="12-digit Aadhar number" maxlength="12" inputmode="numeric" />
              <span class="material-symbols-outlined input-icon">fingerprint</span>
            </div>
            @if (f['aadharNumber'].touched && f['aadharNumber'].errors?.['required']) {
              <div class="field-error" style="color: red; font-size: 12px; margin-top: 4px;">Aadhar number is required</div>
            }
            @if (f['aadharNumber'].touched && f['aadharNumber'].errors?.['pattern']) {
              <div class="field-error" style="color: red; font-size: 12px; margin-top: 4px;">Aadhar number must be exactly 12 digits</div>
            }
          </div>
        </div>

        <div class="auth-split-input-group">
          <div class="input-wrapper">
            <input type="text" class="form-control" formControlName="username"
                   placeholder="Username" autocomplete="username" />
            <span class="material-symbols-outlined input-icon">account_circle</span>
          </div>
          @if (f['username'].touched && f['username'].errors?.['required']) {
            <div class="field-error" style="color: red; font-size: 12px; margin-top: 4px;">Username is required</div>
          }
          @if (f['username'].touched && f['username'].errors?.['minlength']) {
            <div class="field-error" style="color: red; font-size: 12px; margin-top: 4px;">At least 3 characters</div>
          }
          @if (f['username'].touched && f['username'].errors?.['pattern']) {
            <div class="field-error" style="color: red; font-size: 12px; margin-top: 4px;">Only letters, digits, and underscores</div>
          }
        </div>

        <div class="auth-split-input-group">
          <div class="input-wrapper">
            <input type="email" class="form-control" formControlName="email"
                   placeholder="Email address" autocomplete="email" />
            <span class="material-symbols-outlined input-icon">mail</span>
          </div>
          @if (f['email'].touched && f['email'].errors?.['required']) {
            <div class="field-error" style="color: red; font-size: 12px; margin-top: 4px;">Email is required</div>
          }
          @if (f['email'].touched && f['email'].errors?.['email']) {
            <div class="field-error" style="color: red; font-size: 12px; margin-top: 4px;">Enter a valid email</div>
          }
        </div>

        <div class="auth-split-input-group">
          <div class="input-wrapper">
            <input [type]="showPw ? 'text' : 'password'" class="form-control"
                   formControlName="password"
                   placeholder="Password (Min 8 chars, mixed case + symbol)"
                   autocomplete="new-password"
                   (input)="updateStrength()" />
            <button type="button" class="toggle-pw" (click)="showPw = !showPw" title="Toggle password visibility">
              <span class="material-symbols-outlined">{{ showPw ? 'visibility' : 'visibility_off' }}</span>
            </button>
          </div>
          
          <div class="strength-bar" style="margin-top: 4px; height: 4px; background: #eee; border-radius: 2px; overflow: hidden;">
            <div class="strength-fill" [style.width]="strengthW" [style.background]="strengthC" style="height: 100%; transition: width 0.3s, background 0.3s;"></div>
          </div>
          @if (strengthLabel) { <div class="strength-text" [style.color]="strengthC" style="font-size: 11px; margin-top: 4px;">{{ strengthLabel }}</div> }
          
          @if (f['password'].touched && f['password'].errors?.['required']) {
            <div class="field-error" style="color: red; font-size: 12px; margin-top: 4px;">Password is required</div>
          }
          @if (f['password'].touched && f['password'].errors?.['minlength']) {
            <div class="field-error" style="color: red; font-size: 12px; margin-top: 4px;">At least 8 characters</div>
          }
          @if (f['password'].touched && f['password'].errors?.['passwordStrength']) {
            <div class="field-error" style="color: red; font-size: 12px; margin-top: 4px;">Need uppercase, lowercase, digit & special character</div>
          }
        </div>

        <div class="auth-split-input-group">
          <div class="input-wrapper">
            <input [type]="showCp ? 'text' : 'password'" class="form-control"
                   formControlName="confirmPassword"
                   placeholder="Confirm Password"
                   autocomplete="new-password" />
            <button type="button" class="toggle-pw" (click)="showCp = !showCp" title="Toggle password visibility">
              <span class="material-symbols-outlined">{{ showCp ? 'visibility' : 'visibility_off' }}</span>
            </button>
          </div>
          @if (f['confirmPassword'].touched && form.errors?.['mismatch']) {
            <div class="field-error" style="color: red; font-size: 12px; margin-top: 4px;">Passwords do not match</div>
          }
          @if (f['confirmPassword'].touched && f['confirmPassword'].errors?.['required']) {
            <div class="field-error" style="color: red; font-size: 12px; margin-top: 4px;">Please confirm your password</div>
          }
        </div>

        <button type="submit" class="auth-split-btn" [disabled]="loading" style="margin-top: 8px">
          @if (loading) { <span class="spinner"></span> } @else { REGISTER }
        </button>
        
        <div class="auth-forgot-link">
          <a routerLink="/login">Already have an account? Sign in</a>
        </div>
      </form>
    </app-auth-card>
  `,
    styles: [`.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }`]
})
export class RegisterComponent implements OnInit {
    private fb = inject(FormBuilder);
    private api = inject(ApiService);
    private auth = inject(AuthService);
    private router = inject(Router);
    private platformId = inject(PLATFORM_ID);
    form = this.fb.group({
        superAdminSecret: [''],
        role: ['', Validators.required],
        firstName: ['', [Validators.required, Validators.maxLength(50)]],
        lastName: ['', [Validators.required, Validators.maxLength(50)]],
        contactNumber: ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]],
        aadharNumber: ['', [Validators.required, Validators.pattern(/^\d{12}$/)]],
        username: ['', [Validators.required, Validators.minLength(3), Validators.pattern(/^[a-zA-Z0-9_]+$/)]],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(8), passwordValidator]],
        confirmPassword: ['', Validators.required]
    }, { validators: matchPasswords });

    showPw = false; showCp = false;
    loading = false; error = ''; success = '';
    roles: RoleMaster[] = [];
    rolesLoading = false;
    strengthW = '0%'; strengthC = 'transparent'; strengthLabel = '';

    get f() { return this.form.controls; }

    ngOnInit(): void {
        if (this.auth.isLoggedIn()) {
            this.auth.redirectByRole();
            return;
        }
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }
        this.loadRegistrationRoles();
    }

    private loadRegistrationRoles(): void {
        this.rolesLoading = true;
        this.api.getRegistrationRoles().subscribe({
            next: res => {
                this.roles = (res.data || [])
                    .filter(role => role.active && role.assignable)
                    .sort((a, b) => (a.sortOrder - b.sortOrder) || a.displayName.localeCompare(b.displayName));
                if (!this.roles.some(role => role.code === this.f['role'].value)) {
                    this.f['role'].setValue(this.roles[0]?.code ?? '');
                }
                this.rolesLoading = false;
            },
            error: () => {
                this.roles = [];
                this.rolesLoading = false;
                this.error = 'Unable to load registration roles. Please try again later.';
            }
        });
    }

    updateStrength(): void {
        const v = this.f['password'].value || '';
        let s = 0;
        if (v.length >= 8) s++; if (/[A-Z]/.test(v)) s++; if (/[a-z]/.test(v)) s++;
        if (/\d/.test(v)) s++; if (/[@$!%*?&#]/.test(v)) s++;
        const levels = [
            { w: '0%', c: 'transparent', l: '' }, { w: '20%', c: '#ef4444', l: 'Very weak' },
            { w: '40%', c: '#f59e0b', l: 'Weak' }, { w: '60%', c: '#eab308', l: 'Fair' },
            { w: '80%', c: '#22c55e', l: 'Strong' }, { w: '100%', c: '#16a34a', l: 'Very strong' }
        ];
        this.strengthW = levels[s].w; this.strengthC = levels[s].c; this.strengthLabel = levels[s].l;
    }

    submit(): void {
        this.form.markAllAsTouched();
        if (this.form.invalid || !this.roles.length) return;
        this.error = ''; this.success = ''; this.loading = true;

        const v = this.form.value;
        this.api.register({ ...v, email: v.email!.toLowerCase().trim() }).subscribe({
            next: () => {
                this.success = 'Account created! Redirecting to login…';
                this.form.reset();
                setTimeout(() => this.router.navigate(['/login']), 1800);
            },
            error: err => {
                this.loading = false;
                this.error = err.error?.message || 'Registration failed';
            }
        });
    }
}
