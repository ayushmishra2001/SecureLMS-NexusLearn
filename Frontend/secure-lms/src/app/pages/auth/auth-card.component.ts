import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { fadeSlideIn } from '../../shared/animations';

@Component({
    selector: 'app-auth-card',
    standalone: true,
    imports: [RouterModule],
    animations: [fadeSlideIn],
    template: `
    <div class="auth-split-layout">
      <!-- Left Side -->
      <div class="auth-left">
        <div class="auth-left-overlay">
          <div class="auth-emblem">
            <!--<img src="/assets/images/aadhaar_logo.png" alt="Aadhaar Logo" class="emblem-logo" />-->
            <h2 class="emblem-title">Secure LMS<br/>Nexus Learn</h2>
            <p class="emblem-subtitle">Project By Ayush Mishra</p>
          </div>
        </div>
      </div>

      <!-- Right Side -->
      <div class="auth-right">
        <div class="auth-right-content" [@fadeSlideIn]>
          <!--<div class="top-logos">
            <img src="/assets/images/bihar_logo.png" alt="Bihar Logo" class="bihar-logo" />
            <img src="/assets/images/aadhaar_logo.png" alt="Aadhaar Logo" class="aadhaar-top-logo" />
          </div>-->

          <h1 class="main-title">Secure LMS<br/>Nexus Learn</h1>
          <div class="title-underline"></div>

          <div class="form-container">
            <ng-content />
          </div>
        </div>
      </div>
    </div>
  `,
    styles: [`
    .auth-split-layout {
      display: flex; height: 100vh; width: 100%; overflow: hidden;
      overscroll-behavior: none;
    }
    .auth-left {
      flex: 1; background: url('/assets/images/auth_bg.png') no-repeat center center;
      background-size: cover; position: relative; display: flex;
      align-items: center; justify-content: center;
      /* Fallback styling in case image is missing */
      background-color: #3b3f8c;
    }
    .auth-left-overlay {
      position: absolute; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(59, 63, 140, 0.4); display: flex;
      align-items: center; justify-content: center;
    }
    .auth-emblem {
      background: #fff; width: 320px; height: 320px; border-radius: 50%;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      box-shadow: 0 0 0 20px rgba(240, 140, 60, 0.9), 0 10px 30px rgba(0,0,0,0.3);
      text-align: center; padding: 20px;
    }
    .emblem-logo { height: 70px; margin-bottom: 15px; }
    .emblem-title { font-size: 16px; font-weight: 700; color: #333; margin: 0 0 8px 0; line-height: 1.3; }
    .emblem-subtitle { font-size: 10px; color: #666; margin: 0; }

    .auth-right {
      flex: 1; display: flex; flex-direction: column;
      background: #fff; padding: 40px; overflow-y: auto;
      overscroll-behavior: none;
    }
    .auth-right::before, .auth-right::after {
      content: ''; flex: 1; min-height: 20px;
    }
    .auth-right-content {
      margin: 0 auto; width: 100%; max-width: 440px; display: flex; flex-direction: column; align-items: center; text-align: center; flex-shrink: 0;
    }
    .top-logos {
      display: flex; justify-content: center; align-items: center; gap: 30px; margin-bottom: 25px;
    }
    .bihar-logo { height: 70px; }
    .aadhaar-top-logo { height: 50px; }

    .main-title {
      font-size: 20px; font-weight: 700; color: #b71c1c; margin: 0 0 15px 0; line-height: 1.4;
      text-transform: uppercase;
    }
    .title-underline {
      width: 60px; height: 3px; background-color: #b71c1c; margin: 0 auto 40px auto;
    }
    .form-container { width: 100%; text-align: left; }

    @media (max-width: 900px) {
      .auth-split-layout { flex-direction: column; }
      .auth-left { min-height: 400px; }
    }
  `]
})
export class AuthCardComponent {
}
