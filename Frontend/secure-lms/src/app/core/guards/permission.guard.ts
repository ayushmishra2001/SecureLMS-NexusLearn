import { CanActivateFn, Router, RouterStateSnapshot, ActivatedRouteSnapshot } from '@angular/router';
import { inject } from '@angular/core';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { MenuService } from '../services/menu.service';

export const permissionGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const menuService = inject(MenuService);
  const router = inject(Router);
  const currentRoute = state.url.split('?')[0];

  return menuService.refreshMenu().pipe(
    map(() => {
      const permissions = menuService.findFunctionPermissionsByRoute(currentRoute);
      if (!permissions) {
        return true;
      }
      return permissions.canView ? true : router.parseUrl('/403');
    }),
    catchError(() => of(true))
  );
};
