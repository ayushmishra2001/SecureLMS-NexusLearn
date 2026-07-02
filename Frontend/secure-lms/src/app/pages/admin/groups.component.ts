import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { DashboardLayoutComponent } from '../../shared/dashboard-layout/dashboard-layout.component';
import { ToastService } from '../../core/services/toast.service';
import { ApiService } from '../../core/services/api.service';
import { GroupService } from '../../core/services/group.service';
import { GroupMaster, User } from '../../core/models';
import { Router, RouterModule } from '@angular/router';
import { ADMIN_NAV_GROUPS, ADMIN_SECTION_ROUTES } from '../../core/navigation/app-routes';
import { MatTabsModule, MatTabGroup } from '@angular/material/tabs';
import { ModalComponent } from '../../shared/modal/modal.component';

@Component({
  selector: 'app-groups',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule, DashboardLayoutComponent, MatTabsModule, ModalComponent],
  template: `
    <app-dashboard-layout
      [navGroups]="navGroups"
      [activeSection]="activeSection"
      [pageTitle]="pageTitle"
      roleLabel="Administrator"
      (sectionChange)="onSectionChange($event)">

      <mat-tab-group #tabGroup animationDuration="0ms">

        <mat-tab [label]="editingGroup ? 'Edit Group' : 'Add Group'">
          <section class="card" style="margin-top:20px;">
            <div class="card-header">
              <div class="card-title">{{ editingGroup ? 'Edit Group' : 'Add Group' }}</div>
            </div>
            <div class="card-body">
            <form [formGroup]="groupForm" (ngSubmit)="saveGroup()">
              <div class="form-grid">
                <div class="form-group">
                  <label>Group Name <span class="text-danger">*</span></label>
                  <input class="form-control" formControlName="groupName" placeholder="e.g. Batch 2024" />
                  @if (groupForm.controls['groupName'].touched && groupForm.controls['groupName'].invalid) {
                    <div class="field-error">Group name is required.</div>
                  }
                </div>

                <div class="form-group full-width">
                  <label>Description</label>
                  <textarea class="form-control" formControlName="description" rows="3" placeholder="Description..."></textarea>
                </div>

                <!-- NEW DUAL LISTBOX IN FORM -->
                <div class="form-group full-width" style="margin-top: 10px;">
                  <label>Assign Users</label>
                  <div class="dual-listbox-wrap" style="display: flex; gap: 20px; align-items: stretch; justify-content: space-between; height: 320px;">
                    <div class="listbox-container" style="flex: 1; border: 1px solid #ddd; border-radius: 6px; padding: 10px; display: flex; flex-direction: column;">
                      <h4 style="margin: 0 0 10px 0; font-size: 14px;">Available Users</h4>
                      <input type="text" class="form-control" style="margin-bottom: 10px;" placeholder="Search..." [(ngModel)]="searchAvailable" [ngModelOptions]="{standalone: true}" />
                      <select class="form-control" style="margin-bottom: 10px;" [(ngModel)]="filterAvailableGroup" [ngModelOptions]="{standalone: true}">
                        <option value="">-- All Groups --</option>
                        <option value="NULL_GROUP">No Group / Pending</option>
                        @for (g of uniqueAvailableGroups(); track g) {
                          <option [value]="g">{{ g }}</option>
                        }
                      </select>
                      <div class="custom-listbox form-control" style="flex: 1; min-height: 150px; overflow-y: auto; padding: 0;">
                        @for (u of filteredAvailableUsers(); track u.id) {
                          <div class="listbox-item" 
                               [class.selected]="selectedAvailable.includes(u)" 
                               (click)="toggleSelection(u, 'available', $event)"
                               style="padding: 6px 12px; cursor: pointer; border-bottom: 1px solid #f0f0f0; user-select: none;">
                            {{ u.firstName }} {{ u.lastName }} ({{ u.username }}) [{{ u.groupName || 'Pending / None' }}]
                          </div>
                        }
                        @if (filteredAvailableUsers().length === 0) {
                          <div style="padding: 10px; color: #888; text-align: center; font-style: italic;">No users available</div>
                        }
                      </div>
                    </div>
                    
                    <div class="listbox-actions" style="display: flex; flex-direction: column; justify-content: center; gap: 10px;">
                      <button type="button" class="btn btn-secondary btn-icon" (click)="moveRight()" [disabled]="!selectedAvailable.length"><span class="material-symbols-outlined">chevron_right</span></button>
                      <button type="button" class="btn btn-secondary btn-icon" (click)="moveLeft()" [disabled]="!selectedAssigned.length"><span class="material-symbols-outlined">chevron_left</span></button>
                    </div>

                    <div class="listbox-container" style="flex: 1; border: 1px solid #ddd; border-radius: 6px; padding: 10px; display: flex; flex-direction: column;">
                      <h4 style="margin: 0 0 10px 0; font-size: 14px;">Assigned Users</h4>
                      <input type="text" class="form-control" style="margin-bottom: 10px;" placeholder="Search..." [(ngModel)]="searchAssigned" [ngModelOptions]="{standalone: true}" />
                      <div class="custom-listbox form-control" style="flex: 1; min-height: 150px; overflow-y: auto; padding: 0;">
                        @for (u of filteredAssignedUsers(); track u.id) {
                          <div class="listbox-item" 
                               [class.selected]="selectedAssigned.includes(u)" 
                               (click)="toggleSelection(u, 'assigned', $event)"
                               style="padding: 6px 12px; cursor: pointer; border-bottom: 1px solid #f0f0f0; user-select: none;">
                            {{ u.firstName }} {{ u.lastName }} ({{ u.username }})
                          </div>
                        }
                        @if (filteredAssignedUsers().length === 0) {
                          <div style="padding: 10px; color: #888; text-align: center; font-style: italic;">No users assigned</div>
                        }
                      </div>
                    </div>
                  </div>
                </div>

                <div class="form-group checkbox-group full-width">
                  <label><input type="checkbox" formControlName="isActive" /> Active</label>
                </div>
              </div>

                <div class="form-actions" style="margin-top: 12px; display: flex; gap: 12px;">
                  <button type="submit" class="btn btn-primary" [disabled]="groupForm.invalid || saving">{{ saving ? 'Saving...' : 'Save Group' }}</button>
                  <button type="button" class="btn btn-secondary" (click)="cancelEdit()">Cancel</button>
                </div>
              </form>
            </div>
          </section>
        </mat-tab>

        <mat-tab label="View Groups">
          <section class="card" style="margin-top:20px;">
            <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
              <div>
                <div class="card-title">Groups List</div>
                <p class="card-subtitle">Manage all system groups</p>
              </div>
              <div class="filter-bar" style="display: flex; gap: 12px; align-items: center;">
                <input type="text" class="form-control" placeholder="Search groups..." [(ngModel)]="searchTerm" (ngModelChange)="applyFilters()" style="max-width: 200px;" />
                <select class="form-control" [(ngModel)]="statusFilter" (ngModelChange)="applyFilters()" style="max-width: 150px;">
                  <option value="ALL">All Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>

            <div class="card-body table-wrap">
              @if (paginatedGroups.length > 0) {
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Group Name</th>
                      <th>Description</th>
                      <th>Users</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (group of paginatedGroups; track group.id) {
                      <tr>
                        <td>{{ group.id }}</td>
                        <td><strong>{{ group.groupName }}</strong></td>
                        <td>{{ group.description || '--' }}</td>
                        <td>{{ group.userCount || 0 }}</td>
                        <td><span class="status-pill" [class.inactive]="!group.active">{{ group.active ? 'Active' : 'Inactive' }}</span></td>
                        <td>
                          <button class="btn btn-secondary btn-icon btn-sm" (click)="openForm(group)" title="Edit"><span class="material-symbols-outlined">edit</span></button>
                          <button class="btn btn-ghost btn-icon btn-sm" (click)="toggleStatus(group)" title="Toggle Status">
                            <span class="material-symbols-outlined">{{ group.active ? 'toggle_on' : 'toggle_off' }}</span>
                          </button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>

                <div class="pagination-wrap" style="margin-top: 16px; display: flex; justify-content: space-between; align-items: center;">
                  <span class="pagination-info">
                    Showing {{ paginationStart }}-{{ paginationEnd }} of {{ filteredGroups.length }}
                  </span>
                  <div class="pagination-btns">
                    <button class="page-btn" [disabled]="currentPage === 1" (click)="setPage(currentPage - 1)">&lt;</button>
                    @for (p of getPageNumbers(); track $index) {
                      <button class="page-btn" [class.active]="p === currentPage" (click)="setPage(p)">{{ p }}</button>
                    }
                    <button class="page-btn" [disabled]="currentPage === totalPages" (click)="setPage(currentPage + 1)">&gt;</button>
                  </div>
                  <div class="page-size-wrap">
                    <label>Rows:</label>
                    <select class="form-control" [(ngModel)]="pageSize" (ngModelChange)="onPageSizeChange()">
                      <option [ngValue]="5">5</option>
                      <option [ngValue]="10">10</option>
                      <option [ngValue]="20">20</option>
                      <option [ngValue]="50">50</option>
                    </select>
                  </div>
                </div>
              } @else {
                <div class="empty-state">
                  <span class="material-symbols-outlined empty-icon">groups</span>
                  <p>No groups found.</p>
                </div>
              }
            </div>
          </section>
        </mat-tab>

      </mat-tab-group>
    </app-dashboard-layout>
  `,
  styles: [`
    .listbox-item:hover { background: #f9f9f9; }
    .listbox-item.selected { background: #1d2d5e !important; color: white !important; }
  `]
})
export class GroupsComponent implements OnInit {
  private router = inject(Router);
  private toast = inject(ToastService);
  private groupService = inject(GroupService);
  private api = inject(ApiService);
  private fb = inject(FormBuilder);

