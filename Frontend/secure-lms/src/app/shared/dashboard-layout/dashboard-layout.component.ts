import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
  ViewChild,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { MenuService } from '../../core/services/menu.service';
import { ToastService } from '../../core/services/toast.service';
import { ApiService } from '../../core/services/api.service';
import { NotificationService } from '../../core/services/notification.service';
import { NavItem } from '../../core/models';
import { fadeIn } from '../animations';
import { PasswordExpiryBannerComponent } from '../password-expiry-banner/password-expiry-banner.component';
import { BreadcrumbComponent } from '../breadcrumb/breadcrumb.component';
import { resolveRoleRoutePath, routesMatchForRole } from '../../core/navigation/app-routes';
import { Subscription, filter } from 'rxjs';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, PasswordExpiryBannerComponent, BreadcrumbComponent],
  animations: [fadeIn],
  template: `
    <div class="dashboard" [class.resizing]="isResizingSidebar">
      <!-- GLOBAL HEADER -->
      <header class="global-header">
        <div class="header-left">
          <button
            class="collapse-btn"
            (click)="toggleSidebarCollapsed()"
            [title]="sidebarCollapsed ? 'Expand' : 'Collapse'"
            [attr.aria-label]="sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
          >
            <span class="collapse-icon material-symbols-outlined">{{ sidebarCollapsed ? 'menu' : 'menu_open' }}</span>
          </button>
          <div class="header-brand">
            <!--<img src="/assets/images/bihar_logo.png" alt="Bihar Logo" class="header-logo" /> -->
            <span class="header-title">SecureLms</span>
          </div>

        </div>

        <div class="header-right">
          <div class="notif-wrap" #notifWrap>
            <button
              type="button"
              class="notif-bell"
              title="Notifications"
              aria-label="Notifications"
              (click)="toggleNotifications($event)"
            >
              <span class="bell-icon material-symbols-outlined">notifications</span>
              @if (notifService.hasUnread) { <span class="notif-dot"></span> }
            </button>

            <div
              class="notif-panel"
              [class.open]="isNotificationPanelVisible"
              (click)="$event.stopPropagation()"
            >
              <div class="notif-header">
                <span>Notifications</span>
                @if (notifService.notifications().length > 0) {
                  <button class="clear-btn" (click)="notifService.clearAll()">Clear All</button>
                }
              </div>

              @if (notifService.loading()) {
                <div class="notif-empty">Loading notifications...</div>
              } @else if (notifService.notifications().length > 0) {
                <div class="notif-list">
                  @for (notif of notifService.notifications(); track notif.id) {
                    @if (notif.type === 'PASSWORD_EXPIRY') {
                      <app-password-expiry-banner
                        [status]="notif.data"
                        [inPopover]="true"
                        (dismissed)="notifService.dismissPasswordWarning()"
                      />
                    } @else if (notif.type === 'AUDIT_LOG') {
                      <div class="audit-log-item">
                        <div class="audit-log-icon" [ngClass]="notif.data.outcome === 'SUCCESS' ? 'success' : 'failure'">
                          <span class="material-symbols-outlined">
                            {{ notif.data.eventType.includes('LOGIN') ? 'login' : notif.data.eventType.includes('USER') ? 'person' : 'history' }}
                          </span>
                        </div>
                        <div class="audit-log-content">
                          <div class="audit-log-title">{{ notif.data.username || notif.data.fullName || 'System' }} {{ notif.data.eventType.toLowerCase().replace('_', ' ') }}</div>
                          <div class="audit-log-time">{{ notif.data.createdAt | date:'medium' }}</div>
                        </div>
                      </div>
                    }
                  }
                </div>
                @if (auth.role() === 'SUPER_ADMIN') {
                  <div class="notif-footer" routerLink="/admin/audit-logs">View all audit logs</div>
                }
              } @else {
                <div class="notif-empty">No notifications</div>
              }
            </div>
          </div>

          <!-- User Profile Dropdown -->
          <div class="profile-wrap" #profileWrap>
            <div class="user-menu-btn" (click)="toggleProfileMenu($event)">
              <div class="user-avatar">{{ userInitial }}</div>
              <span class="user-welcome">Welcome <br> {{ user?.username }}</span>
              <span class="material-symbols-outlined dropdown-icon">expand_more</span>
            </div>

            <div class="profile-dropdown" [class.open]="profileMenuOpen">
              <a class="dropdown-item" routerLink="/profile"><span class="material-symbols-outlined">person</span> My Profile</a>
              <a class="dropdown-item"><span class="material-symbols-outlined">settings</span> Setting</a>
              <div class="dropdown-divider"></div>
              <a class="dropdown-item text-danger" (click)="onLogout()"><span class="material-symbols-outlined">logout</span> Logout</a>
            </div>
          </div>

          <!-- Date and Time Display -->
          <div class="datetime-display">
            <div class="date">{{ now | date:'dd-MM-yyyy' }}</div>
            <div class="time">{{ now | date:'hh:mm a' }}</div>

          </div>

          <!-- Dedicated Logout Button -->
          <button class="header-logout-btn" (click)="onLogout()" title="Logout">
            <span class="material-symbols-outlined">logout</span>
          </button>
        </div>
      </header>

      <div class="dashboard-body">
        <aside
          class="sidebar"
          [class.collapsed]="sidebarCollapsed"
          [style.width.px]="effectiveSidebarWidth"
          [style.minWidth.px]="effectiveSidebarWidth"
        >
          <nav class="nav" aria-label="Primary navigation">
          @for (group of navGroups; track group.label) {
            @if (!sidebarCollapsed) {
              <div class="nav-section">{{ group.label }}</div>
            }
            @for (item of group.items; track item.section) {
              @if (item.children?.length) {
                <div
                  class="nav-item nav-parent"
                  [class.active]="isChildActive(item)"
                  [class.collapsed]="!isStaticGroupExpanded(item.section)"
                  (click)="toggleStaticGroup(item.section)"
                  [title]="sidebarCollapsed ? item.label : ''"
                >
                  <span class="nav-icon">{{ item.icon }}</span>
                  @if (!sidebarCollapsed) {
                    <span>{{ item.label }}</span>
                    <span class="nav-toggle-icon" [class.expanded]="isStaticGroupExpanded(item.section)"></span>
                  }
                </div>
                @if (!sidebarCollapsed && isStaticGroupExpanded(item.section)) {
                  <div class="nav-static-children">
                    @for (child of item.children; track child.section) {
                      <div
                        class="nav-item nav-subitem"
                        [class.active]="activeSection === child.section"
                        (click)="onNavClick(child.section)"
                      >
                        <span class="nav-icon">{{ child.icon }}</span>
                        <span>{{ child.label }}</span>
                      </div>
                    }
                  </div>
                }
              } @else {
                <div
                  class="nav-item"
                  [class.active]="activeSection === item.section"
                  (click)="onNavClick(item.section)"
                  [title]="sidebarCollapsed ? item.label : ''"
                >
                  <span class="nav-icon">{{ item.icon }}</span>
                  @if (!sidebarCollapsed) {
                    <span>{{ item.label }}</span>
                  }
                </div>
              }
            }
          }
          @if ($any(menu())?.length > 0) {
            @for (group of menu(); track group.globalLink.id) {
              <div
                class="nav-item nav-parent nav-dynamic-group"
                [class.active]="isGlobalActive(group.globalLink.id)"
                [class.collapsed]="!isGlobalExpanded(group.globalLink.id)"
                (click)="toggleGlobal(group.globalLink.id)"
                [title]="sidebarCollapsed ? group.globalLink.displayName : ''"
              >
                <span class="nav-icon">folder</span>
                @if (!sidebarCollapsed) {
                  <span class="nav-label">{{ group.globalLink.displayName }}</span>
                  <span class="nav-toggle-icon" [class.expanded]="isGlobalExpanded(group.globalLink.id)"></span>
                }
              </div>
              @if (!sidebarCollapsed && isGlobalExpanded(group.globalLink.id)) {
                @for (fun of group.functionLinks; track fun.functionLink.id) {
                  <div class="nav-subgroup">
                    @for (item of fun.primaryLinks; track item.id) {
                      <a
                        class="nav-item nav-subitem nav-function-link"
                        [routerLink]="fun.functionLink.routePath ? resolvedRoutePath(fun.functionLink.routePath) : null"
                        [class.active]="fun.functionLink.routePath ? isRouteActive(fun.functionLink.routePath) : false"
                        [class.disabled]="!$any(fun.permissions)?.canView"
                        [attr.aria-disabled]="!$any(fun.permissions)?.canView"
                      >
                        <span class="nav-icon">link</span>
                        <span class="nav-label">{{ item.displayName }}</span>
                      </a>
                    }
                  </div>
                }
              }
            }
          } @else if (menuLoading) {
            <div class="sidebar-menu-loading">Loading menu...</div>
          }
        </nav>

          @if (!sidebarCollapsed) {
            <div
              class="sidebar-resize-handle"
              role="separator"
              aria-orientation="vertical"
              title="Drag to resize sidebar"
              (pointerdown)="startSidebarResize($event)"
            ></div>
          }
        </aside>

        <div class="main-wrapper">
          <main class="content" [@fadeIn]="activeSection">
            <app-breadcrumb></app-breadcrumb>
            <ng-content></ng-content>
          </main>

          <footer class="global-footer">
            Secure LMS - NexusLearn
          </footer>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* GLOBAL LAYOUT */
    .dashboard { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
    .dashboard-body { display: flex; flex: 1; overflow: hidden; position: relative; }
    .main-wrapper { display: flex; flex-direction: column; flex: 1; overflow: hidden; background: #f3f4f6; }
    .content { flex: 1; overflow-y: auto; padding: 20px 28px 28px; }
    .dashboard.resizing { cursor: col-resize; user-select: none; }
    .dashboard.resizing .sidebar { transition: none; }

    /* HEADER */
    .global-header {
      height: 64px;
      background: #1d2d5e;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
      flex-shrink: 0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      z-index: 20;
    }
    .header-left { display: flex; align-items: center; gap: 20px; }
    .collapse-btn {
      background: transparent;
      border: none;
      color: #fff;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 6px;
      border-radius: 4px;
      transition: background 0.2s;
    }
    .collapse-btn:hover { background: rgba(255,255,255,0.1); }
    .collapse-icon { font-size: 24px; }

    .header-brand { display: flex; align-items: center; gap: 12px; }
    .header-logo { height: 40px; }
    .header-title { font-size: 18px; font-weight: 600; }

    .header-right { display: flex; align-items: center; gap: 16px; }

    /* NOTIFICATIONS */
    .notif-wrap { position: relative; }
    .notif-bell {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: none;
      background: rgba(255,255,255,0.1);
      color: #fff;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      position: relative;
      transition: background 0.2s;
    }
    .notif-bell:hover { background: rgba(255,255,255,0.2); }
    .bell-icon { font-size: 20px; }
    .notif-dot {
      position: absolute; top: 4px; right: 4px; width: 8px; height: 8px;
      border-radius: 50%; background: #ef4444; border: 2px solid #1d2d5e;
    }
    .notif-panel {
      position: absolute; top: calc(100% + 10px); right: 0;
      width: 320px; z-index: 100; opacity: 0; transform: translateY(-8px) scale(.98);
      pointer-events: none; transition: all .2s;
      background: #fff; color: #333; border: 1px solid #ddd;
      border-radius: 8px; padding: 12px; box-shadow: 0 10px 30px rgba(0,0,0,.14);
    }
    .notif-panel.open { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
    .notif-empty { font-size: 13px; color: #888; padding: 16px; text-align: center; }

    .notif-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--border); font-weight: 600; font-size: 14px; color: var(--text); }
    .clear-btn { background: none; border: none; color: var(--primary); font-size: 12px; font-weight: 500; cursor: pointer; padding: 4px 8px; border-radius: 4px; }
    .clear-btn:hover { background: var(--surface-hover); }

    .notif-list { max-height: 350px; overflow-y: auto; padding-right: 4px; padding-top: 4px; display: flex; flex-direction: column; gap: 10px; }
    .notif-list::-webkit-scrollbar { width: 4px; }
    .notif-list::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
    .audit-log-item { display: flex; gap: 12px; padding: 12px 16px; border-radius: 10px; border: 1px solid #e2e8f0; border-left: 4px solid var(--primary); background: #f8fafc; transition: background 0.2s, transform 0.2s; box-shadow: 0 2px 5px rgba(0,0,0,0.03); margin: 0; }
    .audit-log-item:last-child { margin-bottom: 0; }
    .audit-log-item:hover { background: #fff; transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.06); }
    .audit-log-icon { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; background: var(--surface-hover); color: var(--text-muted); }
    .audit-log-icon.success { color: var(--success); background: rgba(34, 197, 94, 0.1); }
    .audit-log-icon.failure { color: var(--danger); background: rgba(239, 68, 68, 0.1); }
    .audit-log-content { display: flex; flex-direction: column; gap: 4px; }
    .audit-log-title { font-size: 13px; color: var(--text); font-weight: 500; text-transform: capitalize; }
    .audit-log-time { font-size: 11px; color: var(--text-muted); }
    .notif-footer { display: block; padding: 10px; text-align: center; font-size: 13px; color: var(--primary); cursor: pointer; border-top: 1px solid var(--border); font-weight: 500; }
    .notif-footer:hover { background: var(--surface-hover); text-decoration: underline; }

    /* DATE AND TIME DISPLAY */
    .datetime-display {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      margin-left: 16px;
      margin-right: 8px;
      color: #fff;
      line-height: 1.2;
    }
    .datetime-display .time {
      font-size: 14px;
      font-weight: 600;
    }
    .datetime-display .date {
      font-size: 11px;
      opacity: 0.9;
    }

    /* USER PROFILE MENU */
    .profile-wrap { position: relative; }
    .user-menu-btn {
      display: flex; align-items: center; gap: 10px; cursor: pointer;
      padding: 6px 12px; border-radius: 20px; transition: background 0.2s;
    }
    .user-menu-btn:hover { background: rgba(255,255,255,0.1); }
    .user-avatar {
      width: 32px; height: 32px; border-radius: 50%;
      background: #d87625; color: #fff; font-weight: bold; font-size: 14px;
      display: flex; align-items: center; justify-content: center;
    }
    .user-welcome { font-size: 14px; font-weight: 500; }
    .dropdown-icon { font-size: 20px; }

    .profile-dropdown {
      position: absolute; top: calc(100% + 10px); right: 0; width: 200px;
      background: #fff; color: #333; border: 1px solid #ddd; border-radius: 8px;
      box-shadow: 0 10px 30px rgba(0,0,0,.1); z-index: 100;
      opacity: 0; transform: translateY(-8px) scale(0.98); pointer-events: none; transition: all 0.2s;
      display: flex; flex-direction: column; padding: 8px 0;
    }
    .profile-dropdown.open { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
    .dropdown-item {
      padding: 10px 16px; font-size: 14px; display: flex; align-items: center; gap: 10px;
      cursor: pointer; transition: background 0.2s; color: #333; text-decoration: none;
    }
    .dropdown-item:hover { background: #f3f4f6; color: #d87625; }
    .dropdown-item.text-danger { color: #ef4444; }
    .dropdown-item.text-danger:hover { background: #fef2f2; color: #dc2626; }
    .dropdown-item .material-symbols-outlined { font-size: 18px; }
    .dropdown-divider { height: 1px; background: #eee; margin: 4px 0; }

    .header-logout-btn {
      background: transparent; border: none; color: #ef4444; cursor: pointer;
      display: flex; align-items: center; justify-content: center; padding: 6px;
      border-radius: 4px; transition: background 0.2s;
    }
    .header-logout-btn:hover { background: rgba(239,68,68,0.1); }

    /* SIDEBAR */
    .sidebar {
      background: #1d2d5e;
      color: #fff;
      display: flex;
      flex-direction: column;
      overflow-x: hidden; overflow-y: auto;
      transition: width .3s, min-width .3s;
      position: relative;
      z-index: 10;
      box-shadow: 2px 0 8px rgba(0,0,0,0.05);
    }
    .sidebar.collapsed { width: 72px !important; min-width: 72px !important; }

    .nav { flex: 1; padding: 16px 0; display: flex; flex-direction: column; gap: 4px; }
    .nav-section {
      padding: 16px 20px 8px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: .05em;
      color: rgba(255,255,255,0.5);
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 20px;
      color: #fff;
      cursor: pointer;
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
      transition: color .2s ease;
      position: relative;
    }
    .sidebar.collapsed .nav-item { justify-content: center; padding-inline: 0; }

    .nav-icon {
      font-family: 'Material Symbols Outlined';
      font-size: 20px;
      flex-shrink: 0;
    }

    .nav-item:hover, .nav-item.active {
      color: #d87625;
    }

    .nav-label {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .nav-toggle-icon {
      width: 16px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform .2s;
    }
    .nav-toggle-icon::before {
      content: 'expand_more';
      font-family: 'Material Symbols Outlined';
      font-size: 18px;
    }
    .nav-toggle-icon.expanded { transform: rotate(180deg); }

    .nav-static-children, .nav-subgroup {
      display: flex;
      flex-direction: column;
      background: rgba(0,0,0,0.1);
      margin-bottom: 4px;
    }
    .nav-subitem { padding-left: 52px; font-size: 13px; }
    .sidebar.collapsed .nav-subitem { padding-left: 0; justify-content: center; }

    .sidebar-menu-loading { padding: 20px; color: rgba(255,255,255,0.6); font-size: 13px; text-align: center; }

    .sidebar-resize-handle {
      position: absolute;
      top: 0; right: 0; bottom: 0; width: 5px;
      cursor: col-resize; z-index: 20;
    }
    .sidebar-resize-handle:hover, .dashboard.resizing .sidebar-resize-handle {
      background: rgba(255,255,255,0.1);
    }

    /* FOOTER */
    .global-footer {
      background: #dad8d8;
      color: #000;
      text-align: center;
      padding: 12px 20px;
      font-size: 13px;
      font-weight: 500;
      border-top: 1px solid #ddd;
      flex-shrink: 0;
    }

    @media (max-width: 768px) {
      .header-title { display: none; }
      .user-welcome { display: none; }
      .sidebar:not(.collapsed) {
        position: absolute; height: 100%;
        width: min(300px, 82vw) !important;
        min-width: min(300px, 82vw) !important;
      }
      .sidebar-resize-handle { display: none; }
    }
  `]
})
export class DashboardLayoutComponent implements OnInit, OnDestroy {
  private readonly collapsedSidebarWidth = 72;
  private readonly minSidebarWidth = 220;
  private readonly maxSidebarWidth = 420;
  private readonly sidebarWidthKey = 'dashboard_sidebar_width';

