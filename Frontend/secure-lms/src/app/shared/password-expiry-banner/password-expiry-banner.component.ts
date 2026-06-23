import { Component, OnInit, signal, inject, PLATFORM_ID, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import { ApiService } from '../../core/services/api.service';
import { PasswordExpiryStatus } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { APP_ROUTES, ROLE_SECTION_ROUTES } from '../../core/navigation/app-routes';

const SESSION_DISMISS_KEY_PREFIX = 'pwd_expiry_dismissed';

const SUBTEXT: Record<string, string> = {
    REGISTRATION: 'Your current password is still the one set during registration.',
    PASSWORD_CHANGE: 'Your current password is based on your last password change.',
    PASSWORD_RESET: 'Your current password was set via password reset.',
};

@Component({
    selector: 'app-password-expiry-banner',
    standalone: true,
    imports: [CommonModule],
    animations: [
        trigger('bannerAnim', [
            transition(':enter', [
                style({ opacity: 0, transform: 'translateY(-10px)', maxHeight: '0px' }),
                animate(
                    '280ms cubic-bezier(.4,0,.2,1)',
                    style({ opacity: 1, transform: 'translateY(0)', maxHeight: '120px' })
                )
            ]),
            transition(':leave', [
                animate(
                    '200ms ease',
                    style({ opacity: 0, transform: 'translateY(-6px)', maxHeight: '0px' })
                )
            ])
        ])
    ],
    template: `
        @if (visible && status()) {
            <div class="expiry-banner" [@bannerAnim] [class.in-popover]="inPopover">
                <div class="banner-content">
                    <span class="banner-icon">!</span>
                    <div class="banner-text">
                        <strong class="banner-title">{{ bannerTitle() }}</strong>
                        @if (bannerSubtext()) {
                            <span class="banner-sub">{{ bannerSubtext() }}</span>
                        }
                    </div>
                </div>

                <div class="banner-actions">
                    <button class="banner-cta" (click)="goToProfile()">
                        Change Password
                    </button>
                </div>

                <button
                    class="banner-dismiss"
                    title="Dismiss until next login"
                    (click)="dismiss()"
                >×</button>
            </div>
        }
    `,
    styles: [`
        .expiry-banner {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            overflow: hidden;

            margin-bottom: 20px;
            padding: 12px 16px;
            border-radius: 10px;
            border: 1px solid #fbbf24;
            border-left: 4px solid #d97706;
            background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
            box-shadow: 0 2px 10px rgba(217, 119, 6, 0.10);
        }
        .expiry-banner.in-popover {
            margin-bottom: 0;
            border-radius: 12px;
            padding: 14px 16px 12px;
            display: block;
            position: relative;
        }

        .banner-content {
            display: flex;
            align-items: center;
            gap: 12px;
            flex: 1;
            min-width: 0;
        }

        .banner-icon {
            font-size: 18px;
            flex-shrink: 0;
            color: #92400e;
            font-weight: 700;
        }

        .banner-text {
            display: flex;
            flex-direction: column;
            gap: 2px;
            min-width: 0;
        }

        .banner-title {
            font-size: 13px;
            font-weight: 700;
            color: #92400e;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .expiry-banner.in-popover .banner-title {
            white-space: normal;
            overflow: visible;
            text-overflow: clip;
            line-height: 1.4;
            font-size: 14px;
        }
        .expiry-banner.in-popover .banner-content {
            align-items: flex-start;
            gap: 12px;
            padding-right: 28px;
        }
        .expiry-banner.in-popover .banner-text {
            flex: 1;
        }

        .banner-sub {
            font-size: 12px;
            color: #b45309;
            line-height: 1.4;
        }
        .expiry-banner.in-popover .banner-sub {
            margin-top: 4px;
            display: block;
        }

        .banner-cta {
            background: #d97706;
            color: #fff;
            border: none;
            border-radius: 7px;
            padding: 7px 16px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            white-space: nowrap;
            flex-shrink: 0;
            transition: background 0.2s, transform 0.15s;
        }
        .banner-cta:hover { background: #b45309; }
        .banner-cta:active { transform: scale(0.97); }
        .banner-actions {
            display: flex;
            align-items: center;
            justify-content: flex-end;
        }
        .expiry-banner.in-popover .banner-actions {
            margin-top: 10px;
            justify-content: flex-start;
        }
        .expiry-banner.in-popover .banner-cta {
            padding: 8px 14px;
            border-radius: 8px;
            font-size: 12px;
        }

        .banner-dismiss {
            background: transparent;
            border: none;
            cursor: pointer;
            color: #b45309;
            font-size: 22px;
            line-height: 1;
            padding: 0 4px;
            flex-shrink: 0;
            transition: opacity 0.2s;
        }
        .banner-dismiss:hover { opacity: 0.6; }
        .expiry-banner.in-popover .banner-dismiss {
            position: absolute;
            top: 8px;
            right: 8px;
            font-size: 20px;
            padding: 2px 6px;
        }
    `]
})
export class PasswordExpiryBannerComponent implements OnInit {
    private readonly api = inject(ApiService);
    private readonly router = inject(Router);
    private readonly auth = inject(AuthService);
    private readonly platformId = inject(PLATFORM_ID);

    readonly status = signal<PasswordExpiryStatus | null>(null);
    visible = false;

    @Input() inPopover = false;
    @Output() visibilityChange = new EventEmitter<boolean>();

    ngOnInit(): void {
        if (!isPlatformBrowser(this.platformId)) {
            this.emitVisibility();
            return;
        }

        if (sessionStorage.getItem(this.dismissKey()) === 'true') {
            this.emitVisibility();
            return;
        }

        this.api.getPasswordExpiryStatus().subscribe({
            next: res => {
                if (res?.success && res.data?.warningRequired) {
                    this.status.set(res.data);
                    this.visible = true;
                }
                this.emitVisibility();
            },
            error: () => this.emitVisibility()
        });
    }

    bannerTitle(): string {
        const s = this.status();
        if (!s) return '';

        const days = s.daysUntilExpiry ?? 0;
        const dayLabel = days < 0
            ? `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`
            : days === 0
                ? 'today'
                : days === 1
                    ? 'in 1 day'
                    : `in ${days} days`;
        const dateStr = s.expiresOn ? ` - expires on ${this.formatDate(s.expiresOn)}` : '';
        return days < 0
            ? `Your password expired ${dayLabel}${dateStr}`
            : `Your password expires ${dayLabel}${dateStr}`;
    }

    bannerSubtext(): string {
        const type = this.status()?.warningType;
        return type ? (SUBTEXT[type] ?? '') : '';
    }

    goToProfile(): void {
        const role = this.auth.role();
        this.router.navigate([role ? ROLE_SECTION_ROUTES[role]['profile'] : APP_ROUTES.profile]);
    }

    dismiss(): void {
        this.visible = false;
        this.emitVisibility();
        if (isPlatformBrowser(this.platformId)) {
            sessionStorage.setItem(this.dismissKey(), 'true');
        }
    }

    private emitVisibility(): void {
        this.visibilityChange.emit(this.visible && !!this.status());
    }

    private dismissKey(): string {
        try {
            const raw = localStorage.getItem('lms_user');
            const user = raw ? JSON.parse(raw) : null;
            const userId = user?.id ?? 'anon';
            return `${SESSION_DISMISS_KEY_PREFIX}_${userId}`;
        } catch {
            return `${SESSION_DISMISS_KEY_PREFIX}_anon`;
        }
    }

    private formatDate(iso: string): string {
        try {
            return new Date(iso).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'short', year: 'numeric'
            });
        } catch {
            return iso;
        }
    }
}
