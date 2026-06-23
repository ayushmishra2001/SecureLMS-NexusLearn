import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { modalAnim, overlayAnim } from '../animations';

@Component({
    selector: 'app-modal',
    standalone: true,
    imports: [CommonModule],
    animations: [modalAnim, overlayAnim],
    template: `
    @if (isOpen) {
      <div class="modal-backdrop" [@overlayAnim] (click)="onBackdropClick($event)">
        <div class="modal-box" [@modalAnim] (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3 class="modal-title">{{ title }}</h3>
            <button class="modal-close-btn" (click)="close.emit()">×</button>
          </div>
          <div class="modal-body">
            <ng-content />
          </div>
          @if (showFooter) {
            <div class="modal-footer">
              <ng-content select="[slot=footer]" />
            </div>
          }
        </div>
      </div>
    }
  `,
    styles: [`
    .modal-backdrop {
      position: fixed; inset: 0;
      background: rgba(15,23,42,.45);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000; padding: 20px;
      backdrop-filter: blur(2px);
    }
    .modal-box {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 16px; width: 100%; max-width: 540px;
      max-height: 90vh; overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0,0,0,.15);
    }
    .modal-header {
      padding: 20px 24px; border-bottom: 1px solid var(--border);
      display: flex; align-items: center; justify-content: space-between;
      position: sticky; top: 0; background: var(--surface); z-index: 1;
    }
    .modal-title { font-size: 16px; font-weight: 700; }
    .modal-close-btn {
      background: var(--surface-2); border: 1px solid var(--border);
      border-radius: 8px; width: 30px; height: 30px;
      font-size: 18px; cursor: pointer; display: flex;
      align-items: center; justify-content: center;
      color: var(--text-muted); transition: all .2s;
      &:hover { background: var(--border); color: var(--text); }
    }
    .modal-body { padding: 24px; }
    .modal-footer {
      padding: 16px 24px; border-top: 1px solid var(--border);
      display: flex; justify-content: flex-end; gap: 10px;
    }
  `]
})
export class ModalComponent {
    @Input() isOpen = false;
    @Input() title = '';
    @Input() showFooter = true;
    @Output() close = new EventEmitter<void>();

    onBackdropClick(e: MouseEvent): void { this.close.emit(); }
}