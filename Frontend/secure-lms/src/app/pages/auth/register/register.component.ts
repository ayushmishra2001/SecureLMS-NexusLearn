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

        <div class="form-group">
          <label>I am registering as</label>
          <select class="form-control" formControlName="role">
            <option value="">— Select your role —</option>
            @for (role of roles; track role.code) {
              <option [value]="role.code">{{ role.displayName }}</option>
            }
          </select>
          @if (rolesLoading) {
            <div class="field-hint">Loading roles...</div>
          }
          @if (!rolesLoading && !roles.length) {
            <div class="field-error">No registration roles are available</div>
          }
          @if (f['role'].touched && f['role'].errors?.['required']) {
            <div class="field-error">Please select a role</div>
          }
        </div>

        @if (f['role'].value === 'SUPER_ADMIN') {
          <div class="form-group">
            <label>Super Admin Secret</label>
            <input type="password" class="form-control" formControlName="superAdminSecret" placeholder="Required for Super Admin registration" />
          </div>
        }

        <div class="two-col">
          <div class="form-group">
            <label>First Name</label>
            <input type="text" class="form-control" formControlName="firstName" placeholder="John" />
            @if (f['firstName'].touched && f['firstName'].errors?.['required']) {
              <div class="field-error">Required</div>
            }
            @if (f['firstName'].touched && f['firstName'].errors?.['maxlength']) {
              <div class="field-error">Must be at most 50 characters</div>
            }
          </div>
          <div class="form-group">
            <label>Last Name</label>
            <input type="text" class="form-control" formControlName="lastName" placeholder="Doe" />
            @if (f['lastName'].touched && f['lastName'].errors?.['required']) {
              <div class="field-error">Required</div>
            }
            @if (f['lastName'].touched && f['lastName'].errors?.['maxlength']) {
              <div class="field-error">Must be at most 50 characters</div>
            }
          </div>
        </div>

        <div class="two-col">
          <div class="form-group">
            <label>Contact Number</label>
            <input type="tel" class="form-control" formControlName="contactNumber"
                   placeholder="10-digit mobile number" maxlength="10" inputmode="numeric" />
            @if (f['contactNumber'].touched && f['contactNumber'].errors?.['required']) {
              <div class="field-error">Contact number is required</div>
            }
            @if (f['contactNumber'].touched && f['contactNumber'].errors?.['pattern']) {
              <div class="field-error">Enter a valid 10-digit number starting with 6-9</div>
            }
          </div>
          <div class="form-group">
            <label>Aadhar Number</label>
            <input type="tel" class="form-control" formControlName="aadharNumber"
                   placeholder="12-digit Aadhar number" maxlength="12" inputmode="numeric" />
            @if (f['aadharNumber'].touched && f['aadharNumber'].errors?.['required']) {
              <div class="field-error">Aadhar number is required</div>
            }
            @if (f['aadharNumber'].touched && f['aadharNumber'].errors?.['pattern']) {
              <div class="field-error">Aadhar number must be exactly 12 digits</div>
            }
          </div>
        </div>

        <div class="form-group">
          <label>Username</label>
          <input type="text" class="form-control" formControlName="username"
                 placeholder="e.g. john_doe" autocomplete="username" />
          @if (f['username'].touched && f['username'].errors?.['required']) {
            <div class="field-error">Username is required</div>
          }
          @if (f['username'].touched && f['username'].errors?.['minlength']) {
            <div class="field-error">At least 3 characters</div>
          }
          @if (f['username'].touched && f['username'].errors?.['pattern']) {
            <div class="field-error">Only letters, digits, and underscores</div>
          }
        </div>

        <div class="form-group">
          <label>Email address</label>
          <input type="email" class="form-control" formControlName="email"
                 placeholder="you@example.com" autocomplete="email" />
          @if (f['email'].touched && f['email'].errors?.['required']) {
            <div class="field-error">Email is required</div>
          }
          @if (f['email'].touched && f['email'].errors?.['email']) {
            <div class="field-error">Enter a valid email</div>
          }
        </div>

        <div class="form-group">
          <label>Password</label>
          <div class="password-wrap">
            <input [type]="showPw ? 'text' : 'password'" class="form-control"
                   formControlName="password"
                   placeholder="Min 8 chars, mixed case + symbol"
                   autocomplete="new-password"
                   (input)="updateStrength()" />
            <button type="button" class="toggle-pw" (click)="showPw = !showPw">
              {{ showPw ? 'Hide' : 'Show' }}
            </button>
          </div>
          <div class="strength-bar"><div class="strength-fill" [style.width]="strengthW" [style.background]="strengthC"></div></div>
          @if (strengthLabel) { <div class="strength-text" [style.color]="strengthC">{{ strengthLabel }}</div> }
          @if (f['password'].touched && f['password'].errors?.['required']) {
            <div class="field-error">Password is required</div>
          }
          @if (f['password'].touched && f['password'].errors?.['minlength']) {
            <div class="field-error">At least 8 characters</div>
          }
          @if (f['password'].touched && f['password'].errors?.['passwordStrength']) {
            <div class="field-error">Need uppercase, lowercase, digit & special character</div>
          }
        </div>

        <div class="form-group">
          <label>Confirm password</label>
          <div class="password-wrap">
            <input [type]="showCp ? 'text' : 'password'" class="form-control"
                   formControlName="confirmPassword"
                   placeholder="Re-enter your password"
                   autocomplete="new-password" />
            <button type="button" class="toggle-pw" (click)="showCp = !showCp">
              {{ showCp ? 'Hide' : 'Show' }}
            </button>
          </div>
          @if (f['confirmPassword'].touched && form.errors?.['mismatch']) {
            <div class="field-error">Passwords do not match</div>
          }
          @if (f['confirmPassword'].touched && f['confirmPassword'].errors?.['required']) {
            <div class="field-error">Please confirm your password</div>
          }
        </div>

        <button type="submit" class="btn btn-primary btn-full" [disabled]="loading" style="margin-top:8px">
          @if (loading) { <span class="spinner"></span> } @else { Create account }
        </button>
      </form>

      <div class="divider"><span>Already have an account?</span></div>
      <a routerLink="/login" style="display:block; text-align:center; font-size:14px">Sign in →</a>
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
