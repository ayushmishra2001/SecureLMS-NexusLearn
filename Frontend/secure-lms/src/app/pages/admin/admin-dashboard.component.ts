import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpParams } from '@angular/common/http';
import { DashboardLayoutComponent } from '../../shared/dashboard-layout/dashboard-layout.component';
import { ModalComponent } from '../../shared/modal/modal.component';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { ExportButtonGroupComponent } from '../../shared/export-button-group/export-button-group.component';
import { ApiService, AdminUserFilters, AuditLogFilters } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/services/auth.service';
import { ExportService } from '../../core/services/export.service';
import { GroupService } from '../../core/services/group.service';
import { User, Course, CourseModule, Enrollment, ExportColumn, ExportScope, NavItem, RoleMaster, GroupMaster } from '../../core/models';
import { sectionAnim, listStagger, cardPop } from '../../shared/animations';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ADMIN_NAV_GROUPS, ADMIN_SECTION_LABELS, ADMIN_SECTION_ROUTES, APP_ROUTES, sectionFromRoutePath } from '../../core/navigation/app-routes';

// Add this interface Ã¢â‚¬â€ describes exactly what the backend returns
export interface AuditLogEntry {
  id: number;
  userId: number | null;
  fullName: string | null;
  username: string | null;
  email: string | null;
  role: string | null;
  eventType: string;
  outcome: string;
  ipAddress: string | null;
  browser: string | null;
  contextInfo: string | null;
  details: string | null;
  createdAt: string;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule,
    DashboardLayoutComponent, ModalComponent, ConfirmDialogComponent, ExportButtonGroupComponent],
  animations: [sectionAnim, listStagger, cardPop],
  template: `
    <app-dashboard-layout
      [navGroups]="navGroups"
      [activeSection]="activeSection"
      [pageTitle]="pageTitle"
      roleLabel="Administrator"
      (sectionChange)="onSectionChange($event)">

      <!-- Dashboard -->
      @if (activeSection === 'dashboard') {
        <div [@sectionAnim]>
          <div class="stats-grid">
            @for (s of stats; track s.label; let i = $index) {
              <div class="stat-card" [@cardPop]>
                <span class="stat-icon">{{ s.icon }}</span>
                <div class="stat-value">{{ s.value }}</div>
                <div class="stat-label">{{ s.label }}</div>
              </div>
            }
          </div>
          <!-- <div class="card management-card">
            <div class="card-header"><span class="card-title">Navigation administration</span></div>
            <div class="card-body card-actions">
              <button class="btn btn-primary btn-sm" [routerLink]="routes.admin.globalLinks">Global Links</button>
              <button class="btn btn-primary btn-sm" [routerLink]="routes.admin.functionLinks">Function Links</button>
              <button class="btn btn-primary btn-sm" [routerLink]="routes.admin.primaryLinks">Primary Links</button>
              <button class="btn btn-primary btn-sm" [routerLink]="routes.admin.roleMaster">Role Master</button>
              <button class="btn btn-primary btn-sm" [routerLink]="routes.admin.permissions">User Permissions</button>
            </div>
          </div> -->
          <div class="card">
            <div class="card-header"><span class="card-title">Recent Users</span></div>
            <div class="card-body table-wrap">
              <table>
                <thead><tr><th>Username</th><th>Email</th><th>Role</th><th>Joined</th></tr></thead>
                <tbody [@listStagger]="recentUsers.length">
                  @for (u of recentUsers; track u.id) {
                    <tr>
                      <td><strong>{{ u.username }}</strong></td>
                      <td>{{ u.email }}</td>
                      <td><span class="badge badge-{{ u.role.toLowerCase() }}">{{ u.role }}</span></td>
                      <td>{{ formatDate(u.createdAt) }}</td>
                    </tr>
                  }
                  @empty { <tr><td colspan="4"><div class="empty-state"><span class="empty-icon">groups</span><p>No users yet</p></div></td></tr> }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      }

      <!-- Users -->
      @if (activeSection === 'users') {
        <div [@sectionAnim]>
          <div class="card">
            <div class="card-header">
              <span class="card-title">All Users</span>
              <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                <button class="btn btn-primary btn-sm" (click)="openUserModal()">+ Add User</button>
                <app-export-button-group
                  [excelLoading]="excelLoading"
                  [pdfLoading]="pdfLoading"
                  (exportExcel)="onExportUsersExcel($event)"
                  (exportPdf)="onExportUsersPdf($event)"
                />
              </div>
            </div>
            <div class="card-body">
              <div class="filter-bar">
                <input
                  class="form-control"
                  type="text"
                  placeholder="Search by username, email, first or last name"
                  [(ngModel)]="userFilters.q"
                  (keyup.enter)="applyUserFilters()" />
                <select class="form-control" [(ngModel)]="userFilters.role" (ngModelChange)="applyUserFilters()">
                  <option value="">All Roles</option>
                  @for (role of roleOptions; track role.code) {
                    <option [value]="role.code">{{ role.displayName }}</option>
                  }
                </select>
                <select class="form-control" [(ngModel)]="userFilters.active" (ngModelChange)="applyUserFilters()">
                  <option value="">All Status</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
                <select class="form-control" [(ngModel)]="userFilters.locked" (ngModelChange)="applyUserFilters()">
                  <option value="">All Lock States</option>
                  <option value="true">Locked</option>
                  <option value="false">Unlocked</option>
                </select>
                <button class="btn btn-sm btn-primary" (click)="applyUserFilters()">Apply</button>
                <button class="btn btn-sm btn-outline" (click)="resetUserFilters()">Reset</button>
              </div>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>#</th><th>Username</th><th>Email</th><th>Role</th>
                      <th>Status</th><th>Joined</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody [@listStagger]="pagedUsers.length">
                    @for (u of pagedUsers; track u.id; let i = $index) {
                      <tr>
                        <td>{{ (userPage - 1) * userPageSize + i + 1 }}</td>
                        <td><strong>{{ u.username }}</strong></td>
                        <td>{{ u.email }}</td>
                        <td><span class="badge badge-{{ u.role.toLowerCase() }}">{{ u.role }}</span></td>
                        <td>
                          <span class="badge" [class]="u.active ? 'badge-active' : 'badge-inactive'">
                            {{ u.active ? 'Active' : 'Inactive' }}
                          </span>
                        </td>
                        <td>{{ formatDate(u.createdAt) }}</td>
                        <td>
                          <div class="action-btns">
                            <button class="btn btn-secondary btn-sm btn-icon" (click)="openUserModal(u)" title="Edit">edit</button>
                            <button class="btn btn-secondary btn-sm btn-icon"
                                    (click)="toggleLock(u)"
                                    [title]="isSelfUser(u) ? 'You cannot lock/unlock your own account' : (u.accountNonLocked ? 'Lock' : 'Unlock')"
                                    [disabled]="isSelfUser(u)">
                              {{ u.accountNonLocked ? 'lock' : 'lock_open' }}
                            </button>
                            <button class="btn btn-secondary btn-sm btn-icon"
                                    (click)="toggleActive(u)"
                                    [title]="isSelfUser(u) ? 'You cannot activate/deactivate your own account' : (u.active ? 'Deactivate' : 'Activate')"
                                    [disabled]="isSelfUser(u)">
                              {{ u.active ? 'toggle_off' : 'toggle_on' }}
                            </button>
                            <button class="btn btn-danger btn-sm btn-icon"
                                    (click)="confirmDeleteUser(u)"
                                    [title]="isSelfUser(u) ? 'You cannot delete your own account' : 'Delete'"
                                    [disabled]="isSelfUser(u)">delete</button>
                          </div>
                        </td>
                      </tr>
                    }
                    @empty { <tr><td colspan="7"><div class="empty-state"><span class="empty-icon">groups</span><p>No users found</p></div></td></tr> }
                  </tbody>
                </table>
              </div>

              @if (allUsers.length > 0) {
                <div class="pagination-wrap">
                  <span class="pagination-info">
                    Showing {{ paginationStart }}-{{ paginationEnd }} of {{ allUsers.length }}
                  </span>
                  <div class="pagination-btns">
                    <button class="page-btn" [disabled]="userPage === 1" (click)="prevUserPage()">&lt;</button>
                    @for (p of userPageNumbers; track $index) {
                      @if (p === '...') {
                        <span class="page-ellipsis">...</span>
                      } @else {
                        <button class="page-btn" [class.active]="p === userPage" (click)="setUserPage(+p)">{{ p }}</button>
                      }
                    }
                    <button class="page-btn" [disabled]="userPage === totalUserPages" (click)="nextUserPage()">&gt;</button>
                  </div>
                  <div class="page-size-wrap">
                    <label>Rows:</label>
                    <select class="form-control" [ngModel]="userPageSize" (ngModelChange)="onUserPageSizeChange($event)">
                      <option [ngValue]="5">5</option>
                      <option [ngValue]="10">10</option>
                      <option [ngValue]="20">20</option>
                      <option [ngValue]="50">50</option>
                    </select>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- Courses -->
      @if (activeSection === 'courses') {
        <div [@sectionAnim]>
          <div class="card">
            <div class="card-header">
              <span class="card-title">All Courses</span>
              <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                <button class="btn btn-primary btn-sm" (click)="openCourseModal()">+ New Course</button>
                <app-export-button-group
                  [excelLoading]="excelLoading"
                  [pdfLoading]="pdfLoading"
                  (exportExcel)="onExportCoursesExcel($event)"
                  (exportPdf)="onExportCoursesPdf($event)"
                />
              </div>
            </div>
            <div class="card-body table-wrap">
              <table>
                <thead><tr><th>#</th><th>Title</th><th>Category</th><th>Difficulty</th><th>By</th><th>Status</th><th>Modules</th><th>Actions</th></tr></thead>
                <tbody [@listStagger]="allCourses.length">
                  @for (c of allCourses; track c.id; let i = $index) {
                    <tr>
                      <td>{{ i+1 }}</td>
                      <td><strong>{{ c.title }}</strong></td>
                      <td>{{ c.category || '-' }}</td>
                      <td>{{ c.difficultyLevel || '-' }}</td>
                      <td>{{ c.createdByUsername }}</td>
                      <td><span class="badge" [class]="c.published ? 'badge-published' : 'badge-draft'">{{ c.published ? 'Published' : 'Draft' }}</span></td>
                      <td>{{ c.moduleCount }}</td>
                      <td>
                        <div class="action-btns">
                          <button class="btn btn-secondary btn-sm btn-icon" (click)="openCourseModal(c)">edit</button>
                          <button class="btn btn-danger btn-sm btn-icon" (click)="confirmDeleteCourse(c)">delete</button>
                        </div>
                      </td>
                    </tr>
                  }
                  @empty { <tr><td colspan="8"><div class="empty-state"><span class="empty-icon">menu_book</span><p>No courses found</p></div></td></tr> }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      }

      <!-- Modules -->
      @if (activeSection === 'modules') {
        <div [@sectionAnim]>
          <div class="card">
            <div class="card-header">
              <span class="card-title">Course Modules</span>
              <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                <button class="btn btn-primary btn-sm" (click)="openModuleModal()">+ New Module</button>
                <app-export-button-group
                  [excelLoading]="excelLoading"
                  [pdfLoading]="pdfLoading"
                  [showExportAll]="true"
                  (exportExcel)="onExportModulesExcel($event)"
                  (exportPdf)="onExportModulesPdf($event)"
                />
              </div>
            </div>
            <div class="card-body">
              <div class="form-group" style="max-width:300px; margin-bottom:16px">
                <label>Filter by Course</label>
                <select class="form-control" [(ngModel)]="selectedCourseId" (ngModelChange)="loadModulesForCourse($event)">
                  <option value="">All Courses</option>
                  @for (c of allCourses; track c.id) {
                    <option [value]="c.id">{{ c.title }}</option>
                  }
                </select>
              </div>
              <div class="table-wrap">
                <table>
                  <thead><tr><th>#</th><th>Title</th><th>Course</th><th>Type</th><th>Order</th><th>Duration</th><th>Actions</th></tr></thead>
                  <tbody [@listStagger]="allModules.length">
                    @for (m of allModules; track m.id; let i = $index) {
                      <tr>
                        <td>{{ i+1 }}</td>
                        <td><strong>{{ m.title }}</strong></td>
                        <td>{{ m.courseTitle || '-' }}</td>
                        <td>{{ m.moduleType || '-' }}</td>
                        <td>{{ m.orderIndex ?? '-' }}</td>
                        <td>{{ m.durationMinutes ? m.durationMinutes + ' min' : '-' }}</td>
                        <td>
                          <div class="action-btns">
                            <button class="btn btn-secondary btn-sm btn-icon" (click)="openModuleModal(m)">edit</button>
                            <button class="btn btn-danger btn-sm btn-icon" (click)="confirmDeleteModule(m)">delete</button>
                          </div>
                        </td>
                      </tr>
                    }
                    @empty { <tr><td colspan="7"><div class="empty-state"><span class="empty-icon">description</span><p>No modules found</p></div></td></tr> }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Enrollments -->
      @if (activeSection === 'enrollments') {
        <div [@sectionAnim]>
          <div class="card">
            <div class="card-header">
              <span class="card-title">Course Enrollments</span>
              <app-export-button-group
                [excelLoading]="excelLoading"
                [pdfLoading]="pdfLoading"
                [showExportAll]="false"
                (exportExcel)="onExportEnrollmentsExcel($event)"
                (exportPdf)="onExportEnrollmentsPdf($event)"
              />
            </div>
            <div class="card-body">
              <div class="form-group" style="max-width:320px; margin-bottom:16px">
                <label>Select Course</label>
                <select class="form-control" [(ngModel)]="enrollmentCourseId" (ngModelChange)="loadEnrollments($event)">
                  <option value="">- Select a course -</option>
                  @for (c of allCourses; track c.id) {
                    <option [value]="c.id">{{ c.title }}</option>
                  }
                </select>
              </div>
              <div class="table-wrap">
                <table>
                  <thead><tr><th>#</th><th>Student</th><th>Enrolled</th><th>Progress</th><th>Modules</th><th>Status</th></tr></thead>
                  <tbody [@listStagger]="enrollments.length">
                    @for (e of enrollments; track e.id; let i = $index) {
                      <tr>
                        <td>{{ i+1 }}</td>
                        <td><strong>{{ e.studentUsername }}</strong></td>
                        <td>{{ formatDate(e.enrolledAt) }}</td>
                        <td>
                          <div class="progress-row">
                            <div class="progress-wrap" style="flex:1"><div class="progress-fill" [style.width]="(e.progressPercent||0)+'%'"></div></div>
                            <span style="font-size:12px;font-weight:600;min-width:36px">{{ e.progressPercent || 0 }}%</span>
                          </div>
                        </td>
                        <td><span class="badge badge-published">{{ e.completedModuleCount||0 }}/{{ e.totalModuleCount||0 }}</span></td>
                        <td><span class="badge" [class]="e.completedAt ? 'badge-active' : 'badge-draft'">{{ e.completedAt ? 'Completed' : 'In Progress' }}</span></td>
                      </tr>
                    }
                    @empty { <tr><td colspan="6"><div class="empty-state"><span class="empty-icon">bar_chart</span><p>{{ enrollmentCourseId ? 'No enrollments' : 'Select a course to view enrollments' }}</p></div></td></tr> }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      }
      <!-- Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Audit Logs Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ -->
      @if (activeSection === 'audit-logs') {
        <div [@sectionAnim]>
          <div class="card">
            <div class="card-header">
              <span class="card-title">User Audit Logs</span>
              <app-export-button-group
                [excelLoading]="excelLoading"
                [pdfLoading]="pdfLoading"
                (exportExcel)="onExportAuditExcel($event)"
                (exportPdf)="onExportAuditPdf($event)"
              />
              @if (auditTotalElements > 0) {
                <span class="badge badge-published" style="margin-left:8px">
                  {{ auditTotalElements }} total
                </span>
              }
            </div>
            <div class="card-body">

              <!-- Tab switcher Ã¢â‚¬â€ matches your existing button style -->
              <div style="display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap">
                <button
                  class="btn btn-sm"
                  [class.btn-primary]="auditTab === 'registrations'"
                  [class.btn-outline]="auditTab !== 'registrations'"
                  (click)="switchAuditTab('registrations')">
                  Registrations
                </button>
                <button
                  class="btn btn-sm"
                  [class.btn-primary]="auditTab === 'logins'"
                  [class.btn-outline]="auditTab !== 'logins'"
                  (click)="switchAuditTab('logins')">
                  Login Activity
                </button>
                <button
                  class="btn btn-sm"
                  [class.btn-primary]="auditTab === 'all'"
                  [class.btn-outline]="auditTab !== 'all'"
                  (click)="switchAuditTab('all')">
                  All Events
                </button>
              </div>

              <div class="filter-bar filter-bar-audit">
                <input
                  class="form-control"
                  type="text"
                  placeholder="Search user, email, event, IP, context"
                  [(ngModel)]="auditFilters.q"
                  (keyup.enter)="applyAuditFilters()" />
                <select class="form-control" [(ngModel)]="auditFilters.outcome" (ngModelChange)="applyAuditFilters()">
                  <option value="">All Outcomes</option>
                  <option value="SUCCESS">Success</option>
                  <option value="FAILURE">Failure</option>
                </select>
                <select class="form-control" [(ngModel)]="auditFilters.role" (ngModelChange)="applyAuditFilters()">
                  <option value="">All Roles</option>
                  @for (role of roleOptions; track role.code) {
                    <option [value]="role.code">{{ role.displayName }}</option>
                  }
                </select>
                <select class="form-control" [(ngModel)]="auditFilters.eventType" (ngModelChange)="applyAuditFilters()">
                  <option value="">All Events</option>
                  @for (eventType of auditEventTypes; track eventType) {
                    <option [value]="eventType">{{ auditEventLabel(eventType) }}</option>
                  }
                </select>
                <input class="form-control" type="date" [(ngModel)]="auditFilters.fromDate" (change)="applyAuditFilters()" />
                <input class="form-control" type="date" [(ngModel)]="auditFilters.toDate" (change)="applyAuditFilters()" />
                <button class="btn btn-sm btn-primary" (click)="applyAuditFilters()">Apply</button>
                <button class="btn btn-sm btn-outline" (click)="resetAuditFilters()">Reset</button>
              </div>

              <!-- Loading state -->
              @if (auditLoading) {
                <div class="empty-state"><span class="empty-icon">hourglass_top</span><p>Loading audit logs...</p></div>
              }

              <!-- Empty state -->
              @if (!auditLoading && auditLogs.length === 0) {
                <div class="empty-state"><span class="empty-icon">manage_search</span><p>No audit records found.</p></div>
              }

              <!-- Table -->
              @if (!auditLoading && auditLogs.length > 0) {
                <div class="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Full Name</th>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Event</th>
                        <th>Outcome</th>
                        <th>IP Address</th>
                        <th>Browser</th>
                        <th>Date &amp; Time</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody [@listStagger]="auditLogs.length">
                      @for (log of auditLogs; track log.id; let i = $index) {
                        <tr>
                          <td>{{ auditPage * auditPageSize + i + 1 }}</td>
                          <td><strong>{{ log.fullName || '-' }}</strong></td>
                            <td>
                              @if (log.username) {
                                {{ log.username }}
                              } @else if (log.contextInfo) {
                                <span style="color: #888; font-style: italic;" title="Attempted Identifier">
                                  {{ log.contextInfo }}
                                </span>
                              } @else {
                                -
                              }
                            </td>
                          <td style="font-size:12px">{{ log.email || '-' }}</td>
                          <td>
                            @if (log.role) {
                              <span class="badge"
                                [class.badge-admin]="log.role === 'ADMIN'"
                                [class.badge-trainer]="log.role === 'TRAINER'"
                                [class.badge-published]="log.role === 'STUDENT'">
                                {{ log.role }}
                              </span>
                            } @else { <span>-</span> }
                          </td>
                          <td>
                            <span class="badge badge-draft">
                              {{ auditEventLabel(log.eventType) }}
                            </span>
                          </td>
                          <td>
                            <span class="badge"
                              [class.badge-active]="log.outcome === 'SUCCESS'"
                              [class.badge-inactive]="log.outcome === 'FAILURE'">
                              {{ log.outcome }}
                            </span>
                          </td>
                          <td style="font-size:12px">{{ formatIp(log.ipAddress) }}</td>
                          <td>{{ log.browser || '-' }}</td>
                          <td style="font-size:12px; white-space:nowrap">
                            {{ formatDateTime(log.createdAt) }}
                          </td>
                          <td style="font-size:12px; max-width: 200px; white-space: normal; overflow-wrap: break-word;">
                            {{ log.details || '-' }}
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>

                <!-- Pagination Ã¢â‚¬â€ same pattern as user table -->
                <div class="pagination-row" style="display:flex; align-items:center; gap:8px; margin-top:12px; flex-wrap:wrap">
                  <button class="btn btn-sm btn-outline"
                    [disabled]="auditPage === 0"
                    (click)="auditPage = auditPage - 1; loadAuditLogs()">
                    &lt; Prev
                  </button>
                  <span style="font-size:13px">
                    Page {{ auditPage + 1 }} of {{ auditTotalPages }}
                  </span>
                  <button class="btn btn-sm btn-outline"
                    [disabled]="auditPage + 1 >= auditTotalPages"
                    (click)="auditPage = auditPage + 1; loadAuditLogs()">
                    Next &gt;
                  </button>
                  <div class="page-size-wrap" style="margin-left:auto">
                    <label>Rows:</label>
                    <select class="form-control" [ngModel]="auditPageSize" (ngModelChange)="onAuditPageSizeChange($event)">
                      <option [ngValue]="10">10</option>
                      <option [ngValue]="20">20</option>
                      <option [ngValue]="50">50</option>
                    </select>
                  </div>
                </div>
              }

            </div>
          </div>
        </div>
      }
      <!-- Groups -->
      @if (activeSection === 'groups') {
        <div [@sectionAnim]>
          <div class="card">
            <div class="card-header">
              <span class="card-title">Group Management</span>
              <button class="btn btn-primary btn-sm" (click)="openGroupModal()">+ Add Group</button>
            </div>
            <div class="card-body table-wrap">
              <table>
                <thead><tr><th>ID</th><th>Group Name</th><th>Description</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody [@listStagger]="groups.length">
                  @for (g of groups; track g.id) {
                    <tr>
                      <td>{{ g.id }}</td>
                      <td><strong>{{ g.groupName }}</strong></td>
                      <td>{{ g.description || '-' }}</td>
                      <td><span class="badge" [class.badge-active]="g.active" [class.badge-inactive]="!g.active">{{ g.active ? 'Active' : 'Inactive' }}</span></td>
                      <td class="actions-cell">
                        <button class="action-btn edit-btn" title="Edit" (click)="openGroupModal(g)"><span class="mi">edit</span></button>
                      </td>
                    </tr>
                  }
                  @empty { <tr><td colspan="5"><div class="empty-state"><span class="empty-icon">groups</span><p>No groups found</p></div></td></tr> }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      }
      <!-- Profile -->
      @if (activeSection === 'profile') {
        <div [@sectionAnim]>
          <a [routerLink]="routes.admin.profile" class="btn btn-primary" style="width:auto;margin-bottom:20px">
            Open Full Profile Page ->
          </a>
        </div>
      }
    </app-dashboard-layout>

    <!-- ── User Modal ──────────────────────────────────────────────────────── -->
    <app-modal [isOpen]="showUserModal" [title]="editingUser ? 'Edit User' : 'Add User'" (close)="showUserModal=false">
      <form [formGroup]="userForm" (ngSubmit)="saveUser()">
        <div class="form-group">
          <label>Role</label>
          <select class="form-control" formControlName="role">
            @for (role of assignableRoles; track role.code) {
              <option [value]="role.code">{{ role.displayName }}</option>
            }
          </select>
        </div>
        @if (auth.user()?.role === 'SUPER_ADMIN') {
          <div class="form-group">
            <label>Group</label>
            <select class="form-control" formControlName="groupId">
              <option [ngValue]="null">-- Default / Pending --</option>
              @for (grp of groups; track grp.id) {
                <option [value]="grp.id">{{ grp.groupName }}</option>
              }
            </select>
          </div>
        }
        <div class="two-col">
          <div class="form-group"><label>First Name</label><input type="text" class="form-control" formControlName="firstName" /></div>
          <div class="form-group"><label>Last Name</label><input type="text" class="form-control" formControlName="lastName" /></div>
        </div>
        <div class="form-group"><label>Username</label><input type="text" class="form-control" formControlName="username" /></div>
        <div class="form-group"><label>Email</label><input type="email" class="form-control" formControlName="email" /></div>
        <div class="two-col">
          <div class="form-group"><label>Contact Number</label><input type="tel" class="form-control" formControlName="contactNumber" maxlength="10" /></div>
          <div class="form-group"><label>Aadhar Number</label><input type="text" class="form-control" formControlName="aadharNumber" maxlength="12" /></div>
        </div>
        @if (!editingUser) {
          <div class="form-group"><label>Password</label><input type="password" class="form-control" formControlName="password" /></div>
          <div class="form-group"><label>Confirm Password</label><input type="password" class="form-control" formControlName="confirmPassword" /></div>
        }
        <div class="form-group">
          <label>Status</label>
          <select class="form-control" formControlName="active">
            <option [ngValue]="true">Active</option>
            <option [ngValue]="false">Inactive</option>
          </select>
        </div>
      </form>
      <div slot="footer">
        <button class="btn btn-secondary btn-sm" (click)="showUserModal=false">Cancel</button>
        <button class="btn btn-primary btn-sm" [disabled]="savingUser" (click)="saveUser()">
          @if (savingUser) { <span class="spinner"></span> } @else { Save }
        </button>
      </div>
    </app-modal>

    <!-- ── Group Modal ──────────────────────────────────────────────────────── -->
    <app-modal [isOpen]="showGroupModal" [title]="editingGroup ? 'Edit Group' : 'New Group'" (close)="showGroupModal=false">
      <form [formGroup]="groupForm" (ngSubmit)="saveGroup()">
        <div class="form-group"><label>Group Name *</label><input type="text" class="form-control" formControlName="groupName" placeholder="E.g., B.Tech CSE" /></div>
        <div class="form-group"><label>Description</label><textarea class="form-control" formControlName="description" rows="3"></textarea></div>
        <div class="form-group">
          <label>Status</label>
          <select class="form-control" formControlName="active">
            <option [ngValue]="true">Active</option>
            <option [ngValue]="false">Inactive</option>
          </select>
        </div>
      </form>
      <div slot="footer">
        <button class="btn btn-secondary btn-sm" (click)="showGroupModal=false">Cancel</button>
        <button class="btn btn-primary btn-sm" [disabled]="savingGroup || groupForm.invalid" (click)="saveGroup()">
          @if (savingGroup) { <span class="spinner"></span> } @else { Save }
        </button>
      </div>
    </app-modal>

    <!-- ── Course Modal ─────────────────────────────────────────────────────── -->
    <app-modal [isOpen]="showCourseModal" [title]="editingCourse ? 'Edit Course' : 'New Course'" (close)="showCourseModal=false">
      <form [formGroup]="courseForm" (ngSubmit)="saveCourse()">
        <div class="form-group"><label>Title *</label><input type="text" class="form-control" formControlName="title" placeholder="Course title" /></div>
        <div class="form-group"><label>Description</label><textarea class="form-control" formControlName="description" rows="3"></textarea></div>
        <div class="two-col">
          <div class="form-group"><label>Category</label><input type="text" class="form-control" formControlName="category" /></div>
          <div class="form-group"><label>Duration (hours)</label><input type="number" class="form-control" formControlName="durationHours" min="1" /></div>
        </div>
        <div class="form-group">
          <label>Difficulty</label>
          <select class="form-control" formControlName="difficultyLevel">
            <option value="">- Select -</option>
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
          </select>
        </div>
        <label class="checkbox-label"><input type="checkbox" formControlName="published" /><span>Publish immediately</span></label>
      </form>
      <div slot="footer">
        <button class="btn btn-secondary btn-sm" (click)="showCourseModal=false">Cancel</button>
        <button class="btn btn-primary btn-sm" [disabled]="savingCourse" (click)="saveCourse()">
          @if (savingCourse) { <span class="spinner"></span> } @else { Save Course }
        </button>
      </div>
    </app-modal>
    <app-modal [isOpen]="showModuleModal" [title]="editingModule ? 'Edit Module' : 'New Module'" (close)="showModuleModal=false">
      <form [formGroup]="moduleForm" (ngSubmit)="saveModule()">
        <div class="form-group">
          <label>Course *</label>
          <select class="form-control" formControlName="courseId">
            <option value="">- Select Course -</option>
            @for (c of allCourses; track c.id) { <option [value]="c.id">{{ c.title }}</option> }
          </select>
        </div>
        <div class="form-group"><label>Title *</label><input type="text" class="form-control" formControlName="title" /></div>
        <div class="form-group"><label>Content *</label><textarea class="form-control" formControlName="content" rows="4"></textarea></div>
        <div class="form-group">
          <label>Type</label>
          <select class="form-control" formControlName="moduleType">
            <option value="READING">Reading</option><option value="VIDEO">Video</option>
            <option value="QUIZ">Quiz</option><option value="ASSIGNMENT">Assignment</option>
          </select>
        </div>
        <div class="form-group"><label>Resource URL</label><input type="url" class="form-control" formControlName="resourceUrl" /></div>
        <div class="two-col">
          <div class="form-group"><label>Order</label><input type="number" class="form-control" formControlName="orderIndex" min="1" /></div>
          <div class="form-group"><label>Duration (min)</label><input type="number" class="form-control" formControlName="durationMinutes" min="1" /></div>
        </div>
      </form>
      <div slot="footer">
        <button class="btn btn-secondary btn-sm" (click)="showModuleModal=false">Cancel</button>
        <button class="btn btn-primary btn-sm" [disabled]="savingModule" (click)="saveModule()">
          @if (savingModule) { <span class="spinner"></span> } @else { Save Module }
        </button>
      </div>
    </app-modal>
    <!-- Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Confirm Delete Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ -->
    <app-confirm-dialog
      [isOpen]="showConfirm"
      [message]="confirmMessage"
      (confirm)="executeDelete()"
      (cancel)="showConfirm=false" />

    <app-confirm-dialog
      [isOpen]="showUserDeleteConfirm"
      [message]="userDeleteConfirmMessage"
      confirmLabel="Delete User"
      (confirm)="deleteSelectedUser()"
      (cancel)="cancelUserDelete()" />
  `,
  styles: [`
    .action-btns { display: flex; gap: 6px; }
    .progress-row { display: flex; align-items: center; gap: 8px; min-width: 120px; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .checkbox-label { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 500; cursor: pointer; input { width: auto; } }
    .page-ellipsis { display: inline-flex; align-items: center; justify-content: center; min-width: 34px; height: 34px; font-size: 14px; color: var(--text-muted); pointer-events: none; }
    .filter-bar {
      display: grid;
      grid-template-columns: minmax(220px, 2fr) repeat(3, minmax(140px, 1fr)) auto auto;
      gap: 10px;
      margin-bottom: 14px;
      align-items: center;
    }
    .filter-bar-audit {
      grid-template-columns: minmax(220px, 2fr) repeat(5, minmax(120px, 1fr)) auto auto;
      margin-top: 2px;
    }
    @media (max-width: 1100px) {
      .filter-bar, .filter-bar-audit { grid-template-columns: 1fr 1fr; }
    }
    @media (max-width: 700px) {
      .filter-bar, .filter-bar-audit { grid-template-columns: 1fr; }
    }

  `]
})
export class AdminDashboardComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  auth = inject(AuthService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private exportSvc = inject(ExportService);
  private groupService = inject(GroupService);
  readonly routes = APP_ROUTES;

  activeSection = 'dashboard';
  get pageTitle(): string {
    const items = this.navGroups.flatMap(g => g.items.flatMap(i => [i, ...(i.children ?? [])]));
    return items.find(i => i.section === this.activeSection)?.label ?? ADMIN_SECTION_LABELS[this.activeSection] ?? 'Dashboard';
  }

  navGroups: { label: string; items: NavItem[] }[] = ADMIN_NAV_GROUPS;

  stats = [
    { icon: 'groups', label: 'Total Users', value: '-' },
    { icon: 'menu_book', label: 'Total Courses', value: '-' },
    { icon: 'school', label: 'Students', value: '-' },
    { icon: 'co_present', label: 'Trainers', value: '-' }
  ];
  recentUsers: User[] = [];
  roleOptions: RoleMaster[] = [];
  assignableRoles: RoleMaster[] = [];
  groups: GroupMaster[] = [];

  // Ã¢â€â‚¬Ã¢â€â‚¬ Users & Pagination Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  allUsers: User[] = [];
  userPage = 1;
  userPageSize = 10;
  userFilters: AdminUserFilters = { q: '', role: '', active: '', locked: '' };

  get pagedUsers(): User[] {
    const size = Number(this.userPageSize);
    const start = (this.userPage - 1) * size;
    return this.allUsers.slice(start, start + size);
  }
  get totalUserPages(): number { return Math.ceil(this.allUsers.length / Number(this.userPageSize)) || 1; }
  get paginationStart(): number { return this.allUsers.length === 0 ? 0 : (this.userPage - 1) * Number(this.userPageSize) + 1; }
  get paginationEnd(): number { return Math.min(this.userPage * Number(this.userPageSize), this.allUsers.length); }

  get userPageNumbers(): (number | '...')[] {
    const total = this.totalUserPages, cur = this.userPage;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | '...')[] = [1];
    if (cur > 3) pages.push('...');
    for (let p = Math.max(2, cur - 1); p <= Math.min(total - 1, cur + 1); p++) pages.push(p);
    if (cur < total - 2) pages.push('...');
    pages.push(total);
    return pages;
  }

  prevUserPage(): void { if (this.userPage > 1) this.userPage--; }
  nextUserPage(): void { if (this.userPage < this.totalUserPages) this.userPage++; }
  setUserPage(p: number): void { if (p >= 1 && p <= this.totalUserPages) this.userPage = p; }
  onUserPageSizeChange(val: string | number): void { this.userPageSize = Number(val); this.userPage = 1; }


  // â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”
  // â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”
  allCourses: Course[] = [];
  allModules: CourseModule[] = [];
  selectedCourseId: any = '';

  // â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”
  enrollments: Enrollment[] = [];
  enrollmentCourseId: any = '';
  // â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”â€”
