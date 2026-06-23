import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpParams } from '@angular/common/http';
import { DashboardLayoutComponent } from '../../shared/dashboard-layout/dashboard-layout.component';
import { ModalComponent } from '../../shared/modal/modal.component';
import { ExportButtonGroupComponent } from '../../shared/export-button-group/export-button-group.component';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { ExportService } from '../../core/services/export.service';
import { Course, CourseModule, Enrollment, ExportColumn, ExportScope } from '../../core/models';
import { sectionAnim, cardPop, listStagger, fadeIn } from '../../shared/animations';
import { forkJoin } from 'rxjs';
import { APP_ROUTES, STUDENT_NAV_GROUPS, STUDENT_SECTION_LABELS, STUDENT_SECTION_ROUTES, sectionFromRoutePath } from '../../core/navigation/app-routes';

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, DashboardLayoutComponent, ModalComponent, ExportButtonGroupComponent],
  animations: [sectionAnim, cardPop, listStagger, fadeIn],
  template: `
    <app-dashboard-layout
      [navGroups]="allNavGroups"
      [activeSection]="activeSection"
      [pageTitle]="pageTitle"
      roleLabel="Student"
      (sectionChange)="onSectionChange($event)">
      <!-- ── Dashboard ─────────────────────────────────────────────────── -->
      @if (activeSection === 'dashboard') {
        <div [@sectionAnim]>
          <div class="stats-grid">
            @for (s of stats; track s.label) {
              <div class="stat-card" [@cardPop]>
                <span class="stat-icon">{{ s.icon }}</span>
                <div class="stat-value">{{ s.value }}</div>
                <div class="stat-label">{{ s.label }}</div>
              </div>
            }
          </div>
          <div class="card">
            <div class="card-header">
              <span class="card-title">Continue Learning</span>
              <button class="btn btn-primary btn-sm" (click)="onSectionChange('browse')">Browse Courses →</button>
            </div>
            <div class="card-body">
              @if (myEnrollments.length) {
                @for (e of myEnrollments.slice(0,4); track e.id) {
                  <div class="continue-card" [@cardPop]>
                    <div class="continue-icon">auto_stories</div>
                    <div class="continue-info">
                      <div class="continue-title">{{ e.courseTitle }}</div>
                      <div class="continue-meta">Enrolled {{ formatDate(e.enrolledAt) }}</div>
                      <div class="progress-row" style="margin-top:8px">
                        <div class="progress-wrap" style="flex:1"><div class="progress-fill" [style.width]="(e.progressPercent||0)+'%'"></div></div>
                        <span style="font-size:12px;font-weight:600;min-width:36px">{{ e.progressPercent||0 }}%</span>
                      </div>
                    </div>
                    <button class="btn btn-primary btn-sm" (click)="openCourseDetail(e.courseId)">Continue →</button>
                  </div>
                }
              } @else {
                <div class="empty-state">
                  <span class="empty-icon">menu_book</span>
                  <p>You haven't enrolled in any courses yet.</p>
                  <small><a (click)="onSectionChange('browse')" style="cursor:pointer">Browse courses →</a></small>
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- ── My Courses ─────────────────────────────────────────────────── -->
      @if (activeSection === 'my-courses') {
        <div [@sectionAnim]>
          <div class="card">
            <div class="card-header">
              <span class="card-title">My Enrolled Courses</span>
              <app-export-button-group
                [excelLoading]="excelLoading"
                [pdfLoading]="pdfLoading"
                [showExportAll]="false"
                (exportExcel)="onExportMyEnrollmentsExcel($event)"
                (exportPdf)="onExportMyEnrollmentsPdf($event)"
              />
            </div>
            <div class="card-body">
              @if (myEnrollments.length) {
                @for (e of myEnrollments; track e.id) {
                  <div class="continue-card" [@cardPop]>
                    <div class="continue-icon">auto_stories</div>
                    <div class="continue-info">
                      <div class="continue-title">{{ e.courseTitle }}</div>
                      <div class="continue-meta">Enrolled {{ formatDate(e.enrolledAt) }}</div>
                      <div class="progress-row" style="margin-top:8px">
                        <div class="progress-wrap" style="flex:1"><div class="progress-fill" [style.width]="(e.progressPercent||0)+'%'"></div></div>
                        <span style="font-size:12px;font-weight:600">{{ e.progressPercent||0 }}%</span>
                      </div>
                    </div>
                    <div style="display:flex;gap:8px;flex-shrink:0">
                      <button class="btn btn-primary btn-sm" (click)="openCourseDetail(e.courseId)">View</button>
                      <button class="btn btn-danger btn-sm" (click)="unenroll(e.courseId)">Unenroll</button>
                    </div>
                  </div>
                }
              } @else {
                <div class="empty-state"><span class="empty-icon">import_contacts</span><p>No enrolled courses.</p></div>
              }
            </div>
          </div>
        </div>
      }

      <!-- ── Browse / Detail ────────────────────────────────────────────── -->
      @if (activeSection === 'browse') {
        <div [@sectionAnim]>
          @if (!showingDetail) {
            <div>
              <div class="browse-header">
                <h2 class="section-heading">Available Courses</h2>
                <input type="text" class="form-control search-input" placeholder="Search courses…"
                       [(ngModel)]="searchQuery" (ngModelChange)="filterCourses()" />
              </div>
              <div class="course-grid" [@listStagger]="filteredCourses.length">
                @for (c of filteredCourses; track c.id) {
                  <div class="course-card" [@cardPop] (click)="openCourseDetail(c.id)">
                    <div class="course-card-header">
                      <h3>{{ c.title }}</h3>
                      @if (c.difficultyLevel) { <span class="badge badge-published">{{ c.difficultyLevel }}</span> }
                    </div>
                    <p>{{ c.description || 'No description.' }}</p>
                    <div class="course-meta">
                      <span><span class="mi">description</span> {{ c.moduleCount }} modules</span>
                      @if (c.durationHours) { <span><span class="mi">schedule</span> {{ c.durationHours }}h</span> }
                      @if (c.category) { <span><span class="mi">sell</span> {{ c.category }}</span> }
                    </div>
                    <div class="course-actions" (click)="$event.stopPropagation()">
                      <button class="btn btn-secondary btn-sm" (click)="openCourseDetail(c.id)">View Details</button>
                      @if (enrolledIds.has(c.id)) {
                        <button class="btn btn-danger btn-sm" (click)="unenroll(c.id)">Unenroll</button>
                      } @else {
                        <button class="btn btn-primary btn-sm" (click)="enroll(c.id)">Enroll</button>
                      }
                    </div>
                  </div>
                }
                @empty {
                  <div class="empty-state" style="grid-column:1/-1"><span class="empty-icon">search</span><p>No courses found</p></div>
                }
              </div>
            </div>
          } @else {
            <div [@fadeIn]>
              <button class="btn btn-ghost btn-sm" style="margin-bottom:16px" (click)="hideCourseDetail()">← Back to Browse</button>
              @if (detailCourse) {
                <div class="card">
                  <div class="card-header" style="flex-wrap:wrap;gap:12px">
                    <div>
                      <div class="card-title">{{ detailCourse.title }}</div>
                      <div style="display:flex;gap:8px;margin-top:6px">
                        @if (detailCourse.difficultyLevel) { <span class="badge badge-published">{{ detailCourse.difficultyLevel }}</span> }
                        @if (detailCourse.category) { <span class="badge badge-student">{{ detailCourse.category }}</span> }
                      </div>
                    </div>
                    <button class="btn btn-sm"
                            [class]="enrolledIds.has(detailCourse.id) ? 'btn-danger' : 'btn-primary'"
                            (click)="enrolledIds.has(detailCourse.id) ? unenroll(detailCourse.id) : enroll(detailCourse.id)">
                      {{ enrolledIds.has(detailCourse.id) ? 'Unenroll' : '+ Enroll' }}
                    </button>
                  </div>
                  <div class="card-body">
                    @if (detailCourse.description) {
                      <p style="color:var(--text-muted);margin-bottom:16px;font-size:14px">{{ detailCourse.description }}</p>
                    }
                    <div style="display:flex;gap:20px;margin-bottom:20px;font-size:13px;color:var(--text-muted);flex-wrap:wrap">
                      @if (detailCourse.durationHours) { <span><span class="mi">schedule</span> {{ detailCourse.durationHours }} hours</span> }
                      <span><span class="mi">description</span> {{ detailCourse.moduleCount }} modules</span>
                      <span><span class="mi">co_present</span> {{ detailCourse.createdByUsername }}</span>
                    </div>
                    @if (currentEnrollment) {
                      <div style="margin-bottom:20px">
                        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px">
                          <span>Progress</span>
                          <span>{{ currentEnrollment.completedModuleCount||0 }}/{{ currentEnrollment.totalModuleCount||0 }} ({{ currentEnrollment.progressPercent||0 }}%)</span>
                        </div>
                        <div class="progress-wrap"><div class="progress-fill" [style.width]="(currentEnrollment.progressPercent||0)+'%'"></div></div>
                      </div>
                    }
                    <h3 style="font-size:14px;font-weight:600;margin-bottom:12px">Course Modules</h3>
                    @if (detailModules.length) {
                      <div [@listStagger]="detailModules.length">
                        @for (m of detailModules; track m.id; let i = $index) {
                          <div class="module-row"
                               [class.completed]="isModuleCompleted(m.id)"
                               (click)="enrolledIds.has(detailCourse!.id) ? viewModule(m) : toast.info('Enroll to access modules')">
                            <div class="module-num" [class.done]="isModuleCompleted(m.id)">
                              {{ isModuleCompleted(m.id) ? 'check' : (i+1) }}
                            </div>
                            <div class="module-info">
                              <div class="module-title">{{ m.title }}</div>
                              <div class="module-meta">{{ m.moduleType || 'READING' }}{{ m.durationMinutes ? ' · ' + m.durationMinutes + ' min' : '' }}</div>
                            </div>
                            <span class="module-arrow">{{ enrolledIds.has(detailCourse!.id) ? (isModuleCompleted(m.id) ? 'check_circle' : 'play_arrow') : 'lock' }}</span>
                          </div>
                        }
                      </div>
                    } @else {
                      <div class="empty-state"><span class="empty-icon">description</span><p>No modules yet</p></div>
                    }
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- ── Profile ────────────────────────────────────────────────────── -->
      @if (activeSection === 'profile') {
        <div [@sectionAnim]>
          <a [routerLink]="routes.student.profile" class="btn btn-primary" style="width:auto">Open Profile Page →</a>
        </div>
      }
    </app-dashboard-layout>

    <!-- Module Viewer Modal -->
    <app-modal [isOpen]="showModuleViewer" [title]="viewingModule?.title || ''" (close)="showModuleViewer=false">
      <div style="white-space:pre-wrap;line-height:1.75;font-size:14px;color:var(--text-muted)">
        {{ viewingModule?.content }}
      </div>
      @if (viewingModule?.resourceUrl) {
        <div style="margin-top:16px">
          <a [href]="viewingModule!.resourceUrl" target="_blank" class="btn btn-primary btn-sm" style="width:auto">
            <span class="mi">link</span> Open Resource
          </a>
        </div>
      }
      <div slot="footer">
        <button class="btn btn-secondary btn-sm" (click)="showModuleViewer=false">Close</button>
        <button class="btn btn-success btn-sm" [disabled]="markingDone" (click)="toggleModuleDone()">
          @if (markingDone) { <span class="spinner"></span> }
          @else { {{ isModuleCompleted(viewingModule?.id) ? 'Mark Incomplete' : 'Mark as Done' }} }
        </button>
      </div>
    </app-modal>
  `,
  styles: [`
.browse-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; gap: 16px; flex-wrap: wrap; }
    .section-heading { font-size: 16px; font-weight: 600; }
    .search-input { max-width: 280px; }
    .continue-card {
      background: var(--surface-2); border: 1px solid var(--border); border-radius: 12px;
      padding: 16px; margin-bottom: 12px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
      transition: box-shadow .2s; &:hover { box-shadow: var(--shadow); }
    }
    .continue-icon { font-size: 32px; flex-shrink: 0; }
    .continue-info { flex: 1; min-width: 180px; }
    .continue-title { font-weight: 600; font-size: 14px; }
    .continue-meta { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
    .progress-row { display: flex; align-items: center; gap: 8px; }
    .module-row {
      background: var(--surface-2); border: 1px solid var(--border); border-radius: 10px;
      padding: 14px 16px; margin-bottom: 8px; display: flex; align-items: center; gap: 12px;
      cursor: pointer; transition: all .18s;
      &:hover { border-color: var(--primary); background: var(--surface); }
      &.completed { opacity: .7; }
    }
    .module-num {
      width: 30px; height: 30px; border-radius: 50%; background: var(--primary-light);
      color: var(--primary); display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 700; flex-shrink: 0;
      &.done { background: rgba(22,163,74,.1); color: var(--success); }
    }
    .module-info { flex: 1; }
    .module-title { font-weight: 500; font-size: 13px; }
    .module-meta { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
    .module-arrow { font-size: 18px; flex-shrink: 0; }
  `]
})
export class StudentDashboardComponent implements OnInit {
  private api = inject(ApiService);
  toast = inject(ToastService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private exportSvc = inject(ExportService);
  readonly routes = APP_ROUTES;

  activeSection = 'dashboard';
  readonly allNavGroups = STUDENT_NAV_GROUPS;
  get pageTitle(): string {
    return this.allNavGroups.flatMap(g => g.items).find(i => i.section === this.activeSection)?.label ?? STUDENT_SECTION_LABELS[this.activeSection] ?? 'Dashboard';
  }

  stats = [
    { icon: 'import_contacts', label: 'Enrolled Courses', value: '—' },
    { icon: 'check_circle', label: 'Completed', value: '—' },
    { icon: 'search', label: 'Available Courses', value: '—' },
    { icon: 'bolt', label: 'In Progress', value: '—' }
  ];

  myEnrollments: Enrollment[] = [];
  allAvailable: Course[] = [];
  filteredCourses: Course[] = [];
  enrolledIds = new Set<number>();
  searchQuery = '';

  showingDetail = false;
  detailCourse: Course | null = null;
  detailModules: CourseModule[] = [];
  currentEnrollment: Enrollment | null = null;

  showModuleViewer = false;
  viewingModule: CourseModule | null = null;
  markingDone = false;
  excelLoading = false;
  pdfLoading = false;

  private readonly MY_ENROLLMENTS_COLS: ExportColumn[] = [
    { header: 'Course',        field: 'courseTitle' },
    { header: 'Progress (%)',  field: 'progressPercent',      format: 'percent' },
    { header: 'Modules Done',  field: 'completedModuleCount' },
    { header: 'Total Modules', field: 'totalModuleCount' },
    { header: 'Status',        field: 'completedAt' },
    { header: 'Enrolled At',   field: 'enrolledAt',           format: 'datetime' },
    { header: 'Completed At',  field: 'completedAt',          format: 'datetime' },
  ];

  ngOnInit(): void {
    this.route.url.subscribe(() => {
      this.activateSection(sectionFromRoutePath(this.router.url, STUDENT_SECTION_ROUTES));
    });
  }

  private loadForSection(section: string): void {
    if (section === 'dashboard') this.loadDashboard();
    else if (section === 'my-courses') this.loadMyEnrollments();
    else if (section === 'browse') this.loadBrowse();
  }

  onSectionChange(s: string): void {
    const routePath = STUDENT_SECTION_ROUTES[s] ?? STUDENT_SECTION_ROUTES['dashboard'];
    if (this.router.url.split('?')[0] !== routePath) {
      this.router.navigate([routePath]);
      return;
    }
    this.activateSection(s);
  }

  private activateSection(s: string): void {
    this.activeSection = s;
    this.showingDetail = false;
    this.loadForSection(s);
  }

  loadDashboard(): void {
    this.api.getMyEnrollments().subscribe(res => this.setEnrollmentState(res.data || []));
    this.api.getStudentCourses().subscribe(res => { this.stats[2].value = String((res.data || []).length); });
  }

  loadMyEnrollments(): void {
    this.api.getMyEnrollments().subscribe(res => this.setEnrollmentState(res.data || []));
  }

  loadBrowse(): void {
    this.api.getStudentCourses().subscribe(res => { this.allAvailable = res.data || []; this.filterCourses(); });
    this.api.getMyEnrollments().subscribe(res => this.setEnrollmentState(res.data || []));
  }

  filterCourses(): void {
    const q = this.searchQuery.toLowerCase();
    this.filteredCourses = q
      ? this.allAvailable.filter(c =>
        c.title.toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q) ||
        (c.category || '').toLowerCase().includes(q))
      : [...this.allAvailable];
  }

