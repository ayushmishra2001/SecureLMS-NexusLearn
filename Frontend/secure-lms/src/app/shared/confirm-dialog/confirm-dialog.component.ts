import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ModalComponent } from '../modal/modal.component';

@Component({
    selector: 'app-confirm-dialog',
    standalone: true,
    imports: [ModalComponent],
    template: `
    <app-modal [isOpen]="isOpen" title="Confirm Action" (close)="cancel.emit()">
      <p style="color: var(--text-muted); font-size: 14px; line-height: 1.6;">{{ message }}</p>
      <div slot="footer">
        <button class="btn btn-secondary btn-sm" (click)="cancel.emit()">Cancel</button>
        <button class="btn btn-danger btn-sm" (click)="confirm.emit()">
          {{ confirmLabel }}
        </button>
      </div>
    </app-modal>
  `
})
export class ConfirmDialogComponent {
    @Input() isOpen = false;
    @Input() message = 'Are you sure?';
    @Input() confirmLabel = 'Delete';
    @Output() confirm = new EventEmitter<void>();
    @Output() cancel = new EventEmitter<void>();
}