auditTab: 'registrations' | 'logins' | 'all' = 'registrations';
auditLogs: AuditLogEntry[] = [];
auditPage = 0;
auditTotalPages = 0;
auditTotalElements = 0;
auditLoading = false;
auditPageSize = 20;
auditFilters: AuditLogFilters = {
  q: '',
  outcome: '',
  role: '',
  eventType: '',
  fromDate: '',
  toDate: ''
};
auditEventTypes: string[] = [
  'USER_REGISTERED',
  'LOGIN_SUCCESS',
  'LOGIN_FAILED',
  'LOGOUT',
  'SESSION_TIMEOUT',
  'ACCOUNT_LOCKED_TEMPORARY',
  'ACCOUNT_LOCKED_ADMIN_REQUIRED',
  'ACCOUNT_UNLOCKED_ADMIN',
  'ACCOUNT_LOCKED_BY_ADMIN',
  'PASSWORD_RESET_REQUESTED',
  'PASSWORD_RESET_COMPLETED',
  'PASSWORD_CHANGED',
  'USER_LOCK_TOGGLED_BY_ADMIN',
  'USER_ACTIVE_TOGGLED_BY_ADMIN'
];
  // ——————————————————————————————————————————————————————————————————————————————————
  showUserModal = false;
  showCourseModal = false;
  showModuleModal = false;
  showUserDeleteConfirm = false;
  showConfirm = false;
  confirmMessage = '';
  private deleteAction?: () => void;
  userToDelete: User | null = null;
  deletingUser = false;

  editingUser: User | null = null;
  editingCourse: Course | null = null;
  editingModule: CourseModule | null = null;
  editingGroup: GroupMaster | null = null;
  showGroupModal = false;
  savingGroup = false;

  savingUser = false;
  savingCourse = false;
  savingModule = false;
  excelLoading = false;
  pdfLoading = false;

  // ——————————————————————————————————————————————————————————————————————————————————
  // ——————————————————————————————————————————————————————————————————————————————————
  userForm = this.fb.group({
    groupId: [null as number | null],
    role: ['STUDENT', Validators.required],
    firstName: ['', [Validators.required, Validators.maxLength(50)]],
    lastName: ['', [Validators.required, Validators.maxLength(50)]],
    contactNumber: ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]],
    aadharNumber: ['', [Validators.required, Validators.pattern(/^\d{12}$/)]],
    username: ['', [Validators.required, Validators.minLength(3), Validators.pattern(/^[a-zA-Z0-9_]+$/)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.minLength(8), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#]).+$/)]],
    confirmPassword: [''],
    active: [true]
  });

  courseForm = this.fb.group({
    title: ['', Validators.required], description: [''], category: [''],
    difficultyLevel: [''], durationHours: [null as number | null], published: [false]
  });

  moduleForm = this.fb.group({
    courseId: ['', Validators.required], title: ['', Validators.required],
    content: ['', Validators.required], moduleType: ['READING'],
    resourceUrl: [''], orderIndex: [null as number | null], durationMinutes: [null as number | null]
  });

  groupForm = this.fb.group({
    groupName: ['', Validators.required],
    description: [''],
    active: [true]
  });

  // ——————————————————————————————————————————————————————————————————————————————————

  private readonly USER_COLS: ExportColumn[] = [
    { header: 'Username',   field: 'username' },
    { header: 'First Name', field: 'firstName' },
    { header: 'Last Name',  field: 'lastName' },
    { header: 'Email',      field: 'email' },
    { header: 'Role',       field: 'role' },
    { header: 'Active',     field: 'active',            format: 'boolean' },
    { header: 'Locked',     field: 'accountNonLocked',  format: 'yesno_inv' },
    { header: 'Created At', field: 'createdAt',         format: 'date' },
  ];

  private readonly COURSE_COLS: ExportColumn[] = [
    { header: 'Title',       field: 'title' },
    { header: 'Category',    field: 'category' },
    { header: 'Difficulty',  field: 'difficultyLevel' },
    { header: 'Trainer',     field: 'createdByUsername' },
    { header: 'Status',      field: 'published',   format: 'boolean' },
    { header: 'Modules',     field: 'moduleCount' },
    { header: 'Enrollments', field: 'enrollmentCount' },
    { header: 'Created At',  field: 'createdAt',   format: 'date' },
  ];

  private readonly MODULE_COLS: ExportColumn[] = [
    { header: 'Title',         field: 'title' },
    { header: 'Course',        field: 'courseTitle' },
    { header: 'Type',          field: 'moduleType' },
    { header: 'Order',         field: 'orderIndex' },
    { header: 'Duration (min)',field: 'durationMinutes' },
    { header: 'Created At',    field: 'createdAt',  format: 'date' },
  ];

  private readonly ENROLLMENT_COLS: ExportColumn[] = [
    { header: 'Student',         field: 'studentUsername' },
    { header: 'Progress (%)',    field: 'progressPercent', format: 'percent' },
    { header: 'Modules Done',    field: 'completedModuleCount' },
    { header: 'Total Modules',   field: 'totalModuleCount' },
    { header: 'Status',          field: 'completedAt' },
    { header: 'Enrolled At',     field: 'enrolledAt',     format: 'datetime' },
    { header: 'Completed At',    field: 'completedAt',    format: 'datetime' },
  ];

  private readonly AUDIT_COLS: ExportColumn[] = [
    { header: 'Full Name',  field: 'fullName' },
    { header: 'Username',   field: 'username' },
    { header: 'Email',      field: 'email' },
    { header: 'Role',       field: 'role' },
    { header: 'Event',      field: 'eventType' },
    { header: 'Outcome',    field: 'outcome' },
    { header: 'IP Address', field: 'ipAddress' },
    { header: 'Browser',    field: 'browser' },
    { header: 'Date & Time',field: 'createdAt',  format: 'datetime' },
    { header: 'Details',    field: 'details' },
  ];

  ngOnInit(): void {
    this.route.url.subscribe(() => {
      this.activateSection(sectionFromRoutePath(this.router.url, ADMIN_SECTION_ROUTES));
    });
    this.route.queryParams.subscribe(params => {
      const legacySection = this.getRequestedSection(params['section']);
      if (params['section'] && legacySection !== this.activeSection) this.activateSection(legacySection);
    });
    this.loadRoles();
    this.loadDashboard();
    if (this.auth.user()?.role === 'SUPER_ADMIN') {
      this.loadGroups();
    }
  }

  loadUsers(): void {
    this.api.getAdminUsers(this.userFilters).subscribe({
      next: res => this.allUsers = res.data || [],
      error: () => this.toast.error('Failed to load users')
    });
  }

  applyUserFilters(): void {
    this.userPage = 1;
    this.loadUsers();
  }
  loadGroups(): void {
    this.groupService.getAllGroups().subscribe({
      next: res => this.groups = res,
      error: () => this.toast.error('Failed to load groups')
    });
  }

  onGroupChange(): void {
    this.loadRoles();
  }

  private getRequestedSection(section: any): string {
    const validSections = ['dashboard', 'users', 'courses', 'modules', 'enrollments', 'audit-logs', 'profile', 'groups'];
    return validSections.includes(section) ? section : 'dashboard';
  }

  onSectionChange(section: string): void {
    const routePath = ADMIN_SECTION_ROUTES[section];
    if (routePath) {
      this.router.navigate([routePath]);
      return;
    }
    this.activateSection(section);
  }

  private activateSection(section: string): void {
    this.activeSection = this.getRequestedSection(section);
    if (this.activeSection === 'users') this.loadUsers();
    else if (this.activeSection === 'courses') this.loadCourses();
    else if (this.activeSection === 'audit-logs') this.loadAuditLogs();
    else if (this.activeSection === 'modules') { this.selectedCourseId = ''; this.loadCourses(() => this.loadModulesForCourse('')); }
    else if (this.activeSection === 'enrollments') this.loadCourses();
  }

  loadDashboard(): void {
    this.api.getAdminUsers().subscribe({
      next: res => {
        const users = res.data || [];
        this.stats[0].value = String(users.length);
        this.stats[2].value = String(users.filter(u => u.role === 'STUDENT').length);
        this.stats[3].value = String(users.filter(u => u.role === 'TRAINER').length);
        this.recentUsers = users.slice(-5).reverse();
      },
      error: () => {
        // Silently fail if user lacks permission to view users
      }
    });
    this.api.getAdminCourses().subscribe({
      next: res => {
        this.stats[1].value = String((res.data || []).length);
      },
      error: () => {
        // Silently fail if user lacks permission to view courses
      }
    });
  }

  loadRoles(): void {
    const groupId = this.userForm.controls.groupId.value || undefined;
    this.api.getRoles(true).subscribe({
      next: res => {
        this.roleOptions = (res.data || []).sort((a, b) => (a.sortOrder - b.sortOrder) || a.displayName.localeCompare(b.displayName));
        this.assignableRoles = this.roleOptions.filter(role => role.active && role.assignable);
        if (!this.assignableRoles.some(role => role.code === this.userForm.controls.role.value)) {
          this.userForm.controls.role.setValue(this.assignableRoles[0]?.code ?? 'STUDENT');
        }
      },
      error: () => this.toast.error('Failed to load roles')
    });
  }

  resetUserFilters(): void {
    this.userFilters = { q: '', role: '', active: '', locked: '' };
    this.applyUserFilters();
  }

  loadCourses(afterLoad?: () => void): void {
    this.api.getAdminCourses().subscribe({
      next: res => { this.allCourses = res.data || []; afterLoad?.(); },
      error: () => this.toast.error('Failed to load courses')
    });
  }

  loadModulesForCourse(courseId: any): void {
    if (!courseId) {
      if (!this.allCourses.length) { this.allModules = []; return; }
      const requests = this.allCourses.map(c => this.api.getAdminCourseModules(c.id));
      const { forkJoin } = require('rxjs');
      forkJoin(requests).subscribe({
        next: (responses: any[]) => { this.allModules = responses.flatMap((r: any) => r.data || []); },
        error: () => this.toast.error('Failed to load modules')
      });
      return;
    }
    this.api.getAdminCourseModules(Number(courseId)).subscribe({
      next: res => this.allModules = res.data || [],
      error: () => this.toast.error('Failed to load modules')
    });
  }

  loadEnrollments(courseId: any): void {
    if (!courseId) { this.enrollments = []; return; }
    this.api.getAdminCourseEnrollments(Number(courseId)).subscribe({
      next: res => this.enrollments = res.data || [],
      error: () => this.toast.error('Failed to load enrollments')
    });
  }

  // ── Users CRUD ─────────────────────────────────────────────────────────────────
  openUserModal(u?: User): void {
    this.editingUser = u ?? null;
    const defaultRole = this.assignableRoles.find(role => role.code === 'STUDENT')?.code
      ?? this.assignableRoles[0]?.code
      ?? 'STUDENT';
    this.userForm.reset({
      groupId: u?.groupId ?? null,
      role: u?.role ?? defaultRole, firstName: (u as any)?.firstName ?? '',
      lastName: (u as any)?.lastName ?? '', username: u?.username ?? '',
      email: u?.email ?? '', contactNumber: (u as any)?.contactNumber ?? '',
      aadharNumber: (u as any)?.aadharNumber ?? '',
      password: '', confirmPassword: '', active: u?.active ?? true
    });
    this.showUserModal = true;
  }

  saveUser(): void {
    this.userForm.markAllAsTouched();
    if (this.userForm.invalid) { this.toast.error('Please fix validation errors'); return; }

    const v = this.userForm.value;
    const isEditing = !!this.editingUser;

    if (!isEditing) {
      if (!v.password || !v.confirmPassword) { this.toast.error('Password is required for new users'); return; }
      if (v.password !== v.confirmPassword) { this.toast.error('Passwords do not match'); return; }
    }

    this.savingUser = true;
    const payload: any = {
      username: v.username?.trim(), email: v.email?.trim().toLowerCase(),
      firstName: v.firstName?.trim(), lastName: v.lastName?.trim(),
      contactNumber: v.contactNumber?.trim(), aadharNumber: v.aadharNumber?.trim(),
      role: v.role, active: v.active
    };
    if (!isEditing || v.password) { payload.password = v.password; payload.confirmPassword = v.confirmPassword; }

    const obs = isEditing
      ? this.api.updateAdminUser(this.editingUser!.id, payload)
      : this.api.createAdminUser(payload);

    obs.subscribe({
      next: () => { this.toast.success('User saved!'); this.showUserModal = false; this.loadUsers(); this.savingUser = false; },
      error: err => { this.toast.error(err.error?.message || 'Failed to save user'); this.savingUser = false; }
    });
  }

  toggleLock(u: User): void {
    this.api.toggleUserLock(u.id).subscribe({
      next: () => { this.toast.success('Lock status updated'); this.loadUsers(); },
      error: () => this.toast.error('Failed to update lock')
    });
  }

  toggleActive(u: User): void {
    this.api.toggleUserActive(u.id).subscribe({
      next: () => { this.toast.success('User status updated'); this.loadUsers(); },
      error: () => this.toast.error('Failed to update status')
    });
  }

  confirmDeleteUser(u: User): void {
    if (this.isSelfUser(u)) {
      this.toast.error('You cannot delete your own account');
      return;
    }
    this.userToDelete = u;
    this.showUserDeleteConfirm = true;
  }

  isSelfUser(u: User): boolean {
    return this.auth.user()?.id === u.id;
  }

  get userDeleteConfirmMessage(): string {
    if (!this.userToDelete) return 'Delete this user permanently?';
    return `Delete user "${this.userToDelete.username}" permanently? This action cannot be undone.`;
  }

  cancelUserDelete(): void {
    this.showUserDeleteConfirm = false;
    this.userToDelete = null;
    this.deletingUser = false;
  }

  deleteSelectedUser(): void {
    if (!this.userToDelete || this.deletingUser) return;
    const userId = this.userToDelete.id;
    this.deletingUser = true;
    this.api.deleteAdminUser(userId).subscribe({
      next: () => {
        this.toast.success('User deleted permanently');
        this.cancelUserDelete();
        this.loadUsers();
      },
      error: err => {
        this.toast.error(err?.error?.message || 'Failed to delete user');
        this.deletingUser = false;
      }
    });
  }

  // ── Courses CRUD ───────────────────────────────────────────────────────────────
  openCourseModal(c?: Course): void {
    this.editingCourse = c ?? null;
    this.courseForm.reset({
      title: c?.title ?? '', description: c?.description ?? '', category: c?.category ?? '',
      difficultyLevel: c?.difficultyLevel ?? '', durationHours: c?.durationHours ?? null, published: c?.published ?? false
    });
    this.showCourseModal = true;
  }

  saveCourse(): void {
    if (this.courseForm.invalid) return;
    this.savingCourse = true;
    const v: any = this.courseForm.value;
    const obs = this.editingCourse
      ? this.api.updateAdminCourse(this.editingCourse.id, v)
      : this.api.createAdminCourse(v);
    obs.subscribe({
      next: () => { this.toast.success('Course saved!'); this.showCourseModal = false; this.loadCourses(); this.savingCourse = false; },
      error: err => { this.toast.error(err.error?.message || 'Failed'); this.savingCourse = false; }
    });
  }

  confirmDeleteCourse(c: Course): void {
    this.confirmMessage = `Delete course "${c.title}"?`;
    this.deleteAction = () => this.api.deleteAdminCourse(c.id).subscribe({
      next: () => { this.toast.success('Course deleted'); this.loadCourses(); },
      error: () => this.toast.error('Failed to delete course')
    });
    this.showConfirm = true;
  }

  // ── Modules CRUD ───────────────────────────────────────────────────────────────
  openModuleModal(m?: CourseModule): void {
    this.editingModule = m ?? null;
    this.moduleForm.reset({
      courseId: m?.courseId?.toString() ?? '', title: m?.title ?? '', content: m?.content ?? '',
      moduleType: m?.moduleType ?? 'READING', resourceUrl: m?.resourceUrl ?? '',
      orderIndex: m?.orderIndex ?? null, durationMinutes: m?.durationMinutes ?? null
    });
    this.showModuleModal = true;
  }

  saveModule(): void {
    if (this.moduleForm.invalid) return;
    this.savingModule = true;
    const v: any = { ...this.moduleForm.value, courseId: Number(this.moduleForm.value.courseId) };
    const obs = this.editingModule
      ? this.api.updateAdminModule(this.editingModule.id, v)
      : this.api.createAdminModule(v);
    obs.subscribe({
      next: () => { this.toast.success('Module saved!'); this.showModuleModal = false; this.loadModulesForCourse(this.selectedCourseId); this.savingModule = false; },
      error: err => { this.toast.error(err.error?.message || 'Failed'); this.savingModule = false; }
    });
  }

  confirmDeleteModule(m: CourseModule): void {
    this.confirmMessage = `Delete module "${m.title}"?`;
    this.deleteAction = () => this.api.deleteAdminModule(m.id).subscribe({
      next: () => { this.toast.success('Module deleted'); this.loadModulesForCourse(this.selectedCourseId); },
      error: () => this.toast.error('Failed to delete module')
    });
    this.showConfirm = true;
  }

  executeDelete(): void { this.deleteAction?.(); this.showConfirm = false; }

  // ── Audit Logs ────────────────────────────────────────────────────────────────