  openCourseDetail(courseId: number): void {
    this.activeSection = 'browse';
    this.showingDetail = true;
    const enrolled = this.enrolledIds.has(courseId);

    const calls: any = {
      course: this.api.getStudentCourse(courseId),
      enrollments: this.api.getMyEnrollments()
    };
    // Only fetch modules if student is already enrolled
    if (enrolled) calls['modules'] = this.api.getStudentCourseModules(courseId);

    forkJoin(calls).subscribe({
      next: (res: any) => {
        this.detailCourse = res.course.data;
        this.detailModules = res.modules?.data || [];
        const latest = res.enrollments.data || [];
        this.setEnrollmentState(latest);
        this.currentEnrollment = latest.find((e: any) => e.courseId === courseId) || null;
      },
      error: err => this.toast.error(err.error?.message || 'Failed to load course details')
    });
  }

  hideCourseDetail(): void { this.showingDetail = false; this.detailCourse = null; this.detailModules = []; }

  enroll(courseId: number): void {
    this.api.enrollInCourse(courseId).subscribe({
      next: () => {
        this.enrolledIds.add(courseId);
        this.toast.success('Enrolled successfully!');
        if (this.showingDetail && this.detailCourse?.id === courseId) this.openCourseDetail(courseId);
        else this.loadMyEnrollments();
      },
      error: err => this.toast.error(err.error?.message || 'Failed to enroll')
    });
  }

