import { Injectable, computed, signal, effect } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter } from 'rxjs/operators';
import { MenuService } from './menu.service';
import { AuthService } from './auth.service';
import { routesMatchForRole } from '../navigation/app-routes';

export interface BreadcrumbItem {
  label: string;
  url: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class BreadcrumbService {
  private readonly _breadcrumbs = signal<BreadcrumbItem[]>([]);
  readonly breadcrumbs = this._breadcrumbs.asReadonly();

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private menuService: MenuService,
    private authService: AuthService
  ) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.updateBreadcrumbs();
    });

    // Recompute if the menu loads after navigation
    effect(() => {
      if (this.menuService.menu()) {
        this.updateBreadcrumbs();
      }
    }, { allowSignalWrites: true });
  }

  updateBreadcrumbs() {
    const currentUrl = this.router.url.split('?')[0];
    const rootItem: BreadcrumbItem = { label: 'Home', url: '/admin/dashboard' };
    const trail: BreadcrumbItem[] = [rootItem];

    if (currentUrl === '/admin/dashboard' || currentUrl === '/') {
       this._breadcrumbs.set(trail);
       return;
    }

    // 1. Try to find the route in the dynamic menu
    const menuData = this.menuService.menu();
    let foundInMenu = false;

    if (menuData) {
      for (const group of menuData) {
        for (const fnLink of group.functionLinks || []) {
          // Robust route matching using the same logic as the menu
          if (fnLink.functionLink.routePath && routesMatchForRole(fnLink.functionLink.routePath, currentUrl, this.authService.role())) {
            // Found it!
            trail.push({ label: group.globalLink.displayName, url: null });
            
            // Prefer Primary Link name since that's what shows in the Left Menu
            const linkName = fnLink.primaryLinks?.length > 0 
                ? fnLink.primaryLinks[0].displayName 
                : fnLink.functionLink.displayName;
                
            trail.push({ label: linkName, url: currentUrl });
            foundInMenu = true;
            break;
          }
        }
        if (foundInMenu) break;
      }
    }

    // 2. If not found in dynamic menu, check static route data
    if (!foundInMenu) {
      const staticLabel = this.getBreadcrumbFromRoute(this.activatedRoute.root);
      if (staticLabel && staticLabel !== 'Home') {
        trail.push({ label: staticLabel, url: currentUrl });
      } else {
        // Fallback for completely unmatched routes
        const parts = currentUrl.split('/').filter(p => p && p !== 'admin');
        if (parts.length > 0) {
            const lastPart = parts[parts.length - 1];
            const capitalized = lastPart.charAt(0).toUpperCase() + lastPart.slice(1).replace(/-/g, ' ');
            trail.push({ label: capitalized, url: currentUrl });
        }
      }
    }

    this._breadcrumbs.set(trail);
  }

  private getBreadcrumbFromRoute(route: ActivatedRoute): string | null {
    let currentRoute: ActivatedRoute | null = route;
    let label: string | null = null;
    
    while (currentRoute) {
      if (currentRoute.snapshot.data['breadcrumb']) {
        label = currentRoute.snapshot.data['breadcrumb'];
      }
      currentRoute = currentRoute.firstChild;
    }
    
    return label;
  }
}