loadAuditLogs(): void {
  this.auditLoading = true;
  this.api.getAuditLogs(this.auditTab, this.auditPage, this.auditPageSize, this.auditFilters).subscribe({
    next: res => {
      this.auditLogs = res.data?.content ?? [];
      this.auditTotalPages = res.data?.totalPages ?? 0;
      this.auditTotalElements = res.data?.totalElements ?? 0;
      this.auditLoading = false;
    },
    error: () => {
      this.toast.error('Failed to load audit logs');
      this.auditLoading = false;
    }
  });
}

switchAuditTab(tab: 'registrations' | 'logins' | 'all'): void {
  this.auditTab = tab;
  this.auditPage = 0;
  this.loadAuditLogs();
}

applyAuditFilters(): void {
  this.auditPage = 0;
  this.loadAuditLogs();
}

resetAuditFilters(): void {
  this.auditFilters = {
    q: '',
    outcome: '',
    role: '',
    eventType: '',
    fromDate: '',
    toDate: ''
  };
  this.applyAuditFilters();
}

onAuditPageSizeChange(val: string | number): void {
  this.auditPageSize = Number(val);
  this.auditPage = 0;
  this.loadAuditLogs();
}

auditEventLabel(eventType: string): string {
  const labels: Record<string, string> = {
    USER_REGISTERED: 'Registered',
    LOGIN_SUCCESS: 'Login Success',
    LOGIN_FAILED: 'Login Failed',
    LOGOUT: 'Logout',
    SESSION_TIMEOUT: 'Session Timeout',
    ACCOUNT_LOCKED_TEMPORARY: 'Temp Locked',
    ACCOUNT_LOCKED_ADMIN_REQUIRED: 'Locked (Admin)',
    ACCOUNT_UNLOCKED_ADMIN: 'Unlocked',
    ACCOUNT_LOCKED_BY_ADMIN: 'Locked by Admin',
    PASSWORD_RESET_REQUESTED: 'Password Reset Req.',
    PASSWORD_RESET_COMPLETED: 'Password Reset Done',
    PASSWORD_CHANGED: 'Password Changed',
    USER_LOCK_TOGGLED_BY_ADMIN: 'Lock Toggled',
    USER_ACTIVE_TOGGLED_BY_ADMIN: 'Active Toggled'
  };
  return labels[eventType] ?? eventType;
}

