import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { DashboardLayoutComponent } from '../../shared/dashboard-layout/dashboard-layout.component';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { MenuService } from '../../core/services/menu.service';
import { ExportService } from '../../core/services/export.service';
import { AuthService } from '../../core/services/auth.service';
import { MatTabsModule } from '@angular/material/tabs';
import {
  RoleMaster,
  GroupMaster,
  User,
  UserPermissionUserOption,
  UserPermissionFunctionRow,
  UserPermissionGlobalGroup,
  PaginatedResponse,
  PermissionListResponse
} from '../../core/models';
import { ADMIN_NAV_GROUPS, ADMIN_SECTION_ROUTES } from '../../core/navigation/app-routes';

type PermissionField = 'canView' | 'canAdd' | 'canManage';

@Component({
  selector: 'app-user-permissions',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, DashboardLayoutComponent, MatTabsModule],
  template: `
    <app-dashboard-layout
      [navGroups]="navGroups"
      [activeSection]="activeSection"
      [pageTitle]="pageTitle"
      roleLabel="Administrator"
      (sectionChange)="onSectionChange($event)">

      <mat-tab-group animationDuration="0ms" #tabGroup>
        <mat-tab label="Set Permissions">
          <section class="card selector-card" style="margin-top:20px;">
            <div class="card-body">
              <div class="section-heading">
                <h2>Select Roles, Groups, and Users</h2>
              </div>
              <div class="target-grid" [style.grid-template-columns]="auth.user()?.role === 'SUPER_ADMIN' ? 'repeat(3, minmax(300px, 1fr))' : 'repeat(2, minmax(300px, 1fr))'">
                @if (auth.user()?.role === 'SUPER_ADMIN') {
                  <div class="target-section">
                    <h3>Select Groups</h3>
                    <div class="search-row" style="visibility: hidden; pointer-events: none;">
                      <input class="form-control" />
                    </div>
                    <div class="dual-list">
                      <div class="list-block">
                        <label>Available Groups:</label>
                        <select class="transfer-list" multiple size="8" [(ngModel)]="availableGroupSelection">
                          @for (group of displayedAvailableGroups; track group.id) {
                            <option [ngValue]="group.id">{{ group.groupName }} (Group)</option>
                          }
                        </select>
                        <button class="btn btn-secondary transfer-btn" type="button" (click)="addGroups()" [disabled]="availableGroupSelection.length === 0">
                          Add Groups <span class="material-symbols-outlined">arrow_forward</span>
                        </button>
                      </div>
                      <div class="list-block">
                        <label>Selected Groups:</label>
                        <select class="transfer-list" multiple size="8" [(ngModel)]="selectedGroupSelection">
                          @for (group of selectedGroups; track group.id) {
                            <option [ngValue]="group.id">{{ group.groupName }} (Group)</option>
                          }
                        </select>
                        <div class="transfer-actions">
                          <button class="btn btn-primary transfer-btn remove-btn" type="button" (click)="removeGroups()" [disabled]="selectedGroupSelection.length === 0">
                            <span class="material-symbols-outlined">arrow_back</span> Remove Groups
                          </button>
                          <button class="btn btn-primary square-btn" type="button" title="Move up" (click)="moveSelectedGroups(-1)" [disabled]="!canMoveSelectedGroup(-1)">
                            <span class="material-symbols-outlined">arrow_upward</span>
                          </button>
                          <button class="btn btn-secondary square-btn" type="button" title="Move down" (click)="moveSelectedGroups(1)" [disabled]="!canMoveSelectedGroup(1)">
                            <span class="material-symbols-outlined">arrow_downward</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                }

                <div class="target-section">
                  <h3>Select Roles</h3>
                  <div class="search-row" style="visibility: hidden; pointer-events: none;">
                    <input class="form-control" />
                  </div>
                  <div class="dual-list">
                    <div class="list-block">
                      <label>Available Roles:</label>
                      <select class="transfer-list" multiple size="8" [(ngModel)]="availableRoleSelection">
                        @for (role of displayedAvailableRoles; track role.id) {
                          <option [ngValue]="role.id">{{ role.displayName }} (Role)</option>
                        }
                      </select>
                      <button class="btn btn-secondary transfer-btn" type="button" (click)="addRoles()" [disabled]="availableRoleSelection.length === 0">
                        Add Roles <span class="material-symbols-outlined">arrow_forward</span>
                      </button>
                    </div>
                    <div class="list-block">
                      <label>Selected Roles:</label>
                      <select class="transfer-list" multiple size="8" [(ngModel)]="selectedRoleSelection">
                        @for (role of selectedRoles; track role.id) {
                          <option [ngValue]="role.id">{{ role.displayName }} (Role)</option>
                        }
                      </select>
                      <div class="transfer-actions">
                        <button class="btn btn-primary transfer-btn remove-btn" type="button" (click)="removeRoles()" [disabled]="selectedRoleSelection.length === 0">
                          <span class="material-symbols-outlined">arrow_back</span> Remove Roles
                        </button>
                        <button class="btn btn-primary square-btn" type="button" title="Move up" (click)="moveSelectedRoles(-1)" [disabled]="!canMoveSelectedRole(-1)">
                          <span class="material-symbols-outlined">arrow_upward</span>
                        </button>
                        <button class="btn btn-secondary square-btn" type="button" title="Move down" (click)="moveSelectedRoles(1)" [disabled]="!canMoveSelectedRole(1)">
                          <span class="material-symbols-outlined">arrow_downward</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="target-section">
                  <h3>Select Users</h3>
                  <div class="search-row">
                    <input class="form-control" placeholder="Search users..." [(ngModel)]="searchQuery" (input)="searchUsers()" />
                  </div>
                  <div class="dual-list">
                    <div class="list-block">
                      <label>Available Users:</label>
                      <select class="transfer-list" multiple size="8" [(ngModel)]="availableUserSelection">
                        @for (user of displayedAvailableUsers; track user.id) {
                          <option [ngValue]="user.id">{{ user.username }} (User)</option>
                        }
                      </select>
                      <button class="btn btn-secondary transfer-btn" type="button" (click)="addUsersFromSelection()" [disabled]="availableUserSelection.length === 0">
                        Add Users <span class="material-symbols-outlined">arrow_forward</span>
                      </button>
                    </div>
                    <div class="list-block">
                      <label>Selected Users:</label>
                      <select class="transfer-list" multiple size="8" [(ngModel)]="selectedUserSelection">
                        @for (user of selectedUsers; track user.id) {
                          <option [ngValue]="user.id">{{ user.username }} (User)</option>
                        }
                      </select>
                      <div class="transfer-actions">
                        <button class="btn btn-primary transfer-btn remove-btn" type="button" (click)="removeUsers()" [disabled]="selectedUserSelection.length === 0">
                          <span class="material-symbols-outlined">arrow_back</span> Remove Users
                        </button>
                        <button class="btn btn-primary square-btn" type="button" title="Move up" (click)="moveSelectedUsers(-1)" [disabled]="!canMoveSelectedUser(-1)">
                          <span class="material-symbols-outlined">arrow_upward</span>
                        </button>
                        <button class="btn btn-secondary square-btn" type="button" title="Move down" (click)="moveSelectedUsers(1)" [disabled]="!canMoveSelectedUser(1)">
                          <span class="material-symbols-outlined">arrow_downward</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>


            <section class="card permission-card" style="margin-top:20px;">
              <div class="card-body">
                <div class="permission-header-row">
                  <div>
                    <h2>Permission mapping</h2>
                    <p>Save permission flags for selected roles, groups, and users per function link.</p>
                  </div>
                  @if (selectedRoles.length || selectedGroups.length || selectedUsers.length) {
                    <button class="btn btn-primary" [disabled]="saving || permissionsLoading || mergedPermissions.length === 0" (click)="savePermissions()">
                      {{ saving ? 'Saving...' : 'Save Permissions' }}
                    </button>
                  }
                </div>

              @if (!selectedRoles.length && !selectedGroups.length && !selectedUsers.length) {
                <div class="empty-state"><span class="empty-icon">groups</span><p>Select at least one role, group, or user to configure permissions.</p></div>
              } @else if (permissionsLoading) {
                <div class="empty-state"><span class="empty-icon">hourglass_empty</span><p>Loading permissions for selected targets...</p></div>
              } @else if (mergedPermissions.length === 0) {
                <div class="empty-state"><span class="empty-icon">security</span><p>No permission rows are available for the selected targets.</p></div>
              } @else {
                <div class="permission-list">
                  @for (group of mergedPermissions; track group.globalLinkId) {
                    <div class="permission-group">
                      <div class="group-heading">{{ group.globalLinkName }}</div>
                      <div class="permission-table">
                        <div class="permission-row permission-row-head">
                          <span>Function</span><span>View</span><span>Add</span><span>Manage</span>
                        </div>
                        @for (row of group.functionLinks; track row.functionLinkId) {
                          <div class="permission-row">
                            <span>{{ row.functionLinkName }}</span>
                            <label><input type="checkbox" [checked]="$any(row).canView" (change)="togglePermission(row, 'canView', $any($event.target).checked)" />
                              @if ($any(row).viewMixed) { <small>mixed</small> }</label>
                            <label><input type="checkbox" [checked]="$any(row).canAdd" (change)="togglePermission(row, 'canAdd', $any($event.target).checked)" />
                              @if ($any(row).addMixed) { <small>mixed</small> }</label>
                            <label><input type="checkbox" [checked]="$any(row).canManage" (change)="togglePermission(row, 'canManage', $any($event.target).checked)" />
                              @if ($any(row).manageMixed) { <small>mixed</small> }</label>
                          </div>
                        }
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </section>
        </mat-tab>

        <mat-tab label="View Permissions">
          <section class="card" style="margin-top:20px;">
            <div class="card-header">
              <div class="card-title">View Permissions</div>
            </div>
            <div class="card-body">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                <div style="display:flex; gap:16px; align-items:center;">
                  <label style="display:flex; gap:6px; align-items:center;"><input type="radio" name="viewType" value="role" [(ngModel)]="viewType" (change)="loadPermissions()" /> Role Wise</label>
                  @if (auth.user()?.role === 'SUPER_ADMIN') {
                    <label style="display:flex; gap:6px; align-items:center;"><input type="radio" name="viewType" value="group" [(ngModel)]="viewType" (change)="loadPermissions()" /> Group Wise</label>
                  }
                  <label style="display:flex; gap:6px; align-items:center;"><input type="radio" name="viewType" value="user" [(ngModel)]="viewType" (change)="loadPermissions()" /> User Wise</label>
                  <input type="text" class="form-control" placeholder="Search..." [(ngModel)]="searchListQuery" (keyup.enter)="loadPermissions()" style="width:200px;" />
                  <button class="btn btn-secondary" (click)="loadPermissions()">Search</button>
                </div>
                <div style="display:flex; gap:8px;">
                  <button class="btn btn-secondary" (click)="exportExcel()"><span class="material-symbols-outlined">table</span> Export Excel</button>
                </div>
              </div>

              @if (listLoading) {
                <div class="empty-state"><span class="spinner"></span></div>
              } @else {
                <div class="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>{{ viewType === 'role' ? 'Role Name' : (viewType === 'group' ? 'Group Name' : 'Username') }}</th>
                        <th>Global Link</th>
                        <th>Function Link</th>
                        <th>View</th>
                        <th>Add</th>
                        <th>Manage</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (p of permissionList; track p.id) {
                        <tr>
                          <td>{{ p.entityName }}</td>
                          <td>{{ p.globalLinkName }}</td>
                          <td>{{ p.functionLinkName }}</td>
                          <td><span class="badge" [class.badge-active]="p.canView" [class.badge-inactive]="!p.canView">{{ p.canView ? 'Yes' : 'No' }}</span></td>
                          <td><span class="badge" [class.badge-active]="p.canAdd" [class.badge-inactive]="!p.canAdd">{{ p.canAdd ? 'Yes' : 'No' }}</span></td>
                          <td><span class="badge" [class.badge-active]="p.canManage" [class.badge-inactive]="!p.canManage">{{ p.canManage ? 'Yes' : 'No' }}</span></td>
                          <td>
                            <button class="btn btn-ghost btn-icon" (click)="editPermission(p)" title="Edit"><span class="material-symbols-outlined">edit</span></button>
                            <button class="btn btn-ghost btn-icon" (click)="deletePermission(p.id)" title="Delete"><span class="material-symbols-outlined">delete</span></button>
                          </td>
                        </tr>
                      }
                      @if (permissionList.length === 0) {
                        <tr><td colspan="7" class="empty-state">No permissions found.</td></tr>
                      }
                    </tbody>
                  </table>
                </div>
                
                <div class="pagination-wrap">
                    <div class="pagination-info">Showing {{ page * size + 1 }} to {{ Math.min((page + 1) * size, totalElements) }} of {{ totalElements }} entries</div>
                    <div class="page-size-wrap">
                        <select class="form-control" [(ngModel)]="size" (change)="page = 0; loadPermissions()">
                            <option [ngValue]="10">10 per page</option>
                            <option [ngValue]="20">20 per page</option>
                            <option [ngValue]="50">50 per page</option>
                        </select>
                    </div>
                    <div class="pagination-btns">
                        <button class="page-btn" [disabled]="page === 0" (click)="goToPage(page - 1)"><span class="material-symbols-outlined">chevron_left</span></button>
                        <button class="page-btn active">{{ page + 1 }}</button>
                        <button class="page-btn" [disabled]="page >= totalPages - 1" (click)="goToPage(page + 1)"><span class="material-symbols-outlined">chevron_right</span></button>
                    </div>
                </div>
              }
            </div>
          </section>
        </mat-tab>
      </mat-tab-group>
    </app-dashboard-layout>
  `,
  styles: [`
    .selector-card, .permission-card { border-radius: 18px; }
    .section-heading h2, .permission-header-row h2 { margin: 0; font-size: 26px; line-height: 1.2; }
    .permission-header-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 18px; }
    .permission-header-row p { margin: 8px 0 0; color: var(--text-muted); font-size: 0.95rem; }
    .target-grid { display: grid; gap: 30px; margin-top: 18px; align-items: start; }
    .target-section h3 { margin: 0 0 8px; font-size: 19px; }
    .dual-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; align-items: start; }
    .list-block { min-width: 0; }
    .list-block label { display: block; margin-bottom: 8px; color: var(--text); font-size: 16px; font-weight: 500; }
    .transfer-list { width: 100%; height: 234px; min-height: 234px; border: 1.5px solid #8b8f97; border-radius: 8px; background: var(--surface); color: var(--text); font: inherit; font-size: 16px; padding: 8px 10px; outline: none; overflow: auto; }
    .transfer-list:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(79, 70, 229, .12); }
    .search-row { margin: 0 0 10px; }
    .transfer-actions { display: grid; grid-template-columns: minmax(144px, 1fr) 40px 40px; gap: 10px; margin-top: 12px; align-items: center; }
    .transfer-btn { margin-top: 12px; min-height: 40px; font-size: 14px; border-radius: 8px; padding-inline: 16px; white-space: nowrap; width: fit-content; max-width: 100%; }
    .remove-btn { width: 100%; min-width: 144px; }
    .transfer-actions .transfer-btn { margin-top: 0; width: 100%; }
    .square-btn { width: 40px; height: 40px; min-width: 40px; padding: 0; border-radius: 8px; }
    .permission-list { display: grid; gap: 20px; }
    .permission-group { border-bottom: 1px solid var(--border); padding-bottom: 16px; }
    .permission-group:last-child { border-bottom: none; padding-bottom: 0; }
    .group-heading { font-size: 18px; font-weight: 700; margin-bottom: 12px; }
    .permission-table { display: grid; gap: 0; min-width: 640px; }
    .permission-row { display: grid; grid-template-columns: minmax(260px, 1.3fr) repeat(3, minmax(92px, .45fr)); align-items: center; min-height: 48px; border-bottom: 1px solid var(--border); font-size: 16px; }
    .permission-row:last-child { border-bottom: none; }
    .permission-row > span, .permission-row > label { padding: 10px 0; }
    .permission-row-head { min-height: 34px; border-bottom: none; color: var(--text-muted); font-size: 14px; font-weight: 700; text-transform: uppercase; }
    .permission-row label { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; color: var(--text-muted); }
    .permission-row input[type='checkbox'] { width: 16px; height: 16px; accent-color: var(--info); }
    .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 180px; color: var(--text-muted); }
    .btn:disabled { opacity: .45; cursor: not-allowed; }
  `]
})
export class UserPermissionsComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private menuService = inject(MenuService);
  private exportService = inject(ExportService);
  private router = inject(Router);
  protected auth = inject(AuthService);

  @ViewChild('tabGroup') tabGroup!: any;

  activeSection = 'permissions';
  navGroups = ADMIN_NAV_GROUPS;

  roles: RoleMaster[] = [];
  selectedRoles: RoleMaster[] = [];
  roleLoading = false;

  groups: GroupMaster[] = [];
  selectedGroups: GroupMaster[] = [];
  groupLoading = false;


  searchUserOptions: UserPermissionUserOption[] = [];
  selectedUsers: UserPermissionUserOption[] = [];

  availableRoleSelection: number[] = [];
  selectedRoleSelection: number[] = [];
  
  availableGroupSelection: number[] = [];
  selectedGroupSelection: number[] = [];
  
  availableUserSelection: number[] = [];
  selectedUserSelection: number[] = [];
  searchQuery = '';
  permissionsLoading = false;
  saving = false;

  mergedPermissions: any[] = [];

  viewType: 'role' | 'group' | 'user' = 'role';
  searchListQuery = '';
  permissionList: PermissionListResponse[] = [];
  listLoading = false;
  page = 0;
  size = 20;
  totalElements = 0;
  totalPages = 0;
  Math = Math;

  get pageTitle(): string { return 'User Permissions'; }
  get displayedAvailableRoles(): RoleMaster[] {
    const selectedIds = new Set(this.selectedRoles.map(role => role.id));
    return this.roles.filter(role => !selectedIds.has(role.id));
  }
  get displayedAvailableGroups(): GroupMaster[] {
    const selectedIds = new Set(this.selectedGroups.map(group => group.id));
    return this.groups.filter(group => !selectedIds.has(group.id));
  }
  get displayedAvailableUsers(): UserPermissionUserOption[] {
    const selectedIds = new Set(this.selectedUsers.map(user => user.id));
    return this.availableUsers.filter(user => !selectedIds.has(user.id));
  }
  get availableUsers(): UserPermissionUserOption[] {
    return this.uniqueById([...this.searchUserOptions])
      .sort((a, b) => a.username.localeCompare(b.username));
  }

  ngOnInit(): void {
    if (this.auth.user()?.role === 'SUPER_ADMIN') {
      this.loadGroups();
    }
    this.loadRoles();
    this.loadPermissions();
  }

  onSectionChange(section: string): void {
    this.router.navigate([ADMIN_SECTION_ROUTES[section] ?? ADMIN_SECTION_ROUTES['dashboard']]);
  }

  loadRoles(): void {
    this.roleLoading = true;
    const groupIds = this.selectedGroups.map(g => g.id);
    this.api.getRoles(false, true, groupIds).subscribe({
      next: res => {
        this.roles = (res.data || []).sort((a, b) => a.sortOrder - b.sortOrder || a.displayName.localeCompare(b.displayName));
        // Remove selected roles that are no longer in the filtered roles list
        const fetchedIds = new Set(this.roles.map(r => r.id));
        this.selectedRoles = this.selectedRoles.filter(r => fetchedIds.has(r.id));
        this.selectedRoleSelection = this.selectedRoleSelection.filter(id => fetchedIds.has(id));
        this.roleLoading = false;
        this.searchUsers(); // cascade down to users
      },
      error: () => { this.roles = []; this.roleLoading = false; this.toast.error('Failed to load roles.'); }
    });
  }

  loadGroups(): void {
    this.groupLoading = true;
    this.api.getGroups(true).subscribe({
      next: res => {
        this.groups = (res.data || []).sort((a, b) => a.groupName.localeCompare(b.groupName));
        this.groupLoading = false;
      },
      error: () => { this.groups = []; this.groupLoading = false; this.toast.error('Failed to load groups.'); }
    });
  }

  searchUsers(): void {
    const q = this.searchQuery?.trim();
    const groupIds = this.selectedGroups.map(g => g.id);
    const roleIds = this.selectedRoles.map(r => r.id);

    if (!q) {
      // If there is no search query, we only auto-populate if a Role is selected.
      if (roleIds.length === 0) {
        this.searchUserOptions = [];
        this.availableUserSelection = [];
        return;
      }
    } else if (q.length < 2) {
      // If they are typing a query but it's too short, wait.
      this.searchUserOptions = [];
      this.availableUserSelection = [];
      return;
    }

    this.api.getUserPermissionUsers(q, groupIds, roleIds).subscribe({
      next: res => {
        this.searchUserOptions = res.data || [];
        this.availableUserSelection = this.availableUserSelection.filter(id => this.displayedAvailableUsers.some(user => user.id === id));
        // Remove selected users that don't match the new roles/groups filters (if no query is active to prevent unselecting due to search)
        if (!q) {
          const fetchedIds = new Set(this.searchUserOptions.map(u => u.id));
          this.selectedUsers = this.selectedUsers.filter(u => fetchedIds.has(u.id));
          this.selectedUserSelection = this.selectedUserSelection.filter(id => fetchedIds.has(id));
        }
      },
      error: () => { this.searchUserOptions = []; this.availableUserSelection = []; this.toast.error('Failed to search users.'); }
    });
  }

  addGroups(): void {
    const selected = new Set(this.availableGroupSelection);
    const nextGroups = this.groups.filter(group => selected.has(group.id));
    this.selectedGroups = this.uniqueById([...this.selectedGroups, ...nextGroups]);
    this.selectedGroupSelection = nextGroups.map(group => group.id);
    this.availableGroupSelection = [];
    this.loadRoles();
    this.loadSelectedPermissions();
  }

  removeGroups(): void {
    const removing = new Set(this.selectedGroupSelection);
    this.selectedGroups = this.selectedGroups.filter(group => !removing.has(group.id));
    this.selectedGroupSelection = [];
    this.loadRoles();
    this.loadSelectedPermissions();
  }

  addRoles(): void {
    const selected = new Set(this.availableRoleSelection);
    const nextRoles = this.roles.filter(role => selected.has(role.id));
    this.selectedRoles = this.uniqueById([...this.selectedRoles, ...nextRoles]);
    this.selectedRoleSelection = nextRoles.map(role => role.id);
    this.availableRoleSelection = [];
    this.searchUsers();
    this.loadSelectedPermissions();
  }

  removeRoles(): void {
    const removing = new Set(this.selectedRoleSelection);
    this.selectedRoles = this.selectedRoles.filter(role => !removing.has(role.id));
    this.selectedRoleSelection = [];
    this.searchUsers();
    this.loadSelectedPermissions();
  }



  addUsersFromSelection(): void {
    const selected = new Set(this.availableUserSelection);
    const nextUsers = this.displayedAvailableUsers.filter(user => selected.has(user.id));
    this.selectedUsers = this.uniqueById([...this.selectedUsers, ...nextUsers]);
    this.availableUserSelection = [];
    this.loadSelectedPermissions();
  }

  removeUsers(): void {
    const removing = new Set(this.selectedUserSelection);
    this.selectedUsers = this.selectedUsers.filter(user => !removing.has(user.id));
    this.selectedUserSelection = [];
    this.loadSelectedPermissions();
  }

  canMoveSelectedRole(delta: number): boolean { return this.canMoveSelection(this.selectedRoles, this.selectedRoleSelection, delta); }
  canMoveSelectedGroup(delta: number): boolean { return this.canMoveSelection(this.selectedGroups, this.selectedGroupSelection, delta); }
  canMoveSelectedUser(delta: number): boolean { return this.canMoveSelection(this.selectedUsers, this.selectedUserSelection, delta); }
  moveSelectedRoles(delta: number): void { this.selectedRoles = this.moveSelection(this.selectedRoles, this.selectedRoleSelection, delta); }
  moveSelectedGroups(delta: number): void { this.selectedGroups = this.moveSelection(this.selectedGroups, this.selectedGroupSelection, delta); }
  moveSelectedUsers(delta: number): void { this.selectedUsers = this.moveSelection(this.selectedUsers, this.selectedUserSelection, delta); }

  togglePermission(row: any, field: PermissionField, value: boolean): void {
    this.mergedPermissions.forEach(group => {
      group.functionLinks.filter((item: any) => item.functionLinkId === row.functionLinkId).forEach((item: any) => this.applyPermissionChange(item, field, value));
    });
  }

  savePermissions(): void {
    if (!this.selectedRoles.length && !this.selectedGroups.length && !this.selectedUsers.length) return;
    const permissions = this.buildPermissionPayload();
    const requests: any[] = [];
    
    if (this.selectedUsers.length) {
      requests.push(this.api.saveUserPermissions({ userIds: this.selectedUsers.map(user => user.id), permissions }));
    } else if (this.selectedRoles.length) {
      this.selectedRoles.forEach(role => requests.push(this.api.saveRolePermissions(role.id, { permissions })));
    } else if (this.selectedGroups.length) {
      this.selectedGroups.forEach(group => requests.push(this.api.saveGroupPermissions(group.id, { permissions })));
    }

    this.saving = true;
    (requests.length ? forkJoin(requests) : of<any[]>([])).subscribe({
      next: () => {
        this.toast.success('Permissions saved successfully.');
        this.saving = false;
        this.menuService.refreshMenu(true).subscribe({ next: () => {} });
        this.loadPermissions();
      },
      error: (err: any) => { this.toast.error(err.error?.message || 'Failed to save permissions.'); this.saving = false; }
    });
  }

  private loadSelectedPermissions(): void {
    if (!this.selectedRoles.length && !this.selectedGroups.length && !this.selectedUsers.length) { 
      this.mergedPermissions = []; 
      this.permissionsLoading = false; 
      return; 
    }
    this.permissionsLoading = true;
    this.mergedPermissions = [];

    let targetRequests: any[] = [];
    let groupRequests: any[] = [];
    let roleRequests: any[] = [];

    if (this.selectedUsers.length > 0) {
       targetRequests = this.selectedUsers.map(user => this.api.getUserPermissions(user.id));
       roleRequests = this.selectedRoles.map(role => this.api.getRolePermissions(role.id));
       groupRequests = this.selectedGroups.map(group => this.api.getGroupPermissions(group.id));
    } else if (this.selectedRoles.length > 0) {
       targetRequests = this.selectedRoles.map(role => this.api.getRolePermissions(role.id));
       groupRequests = this.selectedGroups.map(group => this.api.getGroupPermissions(group.id));
    } else {
       targetRequests = this.selectedGroups.map(group => this.api.getGroupPermissions(group.id));
    }

    forkJoin({
       targets: targetRequests.length ? forkJoin(targetRequests) : of([]),
       groups: groupRequests.length ? forkJoin(groupRequests) : of([]),
       roles: roleRequests.length ? forkJoin(roleRequests) : of([])
    }).subscribe({
       next: (res: any) => {
          let targetResponses = res.targets.map((r: any) => r.data);
          let groupResponses = res.groups.map((r: any) => r.data);
          let roleResponses = res.roles.map((r: any) => r.data);

          let allowedLinkIds: Set<number> | null = null;

          if (groupResponses.length > 0) {
             allowedLinkIds = new Set<number>();
             groupResponses.forEach((pRes: any) => {
                pRes.globalLinks?.forEach((gl: any) => {
                   gl.functionLinks?.forEach((fl: any) => {
                      if (fl.permissions.canView || fl.permissions.canAdd || fl.permissions.canManage) {
                         allowedLinkIds!.add(fl.functionLinkId);
                      }
                   });
                });
             });
          }

          if (roleResponses.length > 0) {
              // We do not intersect target permissions with role permissions anymore,
              // because user permissions can be additive.
          }

          let hasSuperAdminTarget = this.selectedRoles.some(r => r.code === 'SUPER_ADMIN');
          
          if (hasSuperAdminTarget) {
              allowedLinkIds = null;
          }

          if (allowedLinkIds !== null) {
             targetResponses.forEach((tRes: any) => {
                 tRes.globalLinks?.forEach((gl: any) => {
                     gl.functionLinks = gl.functionLinks?.filter((fl: any) => allowedLinkIds!.has(fl.functionLinkId));
                 });
                 tRes.globalLinks = tRes.globalLinks?.filter((gl: any) => gl.functionLinks && gl.functionLinks.length > 0);
             });
          }

          this.mergedPermissions = this.mergePermissions(targetResponses);
          this.permissionsLoading = false;
       },
       error: () => {
          this.toast.error('Failed to load permissions.');
          this.mergedPermissions = [];
          this.permissionsLoading = false;
       }
    });
  }



  private mergePermissions(responses: any[]) {
    const functionMap = new Map<string, any>();
    responses.forEach(response => {
      response.globalLinks?.forEach((group: any) => {
        group.functionLinks?.forEach((row: any) => {
          const scopeKey = group.globalLinkId + ':' + row.functionLinkId;
          const record = { canView: row.permissions.canView, canAdd: row.permissions.canAdd, canManage: row.permissions.canManage };
          const existing = functionMap.get(scopeKey);
          if (existing) { existing.permissions.push(record); return; }
          functionMap.set(scopeKey, { globalLinkId: group.globalLinkId, globalLinkName: group.globalLinkName, orderIndex: group.orderIndex, functionLinkId: row.functionLinkId, functionLinkName: row.functionLinkName, permissions: [record] });
        });
      });
    });
    const merged = new Map<number, any>();
    functionMap.forEach(entry => {
      const viewValues = entry.permissions.map((p: any) => p.canView);
      const addValues = entry.permissions.map((p: any) => p.canAdd);
      const manageValues = entry.permissions.map((p: any) => p.canManage);
      const row = {
        functionLinkId: entry.functionLinkId, functionLinkName: entry.functionLinkName,
        canView: viewValues.every(Boolean), canAdd: addValues.every(Boolean), canManage: manageValues.every(Boolean),
        viewMixed: viewValues.some(Boolean) && !viewValues.every(Boolean), addMixed: addValues.some(Boolean) && !addValues.every(Boolean), manageMixed: manageValues.some(Boolean) && !manageValues.every(Boolean)
      };
      const existing = merged.get(entry.globalLinkId);
      if (existing) { existing.functionLinks.push(row); return; }
      merged.set(entry.globalLinkId, { globalLinkId: entry.globalLinkId, globalLinkName: entry.globalLinkName, orderIndex: entry.orderIndex, functionLinks: [row] });
    });
    return Array.from(merged.values())
      .sort((a, b) => a.orderIndex - b.orderIndex || a.globalLinkName.localeCompare(b.globalLinkName))
      .map(group => ({ ...group, functionLinks: group.functionLinks.sort((a: any, b: any) => a.functionLinkName.localeCompare(b.functionLinkName)) }));
  }

  private applyPermissionChange(row: any, field: PermissionField, value: boolean): void {
    if (field === 'canManage') { row.canManage = value; if (value) { row.canAdd = true; row.canView = true; } }
    if (field === 'canAdd') { row.canAdd = value; if (value) { row.canView = true; } if (!value) { row.canManage = false; } }
    if (field === 'canView') { row.canView = value; if (!value) { row.canAdd = false; row.canManage = false; } }
    row.viewMixed = false; row.addMixed = false; row.manageMixed = false;
  }

  private buildPermissionPayload() {
    return this.mergedPermissions.flatMap(g => g.functionLinks.map((r: any) => ({
      functionLinkId: r.functionLinkId, canView: r.canView || r.viewMixed, canAdd: r.canAdd || r.addMixed, canManage: r.canManage || r.manageMixed
    })));
  }

  private canMoveSelection(list: any[], selection: number[], delta: number): boolean {
    if (!selection.length) return false;
    const ids = new Set(selection);
    const indices = list.map((item, index) => ids.has(item.id) ? index : -1).filter(i => i !== -1);
    if (delta < 0) return indices[0] > 0;
    return indices[indices.length - 1] < list.length - 1;
  }

  private moveSelection(list: any[], selection: number[], delta: number): any[] {
    const copy = [...list];
    const ids = new Set(selection);
    const indices = copy.map((item, index) => ids.has(item.id) ? index : -1).filter(i => i !== -1);
    if (delta < 0) {
      for (const i of indices) {
        if (i > 0 && !ids.has(copy[i - 1].id)) {
          [copy[i - 1], copy[i]] = [copy[i], copy[i - 1]];
        }
      }
    } else {
      for (const i of [...indices].reverse()) {
        if (i < copy.length - 1 && !ids.has(copy[i + 1].id)) {
          [copy[i + 1], copy[i]] = [copy[i], copy[i + 1]];
        }
      }
    }
    return copy;
  }

  private uniqueById<T extends { id: number }>(items: T[]): T[] {
    const map = new Map<number, T>();
    items.forEach(item => map.set(item.id, item));
    return Array.from(map.values());
  }

  loadPermissions() {
    this.listLoading = true;
    let req;
    if (this.viewType === 'role') {
        req = this.api.getPaginatedRolePermissions(this.searchListQuery, this.page, this.size);
    } else if (this.viewType === 'group') {
        req = this.api.getPaginatedGroupPermissions(this.searchListQuery, this.page, this.size);
    } else {
        req = this.api.getPaginatedUserPermissions(this.searchListQuery, this.page, this.size);
    }

    req.subscribe({
      next: (res) => {
        if (res.data) {
          this.permissionList = res.data.content || [];
          this.totalElements = res.data.totalElements || 0;
          this.totalPages = Math.ceil(this.totalElements / this.size);
        } else {
          this.permissionList = [];
          this.totalElements = 0;
          this.totalPages = 0;
        }
        this.listLoading = false;
      },
      error: () => {
        this.toast.error('Failed to load permissions list.');
        this.listLoading = false;
      }
    });
  }

  goToPage(p: number) {
    if (p >= 0 && p < this.totalPages) {
      this.page = p;
      this.loadPermissions();
    }
  }

  editPermission(p: PermissionListResponse) {
    this.selectedRoles = [];
    this.selectedRoleSelection = [];
    this.availableRoleSelection = [];
    this.selectedGroups = [];
    this.selectedGroupSelection = [];
    this.availableGroupSelection = [];
    this.selectedUsers = [];
    this.selectedUserSelection = [];
    this.availableUserSelection = [];

    if (this.viewType === 'role') {
      const role = this.roles.find(r => r.id === p.entityId);
      if (role) {
        this.selectedRoles = [role];
      }
    } else if (this.viewType === 'group') {
      const group = this.groups.find(g => g.id === p.entityId);
      if (group) {
        this.selectedGroups = [group];
      }
    } else {
      this.selectedUsers = [{
        id: p.entityId,
        username: p.entityName,
        fullName: p.entityName,
        hasPermissions: true
      }];
    }
    
    this.loadSelectedPermissions();
    if (this.tabGroup) {
      this.tabGroup.selectedIndex = 0;
    }
  }

  deletePermission(id: number) {
    if (!confirm('Are you sure you want to delete this permission?')) return;
    let req;
    if (this.viewType === 'role') req = this.api.deleteRolePermission(id);
    else if (this.viewType === 'group') req = this.api.deleteGroupPermission(id);
    else req = this.api.deleteUserPermission(id);
    req.subscribe({
      next: () => {
        this.toast.success('Permission deleted successfully');
        this.loadPermissions();
      },
      error: (err) => {
        this.toast.error('Failed to delete permission');
      }
    });
  }

  exportExcel() {
    const columns = [
        { header: this.viewType === 'role' ? 'Role Name' : (this.viewType === 'group' ? 'Group Name' : 'Username'), field: 'entityName' },
        { header: 'Global Link', field: 'globalLinkName' },
        { header: 'Function Link', field: 'functionLinkName' },
        { header: 'Can View', field: 'canView', format: 'boolean' as const },
        { header: 'Can Add', field: 'canAdd', format: 'boolean' as const },
        { header: 'Can Manage', field: 'canManage', format: 'boolean' as const }
    ];
    this.exportService.exportToExcel(this.permissionList, columns, 'permissions_export');
  }
}