  unenroll(courseId: number): void {
    if (!confirm('Unenroll from this course?')) return;
    this.api.unenrollFromCourse(courseId).subscribe({
      next: () => {
        this.enrolledIds.delete(courseId);
        this.toast.info('Unenrolled');
        if (this.showingDetail && this.detailCourse?.id === courseId) this.openCourseDetail(courseId);
        else this.loadMyEnrollments();
      },
      error: err => this.toast.error(err.error?.message || 'Failed to unenroll')
    });
  }

  viewModule(m: CourseModule): void { this.viewingModule = m; this.showModuleViewer = true; }

  isModuleCompleted(moduleId?: number): boolean {
    if (!moduleId || !this.currentEnrollment) return false;
    return this.currentEnrollment.completedModuleIds?.includes(moduleId) ?? false;
  }

  toggleModuleDone(): void {
    if (!this.viewingModule || !this.detailCourse) return;
    this.markingDone = true;
    const completed = !this.isModuleCompleted(this.viewingModule.id);
    this.api.updateModuleProgress(this.detailCourse.id, this.viewingModule.id, completed).subscribe({
      next: () => {
        this.toast.success(completed ? 'Module marked complete!' : 'Module marked incomplete');
        this.showModuleViewer = false;
        this.markingDone = false;
        this.openCourseDetail(this.detailCourse!.id);
      },
      error: err => { this.toast.error(err.error?.message || 'Failed'); this.markingDone = false; }
    });
  }

  onExportMyEnrollmentsExcel(_scope: ExportScope): void {
    const date = new Date().toISOString().slice(0, 10);
    this.exportSvc.exportToExcel(
      this.myEnrollments,
      this.MY_ENROLLMENTS_COLS,
      `securelms_my_progress_${date}`
    );
  }

  onExportMyEnrollmentsPdf(_scope: ExportScope): void {
    this.pdfLoading = true;
    const date = new Date().toISOString().slice(0, 10);
    this.exportSvc.exportToPdf(
      'my-enrollments/pdf',
      new HttpParams(),
      `securelms_my_progress_${date}`
    ).subscribe({
      complete: () => this.pdfLoading = false,
      error: () => this.pdfLoading = false
    });
  }

  private setEnrollmentState(enrollments: Enrollment[]): void {
    this.myEnrollments = enrollments;
    this.enrolledIds = new Set(enrollments.map(e => e.courseId));
    this.stats[0].value = String(enrollments.length);
    this.stats[1].value = String(enrollments.filter(e => e.progressPercent === 100).length);
    this.stats[3].value = String(enrollments.filter(e => (e.progressPercent || 0) > 0 && e.progressPercent !== 100).length);
  }

  formatDate(iso?: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}



