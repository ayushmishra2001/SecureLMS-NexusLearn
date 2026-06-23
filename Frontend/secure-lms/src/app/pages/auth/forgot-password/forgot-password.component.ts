import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthCardComponent } from '../auth-card.component';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
    selector: 'app-forgot-password',
    standalone: true,
    imports: [CommonModule, RouterModule, ReactiveFormsModule, AuthCardComponent],
    template: `
    <app-auth-card title="Forgot your password?"
                   subtitle="Enter your registered email and we'll send a reset link.">
      @if (error) { <div class="alert alert-error"><span class="mi">warning</span>{{ error }}</div> }
      @if (success) { <div class="alert alert-success"><span class="mi">mail</span>{{ success }}</div> }

      @if (!success) {
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <div class="form-group">
            <label>Email address</label>
            <input type="email" class="form-control" formControlName="email"
                   placeholder="you@example.com" autocomplete="email" />
            @if (f['email'].touched && f['email'].errors?.['required']) {
              <div class="field-error">Email is required</div>
            }
            @if (f['email'].touched && f['email'].errors?.['email']) {
              <div class="field-error">Enter a valid email</div>
            }
          </div>
          <button type="submit" class="btn btn-primary btn-full" [disabled]="loading" style="margin-top:8px">
            @if (loading) { <span class="spinner"></span> } @else { Send reset link }
          </button>
        </form>
      }

      <div class="divider"><span></span></div>
      <a routerLink="/login" style="display:block; text-align:center; font-size:14px">← Back to Sign in</a>
    </app-auth-card>
  `
})
export class ForgotPasswordComponent implements OnInit {
    private fb = inject(FormBuilder);
    private api = inject(ApiService);
    private auth = inject(AuthService);

    form = this.fb.group({ email: ['', [Validators.required, Validators.email]] });
    get f() { return this.form.controls; }

    loading = false; error = ''; success = '';

    ngOnInit(): void { if (this.auth.isLoggedIn()) this.auth.redirectByRole(); }

    submit(): void {
        this.form.markAllAsTouched();
        if (this.form.invalid) return;
        this.error = ''; this.loading = true;

        this.api.forgotPassword(this.form.value.email!.toLowerCase().trim()).subscribe({
            next: res => {
                this.success = res.message || 'If the email exists, a reset link has been sent.';
                this.loading = false;
            },
            error: err => {
                this.error = err.error?.message || 'Unable to send reset link. Please try again.';
                this.loading = false;
            }
        });
    }
}