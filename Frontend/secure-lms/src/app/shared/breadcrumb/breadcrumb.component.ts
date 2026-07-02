import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BreadcrumbService } from '../../core/services/breadcrumb.service';
import { cardPop, fadeIn } from '../animations';

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="breadcrumb-container" aria-label="Breadcrumb" [@fadeIn]="true">
      <ol class="breadcrumb-list">
        @for (item of breadcrumbs(); track $index) {
          <li class="breadcrumb-item" [@cardPop]="true">
            @if (item.url) {
              <a [routerLink]="item.url" class="breadcrumb-link" [class.breadcrumb-active]="$last">
                @if ($first) {
                  <span class="material-symbols-outlined breadcrumb-icon">home</span>
                }
                {{ item.label }}
              </a>
            } @else {
              <span class="breadcrumb-text">
                {{ item.label }}
              </span>
            }

            @if (!$last) {
              <span class="material-symbols-outlined breadcrumb-separator">chevron_right</span>
            }
          </li>
        }
      </ol>
    </nav>
  `,
  styles: [`
    .breadcrumb-container {
      margin-bottom: 1.5rem;
      padding: 0.75rem 1.25rem;
      background: var(--surface-card);
      border-radius: 12px;
      border: 1px solid var(--surface-border);
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
    }
    
    .breadcrumb-list {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      list-style: none;
      margin: 0;
      padding: 0;
      gap: 0.5rem;
    }
    
    .breadcrumb-item {
      display: flex;
      align-items: center;
      font-size: 0.9rem;
      font-weight: 500;
    }
    
    .breadcrumb-link {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      color: var(--text-secondary);
      text-decoration: none;
      transition: color 0.2s ease;
    }
    
    .breadcrumb-link:hover {
      color: var(--primary-color);
    }
    
    .breadcrumb-active {
      color: var(--primary-color);
      font-weight: 600;
      pointer-events: none; /* Current page shouldn't be clickable */
    }
    
    .breadcrumb-text {
      color: var(--text-secondary);
      display: flex;
      align-items: center;
    }
    
    .breadcrumb-icon {
      font-size: 1.1rem;
    }
    
    .breadcrumb-separator {
      font-size: 1.2rem;
      color: var(--text-tertiary, #9ca3af);
      margin-left: 0.5rem;
    }
  `],
  animations: [fadeIn, cardPop]
})
export class BreadcrumbComponent {
  private breadcrumbService = inject(BreadcrumbService);
  breadcrumbs = this.breadcrumbService.breadcrumbs;
}