  @Input() navGroups: { label: string; items: NavItem[] }[] = [];
  @Input() activeSection = '';
  @Input() pageTitle = 'Dashboard';
  @Input() roleLabel = '';
  @Output() sectionChange = new EventEmitter<string>();
  @ViewChild('notifWrap') notificationHost?: ElementRef<HTMLElement>;
  @ViewChild('profileWrap') profileHost?: ElementRef<HTMLElement>;


  sidebarCollapsed = false;
  profileMenuOpen = false;

  now = new Date();
  private timeInterval: ReturnType<typeof setInterval> | null = null;

  notificationOpen = false;
  autoPreviewVisible = false;
  menuLoading = false;
  isResizingSidebar = false;
  sidebarWidth = 260;
  private autoPreviewTimer: ReturnType<typeof setTimeout> | null = null;
  private routeEvents?: Subscription;

  auth = inject(AuthService);
  notifService = inject(NotificationService);
  private menuService = inject(MenuService);
  private router = inject(Router);
  private toast = inject(ToastService);
  apiService = inject(ApiService);

  readonly menu = this.menuService.menu;

  get user() { return this.auth.user(); }
  get userInitial(): string { return (this.user?.username?.charAt(0) ?? 'U').toUpperCase(); }
  get isNotificationPanelVisible(): boolean { return this.notificationOpen || this.autoPreviewVisible; }
  get effectiveSidebarWidth(): number { return this.sidebarCollapsed ? this.collapsedSidebarWidth : this.sidebarWidth; }

