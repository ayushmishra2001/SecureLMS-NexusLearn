import { Injectable, signal } from '@angular/core';
import { Toast } from '../models';

@Injectable({ providedIn: 'root' })
export class ToastService {
    private counter = 0;
    readonly toasts = signal<Toast[]>([]);

    show(message: string, type: Toast['type'] = 'info', duration = 3500): void {
        const id = ++this.counter;
        this.toasts.update(list => [...list, { id, message, type }]);
        setTimeout(() => this.dismiss(id), duration);
    }

    success(message: string): void { this.show(message, 'success'); }
    error(message: string): void { this.show(message, 'error'); }
    info(message: string): void { this.show(message, 'info'); }
    warning(message: string): void { this.show(message, 'warning'); }

    dismiss(id: number): void {
        this.toasts.update(list => list.filter(t => t.id !== id));
    }
}