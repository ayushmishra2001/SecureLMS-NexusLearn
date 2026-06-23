import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DashboardLayoutComponent } from '../../shared/dashboard-layout/dashboard-layout.component';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { NavItem, Role } from '../../core/models';
import { fadeSlideIn } from '../../shared/animations';
import { ADMIN_NAV_GROUPS, ROLE_DASHBOARD_ROUTES, ROLE_SECTION_ROUTES, STUDENT_NAV_GROUPS, TRAINER_NAV_GROUPS } from '../../core/navigation/app-routes';

@Component({
    selector: 'app-profile',
    standalone: true,
    imports: [CommonModule, RouterModule, ReactiveFormsModule, DashboardLayoutComponent],
    animations: [fadeSlideIn],
    template: `
    <app-dashboard-layout
      [navGroups]="navGroups"
      activeSection="profile"
      pageTitle="My Profile"
      [roleLabel]="roleLabel"
      (sectionChange)="onSectionChange($event)">
    <div class="profile-page" [@fadeSlideIn]>
      <div class="profile-header">
        <div class="avatar-lg">{{ userInitial }}</div>
        <div>
          <h2>{{ auth.user()?.username }}</h2>
          <span class="badge badge-{{ auth.role()?.toLowerCase() }}">{{ auth.role() }}</span>
        </div>
      </div>

      <div class="profile-grid">
        <!-- Info card -->
        <div class="card">
          <div class="card-header">
            <span class="card-title">Account Information</span>
            <button class="btn btn-secondary btn-sm" (click)="editMode = !editMode">
              {{ editMode ? 'Cancel' : 'Edit Profile' }}
            </button>
          </div>
          <div class="card-body">
            @if (!editMode) {
              <div class="info-row"><strong>Username</strong><span>{{ profileData?.username }}</span></div>
              <div class="info-row"><strong>Email</strong><span>{{ profileData?.email }}</span></div>
              <div class="info-row"><strong>First Name</strong><span>{{ profileData?.firstName || '—' }}</span></div>
              <div class="info-row"><strong>Last Name</strong><span>{{ profileData?.lastName || '—' }}</span></div>
              <div class="info-row"><strong>Contact Number</strong><span>{{ profileData?.contactNumber || '—' }}</span></div>
              <div class="info-row"><strong>Aadhar Number</strong><span>{{ profileData?.aadharNumber || '—' }}</span></div>
              <div class="info-row"><strong>Role</strong><span>{{ profileData?.role }}</span></div>
              <div class="info-row"><strong>Account Status</strong>
                <span class="badge" [class]="profileData?.active ? 'badge-active' : 'badge-inactive'">
                  {{ profileData?.active ? 'Active' : 'Inactive' }}
                </span>
              </div>
              <div class="info-row"><strong>Member since</strong><span>{{ formatDate(profileData?.createdAt) }}</span></div>
            } @else {
              @if (profileError) { <div class="alert alert-error"><span class="mi">warning</span>{{ profileError }}</div> }
              <form [formGroup]="profileForm" (ngSubmit)="saveProfile()">
                <div class="two-col">
                  <div class="form-group">
                    <label>First Name</label>
                    <input type="text" class="form-control" formControlName="firstName" />
                  </div>
                  <div class="form-group">
                    <label>Last Name</label>
                    <input type="text" class="form-control" formControlName="lastName" />
                  </div>
                </div>
                <div class="form-group">
                  <label>Username</label>
                  <input type="text" class="form-control" formControlName="username" />
                </div>
                <div class="form-group">
                  <label>Email</label>
                  <input type="email" class="form-control" formControlName="email" />
                </div>
                <div class="two-col">
                  <div class="form-group">
                    <label>Contact Number</label>
                    <input type="tel" class="form-control" formControlName="contactNumber" maxlength="10" />
                  </div>
                  <div class="form-group">
                    <label>Aadhar Number</label>
                    <input type="text" class="form-control" formControlName="aadharNumber" maxlength="12" />
                  </div>
                </div>
                <button type="submit" class="btn btn-primary" [disabled]="savingProfile">
                  @if (savingProfile) { <span class="spinner"></span> } @else { Save Changes }
                </button>
              </form>
            }
          </div>
        </div>

        <!-- Change password -->
        <div class="card">
          <div class="card-header"><span class="card-title">Change Password</span></div>
          <div class="card-body">
            @if (pwError) { <div class="alert alert-error"><span class="mi">warning</span>{{ pwError }}</div> }
            <form [formGroup]="pwForm" (ngSubmit)="changePassword()">
              <div class="form-group">
                <label>Current Password</label>
                <div class="password-wrap">
                  <input [type]="showCurr ? 'text' : 'password'" class="form-control"
                         formControlName="currentPassword" placeholder="Your current password" />
                  <button type="button" class="toggle-pw" (click)="showCurr = !showCurr">
                    {{ showCurr ? 'Hide' : 'Show' }}
                  </button>
                </div>
                @if (pw['currentPassword'].touched && pw['currentPassword'].errors?.['required']) {
                  <div class="field-error">Required</div>
                }
              </div>
              <div class="form-group">
                <label>New Password</label>
                <div class="password-wrap">
                  <input [type]="showNew ? 'text' : 'password'" class="form-control"
                         formControlName="newPassword" placeholder="Min 8 chars" />
                  <button type="button" class="toggle-pw" (click)="showNew = !showNew">
                    {{ showNew ? 'Hide' : 'Show' }}
                  </button>
                </div>
                @if (pw['newPassword'].touched && pw['newPassword'].errors?.['required']) {
                  <div class="field-error">Required</div>
                }
                @if (pw['newPassword'].touched && pw['newPassword'].errors?.['minlength']) {
                  <div class="field-error">At least 8 characters</div>
                }
                @if (pw['newPassword'].touched && pw['newPassword'].errors?.['pattern']) {
                  <div class="field-error">Need uppercase, lowercase, digit and special character</div>
                }
              </div>
              <div class="form-group">
                <label>Confirm New Password</label>
                <div class="password-wrap">
                  <input [type]="showConf ? 'text' : 'password'" class="form-control"
                         formControlName="confirmNewPassword" placeholder="Re-enter new password" />
                  <button type="button" class="toggle-pw" (click)="showConf = !showConf">
                    {{ showConf ? 'Hide' : 'Show' }}
                  </button>
                </div>
                @if (pw['confirmNewPassword'].touched && pwForm.errors?.['mismatch']) {
                  <div class="field-error">Passwords do not match</div>
                }
                @if (pw['confirmNewPassword'].touched && pw['confirmNewPassword'].errors?.['required']) {
                  <div class="field-error">Required</div>
                }
              </div>
              <button type="submit" class="btn btn-primary" [disabled]="savingPw">
                @if (savingPw) { <span class="spinner"></span> } @else { Change Password }
              </button>
            </form>
          </div>
        </div>
      </div>

      <div class="profile-footer">
        <button type="button" class="btn btn-secondary" (click)="goBackToDashboard()">
          Back to Dashboard
        </button>
      </div>
    </div>
    </app-dashboard-layout>
  `,
    styles: [`
    .profile-page { max-width: 900px; margin: 0 auto; }
    .profile-header {
      display: flex; align-items: center; gap: 20px; margin-bottom: 28px;
      h2 { font-size: 22px; font-weight: 700; margin-bottom: 6px; }
    }
    .avatar-lg {
      width: 72px; height: 72px; border-radius: 50%;
      background: linear-gradient(135deg, var(--primary), #818cf8);
      display: flex; align-items: center; justify-content: center;
      font-size: 28px; font-weight: 800; color: #fff; flex-shrink: 0;
      box-shadow: 0 4px 16px rgba(79,70,229,.25);
    }
    .profile-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .profile-footer { margin-top: 22px; display: flex; justify-content: center; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    @media (max-width: 768px) { .profile-grid { grid-template-columns: 1fr; } }
  `]
})
export class ProfileComponent implements OnInit {
    auth = inject(AuthService);
    private api = inject(ApiService);
    private toast = inject(ToastService);
    private fb = inject(FormBuilder);
    private router = inject(Router);

