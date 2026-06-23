import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DashboardLayoutComponent } from '../../shared/dashboard-layout/dashboard-layout.component';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { MenuService } from '../../core/services/menu.service';
import { FunctionLink, ReorderItem } from '../../core/models';
import { Router, RouterModule } from '@angular/router';
import { ADMIN_NAV_GROUPS, ADMIN_SECTION_ROUTES } from '../../core/navigation/app-routes';
import { MatTabsModule, MatTabGroup } from '@angular/material/tabs';

@Component({
  selector: 'app-function-links',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, DashboardLayoutComponent, ConfirmDialogComponent, MatTabsModule],
  template: `
    <app-dashboard-layout
      [navGroups]="navGroups"
      [activeSection]="activeSection"
      [pageTitle]="pageTitle"
      roleLabel="Administrator"
      (sectionChange)="onSectionChange($event)">

      <mat-tab-group #tabGroup animationDuration="0ms">
        <mat-tab label="View Links">
          <section class="card" style="margin-top:20px;">
            <div class="card-header">
              <div class="card-title">Function Links Data</div>
              <p class="card-subtitle">Manage function-level navigation and review usage counts.</p>
            </div>
            
            <div class="card-body table-wrap">
              @if (links.length > 0) {
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Route</th>
                      <th>Active</th>
                      <th>Used in</th>
                      <th>Order</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (link of links; track link.id; let i = $index) {
                      <tr>
                        <td>{{ i + 1 }}</td>
                        <td><strong>{{ link.displayName }}</strong></td>
                        <td>{{ link.routePath }}</td>
                        <td><span class="status-pill" [class.inactive]="!link.active">{{ link.active ? 'Active' : 'Inactive' }}</span></td>
                        <td>{{ link.activePrimaryLinkCount }}</td>
                        <td>
                          <button class="btn btn-ghost btn-icon btn-sm" title="Move up" (click)="moveOrder(i, -1)" [disabled]="i === 0">
                            <span class="material-symbols-outlined">arrow_upward</span>
                          </button>
                          <button class="btn btn-ghost btn-icon btn-sm" title="Move down" (click)="moveOrder(i, 1)" [disabled]="i === links.length - 1">
                            <span class="material-symbols-outlined">arrow_downward</span>
                          </button>
                        </td>
                        <td>
                          <button class="btn btn-secondary btn-icon btn-sm" (click)="openForm(link)" title="Edit"><span class="material-symbols-outlined">edit</span></button>
                          <button class="btn btn-danger btn-icon btn-sm" (click)="confirmDeactivate(link)" [disabled]="!link.active" title="Deactivate"><span class="material-symbols-outlined">do_not_disturb_on</span></button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              } @else {
                <div class="empty-state">
                  <span class="material-symbols-outlined empty-icon">extension</span>
                  <p>No function links found.</p>
                </div>
              }
            </div>
          </section>
        </mat-tab>

        <mat-tab [label]="editingLink ? 'Edit Link' : 'Add Link'">
          <section class="card" style="margin-top:20px;">
            <div class="card-header">
              <div class="card-title">{{ editingLink ? 'Edit Function Link' : 'Add Function Link' }}</div>
            </div>
            <div class="card-body">
              <form [formGroup]="linkForm" (ngSubmit)="saveLink()">
                <div class="form-grid">
                  <div class="form-group">
                <label>Display name</label>
                <input class="form-control" formControlName="displayName" placeholder="e.g. System Configuration" />
                @if (linkForm.controls['displayName'].touched && linkForm.controls['displayName'].invalid) {
                  <div class="field-error">Display name is required and must be 150 characters or less.</div>
                }
              </div>
              
              <div class="form-group">
                <label>Route path</label>
                <input class="form-control" formControlName="routePath" placeholder="/admin/settings" />
                @if (linkForm.controls['routePath'].touched && linkForm.controls['routePath'].invalid) {
                  <div class="field-error">Route path is required, must start with /, and must be 500 characters or less.</div>
                }
              </div>
              
                  <div class="form-group checkbox-group full-width">
                    <label><input type="checkbox" formControlName="isActive" /> Active</label>
                  </div>
                </div>
                
                <div class="form-actions" style="margin-top: 12px; display: flex; gap: 12px;">
                  <button type="submit" class="btn btn-primary" [disabled]="linkForm.invalid || saving">{{ saving ? 'Saving...' : 'Save Link' }}</button>
                  <button type="button" class="btn btn-secondary" (click)="cancelEdit()">Cancel</button>
                </div>
              </form>
            </div>
          </section>
        </mat-tab>
      </mat-tab-group>

      <app-confirm-dialog
        [isOpen]="showConfirm"
        [message]="confirmMessage"
        confirmLabel="Deactivate"
        (confirm)="deactivateLink()"
        (cancel)="cancelConfirm()">
      </app-confirm-dialog>
    </app-dashboard-layout>
  `,
  styles: [
    `
    .card-subtitle { margin-top: 4px; color: var(--text-muted); font-size: 0.95rem; }
    .checkbox-group { margin-top: 12px; }
    .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px; color: var(--text-muted); }
    .empty-icon { font-size: 36px; margin-bottom: 12px; color: var(--text-muted); }
    .btn-ghost { border: 1px solid var(--border); background: transparent; min-width: 40px; }
    .btn-ghost:disabled, .btn:disabled { opacity: 0.35; cursor: not-allowed; }
    .status-pill { display: inline-flex; align-items: center; border-radius: 999px; padding: 3px 9px; font-size: 12px; font-weight: 700; background: rgba(22,163,74,.12); color: #15803d; }
    .status-pill.inactive { background: rgba(107,114,128,.14); color: var(--text-muted); }
  `]
})
export class FunctionLinksComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private menuService = inject(MenuService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  @ViewChild('tabGroup') tabGroup!: MatTabGroup;

  activeSection = 'function-links';
  navGroups = ADMIN_NAV_GROUPS;
  links: FunctionLink[] = [];
  editingLink: FunctionLink | null = null;
  
  showConfirm = false;
  confirmMessage = '';
  deletingLink: FunctionLink | null = null;
  saving = false;

  linkForm = this.fb.group({
    displayName: ['', [Validators.required, Validators.maxLength(150)]],
    routePath: ['', [Validators.required, Validators.maxLength(500), Validators.pattern(/^\/.+/)]],
    isActive: [true]
  });

  get pageTitle(): string {
    return 'Function Links';
  }

  ngOnInit(): void {
    this.loadLinks();
  }

  onSectionChange(section: string): void {
    this.router.navigate([ADMIN_SECTION_ROUTES[section] ?? ADMIN_SECTION_ROUTES['dashboard']]);
  }

  loadLinks(): void {
    this.api.getFunctionLinks().subscribe({
      next: res => this.links = res.data || [],
      error: () => this.toast.error('Failed to load function links.')
    });
  }

  openForm(link?: FunctionLink): void {
    this.editingLink = link ?? null;
    this.linkForm.reset({
      displayName: link?.displayName ?? '',
      routePath: link?.routePath ?? '',
      isActive: link?.active ?? true
    });
    if (this.tabGroup) {
      this.tabGroup.selectedIndex = 1;
    }
  }

  cancelEdit(): void {
    this.editingLink = null;
    this.linkForm.reset({ isActive: true });
    if (this.tabGroup) {
      this.tabGroup.selectedIndex = 0;
    }
  }

  saveLink(): void {
    this.linkForm.markAllAsTouched();
    if (this.linkForm.invalid) {
      this.toast.error('Please fix the form errors.');
      return;
    }

    this.saving = true;
    const payload = {
      displayName: (this.linkForm.value.displayName ?? '').trim(),
      routePath: (this.linkForm.value.routePath ?? '').trim(),
      isActive: (this.linkForm.value.isActive ?? false)
    };
    const request = this.editingLink
      ? this.api.updateFunctionLink(this.editingLink.id, payload)
      : this.api.createFunctionLink(payload);

    request.subscribe({
      next: () => {
        this.toast.success('Function link saved.');
        this.editingLink = null;
        this.loadLinks();
        this.refreshMenu();
        this.saving = false;
        this.cancelEdit();
      },
      error: err => {
        this.toast.error(err.error?.message || 'Failed to save function link.');
        this.saving = false;
      }
    });
  }

  confirmDeactivate(link: FunctionLink): void {
    if (!link.active) return;
    this.deletingLink = link;
    this.confirmMessage = `Deactivate function link "${link.displayName}"? This will retain user permission mappings but remove the link from active navigation.`;
    this.showConfirm = true;
  }

  cancelConfirm(): void {
    this.showConfirm = false;
    this.deletingLink = null;
  }

  deactivateLink(): void {
    if (!this.deletingLink) return;
    this.api.deleteFunctionLink(this.deletingLink.id).subscribe({
      next: () => {
        this.toast.success('Function link deactivated.');
        this.showConfirm = false;
        this.deletingLink = null;
        this.loadLinks();
        this.refreshMenu();
      },
      error: () => {
        this.toast.error('Failed to deactivate function link.');
        this.showConfirm = false;
      }
    });
  }

  moveOrder(index: number, delta: number): void {
    const nextIndex = index + delta;
    if (nextIndex < 0 || nextIndex >= this.links.length) return;
    const reordered = [...this.links];
    const [item] = reordered.splice(index, 1);
    reordered.splice(nextIndex, 0, item);
    const payload: ReorderItem[] = reordered.map((link, idx) => ({ id: link.id, orderIndex: idx + 1 }));
    this.api.reorderFunctionLinks(payload).subscribe({
      next: () => {
        this.loadLinks();
        this.refreshMenu();
      },
      error: () => this.toast.error('Failed to update order.')
    });
  }

  private refreshMenu(): void {
    this.menuService.refreshMenu(true).subscribe({ next: () => {} });
  }
}