formatDateTime(iso?: string): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
  });
}
formatIp(ip: string | null): string {
  if (!ip) return '-';
  // Normalize IPv6 loopback to readable form
  if (ip === '0:0:0:0:0:0:0:1' || ip === '::1') return 'localhost';
  // Normalize IPv4-mapped IPv6 (e.g. ::ffff:192.168.1.1)
  if (ip.startsWith('::ffff:')) return ip.substring(7);
  return ip;
}
formatDate(iso?: string): string {   // Ã¢â€ Â existing method stays unchanged
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Users Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

onExportUsersExcel(scope: ExportScope): void {
  const doExport = (data: any[]) => {
    const date = new Date().toISOString().slice(0, 10);
    this.exportSvc.exportToExcel(data, this.USER_COLS, `securelms_users_${date}`);
    this.excelLoading = false;
  };

  if (scope === 'current') {
    doExport(this.allUsers);
  } else {
    this.excelLoading = true;
    this.api.getAllUsersForExport(this.userFilters).subscribe({
      next: res => doExport(res.data || []),
      error: () => { this.toast.error('Failed to fetch all users for export.'); this.excelLoading = false; }
    });
  }
}

onExportUsersPdf(scope: ExportScope): void {
  this.pdfLoading = true;
  const filters = scope === 'current' ? this.userFilters : { q: '', role: '' as const, active: '' as const, locked: '' as const };
  const date     = new Date().toISOString().slice(0, 10);
  this.exportSvc.exportToPdf('users/pdf', this.buildUserParams(filters), `securelms_users_${date}`)
    .subscribe({ complete: () => this.pdfLoading = false, error: () => this.pdfLoading = false });
}

private buildUserParams(f: typeof this.userFilters): HttpParams {
  let p = new HttpParams();
  if (f.q)      p = p.set('q',      f.q);
  if (f.role)   p = p.set('role',   f.role);
  if (f.active) p = p.set('active', f.active);
  if (f.locked) p = p.set('locked', f.locked);
  return p;
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Courses Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

onExportCoursesExcel(scope: ExportScope): void {
  const date = new Date().toISOString().slice(0, 10);
  this.exportSvc.exportToExcel(this.allCourses, this.COURSE_COLS, `securelms_courses_${date}`);
}

onExportCoursesPdf(_scope: ExportScope): void {
  this.pdfLoading = true;
  const date = new Date().toISOString().slice(0, 10);
  this.exportSvc.exportToPdf('courses/pdf', new HttpParams(), `securelms_courses_${date}`)
    .subscribe({ complete: () => this.pdfLoading = false, error: () => this.pdfLoading = false });
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Modules Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

onExportModulesExcel(scope: ExportScope): void {
  const date = new Date().toISOString().slice(0, 10);
  this.exportSvc.exportToExcel(this.allModules, this.MODULE_COLS, `securelms_modules_${date}`);
}

onExportModulesPdf(_scope: ExportScope): void {
  this.pdfLoading = true;
  const date     = new Date().toISOString().slice(0, 10);
  let p = new HttpParams();
  if (this.selectedCourseId) p = p.set('courseId', String(this.selectedCourseId));
  this.exportSvc.exportToPdf('modules/pdf', p, `securelms_modules_${date}`)
    .subscribe({ complete: () => this.pdfLoading = false, error: () => this.pdfLoading = false });
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Enrollments Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

onExportEnrollmentsExcel(scope: ExportScope): void {
  if (!this.enrollmentCourseId) {
    this.toast.info('Please select a course before exporting enrollments.');
    return;
  }
  const date = new Date().toISOString().slice(0, 10);
  this.exportSvc.exportToExcel(this.enrollments, this.ENROLLMENT_COLS,
    `securelms_enrollments_course${this.enrollmentCourseId}_${date}`);
}

onExportEnrollmentsPdf(_scope: ExportScope): void {
  if (!this.enrollmentCourseId) {
    this.toast.info('Please select a course before exporting enrollments.');
    return;
  }
  this.pdfLoading = true;
  const date = new Date().toISOString().slice(0, 10);
  const p    = new HttpParams().set('courseId', String(this.enrollmentCourseId));
  this.exportSvc.exportToPdf('enrollments/pdf', p,
    `securelms_enrollments_course${this.enrollmentCourseId}_${date}`)
    .subscribe({ complete: () => this.pdfLoading = false, error: () => this.pdfLoading = false });
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Audit Logs Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

onExportAuditExcel(scope: ExportScope): void {
  const date     = new Date().toISOString().slice(0, 10);
  const filename = `securelms_audit_${this.auditTab}_${date}`;

  if (scope === 'current') {
    this.exportSvc.exportToExcel(this.auditLogs, this.AUDIT_COLS, filename);
  } else {
    this.excelLoading = true;
    this.api.getAllAuditLogsForExport(this.auditTab, this.auditFilters).subscribe({
      next: res => {
        this.exportSvc.exportToExcel(res.data?.content || [], this.AUDIT_COLS, filename);
        this.excelLoading = false;
      },
      error: () => { this.toast.error('Failed to fetch all audit logs.'); this.excelLoading = false; }
    });
  }
}

onExportAuditPdf(scope: ExportScope): void {
  this.pdfLoading   = true;
  const date        = new Date().toISOString().slice(0, 10);
  const filename    = `securelms_audit_${this.auditTab}_${date}`;
  const filters     = scope === 'current' ? this.auditFilters
    : { q: '', outcome: '' as const, role: '' as const, eventType: '' as const, fromDate: '', toDate: '' };
  this.exportSvc.exportToPdf('audit-logs/pdf',
    this.buildAuditParams(this.auditTab, filters), filename)
    .subscribe({ complete: () => this.pdfLoading = false, error: () => this.pdfLoading = false });
}

private buildAuditParams(tab: string, f: typeof this.auditFilters): HttpParams {
  let p = new HttpParams().set('tab', tab);
  if (f.q)         p = p.set('q',         f.q);
  if (f.outcome)   p = p.set('outcome',   f.outcome);
  if (f.role)      p = p.set('role',      f.role);
  if (f.eventType) p = p.set('eventType', f.eventType);
  if (f.fromDate)  p = p.set('fromDate',  f.fromDate);
  if (f.toDate)    p = p.set('toDate',    f.toDate);
  return p;
}
  openGroupModal(group?: GroupMaster): void {
    if (group) {
      this.editingGroup = group;
      this.groupForm.patchValue({
        groupName: group.groupName,
        description: group.description,
        active: group.active
      });
    } else {
      this.editingGroup = null;
      this.groupForm.reset({ active: true });
    }
    this.showGroupModal = true;
  }

  saveGroup(): void {
    if (this.groupForm.invalid) return;
    this.savingGroup = true;
    const val = this.groupForm.value;
    const req = {
      groupName: val.groupName!,
      description: val.description || undefined,
      active: val.active ?? true
    };

    const ob = this.editingGroup
      ? this.groupService.updateGroup(this.editingGroup.id, req)
      : this.groupService.createGroup(req);

    ob.subscribe({
      next: () => {
        this.toast.success(this.editingGroup ? 'Group updated' : 'Group created');
        this.showGroupModal = false;
        this.savingGroup = false;
        this.loadGroups();
      },
      error: err => {
        this.toast.error(err?.error?.message || 'Failed to save group');
        this.savingGroup = false;
      }
    });
  }
}