  onNavClick(section: string): void {
    this.sectionChange.emit(section);
  }

  onLogout(): void {
    this.auth.logout().subscribe({
      next: () => this.toast.info('Logged out successfully'),
      error: () => this.toast.error('Logout failed. Please try again.')
    });
  }

  toggleSidebarCollapsed(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  toggleNotifications(event: MouseEvent): void {
    event.stopPropagation();
    this.notificationOpen = !this.notificationOpen;
    if (this.notificationOpen) {
      this.autoPreviewVisible = false;
      this.clearAutoPreviewTimer();
      this.notifService.markAllAsRead();
    }
  }



  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const notifHost = this.notificationHost?.nativeElement;
    if (notifHost && !notifHost.contains(event.target as Node)) {
      this.notificationOpen = false;
    }
    const profileHost = this.profileHost?.nativeElement;
    if (profileHost && !profileHost.contains(event.target as Node)) {
      this.profileMenuOpen = false;
    }
  }

  toggleProfileMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.profileMenuOpen = !this.profileMenuOpen;
  }

  ngOnInit(): void {
    this.timeInterval = setInterval(() => {
      this.now = new Date();
    }, 1000);
    this.sidebarWidth = this.loadSidebarWidth();
    if (this.auth.isLoggedIn()) {
      this.notifService.loadNotifications();
      // Auto-preview logic can be added later if needed

      this.menuLoading = true;
      this.menuService.refreshMenu().subscribe({
        next: () => {
          this.menuLoading = false;
          this.expandActiveGlobal();
        },
        error: () => this.menuLoading = false
      });
    }

    this.routeEvents = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => this.expandActiveGlobal());
  }

  isGlobalExpanded(globalLinkId: number): boolean {
    return this.menuService.getGlobalExpanded(globalLinkId);
  }

  toggleGlobal(globalLinkId: number): void {
    if (this.isGlobalExpanded(globalLinkId)) {
      this.menuService.setGlobalExpanded(globalLinkId, false);
      return;
    }
    this.menuService.expandOnlyGlobal(globalLinkId);
  }

  isGlobalActive(globalLinkId: number): boolean {
    return this.menuService.findActiveRouteKeys(this.router.url)?.globalId === globalLinkId;
  }

  isRouteActive(routePath: string): boolean {
    return routesMatchForRole(routePath, this.router.url, this.auth.role());
  }

  isChildActive(item: NavItem): boolean {
    return item.children?.some(child => child.section === this.activeSection) ?? false;
  }

  isStaticGroupExpanded(section: string): boolean {
    return localStorage.getItem(`nav_static_group_${section}`) !== 'collapsed';
  }

  toggleStaticGroup(section: string): void {
    const expanded = this.isStaticGroupExpanded(section);
    localStorage.setItem(`nav_static_group_${section}`, expanded ? 'collapsed' : 'expanded');
  }

  resolvedRoutePath(routePath: string): string {
    return resolveRoleRoutePath(routePath, this.auth.role());
  }

  startSidebarResize(event: PointerEvent): void {
    event.preventDefault();
    this.isResizingSidebar = true;
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  @HostListener('document:pointermove', ['$event'])
  onSidebarResize(event: PointerEvent): void {
    if (!this.isResizingSidebar || this.sidebarCollapsed) return;
    this.sidebarWidth = this.clampSidebarWidth(event.clientX);
  }

  @HostListener('document:pointerup')
  stopSidebarResize(): void {
    if (!this.isResizingSidebar) return;
    this.isResizingSidebar = false;
    localStorage.setItem(this.sidebarWidthKey, String(this.sidebarWidth));
  }

  ngOnDestroy(): void {
    if (this.timeInterval) clearInterval(this.timeInterval);
    this.clearAutoPreviewTimer();
    this.routeEvents?.unsubscribe();
  }

  private clearAutoPreviewTimer(): void {
    if (this.autoPreviewTimer) {
      clearTimeout(this.autoPreviewTimer);
      this.autoPreviewTimer = null;
    }
  }

  private expandActiveGlobal(): void {
    const active = this.menuService.findActiveRouteKeys(this.router.url);
    if (active) {
      this.menuService.expandOnlyGlobal(active.globalId);
    }
  }

  private loadSidebarWidth(): number {
    const stored = Number(localStorage.getItem(this.sidebarWidthKey));
    return Number.isFinite(stored) ? this.clampSidebarWidth(stored) : 260;
  }

  private clampSidebarWidth(width: number): number {
    return Math.min(this.maxSidebarWidth, Math.max(this.minSidebarWidth, Math.round(width)));
  }
}
