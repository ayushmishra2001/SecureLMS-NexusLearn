import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, of, tap, catchError, map } from 'rxjs';
import { AuthUser, ApiResponse, Role } from '../models';
import { dashboardRouteForRole } from '../navigation/app-routes';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly USER_KEY = 'lms_user';

    private _user = signal<AuthUser | null>(this.loadUser());
    readonly user = this._user.asReadonly();
    readonly isLoggedIn = computed(() => !!this._user());
    readonly role = computed(() => this._user()?.role ?? null);

    constructor(private http: HttpClient, private router: Router) { }

    private loadUser(): AuthUser | null {
        if (typeof localStorage === 'undefined') return null;
        try {
            return JSON.parse(localStorage.getItem(this.USER_KEY) || 'null');
        } catch { return null; }
    }

    saveUser(data: {
        userId: number;
        username: string;
        email: string;
        role: Role;
    }): void {
        const u: AuthUser = {
            id: data.userId,
            username: data.username,
            email: data.email,
            role: data.role
        };
        localStorage.setItem(this.USER_KEY, JSON.stringify(u));
        this._user.set(u);
    }

    clearUser(): void {
        localStorage.removeItem(this.USER_KEY);
        this._user.set(null);
    }

    refreshSession(): Observable<void> {
        return this.http.get<ApiResponse<any>>('/api/auth/session').pipe(
            tap(res => {
                if (res?.success && res.data) {
                    this.saveUser(res.data);
                }
            }),
            map(() => undefined as void),
            catchError(() => of(undefined as void))
        );
    }

    redirectByRole(): void {
        const role = this.role();
        if (role) this.router.navigate([dashboardRouteForRole(role)]);
    }

    logout(): Observable<any> {
        return this.http.post('/api/auth/logout', {}).pipe(
            tap(() => { this.clearUser(); window.location.href = '/login'; }),
            catchError(() => {
                this.clearUser();
                window.location.href = '/login';
                return of(null);
            })
        );
    }
}