    navGroups: { label: string; items: NavItem[] }[] = [];
    profileData: any = null;
    editMode = false;
    savingProfile = false;
    profileError = '';
    savingPw = false;
    pwError = '';
    showCurr = false; showNew = false; showConf = false;

    profileForm = this.fb.group({
        firstName: ['', [Validators.minLength(1), Validators.maxLength(50)]],
        lastName: ['', [Validators.minLength(1), Validators.maxLength(50)]],
        username: ['', [Validators.required, Validators.minLength(3), Validators.pattern(/^[a-zA-Z0-9_]+$/)]],
        email: ['', [Validators.required, Validators.email]],
        contactNumber: ['', [Validators.pattern(/^[6-9]\d{9}$/)]],
        aadharNumber: ['', [Validators.pattern(/^\d{12}$/)]]
    });

    pwForm = this.fb.group({
        currentPassword: ['', Validators.required],
        newPassword: ['', [
            Validators.required,
            Validators.minLength(8),
            Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#]).+$/)
        ]],
        confirmNewPassword: ['', Validators.required]
    }, {
        validators: (c) => {
            const p = c.get('newPassword')?.value, cp = c.get('confirmNewPassword')?.value;
            return p && cp && p !== cp ? { mismatch: true } : null;
        }
    });

    get pw() { return this.pwForm.controls; }
    get userInitial(): string { return (this.auth.user()?.username?.charAt(0) ?? 'U').toUpperCase(); }
    get roleLabel(): string { return this.auth.role() ? this.titleCase(this.auth.role()!) : ''; }

