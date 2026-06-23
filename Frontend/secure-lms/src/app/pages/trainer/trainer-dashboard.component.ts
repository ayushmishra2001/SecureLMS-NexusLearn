import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { HttpParams } from '@angular/common/http';
import { DashboardLayoutComponent } from '../../shared/dashboard-layout/dashboard-layout.component';
import { ModalComponent } from '../../shared/modal/modal.component';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { ExportButtonGroupComponent } from '../../shared/export-button-group/export-button-group.component';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { ExportService } from '../../core/services/export.service';
import { Course, CourseModule, Enrollment, ExportColumn, ExportScope } from '../../core/models';
import { sectionAnim, cardPop, listStagger, fadeIn } from '../../shared/animations';
import { APP_ROUTES, TRAINER_NAV_GROUPS, TRAINER_SECTION_LABELS, TRAINER_SECTION_ROUTES, sectionFromRoutePath } from '../../core/navigation/app-routes';

@Component({
  selector: 'app-trainer-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule,
    DashboardLayoutComponent, ModalComponent, ConfirmDialogComponent, ExportButtonGroupComponent],
  animations: [sectionAnim, cardPop, listStagger, fadeIn],
  template: `
    <app-dashboard-layout
      [navGroups]="allNavGroups"
      [activeSection]="activeSection"
      [pageTitle]="pageTitle"
      roleLabel="Trainer"
      (sectionChange)="onSectionChange($event)">
      <!-- ── Dashboard ─────────────────────────────────────────────────── -->
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
          <div class="card">
            <div class="card-header">
              <span class="card-title">My Recent Courses</span>
              <button class="btn btn-primary btn-sm" (click)="openCourseModal()">+ New Course</button>
            </div>
            <div class="card-body">
              @if (myCourses.length) {
                <div class="course-grid">
                  @for (c of myCourses.slice(0,6); track c.id) {
                    <div class="course-card" [@cardPop]>
                      <div class="course-card-header">
                        <h3>{{ c.title }}</h3>
                        <span class="badge" [class]="c.published ? 'badge-published' : 'badge-draft'">
                          {{ c.published ? 'Published' : 'Draft' }}
                        </span>
                      </div>
                      <p>{{ c.description || 'No description provided.' }}</p>
                      <div class="course-meta">
                        <span><span class="mi">description</span> {{ c.moduleCount }} modules</span>
                        @if (c.difficultyLevel) { <span><span class="mi">bar_chart</span> {{ c.difficultyLevel }}</span> }
                      </div>
                      <div class="course-actions">
                        <button class="btn btn-secondary btn-sm" (click)="openCourseModal(c)">Edit</button>
                        <button class="btn btn-primary btn-sm"
                                (click)="openModulesForCourse(c.id)">
                          Modules
                        </button>
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <div class="empty-state"><span class="empty-icon">menu_book</span><p>No courses yet. Create your first!</p></div>
              }
            </div>
          </div>
        </div>
      }

      <!-- ── My Courses ─────────────────────────────────────────────────── -->
      @if (activeSection === 'courses') {
        <div [@sectionAnim]>
          <div class="card">
            <div class="card-header">
              <span class="card-title">My Courses</span>
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
                <thead><tr><th>#</th><th>Title</th><th>Category</th><th>Difficulty</th><th>Status</th><th>Modules</th><th>Actions</th></tr></thead>
                <tbody [@listStagger]="myCourses.length">
                  @for (c of myCourses; track c.id; let i = $index) {
                    <tr>
                      <td>{{ i+1 }}</td>
                      <td><strong>{{ c.title }}</strong></td>
                      <td>{{ c.category || '—' }}</td>
                      <td>{{ c.difficultyLevel || '—' }}</td>
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
                  @empty { <tr><td colspan="7"><div class="empty-state"><span class="empty-icon">menu_book</span><p>No courses yet</p></div></td></tr> }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      }

      <!-- ── Modules ────────────────────────────────────────────────────── -->
      @if (activeSection === 'modules') {
        <div [@sectionAnim]>
          <div class="card">
            <div class="card-header">
              <span class="card-title">Modules</span>
              <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                <button class="btn btn-primary btn-sm" (click)="openModuleModal()">+ New Module</button>
                <app-export-button-group
                  [excelLoading]="excelLoading"
                  [pdfLoading]="pdfLoading"
                  [showExportAll]="false"
                  (exportExcel)="onExportModulesExcel($event)"
                  (exportPdf)="onExportModulesPdf($event)"
                />
              </div>
            </div>
            <div class="card-body">
              <div class="form-group" style="max-width:300px;margin-bottom:16px">
                <label>Course</label>
                <select class="form-control" [(ngModel)]="selectedCourseId" (ngModelChange)="loadModulesForCourse($event)">
                  <option [value]="0">Select a course</option>
                  @for (c of myCourses; track c.id) { <option [value]="c.id">{{ c.title }}</option> }
                </select>
              </div>
              <div class="table-wrap">
                <table>
                  <thead><tr><th>#</th><th>Title</th><th>Type</th><th>Order</th><th>Duration</th><th>Actions</th></tr></thead>
                  <tbody [@listStagger]="currentModules.length">
                    @for (m of currentModules; track m.id; let i = $index) {
                      <tr>
                        <td>{{ i+1 }}</td>
                        <td><strong>{{ m.title }}</strong></td>
                        <td>{{ m.moduleType || '—' }}</td>
                        <td>{{ m.orderIndex ?? '—' }}</td>
                        <td>{{ m.durationMinutes ? m.durationMinutes + ' min' : '—' }}</td>
                        <td>
                          <div class="action-btns">
                            <button class="btn btn-secondary btn-sm btn-icon" (click)="openModuleModal(m)">edit</button>
                            <button class="btn btn-danger btn-sm btn-icon" (click)="confirmDeleteModule(m)">delete</button>
                          </div>
                        </td>
                      </tr>
                    }
                    @empty { <tr><td colspan="6"><div class="empty-state"><span class="empty-icon">description</span><p>{{ selectedCourseId ? 'No modules yet' : 'Select a course' }}</p></div></td></tr> }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- ── Enrollments ────────────────────────────────────────────────── -->
      @if (activeSection === 'enrollments') {
        <div [@sectionAnim]>
          <div class="card">
            <div class="card-header">
              <span class="card-title">Student Enrollments</span>
              <app-export-button-group
                [excelLoading]="excelLoading"
                [pdfLoading]="pdfLoading"
                [showExportAll]="false"
                (exportExcel)="onExportEnrollmentsExcel($event)"
                (exportPdf)="onExportEnrollmentsPdf($event)"
              />
            </div>
            <div class="card-body">
              <div class="form-group" style="max-width:320px;margin-bottom:16px">
                <label>Select Course</label>
                <select class="form-control" [(ngModel)]="enrollCourseId" (ngModelChange)="loadEnrollments($event)">
                  <option [value]="0">— Select a course —</option>
                  @for (c of myCourses; track c.id) { <option [value]="c.id">{{ c.title }}</option> }
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
                            <span style="font-size:12px;font-weight:600">{{ e.progressPercent||0 }}%</span>
                          </div>
                        </td>
                        <td><span class="badge badge-published">{{ e.completedModuleCount||0 }}/{{ e.totalModuleCount||0 }}</span></td>
                        <td><span class="badge" [class]="e.completedAt ? 'badge-active' : 'badge-draft'">{{ e.completedAt ? 'Completed' : 'In Progress' }}</span></td>
                      </tr>
                    }
                    @empty { <tr><td colspan="6"><div class="empty-state"><span class="empty-icon">groups</span><p>{{ enrollCourseId ? 'No enrollments' : 'Select a course' }}</p></div></td></tr> }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- ── Profile ────────────────────────────────────────────────────── -->
      @if (activeSection === 'profile') {
        <div [@sectionAnim]>
          <a [routerLink]="routes.trainer.profile" class="btn btn-primary" style="width:auto">Open Profile Page →</a>
        </div>
      }
    </app-dashboard-layout>

    <!-- Course Modal -->
    <app-modal [isOpen]="showCourseModal" [title]="editingCourse ? 'Edit Course' : 'New Course'" (close)="showCourseModal=false">
      <form [formGroup]="courseForm">
        <div class="form-group"><label>Title *</label><input type="text" class="form-control" formControlName="title" /></div>
        <div class="form-group"><label>Description</label><textarea class="form-control" formControlName="description" rows="3"></textarea></div>
        <div class="two-col">
          <div class="form-group"><label>Category</label><input type="text" class="form-control" formControlName="category" /></div>
          <div class="form-group"><label>Duration (hrs)</label><input type="number" class="form-control" formControlName="durationHours" /></div>
        </div>
        <div class="form-group">
          <label>Difficulty</label>
          <select class="form-control" formControlName="difficultyLevel">
            <option value="">— Select —</option>
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
          </select>
        </div>
        <label class="checkbox-label"><input type="checkbox" formControlName="published" /> <span>Publish immediately</span></label>
      </form>
      <div slot="footer">
        <button class="btn btn-secondary btn-sm" (click)="showCourseModal=false">Cancel</button>
        <button class="btn btn-primary btn-sm" [disabled]="savingCourse" (click)="saveCourse()">
          @if (savingCourse) { <span class="spinner"></span> } @else { Save }
        </button>
      </div>
    </app-modal>

    <!-- Module Modal -->
    <app-modal [isOpen]="showModuleModal" [title]="editingModule ? 'Edit Module' : 'New Module'" (close)="showModuleModal=false">
      <form [formGroup]="moduleForm">
        <div class="form-group">
          <label>Course *</label>
          <select class="form-control" formControlName="courseId">
            <option value="">— Select Course —</option>
            @for (c of myCourses; track c.id) { <option [value]="c.id">{{ c.title }}</option> }
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
          <div class="form-group"><label>Order</label><input type="number" class="form-control" formControlName="orderIndex" /></div>
          <div class="form-group"><label>Duration (min)</label><input type="number" class="form-control" formControlName="durationMinutes" /></div>
        </div>
      </form>
      <div slot="footer">
        <button class="btn btn-secondary btn-sm" (click)="showModuleModal=false">Cancel</button>
        <button class="btn btn-primary btn-sm" [disabled]="savingModule" (click)="saveModule()">
          @if (savingModule) { <span class="spinner"></span> } @else { Save }
        </button>
      </div>
    </app-modal>

    <app-confirm-dialog [isOpen]="showConfirm" [message]="confirmMessage"
      (confirm)="executeDelete()" (cancel)="showConfirm=false" />
  `,
  styles: [`
.action-btns { display: flex; gap: 6px; }
    .progress-row { display: flex; align-items: center; gap: 8px; min-width: 120px; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .checkbox-label { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 500; cursor: pointer; input { width: auto; } }
  `]
})
export class TrainerDashboardComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private exportSvc = inject(ExportService);
  readonly routes = APP_ROUTES;

  activeSection = 'dashboard';
  readonly allNavGroups = TRAINER_NAV_GROUPS;
  get pageTitle(): string {
    return this.allNavGroups.flatMap(g => g.items).find(i => i.section === this.activeSection)?.label ?? TRAINER_SECTION_LABELS[this.activeSection] ?? 'Dashboard';
  }

  stats = [
    { icon: 'menu_book', label: 'My Courses', value: '—' },
    { icon: 'description', label: 'Total Modules', value: '—' },
    { icon: 'public', label: 'Published', value: '—' },
    { icon: 'edit_note', label: 'Drafts', value: '—' }
  ];

  myCourses: Course[] = [];
  currentModules: CourseModule[] = [];
  enrollments: Enrollment[] = [];
  selectedCourseId: any = 0;
  enrollCourseId: any = 0;

  showCourseModal = false;
  showModuleModal = false;
  showConfirm = false;
  confirmMessage = '';
  private deleteAction?: () => void;
  editingCourse: Course | null = null;
  editingModule: CourseModule | null = null;
  savingCourse = false;
  savingModule = false;
  excelLoading = false;
  pdfLoading = false;

  courseForm = this.fb.group({
    title: ['', Validators.required], description: [''], category: [''],
    difficultyLevel: [''], durationHours: [null as number | null], published: [false]
  });

  moduleForm = this.fb.group({
    courseId: ['', Validators.required], title: ['', Validators.required],
    content: ['', Validators.required], moduleType: ['READING'],
    resourceUrl: [''], orderIndex: [null as number | null], durationMinutes: [null as number | null]
  });

  // ── Column definitions (static — defined once, reused per call) ──────────

  private readonly COURSE_COLS: ExportColumn[] = [
    { header: 'Title',       field: 'title' },
    { header: 'Category',    field: 'category' },
    { header: 'Difficulty',  field: 'difficultyLevel' },
    { header: 'Status',      field: 'published',       format: 'boolean' },
    { header: 'Modules',     field: 'moduleCount' },
    { header: 'Enrollments', field: 'enrollmentCount' },
    { header: 'Created At',  field: 'createdAt',       format: 'date' },
  ];

  private readonly MODULE_COLS: ExportColumn[] = [
    { header: 'Title',          field: 'title' },
    { header: 'Type',           field: 'moduleType' },
    { header: 'Order',          field: 'orderIndex' },
    { header: 'Duration (min)', field: 'durationMinutes' },
    { header: 'Created At',     field: 'createdAt',  format: 'date' },
  ];

  private readonly ENROLLMENT_COLS: ExportColumn[] = [
    { header: 'Student',       field: 'studentUsername' },
    { header: 'Progress (%)',  field: 'progressPercent', format: 'percent' },
    { header: 'Modules Done',  field: 'completedModuleCount' },
    { header: 'Total Modules', field: 'totalModuleCount' },
    { header: 'Enrolled At',   field: 'enrolledAt',      format: 'datetime' },
    { header: 'Completed At',  field: 'completedAt',     format: 'datetime' },
  ];

  ngOnInit(): void {
    this.route.url.subscribe(() => {
      const section = sectionFromRoutePath(this.router.url, TRAINER_SECTION_ROUTES);
      this.activateSection(section);
      const courseId = history.state?.courseId;
      if (section === 'modules' && courseId) {
        this.selectedCourseId = courseId;
        this.loadModulesForCourse(courseId);
      }
    });
  }

  private loadForSection(section: string): void {
    if (['dashboard', 'courses', 'modules', 'enrollments'].includes(section)) {
      this.loadDashboard();
    }
  }

  onSectionChange(s: string): void {
    const routePath = TRAINER_SECTION_ROUTES[s] ?? TRAINER_SECTION_ROUTES['dashboard'];
    if (this.router.url.split('?')[0] !== routePath) {
      this.router.navigate([routePath]);
      return;
    }
    this.activateSection(s);
  }

  openModulesForCourse(courseId: number): void {
    this.router.navigate([TRAINER_SECTION_ROUTES['modules']], { state: { courseId } });
  }

  private activateSection(s: string): void {
    this.activeSection = s;
    if (s === 'courses' || s === 'dashboard') this.loadDashboard();
    else if (s === 'modules') { this.loadDashboard(); this.currentModules = []; }
    else if (s === 'enrollments') this.loadDashboard();
  }

  loadDashboard(): void {
    this.api.getTrainerCourses().subscribe(res => {
      this.myCourses = res.data || [];
      this.stats[0].value = String(this.myCourses.length);
      this.stats[2].value = String(this.myCourses.filter(c => c.published).length);
      this.stats[3].value = String(this.myCourses.filter(c => !c.published).length);
      this.stats[1].value = String(this.myCourses.reduce((s, c) => s + (c.moduleCount || 0), 0));
    });
  }

  loadModulesForCourse(cId: any): void {
    if (!cId) { this.currentModules = []; return; }
    this.api.getTrainerCourseModules(Number(cId)).subscribe({
      next: res => this.currentModules = res.data || [],
      error: () => this.toast.error('Failed to load modules')
    });
  }

  loadEnrollments(cId: any): void {
    if (!cId) { this.enrollments = []; return; }
    this.api.getTrainerCourseEnrollments(Number(cId)).subscribe({
      next: res => this.enrollments = res.data || [],
      error: () => this.toast.error('Failed to load enrollments')
    });
  }

  openCourseModal(c?: Course): void {
    this.editingCourse = c ?? null;
    this.courseForm.reset({
      title: c?.title ?? '', description: c?.description ?? '', category: c?.category ?? '',
      difficultyLevel: c?.difficultyLevel ?? '', durationHours: c?.durationHours ?? null, published: c?.published ?? false
    });
    this.showCourseModal = true;
  }

  saveCourse(): void {
    if (this.courseForm.invalid) { this.toast.error('Title is required'); return; }
    this.savingCourse = true;
    const v: any = this.courseForm.value;
    const obs = this.editingCourse
      ? this.api.updateTrainerCourse(this.editingCourse.id, v)
      : this.api.createTrainerCourse(v);
    obs.subscribe({
      next: () => { this.toast.success('Course saved!'); this.showCourseModal = false; this.loadDashboard(); this.savingCourse = false; },
      error: err => { this.toast.error(err.error?.message || 'Failed'); this.savingCourse = false; }
    });
  }

  confirmDeleteCourse(c: Course): void {
    this.confirmMessage = `Delete course "${c.title}"?`;
    this.deleteAction = () => this.api.deleteTrainerCourse(c.id).subscribe({
      next: () => { this.toast.success('Course deleted'); this.loadDashboard(); },
      error: () => this.toast.error('Failed')
    });
    this.showConfirm = true;
  }

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
    if (this.moduleForm.invalid) { this.toast.error('Required fields missing'); return; }
    this.savingModule = true;
    const v: any = { ...this.moduleForm.value, courseId: Number(this.moduleForm.value.courseId) };
    const obs = this.editingModule
      ? this.api.updateTrainerModule(this.editingModule.id, v)
      : this.api.createTrainerModule(v);
    obs.subscribe({
      next: () => { this.toast.success('Module saved!'); this.showModuleModal = false; this.loadModulesForCourse(this.selectedCourseId); this.savingModule = false; },
      error: err => { this.toast.error(err.error?.message || 'Failed'); this.savingModule = false; }
    });
  }

  confirmDeleteModule(m: CourseModule): void {
    this.confirmMessage = `Delete module "${m.title}"?`;
    this.deleteAction = () => this.api.deleteTrainerModule(m.id).subscribe({
      next: () => { this.toast.success('Module deleted'); this.loadModulesForCourse(this.selectedCourseId); },
      error: () => this.toast.error('Failed')
    });
    this.showConfirm = true;
  }

  executeDelete(): void { this.deleteAction?.(); this.showConfirm = false; }

  // ── Courses ────────────────────────────────────────────────────────────────

  onExportCoursesExcel(_scope: ExportScope): void {
    const date = new Date().toISOString().slice(0, 10);
    this.exportSvc.exportToExcel(this.myCourses, this.COURSE_COLS, `securelms_my_courses_${date}`);
  }

  onExportCoursesPdf(_scope: ExportScope): void {
    this.pdfLoading = true;
    const date = new Date().toISOString().slice(0, 10);
    this.exportSvc.exportToPdf('courses/pdf', new HttpParams(), `securelms_my_courses_${date}`)
      .subscribe({ complete: () => this.pdfLoading = false, error: () => this.pdfLoading = false });
  }

  // ── Modules ────────────────────────────────────────────────────────────────

  onExportModulesExcel(_scope: ExportScope): void {
    if (!this.selectedCourseId) {
      this.toast.info('Please select a course before exporting modules.');
      return;
    }
    const date = new Date().toISOString().slice(0, 10);
    this.exportSvc.exportToExcel(this.currentModules, this.MODULE_COLS,
      `securelms_modules_course${this.selectedCourseId}_${date}`);
  }

  onExportModulesPdf(_scope: ExportScope): void {
    if (!this.selectedCourseId) {
      this.toast.info('Please select a course before exporting modules.');
      return;
    }
    this.pdfLoading = true;
    const date = new Date().toISOString().slice(0, 10);
    const p    = new HttpParams().set('courseId', String(this.selectedCourseId));
    this.exportSvc.exportToPdf('modules/pdf', p,
      `securelms_modules_course${this.selectedCourseId}_${date}`)
      .subscribe({ complete: () => this.pdfLoading = false, error: () => this.pdfLoading = false });
  }

  // ── Student Enrollments ────────────────────────────────────────────────────

  onExportEnrollmentsExcel(_scope: ExportScope): void {
    if (!this.enrollCourseId) {
      this.toast.info('Please select a course before exporting enrollments.');
      return;
    }
    const date = new Date().toISOString().slice(0, 10);
    this.exportSvc.exportToExcel(this.enrollments, this.ENROLLMENT_COLS,
      `securelms_enrollments_course${this.enrollCourseId}_${date}`);
  }

  onExportEnrollmentsPdf(_scope: ExportScope): void {
    if (!this.enrollCourseId) {
      this.toast.info('Please select a course before exporting enrollments.');
      return;
    }
    this.pdfLoading = true;
    const date = new Date().toISOString().slice(0, 10);
    const p    = new HttpParams().set('courseId', String(this.enrollCourseId));
    this.exportSvc.exportToPdf('enrollments/pdf', p,
      `securelms_enrollments_course${this.enrollCourseId}_${date}`)
      .subscribe({ complete: () => this.pdfLoading = false, error: () => this.pdfLoading = false });
  }

  formatDate(iso?: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}

