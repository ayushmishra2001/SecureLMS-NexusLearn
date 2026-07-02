import { isPlatformBrowser } from '@angular/common';
import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { Observable, catchError, from, switchMap, throwError, EMPTY } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

function getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    return document.cookie.split(';').reduce((val, c) => {
        const [k, ...v] = c.trim().split('=');
        return k === name ? decodeURIComponent(v.join('=')) : val;
    }, null as string | null);
}

const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const CSRF_ENDPOINT = '/api/auth/csrf';
const CSRF_RETRY_HEADER = 'X-CSRF-RETRY';

function stripQuery(url: string): string {
    const idx = url.indexOf('?');
    return idx >= 0 ? url.slice(0, idx) : url;
}

function isAuthCsrfRequest(url: string): boolean {
    return stripQuery(url).endsWith(CSRF_ENDPOINT);
}

function shouldSkip401Redirect(url: string): boolean {
    const path = stripQuery(url);
    return /^\/api\/auth\/(login|register|roles|forgot-password|reset-password|reset-password\/validate|csrf|session)$/.test(path);
}

async function refreshCsrfToken(): Promise<void> {
    const res = await fetch(CSRF_ENDPOINT, {
        method: 'GET',
        credentials: 'include'
    });
    if (!res.ok) {
        throw new Error('Unable to refresh CSRF token');
    }
}

function withCsrfHeader(req: HttpRequest<unknown>): HttpRequest<unknown> {
    const csrf = getCookie('XSRF-TOKEN');
    if (!csrf) return req;
    return req.clone({ headers: req.headers.set('X-XSRF-TOKEN', csrf) });
}

export const authInterceptor: HttpInterceptorFn = (
    req: HttpRequest<unknown>,
    next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
    const router = inject(Router);
    const authService = inject(AuthService);
    const platformId = inject(PLATFORM_ID);
    const isBrowser = isPlatformBrowser(platformId);

    const method = req.method.toUpperCase();
    const isUnsafe = UNSAFE.has(method);
    const csrfRequest = isAuthCsrfRequest(req.url);
    const skip401Redirect = shouldSkip401Redirect(req.url);

    const handleAuthErrors = (err: any): Observable<never> => {
        if (err.status === 401 && !skip401Redirect) {
            authService.clearUser();
            router.navigate(['/login'], { queryParams: { sessionExpired: 'true' } });
            return EMPTY as Observable<never>;
        }
        return throwError(() => err);
    };

    const executeRequest = (request: HttpRequest<unknown>): Observable<HttpEvent<unknown>> => {
        return next(request).pipe(
            catchError(err => {
                const canRetryCsrf = err.status === 403 &&
                    isBrowser &&
                    isUnsafe &&
                    !csrfRequest &&
                    !request.headers.has(CSRF_RETRY_HEADER);

                if (!canRetryCsrf) {
                    return handleAuthErrors(err);
                }

                return from(refreshCsrfToken()).pipe(
                    switchMap(() => {
                        const retryReq = withCsrfHeader(
                            request.clone({ headers: request.headers.set(CSRF_RETRY_HEADER, '1') })
                        );
                        return next(retryReq);
                    }),
                    catchError(retryErr => handleAuthErrors(retryErr))
                );
            })
        );
    };

    const baseRequest = req.clone({ withCredentials: true });
    const requestWithCsrf = isUnsafe ? withCsrfHeader(baseRequest) : baseRequest;

    const shouldPrimeCsrf = isBrowser &&
        isUnsafe &&
        !csrfRequest &&
        !getCookie('XSRF-TOKEN');

    if (shouldPrimeCsrf) {
        return from(refreshCsrfToken()).pipe(
            switchMap(() => executeRequest(withCsrfHeader(baseRequest))),
            catchError(err => handleAuthErrors(err))
        );
    }

    return executeRequest(requestWithCsrf);
};

