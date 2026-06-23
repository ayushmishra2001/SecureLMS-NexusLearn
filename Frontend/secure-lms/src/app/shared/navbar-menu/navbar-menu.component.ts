import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { MenuService } from '../../core/services/menu.service';
import { NavbarGlobalGroup } from '../../core/models';
import { resolveRoleRoutePath } from '../../core/navigation/app-routes';

@Component({
  selector: 'app-navbar-menu',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    @if (auth.isLoggedIn()) {
      <nav class="navbar-menu" *ngIf="showMenu">
        @if (loading) {
          <div class="navbar-empty">Loading menu...</div>
        } @else if (!($any(menu())?.length > 0)) {
          <div class="navbar-empty">No menu items available...</div>
        } @else {
          @for (group of menu(); track group.globalLink.id) {
            <div class="navbar-group">
              <button class="navbar-group-button" (click)="toggleGlobal(group.globalLink.id)">
                <span>{{ group.globalLink.displayName }}</span>
                <span class="navbar-group-icon">{{ isGlobalExpanded(group.globalLink.id) ? 'expand_less' : 'expand_more' }}</span>
              </button>
              @if (isGlobalExpanded(group.globalLink.id)) {
                <div class="navbar-functions">
                  @for (fun of group.functionLinks; track fun.functionLink.id) {
                    <div class="navbar-function">
                      <button class="navbar-function-button" (click)="toggleFunction(fun.functionLink.id)">
                        <span>{{ fun.functionLink.displayName }}</span>
                        <span class="permission-pill" [class.disabled]="!fun.permissions?.canView">View</span>
                        <span class="navbar-group-icon">{{ isFunctionExpanded(fun.functionLink.id) ? 'expand_less' : 'expand_more' }}</span>
                      </button>
                      @if (isFunctionExpanded(fun.functionLink.id)) {
                        <div class="navbar-primaries">
                          @for (item of fun.primaryLinks; track item.id) {
                            <a class="navbar-primary" [routerLink]="resolvedRoutePath(item.routePath)" (click)="selectRoute(item.routePath)">
                              {{ item.displayName }}
                            </a>
                          }
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          }
        }
      </nav>
    }
  `,
  styles: [
    `
    .navbar-menu {
      width: 100%;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      padding: 10px 20px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .navbar-empty {
      color: var(--text-muted);
      font-size: 14px;
      padding: 12px 0;
    }
    .navbar-group {
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow: hidden;
      background: var(--surface-2);
    }
    .navbar-group-button,
    .navbar-function-button {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 16px;
      border: none;
      background: transparent;
      text-align: left;
      cursor: pointer;
      font-weight: 600;
      color: var(--text);
      transition: background .2s;
    }
    .navbar-group-button:hover,
    .navbar-function-button:hover {
      background: rgba(79,70,229,.05);
    }
    .navbar-functions {
      display: flex;
      flex-direction: column;
      gap: 1px;
      background: var(--surface);
    }
    .navbar-function {
      border-top: 1px solid var(--border);
    }
    .navbar-primaries {
      display: flex;
      flex-direction: column;
      gap: 1px;
      padding: 0 0 10px 26px;
      background: var(--surface-2);
    }
    .navbar-primary {
      padding: 10px 16px;
      display: block;
      color: var(--text);
      text-decoration: none;
      border-radius: 0 0 0 0;
      transition: background .2s;
    }
    .navbar-primary:hover {
      background: rgba(79,70,229,.08);
    }
    .navbar-group-icon {
      font-family: 'Material Icons';
      font-size: 18px;
    }
    .permission-pill {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 999px;
      background: var(--primary-light);
      color: var(--primary);
      margin-left: auto;
    }
    .permission-pill.disabled {
      background: rgba(107,114,128,.12);
      color: var(--text-muted);
    }
  `]
})
export class NavbarMenuComponent implements OnInit {
  auth = inject(AuthService);
  private menuService = inject(MenuService);
  private router = inject(Router);

  menu = this.menuService.menu;
  loading = false;
  showMenu = false;

  ngOnInit(): void {
    if (!this.auth.isLoggedIn()) {
      return;
    }
    this.loading = true;
    this.menuService.refreshMenu().subscribe({
      next: menu => {
        this.loading = false;
        this.showMenu = true;
        const active = this.menuService.findActiveRouteKeys(this.router.url);
        if (active) {
          localStorage.setItem(`navbar_state_${active.globalId}`, 'expanded');
          localStorage.setItem(`navbar_function_state_${active.functionId}`, 'expanded');
        }
      },
      error: () => {
        this.loading = false;
        this.showMenu = true;
      }
    });
  }

  isGlobalExpanded(id: number): boolean {
    return this.menuService.getGlobalExpanded(id);
  }

  isFunctionExpanded(id: number): boolean {
    return this.menuService.getFunctionExpanded(id);
  }

  toggleGlobal(id: number): void {
    this.menuService.toggleGlobalExpanded(id);
  }

  toggleFunction(id: number): void {
    this.menuService.toggleFunctionExpanded(id);
  }

  resolvedRoutePath(routePath: string): string {
    return resolveRoleRoutePath(routePath, this.auth.role());
  }

  selectRoute(routePath: string): void {
    this.router.navigateByUrl(this.resolvedRoutePath(routePath));
  }
}
