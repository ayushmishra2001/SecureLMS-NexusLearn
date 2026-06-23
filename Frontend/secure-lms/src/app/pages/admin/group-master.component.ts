import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GroupMaster, RoleMaster } from '../../core/models';
import { GroupService } from '../../core/services/group.service';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-group-master',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6 bg-white rounded-lg shadow-sm">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h2 class="text-2xl font-semibold text-gray-800">Group Master</h2>
          <p class="text-sm text-gray-500 mt-1">Manage platform groups and their roles</p>
        </div>
        <button (click)="openModal()" class="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center">
          <span class="material-icons-outlined text-sm mr-2">add</span>
          Add Group
        </button>
      </div>

      <!-- Groups Table -->
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Group Name</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr *ngFor="let group of groups">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ group.groupName }}</td>
              <td class="px-6 py-4 text-sm text-gray-500">{{ group.description || '--' }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <span [class]="group.active ? 'px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800' : 'px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800'">
                  {{ group.active ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button (click)="openModal(group)" class="text-indigo-600 hover:text-indigo-900 mr-4">Edit</button>
                <button (click)="toggleStatus(group)" [class]="group.active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'">
                  {{ group.active ? 'Deactivate' : 'Activate' }}
                </button>
              </td>
            </tr>
            <tr *ngIf="groups.length === 0">
              <td colspan="4" class="px-6 py-4 text-center text-sm text-gray-500">No groups found.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div *ngIf="showModal" class="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div class="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" (click)="closeModal()"></div>
        <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        <div class="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div>
            <div class="mt-3 text-center sm:mt-0 sm:text-left">
              <h3 class="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                {{ isEdit ? 'Edit Group' : 'Add New Group' }}
              </h3>
              <div class="mt-4">
                <form (ngSubmit)="saveGroup()">
                  <div class="mb-4">
                    <label for="groupName" class="block text-sm font-medium text-gray-700">Group Name *</label>
                    <input type="text" id="groupName" name="groupName" [(ngModel)]="currentGroup.groupName" required
                      class="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border">
                  </div>
                  <div class="mb-4">
                    <label for="description" class="block text-sm font-medium text-gray-700">Description</label>
                    <textarea id="description" name="description" [(ngModel)]="currentGroup.description" rows="3"
                      class="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md py-2 px-3 border"></textarea>
                  </div>
                  <div class="mb-4">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Assign Roles</label>
                    <div class="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2">
                        <div *ngFor="let role of availableRoles" class="flex items-center mb-2">
                            <input type="checkbox" [id]="'role-' + role.id" [checked]="selectedRoleIds.includes(role.id)" (change)="toggleRoleSelection(role.id)" class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded">
                            <label [for]="'role-' + role.id" class="ml-2 block text-sm text-gray-900">
                                {{ role.displayName }} ({{ role.code }})
                            </label>
                        </div>
                    </div>
                  </div>
                  <div class="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse">
                    <button type="submit" [disabled]="!currentGroup.groupName"
                      class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50">
                      Save
                    </button>
                    <button type="button" (click)="closeModal()"
                      class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class GroupMasterComponent implements OnInit {
  groups: GroupMaster[] = [];
  availableRoles: RoleMaster[] = [];
  
  showModal = false;
  isEdit = false;
  currentGroup: any = { groupName: '', description: '', active: true };
  selectedRoleIds: number[] = [];

  constructor(
    private groupService: GroupService,
    private apiService: ApiService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadGroups();
    this.loadRoles();
  }

  loadGroups(): void {
    this.groupService.getAllGroups().subscribe({
      next: (groups) => this.groups = groups,
      error: (err) => this.toastService.error('Failed to load groups')
    });
  }

  loadRoles(): void {
    this.apiService.getRoles(true).subscribe({
        next: (res: any) => {
            if (res.success) {
                // exclude SUPER_ADMIN from being assigned to any group
                this.availableRoles = (res.data || []).filter((r: any) => r.code !== 'SUPER_ADMIN' && r.active);
            }
        }
    });
  }

  openModal(group?: GroupMaster): void {
    this.isEdit = !!group;
    if (group) {
      this.currentGroup = { ...group };
      this.selectedRoleIds = group.roles ? group.roles.map(r => r.id) : [];
    } else {
      this.currentGroup = { groupName: '', description: '', active: true };
      this.selectedRoleIds = [];
    }
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  toggleRoleSelection(roleId: number): void {
      const index = this.selectedRoleIds.indexOf(roleId);
      if (index > -1) {
          this.selectedRoleIds.splice(index, 1);
      } else {
          this.selectedRoleIds.push(roleId);
      }
  }

  saveGroup(): void {
    const payload = {
      groupName: this.currentGroup.groupName,
      description: this.currentGroup.description,
      active: this.currentGroup.active,
      roleIds: this.selectedRoleIds
    };

    if (this.isEdit) {
      this.groupService.updateGroup(this.currentGroup.id, payload).subscribe({
        next: () => {
          this.toastService.success('Group updated successfully');
          this.closeModal();
          this.loadGroups();
        },
        error: (err) => this.toastService.error(err.error?.message || 'Failed to update group')
      });
    } else {
      this.groupService.createGroup(payload).subscribe({
        next: () => {
          this.toastService.success('Group created successfully');
          this.closeModal();
          this.loadGroups();
        },
        error: (err) => this.toastService.error(err.error?.message || 'Failed to create group')
      });
    }
  }

  toggleStatus(group: GroupMaster): void {
    this.groupService.toggleGroupStatus(group.id, !group.active).subscribe({
      next: () => {
        this.toastService.success(`Group ${group.active ? 'deactivated' : 'activated'} successfully`);
        this.loadGroups();
      },
      error: () => this.toastService.error('Failed to update group status')
    });
  }
}