    ngOnInit(): void {
        this.navGroups = this.buildNavGroups(this.auth.role());
        this.loadProfile();
    }

    loadProfile(): void {
        this.api.getProfile().subscribe({
            next: res => {
                this.profileData = res.data;
                this.profileForm.patchValue(res.data);
            },
            error: () => this.toast.error('Failed to load profile')
        });
    }

    saveProfile(): void {
        if (this.profileForm.invalid) return;
        this.savingProfile = true; this.profileError = '';
        this.api.updateProfile(this.profileForm.value).subscribe({
            next: res => {
                this.profileData = res.data;
                this.editMode = false; this.savingProfile = false;
                const updatedRole = res.data.role ?? this.auth.role();
                if (updatedRole) {
                    this.auth.saveUser({
                        userId: this.auth.user()!.id,
                        username: res.data.username,
                        email: res.data.email,
                        role: updatedRole
                    });
                }
                this.toast.success('Profile updated!');
            },
            error: err => { this.profileError = err.error?.message || 'Update failed'; this.savingProfile = false; }
        });
    }

    changePassword(): void {
        this.pwForm.markAllAsTouched();
        if (this.pwForm.invalid) return;
        this.savingPw = true; this.pwError = '';
        this.api.changePassword(this.pwForm.value).subscribe({
            next: () => {
                this.toast.success('Password changed! Please log in again.');
                this.savingPw = false;
                setTimeout(() => {
                    this.auth.clearUser();
                    this.router.navigate(['/login']);
                }, 2000);
            },
            error: err => { this.pwError = err.error?.message || 'Failed to change password'; this.savingPw = false; }
        });
    }

    goBackToDashboard(): void {
        this.auth.redirectByRole();
    }

    onSectionChange(section: string): void {
        const role = this.auth.role();
        if (section === 'profile') {
            return;
        }
        if (!role) return;
        this.router.navigate([ROLE_SECTION_ROUTES[role][section] ?? ROLE_DASHBOARD_ROUTES[role]]);
    }

    formatDate(iso?: string): string {
        if (!iso) return '—';
        return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    private buildNavGroups(role: Role | null): { label: string; items: NavItem[] }[] {
        if (role === 'ADMIN') {
            return ADMIN_NAV_GROUPS;
        }

        if (role === 'TRAINER') {
            return TRAINER_NAV_GROUPS;
        }

        return STUDENT_NAV_GROUPS;
    }

    private dashboardPath(role: Role | null): string {
        return role ? ROLE_DASHBOARD_ROUTES[role] : '/';
    }

    private titleCase(value: string): string {
        return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
    }
}
