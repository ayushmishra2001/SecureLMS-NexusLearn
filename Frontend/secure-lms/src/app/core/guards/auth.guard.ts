import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Role } from '../models/index';

export const authGuard: CanActivateFn = () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (auth.isLoggedIn()) return true;
    router.navigate(['/login']);
    return false;
};

export function roleGuard(requiredRole: Role): CanActivateFn {
    return () => {
        const auth = inject(AuthService);
        const router = inject(Router);
        if (!auth.isLoggedIn()) { router.navigate(['/login']); return false; }
        if (auth.role() !== requiredRole) { auth.redirectByRole(); return false; }
        return true;
    };
}