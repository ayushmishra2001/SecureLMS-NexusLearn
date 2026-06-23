import { Injectable, signal } from '@angular/core';
import { catchError, map, of, tap } from 'rxjs';
import { ApiService } from './api.service';
import { ApiResponse, NavbarGlobalGroup, PermissionFlags } from '../models';
import { AuthService } from './auth.service';
import { routesMatchForRole } from '../navigation/app-routes';

@Injectable({ providedIn: 'root' })
export class MenuService {
  private readonly ttlMs = 5 * 60 * 1000;
  private lastFetched = 0;
  private readonly _menu = signal<NavbarGlobalGroup[] | null>(null);
  readonly menu = this._menu.asReadonly();

  constructor(private api: ApiService, private auth: AuthService) {}

  refreshMenu(force = false) {
    if (!force && this._menu() && Date.now() - this.lastFetched < this.ttlMs) {
      return of(this._menu() as NavbarGlobalGroup[]);
    }

    return this.api.getNavbarMenu().pipe(
      tap(res => {
        const menu = res.data || [];
        this._menu.set(menu);
        this.lastFetched = Date.now();
      }),
      map(res => res.data || []),
      catchError(() => {
        this._menu.set(this._menu() || []);
        return of(this._menu() || []);
      })
    );
  }

  findFunctionPermissionsByRoute(route: string): PermissionFlags | null {
    if (!this._menu()) return null;
    const normalized = route.split('?')[0];
    const role = this.auth.role();
    for (const group of this._menu() || []) {
      for (const functionLink of group.functionLinks || []) {
        if (functionLink.functionLink.routePath && routesMatchForRole(functionLink.functionLink.routePath, normalized, role)) {
          return functionLink.permissions ?? null;
        }
      }
    }
    return null;
  }

  findActiveRouteKeys(route: string) {
    if (!this._menu()) return null;
    const normalized = route.split('?')[0];
    const role = this.auth.role();
    for (const group of this._menu() || []) {
      for (const functionLink of group.functionLinks || []) {
        if (functionLink.functionLink.routePath && routesMatchForRole(functionLink.functionLink.routePath, normalized, role)) {
          // If a function link matches, return its info and its first primary link as the selected id
          const primaryId = functionLink.primaryLinks && functionLink.primaryLinks.length > 0 ? functionLink.primaryLinks[0].id : 0;
          return {
            globalId: group.globalLink.id,
            functionId: functionLink.functionLink.id,
            primaryId: primaryId
          };
        }
      }
    }
    return null;
  }

  getGlobalExpanded(globalLinkId: number): boolean {
    return localStorage.getItem(`navbar_state_${globalLinkId}`) !== 'collapsed';
  }

  toggleGlobalExpanded(globalLinkId: number): void {
    const expanded = this.getGlobalExpanded(globalLinkId);
    localStorage.setItem(`navbar_state_${globalLinkId}`, expanded ? 'collapsed' : 'expanded');
  }

  setGlobalExpanded(globalLinkId: number, expanded: boolean): void {
    localStorage.setItem(`navbar_state_${globalLinkId}`, expanded ? 'expanded' : 'collapsed');
  }

  expandOnlyGlobal(globalLinkId: number): void {
    for (const group of this._menu() || []) {
      this.setGlobalExpanded(group.globalLink.id, group.globalLink.id === globalLinkId);
    }
  }

  getFunctionExpanded(functionLinkId: number): boolean {
    return localStorage.getItem(`navbar_function_state_${functionLinkId}`) !== 'collapsed';
  }

  toggleFunctionExpanded(functionLinkId: number): void {
    const expanded = this.getFunctionExpanded(functionLinkId);
    localStorage.setItem(`navbar_function_state_${functionLinkId}`, expanded ? 'collapsed' : 'expanded');
  }

}