  @ViewChild('tabGroup') tabGroup?: MatTabGroup;

  navGroups = ADMIN_NAV_GROUPS;
  activeSection = 'groups';

  allGroups: GroupMaster[] = [];
  filteredGroups: GroupMaster[] = [];
  paginatedGroups: GroupMaster[] = [];

  // Pagination
  currentPage = 1;
  pageSize = 10;
  
  // Filters
  searchTerm = '';
  statusFilter = 'ALL';

  editingGroup: GroupMaster | null = null;
  saving = false;

  allUsersCache: User[] = [];
  availableUsers: User[] = [];
  assignedUsers: User[] = [];
  
  selectedAvailable: User[] = [];
  selectedAssigned: User[] = [];

  searchAvailable = '';
  searchAssigned = '';
  filterAvailableGroup = '';

  groupForm = this.fb.group({
    groupName: ['', Validators.required],
    description: [''],
    isActive: [true]
  });

  get pageTitle(): string {
    return 'Group Management';
  }

  get paginationStart(): number {
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get paginationEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredGroups.length);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredGroups.length / this.pageSize);
  }

  ngOnInit(): void {
    this.loadGroups();
    this.loadAllUsers();
  }

  loadAllUsers() {
    this.api.getAdminUsers().subscribe({
      next: (res) => {
        this.allUsersCache = Array.isArray(res.data) ? res.data : (res.data as any)?.content || [];
        this.partitionUsers();
      },
      error: () => this.toast.error('Failed to load users')
    });
  }

  onSectionChange(section: string): void {
    this.router.navigate([ADMIN_SECTION_ROUTES[section] ?? ADMIN_SECTION_ROUTES['dashboard']]);
  }

  loadGroups(): void {
    this.groupService.getAllGroups().subscribe({
      next: res => {
        this.allGroups = res || [];
        this.applyFilters();
      },
      error: () => this.toast.error('Failed to load groups')
    });
  }

  applyFilters(): void {
    let filtered = this.allGroups;
    
    // Status Filter
    if (this.statusFilter === 'ACTIVE') {
      filtered = filtered.filter(g => g.active);
    } else if (this.statusFilter === 'INACTIVE') {
      filtered = filtered.filter(g => !g.active);
    }

    // Search term
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(g => 
        g.groupName.toLowerCase().includes(term) || 
        (g.description && g.description.toLowerCase().includes(term))
      );
    }

    this.filteredGroups = filtered;
    this.currentPage = 1; // reset to first page on filter change
    this.updatePagination();
  }

  updatePagination(): void {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.paginatedGroups = this.filteredGroups.slice(startIndex, startIndex + this.pageSize);
  }

  setPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.updatePagination();
  }

  getPageNumbers(): number[] {
    const pages = [];
    for (let i = 1; i <= this.totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  openForm(group?: GroupMaster): void {
    this.editingGroup = group || null;
    this.groupForm.patchValue({
      groupName: group?.groupName || '',
      description: group?.description || '',
      isActive: group ? group.active : true
    });
    this.partitionUsers();
    if (this.tabGroup) {
      this.tabGroup.selectedIndex = 0;
    }
  }

  cancelEdit(): void {
    this.editingGroup = null;
    this.groupForm.reset({ isActive: true });
    this.assignedUsers = [];
    this.partitionUsers();
    if (this.tabGroup) {
      this.tabGroup.selectedIndex = 1;
    }
  }

  saveGroup(): void {
    if (this.groupForm.invalid) {
      this.groupForm.markAllAsTouched();
      return;
    }

    this.saving = true;
    const raw = this.groupForm.getRawValue();
    const payload = {
      groupName: raw.groupName!,
      description: raw.description ?? undefined,
      active: raw.isActive ?? true,
      userIds: this.assignedUsers.map(u => u.id)
    };

    const ob = this.editingGroup 
      ? this.groupService.updateGroup(this.editingGroup.id, payload)
      : this.groupService.createGroup(payload);

    ob.subscribe({
      next: () => {
        this.toast.success(`Group ${this.editingGroup ? 'updated' : 'created'} successfully`);
        this.saving = false;
        this.groupForm.reset({ isActive: true });
        this.editingGroup = null;
        this.assignedUsers = [];
        this.loadGroups();
        this.loadAllUsers();
        if (this.tabGroup) {
          this.tabGroup.selectedIndex = 1;
        }
      },
      error: err => {
        this.toast.error(err?.error?.message || 'Failed to save group');
        this.saving = false;
      }
    });
  }

  toggleStatus(group: GroupMaster): void {
    this.groupService.toggleGroupStatus(group.id, !group.active).subscribe({
      next: () => {
        this.toast.success('Group status updated');
        this.loadGroups();
      },
      error: () => this.toast.error('Failed to update group status')
    });
  }

  uniqueAvailableGroups(): string[] {
    const groups = new Set<string>();
    this.availableUsers.forEach(u => {
      if (u.groupName) groups.add(u.groupName);
    });
    return Array.from(groups).sort();
  }

  filteredAvailableUsers() {
    let filtered = this.availableUsers;
    if (this.filterAvailableGroup === 'NULL_GROUP') {
      filtered = filtered.filter(u => !u.groupName);
    } else if (this.filterAvailableGroup) {
      filtered = filtered.filter(u => u.groupName === this.filterAvailableGroup);
    }

    if (!this.searchAvailable.trim()) return filtered;
    const term = this.searchAvailable.toLowerCase();
    return filtered.filter(u => u.username.toLowerCase().includes(term) || u.firstName?.toLowerCase().includes(term));
  }

  filteredAssignedUsers() {
    if (!this.searchAssigned.trim()) return this.assignedUsers;
    const term = this.searchAssigned.toLowerCase();
    return this.assignedUsers.filter(u => u.username.toLowerCase().includes(term) || u.firstName?.toLowerCase().includes(term));
  }

  partitionUsers() {
    if (this.editingGroup) {
      this.assignedUsers = this.allUsersCache.filter(u => u.groupId === this.editingGroup!.id);
    } else {
      this.assignedUsers = [];
    }
    this.availableUsers = this.allUsersCache.filter(u => !this.assignedUsers.find(a => a.id === u.id));
  }

  moveRight() {
    this.assignedUsers = [...this.assignedUsers, ...this.selectedAvailable];
    this.availableUsers = this.availableUsers.filter(u => !this.selectedAvailable.includes(u));
    this.selectedAvailable = [];
  }

  moveLeft() {
    this.availableUsers = [...this.availableUsers, ...this.selectedAssigned];
    this.assignedUsers = this.assignedUsers.filter(u => !this.selectedAssigned.includes(u));
    this.selectedAssigned = [];
  }

  toggleSelection(user: User, list: 'available' | 'assigned', event: MouseEvent) {
    const selectedList = list === 'available' ? this.selectedAvailable : this.selectedAssigned;
    const index = selectedList.findIndex(u => u.id === user.id);

    if (event.ctrlKey || event.metaKey || event.shiftKey) {
      if (index > -1) {
        selectedList.splice(index, 1);
      } else {
        selectedList.push(user);
      }
    } else {
      if (list === 'available') {
        this.selectedAvailable = [user];
      } else {
        this.selectedAssigned = [user];
      }
    }
  }
}
