import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { DashboardLayoutComponent } from '../../shared/dashboard-layout/dashboard-layout.component';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { MenuService } from '../../core/services/menu.service';
import { GlobalLink, FunctionLink, PrimaryLink, ReorderItem } from '../../core/models';
import { Router, RouterModule } from '@angular/router';
import { ADMIN_NAV_GROUPS, ADMIN_SECTION_ROUTES } from '../../core/navigation/app-routes';
import { MatTabsModule, MatTabGroup } from '@angular/material/tabs';

@Component({
  selector: 'app-primary-links',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule, DashboardLayoutComponent, ConfirmDialogComponent, MatTabsModule],
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
              <div class="card-title">Primary Links Data</div>
              <p class="card-subtitle">List of primary navigation items scoped by global and function.</p>
            </div>
            
            <div class="card-body filter-row">
              <label>
                Global filter
                <select class="form-control" [(ngModel)]="filters.globalLinkId" (ngModelChange)="loadLinks()">
                  <option value="">All global links</option>
                  @for (link of globalLinks; track link.id) {
                    <option [value]="link.id">{{ link.displayName }}</option>
                  }
                </select>
              </label>
              <label>
                Function filter
                <select class="form-control" [(ngModel)]="filters.functionLinkId" (ngModelChange)="loadLinks()">
                  <option value="">All function links</option>
                  @for (link of functionLinks; track link.id) {
                    <option [value]="link.id">{{ link.displayName }}</option>
                  }
                </select>
              </label>
            </div>
            
            <div class="card-body table-wrap">
              @if (links.length > 0) {
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Global</th>
                      <th>Function</th>
                      <th>Active</th>
                      <th>Order</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (link of links; track link.id; let i = $index) {
                      <tr>
                        <td>{{ i + 1 }}</td>
                        <td><strong>{{ link.displayName }}</strong></td>
                        <td>{{ getGlobalDisplay(link.globalLinkId) }}</td>
                        <td>{{ getFunctionDisplay(link.functionLinkId) }}</td>
                        <td><span class="status-pill" [class.inactive]="!link.active">{{ link.active ? 'Active' : 'Inactive' }}</span></td>
                        <td>
                          <button class="btn btn-ghost btn-icon btn-sm" (click)="moveOrder(i, -1)" [disabled]="i === 0 || !filters.globalLinkId || !filters.functionLinkId" title="Move up"><span class="material-symbols-outlined">arrow_upward</span></button>
                          <button class="btn btn-ghost btn-icon btn-sm" (click)="moveOrder(i, 1)" [disabled]="i === links.length - 1 || !filters.globalLinkId || !filters.functionLinkId" title="Move down"><span class="material-symbols-outlined">arrow_downward</span></button>
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
                  <span class="material-symbols-outlined empty-icon">link</span>
                  <p>No primary links found.</p>
                </div>
              }
            </div>
          </section>
        </mat-tab>

          <mat-tab [label]="editingLink ? 'Edit Link' : 'Add Link'">
            <section class="card" style="margin-top:20px;">
              <div class="card-header">
                <div class="card-title">{{ editingLink ? 'Edit Primary Link' : 'Add Primary Link' }}</div>
              </div>
              <div class="card-body">
              <form [formGroup]="linkForm" (ngSubmit)="saveLink()">
                <div class="form-grid">
                  <div class="form-group">
                  <label>Global link</label>
                  <select class="form-control" formControlName="globalLinkId">
                    <option value="">Select global link</option>
                    @for (link of globalLinks; track link.id) {
                      <option [value]="link.id">{{ link.displayName }}</option>
                    }
                  </select>
                  @if (linkForm.controls['globalLinkId'].touched && linkForm.controls['globalLinkId'].invalid) {
                    <div class="field-error">A global link is required.</div>
                  }
                </div>
                
                <div class="form-group">
                  <label>Function link</label>
                  <select class="form-control" formControlName="functionLinkId">
                    <option value="">Select function link</option>
                    @for (link of functionLinks; track link.id) {
                      <option [value]="link.id">{{ link.displayName }}</option>
                    }
                  </select>
                  @if (linkForm.controls['functionLinkId'].touched && linkForm.controls['functionLinkId'].invalid) {
                    <div class="field-error">A function link is required.</div>
                  }
                </div>
                
                <div class="form-group">
                  <label>Display name</label>
                  <input class="form-control" formControlName="displayName" placeholder="e.g. Add Users" />
                  @if (linkForm.controls['displayName'].touched && linkForm.controls['displayName'].invalid) {
                    <div class="field-error">Display name is required and must be 150 characters or less.</div>
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
    .filter-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin-bottom: 18px; }
    .checkbox-group { margin-top: 12px; }
    .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px; color: var(--text-muted); }
    .empty-icon { font-size: 36px; margin-bottom: 12px; color: var(--text-muted); }
    .btn-ghost { border: 1px solid var(--border); background: transparent; min-width: 40px; }
    .btn-ghost:disabled, .btn:disabled { opacity: 0.35; cursor: not-allowed; }
    .status-pill { display: inline-flex; align-items: center; border-radius: 999px; padding: 3px 9px; font-size: 12px; font-weight: 700; background: rgba(22,163,74,.12); color: #15803d; }
    .status-pill.inactive { background: rgba(107,114,128,.14); color: var(--text-muted); }
  `]
})
export class PrimaryLinksComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private menuService = inject(MenuService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  @ViewChild('tabGroup') tabGroup!: MatTabGroup;

  activeSection = 'primary-links';
  navGroups = ADMIN_NAV_GROUPS;
  globalLinks: GlobalLink[] = [];
  functionLinks: FunctionLink[] = [];
  links: PrimaryLink[] = [];
  filters = { globalLinkId: '', functionLinkId: '' };
  editingLink: PrimaryLink | null = null;
  
  showConfirm = false;
  confirmMessage = '';
  deletingLink: PrimaryLink | null = null;
  routePathError = '';
  saving = false;

  linkForm = this.fb.group({
    globalLinkId: ['', Validators.required],
    functionLinkId: ['', Validators.required],
    displayName: ['', [Validators.required, Validators.maxLength(150)]],
    isActive: [true]
  });

  get pageTitle(): string {
    return 'Primary Links';
  }

  ngOnInit(): void {
    this.loadLookups();
    this.loadLinks();
  }

  onSectionChange(section: string): void {
    this.router.navigate([ADMIN_SECTION_ROUTES[section] ?? ADMIN_SECTION_ROUTES['dashboard']]);
  }

  loadLookups(): void {
    this.api.getGlobalLinks().subscribe({
      next: res => this.globalLinks = res.data || [],
      error: () => this.toast.error('Failed to load global link options.')
    });
    this.api.getFunctionLinks().subscribe({
      next: res => this.functionLinks = res.data || [],
      error: () => this.toast.error('Failed to load function link options.')
    });
  }

  loadLinks(): void {
    const globalId = this.filters.globalLinkId ? Number(this.filters.globalLinkId) : undefined;
    const functionId = this.filters.functionLinkId ? Number(this.filters.functionLinkId) : undefined;
    this.api.getPrimaryLinks(globalId, functionId).subscribe({
      next: res => this.links = res.data || [],
      error: () => this.toast.error('Failed to load primary links.')
    });
  }

  openForm(link?: PrimaryLink): void {
    this.editingLink = link ?? null;
    this.routePathError = '';
    this.linkForm.reset({
      globalLinkId: link?.globalLinkId?.toString() ?? '',
      functionLinkId: link?.functionLinkId?.toString() ?? '',
      displayName: link?.displayName ?? '',
      isActive: link?.active ?? true
    });
    if (this.tabGroup) {
      this.tabGroup.selectedIndex = 1; // Switch to Add/Edit tab
    }
  }

  cancelEdit(): void {
    this.editingLink = null;
    this.routePathError = '';
    this.linkForm.reset({ isActive: true });
    if (this.tabGroup) {
      this.tabGroup.selectedIndex = 0; // Switch to View tab
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
      globalLinkId: Number(this.linkForm.value.globalLinkId),
      functionLinkId: Number(this.linkForm.value.functionLinkId),
      displayName: (this.linkForm.value.displayName ?? '').trim(),
      isActive: (this.linkForm.value.isActive ?? false)
    };
    const request = this.editingLink
      ? this.api.updatePrimaryLink(this.editingLink.id, payload)
      : this.api.createPrimaryLink(payload);

    request.subscribe({
      next: () => {
        this.toast.success('Primary link saved.');
        this.editingLink = null;
        this.loadLinks();
        this.refreshMenu();
        this.saving = false;
        this.cancelEdit();
      },
      error: err => {
        this.saving = false;
        if (err.status === 409) {
          this.routePathError = err.error?.message || 'A primary link with this route already exists.';
        } else {
          this.toast.error(err.error?.message || 'Failed to save primary link.');
        }
      }
    });
  }

  confirmDeactivate(link: PrimaryLink): void {
    if (!link.active) return;
    this.deletingLink = link;
    this.confirmMessage = `Deactivate primary link "${link.displayName}"?`;
    this.showConfirm = true;
  }

  cancelConfirm(): void {
    this.showConfirm = false;
    this.deletingLink = null;
  }

  deactivateLink(): void {
    if (!this.deletingLink) return;
    this.api.deletePrimaryLink(this.deletingLink.id).subscribe({
      next: () => {
        this.toast.success('Primary link deactivated.');
        this.showConfirm = false;
        this.deletingLink = null;
        this.loadLinks();
        this.refreshMenu();
      },
      error: () => {
        this.toast.error('Failed to deactivate primary link.');
        this.showConfirm = false;
      }
    });
  }

  getGlobalDisplay(id: number): string {
    return this.globalLinks.find(link => link.id === id)?.displayName || '-';
  }

  getFunctionDisplay(id: number): string {
    return this.functionLinks.find(link => link.id === id)?.displayName || '-';
  }

  moveOrder(index: number, delta: number): void {
    if (!this.filters.globalLinkId || !this.filters.functionLinkId) {
      this.toast.info('Select both Global and Function filters before reordering primary links.');
      return;
    }
    const nextIndex = index + delta;
    if (nextIndex < 0 || nextIndex >= this.links.length) return;
    const reordered = [...this.links];
    const [item] = reordered.splice(index, 1);
    reordered.splice(nextIndex, 0, item);
    const payload: ReorderItem[] = reordered.map((link, idx) => ({ id: link.id, orderIndex: idx + 1 }));
    this.api.reorderPrimaryLinks(payload).subscribe({
      next: () => {
        this.loadLinks();
        this.refreshMenu();
      },
      error: err => this.toast.error(err.error?.message || 'Failed to update order.')
    });
  }

  private refreshMenu(): void {
    this.menuService.refreshMenu(true).subscribe({ next: () => {} });
  }
}
