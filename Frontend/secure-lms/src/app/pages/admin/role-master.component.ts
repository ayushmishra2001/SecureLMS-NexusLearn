import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { DashboardLayoutComponent } from '../../shared/dashboard-layout/dashboard-layout.component';
import { ModalComponent } from '../../shared/modal/modal.component';
import { GroupService } from '../../core/services/group.service';
import { RoleMaster, UserPermissionEntryRequest, UserPermissionGlobalGroup, GroupMaster } from '../../core/models';
import { ADMIN_NAV_GROUPS, ADMIN_SECTION_ROUTES } from '../../core/navigation/app-routes';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { MatTabsModule } from '@angular/material/tabs';

@Component({
  selector: 'app-role-master',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, DashboardLayoutComponent, ModalComponent, ConfirmDialogComponent, MatTabsModule],
  template: `
    <app-dashboard-layout
      [navGroups]="navGroups"
      [activeSection]="activeSection"
      [pageTitle]="pageTitle"
      roleLabel="Administrator"
      (sectionChange)="onSectionChange($event)">

      <mat-tab-group [(selectedIndex)]="selectedTabIndex">
        <mat-tab label="View Roles">
          <section class="card" style="margin-top:20px;">
            <div class="card-header">
              <div>
                <span class="card-title">Role Master</span>
                <p class="card-subtitle">Create assignable roles and control role availability.</p>
              </div>
            </div>

            <div class="card-body table-wrap">
              @if (roles.length > 0) {
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Type</th>
                  <th>Assignable</th>
                  <th>Users</th>
                  <th>Order</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (role of roles; track role.id; let i = $index) {
                  <tr>
                    <td>{{ i + 1 }}</td>
                    <td>
                      <div class="role-cell">
                        <strong>{{ role.displayName }}</strong>
                        <span>{{ role.code }}</span>
                        @if (role.description) {
                          <small>{{ role.description }}</small>
                        }
                      </div>
                    </td>
                    <td><span class="status-pill" [class.inactive]="!role.active">{{ role.active ? 'Active' : 'Inactive' }}</span></td>
                    <td><span class="type-pill" [class.system]="role.systemRole">{{ role.systemRole ? 'System' : 'Custom' }}</span></td>
                    <td>{{ role.assignable ? 'Yes' : 'No' }}</td>
                    <td>{{ role.userCount ?? 0 }}</td>
                    <td>{{ role.sortOrder }}</td>
                    <td>
                      <button class="btn btn-secondary btn-sm" (click)="openForm(role)">edit</button>
                      <button class="btn btn-secondary btn-sm" (click)="openPermissions(role)">permissions</button>
                      <button class="btn btn-secondary btn-sm" (click)="toggleActive(role)" [disabled]="(role.userCount ?? 0) > 0">
                        {{ role.active ? 'deactivate' : 'activate' }}
                      </button>
                      <button class="btn btn-danger btn-sm" (click)="confirmDelete(role)" [disabled]="role.systemRole || (role.userCount ?? 0) > 0">
                        delete
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          } @else {
            <div class="empty-state"><span class="empty-icon">admin_panel_settings</span><p>No roles found.</p></div>
          }
        </div>
      </section>
    </mat-tab>

    <mat-tab [label]="editingRole ? 'Edit Role' : 'Add Role'">
      <section class="card" style="margin-top:20px;">
        <div class="card-header">
          <div class="card-title">{{ editingRole ? 'Edit Role' : 'Add Role' }}</div>
        </div>
        <div class="card-body">
          <form [formGroup]="roleForm" (ngSubmit)="saveRole()">
            <div class="form-grid">
              <div class="form-group">
              <label>Role code</label>
              <input class="form-control" formControlName="code" placeholder="CONTENT_REVIEWER" />
              @if (roleForm.controls['code'].touched && roleForm.controls['code'].invalid) {
                <div class="field-error">Code must start with a letter and use only letters, digits, and underscores.</div>
              }
            </div>

            <div class="form-group">
              <label>Display name</label>
              <input class="form-control" formControlName="displayName" />
              @if (roleForm.controls['displayName'].touched && roleForm.controls['displayName'].invalid) {
                <div class="field-error">Display name is required and must be 100 characters or less.</div>
              }
            </div>
          </div>

          <div class="form-group">
            <label>Description</label>
            <textarea class="form-control" formControlName="description" rows="3"></textarea>
          </div>

          <div class="form-grid">
              @if (auth.user()?.role === 'SUPER_ADMIN') {
                <div class="form-group">
                  <label>Groups (Select Multiple)</label>
                  <div class="checkbox-group-list" style="display: flex; flex-direction: column; gap: 8px; max-height: 150px; overflow-y: auto; padding: 10px; border: 1px solid var(--border); border-radius: 6px;">
                    @for (group of groups; track group.id) {
                      <label style="display: flex; gap: 8px; align-items: center; cursor: pointer; margin: 0;">
                        <input type="checkbox" 
                               [checked]="roleForm.value.groupIds?.includes(group.id)" 
                               (change)="toggleGroup(group.id, $any($event.target).checked)" />
                        {{ group.groupName }}
                      </label>
                    }
                  </div>
                </div>
              }

            <div class="form-group">
              <label>Sort order</label>
              <input class="form-control" type="number" formControlName="sortOrder" />
            </div>

            @if (!editingRole) {
              <div class="form-group">
                <label>Clone permissions from</label>
                <select class="form-control" formControlName="clonePermissionsFromRoleId">
                  <option [ngValue]="null">No permissions</option>
                  @for (role of roles; track role.id) {
                    <option [ngValue]="role.id">{{ role.displayName }} ({{ role.code }})</option>
                  }
                </select>
              </div>
            }
          </div>

          <div class="switch-row">
            <label><input type="checkbox" formControlName="active" /> Active</label>
            <label><input type="checkbox" formControlName="assignable" /> Assignable to users</label>
          </div>

          <div class="form-actions" style="margin-top: 12px; display: flex; gap: 12px;">
            <button type="submit" class="btn btn-primary" [disabled]="roleForm.invalid || saving">{{ saving ? 'Saving...' : 'Save Role' }}</button>
            <button type="button" class="btn btn-secondary" (click)="closeForm()">Cancel</button>
          </div>
        </form>
      </div>
    </section>
  </mat-tab>
</mat-tab-group>

      <app-confirm-dialog
        [isOpen]="showConfirm"
        [message]="confirmMessage"
        confirmLabel="Delete"
        (confirm)="deleteRole()"
        (cancel)="cancelConfirm()">
      </app-confirm-dialog>

      <app-modal
        [isOpen]="showPermissions"
        title="Role Permissions"
        (close)="closePermissions()">
        @if (permissionRole) {
          <div class="permission-heading">
            <div>
              <strong>{{ permissionRole.displayName }}</strong>
              <span>{{ permissionRole.code }}</span>
            </div>
            @if (permissionsLoading) {
              <span class="spinner"></span>
            }
          </div>
        }

        @if (!permissionsLoading && permissionGroups.length > 0) {
          <div class="permission-list">
            @for (group of permissionGroups; track group.globalLinkId) {
              <div class="permission-group">
                <div class="permission-group-title">{{ group.globalLinkName }}</div>
                <div class="permission-table">
                  <div class="permission-row permission-row-head">
                    <span>Function</span>
                    <span>View</span>
                    <span>Add</span>
                    <span>Manage</span>
                  </div>
                  @for (row of group.functionLinks; track row.functionLinkId) {
                    <div class="permission-row">
                      <span>{{ row.functionLinkName }}</span>
                      <label><input type="checkbox" [checked]="row.permissions.canView" (change)="setPermission(row.functionLinkId, 'canView', $any($event.target).checked)" /></label>
                      <label><input type="checkbox" [checked]="row.permissions.canAdd" (change)="setPermission(row.functionLinkId, 'canAdd', $any($event.target).checked)" /></label>
                      <label><input type="checkbox" [checked]="row.permissions.canManage" (change)="setPermission(row.functionLinkId, 'canManage', $any($event.target).checked)" /></label>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        } @else if (!permissionsLoading) {
          <div class="empty-state"><span class="empty-icon">security</span><p>No permission links found.</p></div>
        }

        <div slot="footer">
          <button type="button" class="btn btn-secondary btn-sm" (click)="closePermissions()">Cancel</button>
          <button type="button" class="btn btn-primary btn-sm" (click)="savePermissions()" [disabled]="permissionsLoading || permissionsSaving">
            {{ permissionsSaving ? 'Saving...' : 'Save Permissions' }}
          </button>
        </div>
      </app-modal>
    </app-dashboard-layout>
  `,
  styles: [`
    .card-subtitle { margin-top: 4px; color: var(--text-muted); font-size: 0.95rem; }
    .role-cell { display: flex; flex-direction: column; gap: 2px; min-width: 220px; }
    .role-cell span { color: var(--text-muted); font-size: 12px; font-weight: 700; letter-spacing: .04em; }
    .role-cell small { color: var(--text-muted); font-size: 12px; max-width: 420px; }
    .status-pill, .type-pill { display: inline-flex; align-items: center; border-radius: 999px; padding: 3px 9px; font-size: 12px; font-weight: 700; background: rgba(22,163,74,.12); color: #15803d; white-space: nowrap; }
    .status-pill.inactive { background: rgba(107,114,128,.14); color: var(--text-muted); }
    .type-pill { background: rgba(100,116,139,.12); color: #475569; }
    .type-pill.system { background: rgba(79,70,229,.1); color: var(--primary); }
    .form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
    .switch-row { display: flex; align-items: center; gap: 18px; margin: 4px 0 18px; color: var(--text-muted); font-size: 13px; }
    .switch-row label { display: inline-flex; align-items: center; gap: 8px; font-weight: 600; }
    .permission-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
    .permission-heading div { display: flex; flex-direction: column; gap: 2px; }
    .permission-heading span { color: var(--text-muted); font-size: 12px; font-weight: 700; letter-spacing: .04em; }
    .permission-list { display: grid; gap: 14px; max-height: 56vh; overflow: auto; padding-right: 2px; }
    .permission-group { border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
    .permission-group-title { padding: 10px 12px; background: var(--surface-2); border-bottom: 1px solid var(--border); font-size: 13px; font-weight: 700; }
    .permission-table { min-width: 440px; }
    .permission-row { display: grid; grid-template-columns: minmax(170px, 1fr) 72px 72px 72px; align-items: center; min-height: 38px; border-bottom: 1px solid var(--border); font-size: 13px; }
    .permission-row:last-child { border-bottom: none; }
    .permission-row > span, .permission-row > label { padding: 8px 12px; }
    .permission-row > label { display: inline-flex; justify-content: center; margin: 0; }
    .permission-row-head { min-height: 34px; background: rgba(248,250,252,.72); color: var(--text-muted); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; }
    .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px; color: var(--text-muted); }
    .empty-icon { font-family: 'Material Symbols Outlined'; font-size: 36px; margin-bottom: 12px; }
    .btn:disabled { opacity: 0.35; cursor: not-allowed; }
    @media (max-width: 720px) {
      .form-grid { grid-template-columns: 1fr; }
      .switch-row { align-items: flex-start; flex-direction: column; gap: 10px; }
    }
  `]
})
export class RoleMasterComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  auth = inject(AuthService);
  private groupService = inject(GroupService);

  activeSection = 'role-master';
  groups: GroupMaster[] = [];
  navGroups = ADMIN_NAV_GROUPS;
  roles: RoleMaster[] = [];
  editingRole: RoleMaster | null = null;
  deletingRole: RoleMaster | null = null;
  permissionRole: RoleMaster | null = null;
  permissionGroups: UserPermissionGlobalGroup[] = [];
  selectedTabIndex = 0;
  showConfirm = false;
  showPermissions = false;
  confirmMessage = '';
  saving = false;
  permissionsLoading = false;
  permissionsSaving = false;

  roleForm = this.fb.group({
    code: ['', [Validators.required, Validators.maxLength(50), Validators.pattern(/^[A-Za-z][A-Za-z0-9_]*$/)]],
    displayName: ['', [Validators.required, Validators.maxLength(100)]],
    description: ['', [Validators.maxLength(500)]],
    active: [true],
    assignable: [true],
    sortOrder: [0],
    groupIds: [[] as number[]],
    clonePermissionsFromRoleId: [null as number | null]
  });

  get pageTitle(): string {
    return 'Role Master';
  }

  ngOnInit(): void {
    this.loadRoles();
    if (this.auth.user()?.role === 'SUPER_ADMIN') {
      this.groupService.getAllGroups().subscribe({
        next: res => this.groups = res,
        error: () => this.toast.error('Failed to load groups')
      });
    }
  }

  onSectionChange(section: string): void {
    this.router.navigate([ADMIN_SECTION_ROUTES[section] ?? ADMIN_SECTION_ROUTES['dashboard']]);
  }

  loadRoles(): void {
    this.api.getRoles(true, false).subscribe({
      next: res => this.roles = res.data || [],
      error: () => this.toast.error('Failed to load roles.')
    });
  }

  openForm(role?: RoleMaster): void {
    this.editingRole = role ?? null;
    this.roleForm.reset({
      code: role?.code ?? '',
      displayName: role?.displayName ?? '',
      description: role?.description ?? '',
      active: role?.active ?? true,
      assignable: role?.assignable ?? true,
      sortOrder: role?.sortOrder ?? 0,
      groupIds: role?.groupIds ?? [],
      clonePermissionsFromRoleId: null
    });

    if (role?.systemRole) {
      this.roleForm.controls.code.disable();
    } else {
      this.roleForm.controls.code.enable();
    }

    this.selectedTabIndex = 1;
  }

  closeForm(): void {
    this.selectedTabIndex = 0;
    this.editingRole = null;
    this.roleForm.reset();
    this.roleForm.controls.code.enable();
  }

  toggleGroup(groupId: number, checked: boolean): void {
    const current = this.roleForm.value.groupIds || [];
    if (checked) {
      if (!current.includes(groupId)) {
        this.roleForm.patchValue({ groupIds: [...current, groupId] });
      }
    } else {
      this.roleForm.patchValue({ groupIds: current.filter(id => id !== groupId) });
    }
  }

  saveRole(): void {
    this.roleForm.markAllAsTouched();
    if (this.roleForm.invalid) {
      this.toast.error('Please fix the form errors.');
      return;
    }

    const raw = this.roleForm.getRawValue();
    const payload: Partial<RoleMaster> = {
      code: (raw.code ?? '').trim(),
      displayName: (raw.displayName ?? '').trim(),
      description: (raw.description ?? '').trim(),
      active: raw.active ?? true,
      assignable: raw.assignable ?? true,
      sortOrder: raw.sortOrder ?? 0,
      groupIds: raw.groupIds ?? []
    };

    if (!this.editingRole && raw.clonePermissionsFromRoleId) {
      payload.clonePermissionsFromRoleId = raw.clonePermissionsFromRoleId;
    }

    this.saving = true;
    const request = this.editingRole
      ? this.api.updateRole(this.editingRole.id, payload)
      : this.api.createRole(payload);

    request.subscribe({
      next: () => {
        this.toast.success('Role saved.');
        this.saving = false;
        this.closeForm();
        this.loadRoles();
      },
      error: err => {
        this.toast.error(err.error?.message || 'Failed to save role.');
        this.saving = false;
      }
    });
  }

  toggleActive(role: RoleMaster): void {
    this.api.setRoleActive(role.id, !role.active).subscribe({
      next: () => {
        this.toast.success('Role status updated.');
        this.loadRoles();
      },
      error: err => this.toast.error(err.error?.message || 'Failed to update role status.')
    });
  }

  confirmDelete(role: RoleMaster): void {
    if (role.systemRole || (role.userCount ?? 0) > 0) return;
    this.deletingRole = role;
    this.confirmMessage = `Delete role "${role.displayName}"? This cannot be undone.`;
    this.showConfirm = true;
  }

  cancelConfirm(): void {
    this.showConfirm = false;
    this.deletingRole = null;
  }

  deleteRole(): void {
    if (!this.deletingRole) return;
    this.api.deleteRole(this.deletingRole.id).subscribe({
      next: () => {
        this.toast.success('Role deleted.');
        this.showConfirm = false;
        this.deletingRole = null;
        this.loadRoles();
      },
      error: err => {
        this.toast.error(err.error?.message || 'Failed to delete role.');
        this.showConfirm = false;
      }
    });
  }

  openPermissions(role: RoleMaster): void {
    this.permissionRole = role;
    this.permissionGroups = [];
    this.permissionsLoading = true;
    this.showPermissions = true;

    this.api.getRolePermissions(role.id).subscribe({
      next: res => {
        this.permissionGroups = res.data?.globalLinks || [];
        this.permissionsLoading = false;
      },
      error: () => {
        this.toast.error('Failed to load role permissions.');
        this.permissionsLoading = false;
      }
    });
  }

  closePermissions(): void {
    this.showPermissions = false;
    this.permissionRole = null;
    this.permissionGroups = [];
  }

  setPermission(functionLinkId: number, key: 'canView' | 'canAdd' | 'canManage', checked: boolean): void {
    for (const group of this.permissionGroups) {
      const row = group.functionLinks.find(item => item.functionLinkId === functionLinkId);
      if (!row) continue;

      row.permissions[key] = checked;
      if (key === 'canManage' && checked) {
        row.permissions.canAdd = true;
        row.permissions.canView = true;
      }
      if (key === 'canAdd' && checked) {
        row.permissions.canView = true;
      }
      if (key === 'canView' && !checked) {
        row.permissions.canAdd = false;
        row.permissions.canManage = false;
      }
      if (key === 'canAdd' && !checked) {
        row.permissions.canManage = false;
      }
      return;
    }
  }

  savePermissions(): void {
    if (!this.permissionRole) return;

    const permissions: UserPermissionEntryRequest[] = this.permissionGroups.flatMap(group =>
      group.functionLinks.map(row => ({
        functionLinkId: row.functionLinkId,
        canView: row.permissions.canView,
        canAdd: row.permissions.canAdd,
        canManage: row.permissions.canManage
      }))
    );

    this.permissionsSaving = true;
    this.api.saveRolePermissions(this.permissionRole.id, { permissions }).subscribe({
      next: () => {
        this.toast.success('Role permissions saved.');
        this.permissionsSaving = false;
        this.closePermissions();
      },
      error: err => {
        this.toast.error(err.error?.message || 'Failed to save role permissions.');
        this.permissionsSaving = false;
      }
    });
  }
}

