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
import { NavItem } from '../../core/models';
import { fadeIn } from '../animations';
import { PasswordExpiryBannerComponent } from '../password-expiry-banner/password-expiry-banner.component';
import { resolveRoleRoutePath, routesMatchForRole } from '../../core/navigation/app-routes';
import { Subscription, filter } from 'rxjs';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, PasswordExpiryBannerComponent],
  animations: [fadeIn],
  template: `
    <div class="dashboard" [class.resizing]="isResizingSidebar">
      <aside
        class="sidebar"
        [class.collapsed]="sidebarCollapsed"
        [style.width.px]="effectiveSidebarWidth"
        [style.minWidth.px]="effectiveSidebarWidth"
      >
        <div class="sidebar-header">
          <div class="sidebar-logo">
            <div class="logo-icon">school</div>
            @if (!sidebarCollapsed) {
              <span class="logo-text">Secure<strong>LMS</strong></span>
            }
          </div>
          <div class="user-badge">
            <div class="user-avatar">{{ userInitial }}</div>
            @if (!sidebarCollapsed) {
              <div class="user-info">
                <div class="user-name">{{ user?.username }}</div>
                <div class="user-role">{{ roleLabel }}</div>
              </div>
            }
          </div>
        </div>

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

        <div class="sidebar-footer">
          <div
            class="nav-item logout-item"
            (click)="onLogout()"
            [title]="sidebarCollapsed ? 'Logout' : ''"
          >
            <span class="nav-icon">logout</span>
            @if (!sidebarCollapsed) { <span>Logout</span> }
          </div>
        </div>
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

      <div class="main">
        <header class="topbar">
          <div class="topbar-left">
            <button
              class="collapse-btn"
              (click)="toggleSidebarCollapsed()"
              [title]="sidebarCollapsed ? 'Expand' : 'Collapse'"
              [attr.aria-label]="sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
            >
              <span class="collapse-icon">{{ sidebarCollapsed ? 'right_panel_open' : 'left_panel_close' }}</span>
            </button>
            <h1 class="page-title">{{ pageTitle }}</h1>
          </div>

          <div class="topbar-actions">
            <div class="notif-wrap" #notifWrap>
              <button
                type="button"
                class="notif-bell"
                title="Notifications"
                aria-label="Notifications"
                (click)="toggleNotifications($event)"
              >
                <span class="bell-icon">notifications</span>
                @if (hasPasswordAlert) { <span class="notif-dot"></span> }
              </button>

              <div
                class="notif-panel"
                [class.open]="isNotificationPanelVisible"
                (click)="$event.stopPropagation()"
              >
                <app-password-expiry-banner
                  [inPopover]="true"
                  (visibilityChange)="onPasswordBannerVisibilityChange($event)"
                />
                @if (!hasPasswordAlert) {
                  <div class="notif-empty">No notifications</div>
                }
              </div>
            </div>

            <ng-content select="[slot=topbar-actions]" />
          </div>
        </header>

        <main class="content" [@fadeIn]="activeSection">
          <ng-content></ng-content>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .dashboard { display: flex; height: 100vh; overflow: hidden; }
    .dashboard.resizing { cursor: col-resize; user-select: none; }

    .sidebar {
      background: var(--surface);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transition: width .3s cubic-bezier(.4,0,.2,1), min-width .3s;
      position: relative;
      z-index: 10;
    }
    .dashboard.resizing .sidebar { transition: none; }
    .sidebar.collapsed { width: 72px !important; min-width: 72px !important; }

    .sidebar-header {
      padding: 18px 14px;
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }
    .sidebar.collapsed .sidebar-header { padding-inline: 12px; }

    .sidebar-logo {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 16px;
      min-width: 0;
    }
    .logo-icon {
      width: 38px;
      height: 38px;
      background: var(--primary);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(79,70,229,.3);
    }
    .logo-text {
      font-size: 16px;
      color: var(--text);
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .logo-text strong { color: var(--primary); }

    .user-badge {
      background: var(--surface-2);
      border-radius: 10px;
      padding: 10px 12px;
      display: flex;
      align-items: center;
      gap: 10px;
      border: 1px solid var(--border);
      min-width: 0;
    }
    .sidebar.collapsed .user-badge { justify-content: center; padding-inline: 8px; }
    .user-avatar {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary), #818cf8);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 700;
      color: #fff;
      flex-shrink: 0;
    }
    .user-info { overflow: hidden; }
    .user-name {
      font-size: 13px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .user-role {
      font-size: 11px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: .5px;
    }

    .nav {
      padding: 12px 8px;
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
    }
    .nav-section {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: .08em;
      color: var(--text-muted);
      padding: 12px 10px 6px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 38px;
      padding: 9px 10px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      color: var(--text-muted);
      transition: background .18s, color .18s, transform .18s;
      margin-bottom: 2px;
      white-space: nowrap;
      overflow: hidden;
      min-width: 0;
    }
    .sidebar.collapsed .nav-item { justify-content: center; padding-inline: 8px; }
    .nav-item:hover { background: var(--surface-2); color: var(--text); }
    .nav-item.active {
      background: var(--primary-light);
      color: var(--primary);
      font-weight: 700;
    }
    .nav-parent {
      justify-content: flex-start;
    }
    .nav-parent .nav-toggle-icon {
      width: 8px;
      height: 8px;
    }
    .nav-static-children {
      padding-left: 8px;
      margin-bottom: 6px;
    }
    .nav-item.active .nav-icon { transform: scale(1.1); }
    .nav-item.logout-item { color: var(--danger); }
    .nav-item.logout-item:hover { background: rgba(220,38,38,.07); }
    .nav-icon {
      font-size: 16px;
      width: 20px;
      min-width: 20px;
      text-align: center;
      flex-shrink: 0;
      transition: transform .2s;
    }
    .nav-label {
      overflow: hidden;
      text-overflow: ellipsis;
      min-width: 0;
    }
    .nav-dynamic-group { font-weight: 700; color: var(--text); }
    .nav-dynamic-group.collapsed { color: var(--text-muted); }
    .nav-toggle-icon {
      display: inline-block;
      width: 10px;
      height: 10px;
      margin-left: auto;
      border-right: 2px solid currentColor;
      border-bottom: 2px solid currentColor;
      transform: rotate(45deg);
      transition: transform .2s ease;
    }
    .nav-toggle-icon.expanded {
      transform: rotate(135deg);
    }

    .nav-subgroup {
      padding-left: 8px;
      margin-bottom: 4px;
    }
    .nav-subgroup-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      margin-bottom: 4px;
      padding-left: 10px;
    }
    .nav-subitem {
      display: flex;
      align-items: center;
      gap: 9px;
      padding: 8px 10px 8px 24px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      color: var(--text-muted);
      transition: all .18s;
      margin-bottom: 2px;
      text-decoration: none;
      overflow: hidden;
      white-space: nowrap;
      min-width: 0;
    }
    .nav-static-children .nav-subitem {
      padding-left: 18px;
    }
    .nav-function-link {
      padding-left: 24px;
      color: var(--text-muted);
    }
    .nav-subitem:hover { background: var(--surface-2); color: var(--text); }
    .nav-subitem.disabled { color: var(--text-muted); pointer-events: none; }
    .sidebar-menu-loading {
      padding: 10px 12px;
      color: var(--text-muted);
      font-size: 13px;
    }

    .sidebar-footer {
      padding: 12px 8px;
      border-top: 1px solid var(--border);
      flex-shrink: 0;
    }

    .sidebar-resize-handle {
      position: absolute;
      top: 0;
      right: -3px;
      width: 7px;
      height: 100%;
      cursor: col-resize;
      z-index: 20;
    }
    .sidebar-resize-handle::after {
      content: '';
      position: absolute;
      top: 0;
      bottom: 0;
      left: 3px;
      width: 1px;
      background: transparent;
      transition: background .18s, box-shadow .18s;
    }
    .sidebar-resize-handle:hover::after,
    .dashboard.resizing .sidebar-resize-handle::after {
      background: var(--primary);
      box-shadow: 0 0 0 2px rgba(79,70,229,.12);
    }

    .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }
    .topbar {
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      padding: 14px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
      box-shadow: 0 1px 3px rgba(0,0,0,.04);
    }
    .topbar-left { display: flex; align-items: center; gap: 14px; }
    .collapse-btn {
      width: 32px;
      height: 32px;
      border: 1.5px solid var(--border);
      border-radius: 8px;
      background: var(--surface-2);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      color: var(--text-muted);
      transition: all .2s;
    }
    .collapse-btn:hover { background: var(--border); color: var(--text); }
    .collapse-icon {
      font-family: 'Material Symbols Outlined';
      font-size: 18px;
      line-height: 1;
    }
    .page-title { font-size: 18px; font-weight: 700; }
    .topbar-actions { display: flex; gap: 10px; align-items: center; }

    .notif-wrap { position: relative; }
    .notif-bell {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: var(--surface-2);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      position: relative;
      transition: all .18s;
    }
    .notif-bell:hover { background: var(--border); }
    .bell-icon { font-size: 16px; line-height: 1; }
    .notif-dot {
      position: absolute;
      top: 7px;
      right: 7px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #ef4444;
      box-shadow: 0 0 0 2px var(--surface-2);
    }

    .notif-panel {
      position: absolute;
      top: calc(100% + 10px);
      right: 0;
      width: min(640px, calc(100vw - 40px));
      z-index: 100;
      opacity: 0;
      transform: translateY(-8px) scale(.98);
      pointer-events: none;
      transition: opacity .2s ease, transform .2s ease;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,.14);
    }
    .notif-panel.open {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: auto;
    }
    .notif-empty {
      font-size: 13px;
      color: var(--text-muted);
      padding: 8px 10px 10px;
    }

    .content { flex: 1; overflow-y: auto; padding: 20px 28px 28px; background: var(--dark); }

    @media (max-width: 768px) {
      .sidebar:not(.collapsed) {
        width: min(300px, 82vw) !important;
        min-width: min(300px, 82vw) !important;
      }
      .sidebar-resize-handle { display: none; }
      .topbar { padding-inline: 16px; }
      .content { padding: 16px; }
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

  sidebarCollapsed = false;
  hasPasswordAlert = false;
  notificationOpen = false;
  autoPreviewVisible = false;
  menuLoading = false;
  isResizingSidebar = false;
  sidebarWidth = 260;
  private autoPreviewTimer: ReturnType<typeof setTimeout> | null = null;
  private routeEvents?: Subscription;

  private auth = inject(AuthService);
  private menuService = inject(MenuService);
  private router = inject(Router);
  private toast = inject(ToastService);

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
    }
  }

  onPasswordBannerVisibilityChange(visible: boolean): void {
    this.hasPasswordAlert = visible;

    if (!visible) {
      this.notificationOpen = false;
      this.autoPreviewVisible = false;
      this.clearAutoPreviewTimer();
      return;
    }

    if (!this.notificationOpen) {
      this.autoPreviewVisible = true;
      this.clearAutoPreviewTimer();
      this.autoPreviewTimer = setTimeout(() => {
        this.autoPreviewVisible = false;
      }, 3600);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const host = this.notificationHost?.nativeElement;
    if (!host) return;
    if (!host.contains(event.target as Node)) {
      this.notificationOpen = false;
    }
  }

  ngOnInit(): void {
    this.sidebarWidth = this.loadSidebarWidth();
    if (this.auth.isLoggedIn()) {
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
