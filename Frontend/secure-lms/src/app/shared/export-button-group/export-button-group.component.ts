// FILE: src/app/shared/export-button-group/export-button-group.component.ts

import {
  Component, Input, Output, EventEmitter,
  HostListener, ElementRef, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExportScope } from '../../core/models';

/**
 * Renders a pair of dropdown export buttons — Excel and PDF —
 * that each offer "Export All" and "Export Current View" options.
 *
 * Usage:
 *   <app-export-button-group
 *     [excelLoading]="excelLoading"
 *     [pdfLoading]="pdfLoading"
 *     (exportExcel)="onExportExcel($event)"
 *     (exportPdf)="onExportPdf($event)"
 *   />
 *
 * The $event on each output is: 'all' | 'current'
 *
 * Optional:
 *   [showExportAll]="false"  — hides the "Export All" option
 *                              (use when a course must be selected first)
 */
@Component({
  selector: 'app-export-button-group',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- ── Excel dropdown ────────────────────────────────────────────── -->
    <div class="export-wrap" [class.open]="excelOpen">
      <button
        class="export-btn excel-btn"
        [disabled]="excelLoading || pdfLoading"
        (click)="toggleExcel($event)"
        title="Export to Excel"
      >
        @if (excelLoading) {
          <span class="export-spinner"></span>
        } @else {
          <span class="export-icon">table_view</span>
        }
        <span>Excel</span>
        <span class="chevron">expand_more</span>
      </button>

      @if (excelOpen) {
        <div class="export-dropdown">
          @if (showExportAll) {
            <button class="dropdown-item" (click)="emitExcel('all')">
              <span class="item-icon">download</span>
              Export All
            </button>
          }
          <button class="dropdown-item" (click)="emitExcel('current')">
            <span class="item-icon">filter_alt</span>
            Export Current View
          </button>
        </div>
      }
    </div>

    <!-- ── PDF dropdown ──────────────────────────────────────────────── -->
    <div class="export-wrap" [class.open]="pdfOpen">
      <button
        class="export-btn pdf-btn"
        [disabled]="pdfLoading || excelLoading"
        (click)="togglePdf($event)"
        title="Export to PDF"
      >
        @if (pdfLoading) {
          <span class="export-spinner export-spinner-pdf"></span>
        } @else {
          <span class="export-icon">picture_as_pdf</span>
        }
        <span>PDF</span>
        <span class="chevron">expand_more</span>
      </button>

      @if (pdfOpen) {
        <div class="export-dropdown">
          @if (showExportAll) {
            <button class="dropdown-item" (click)="emitPdf('all')">
              <span class="item-icon">download</span>
              Export All
            </button>
          }
          <button class="dropdown-item" (click)="emitPdf('current')">
            <span class="item-icon">filter_alt</span>
            Export Current View
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    /* ── Host is always inline-flex so buttons sit in a card-header row ── */
    :host {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .export-wrap {
      position: relative;
    }

    /* ── Shared button base ────────────────────────────────────────────── */
    .export-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      transition: all .18s;
      white-space: nowrap;

      &:disabled {
        opacity: .55;
        cursor: not-allowed;
      }
    }

    /* Excel — green tint matching convention */
    .excel-btn {
      background: rgba(22, 163, 74, .08);
      color: #15803d;
      border: 1.5px solid rgba(22, 163, 74, .25);

      &:not(:disabled):hover {
        background: rgba(22, 163, 74, .14);
        border-color: rgba(22, 163, 74, .4);
      }
    }

    /* PDF — red tint */
    .pdf-btn {
      background: rgba(220, 38, 38, .07);
      color: #b91c1c;
      border: 1.5px solid rgba(220, 38, 38, .2);

      &:not(:disabled):hover {
        background: rgba(220, 38, 38, .12);
        border-color: rgba(220, 38, 38, .35);
      }
    }

    /* ── Icons (Material Symbols) ────────────────────────────────────── */
    .export-icon,
    .chevron,
    .item-icon {
      font-family: 'Material Symbols Outlined';
      font-weight: normal;
      font-style: normal;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      white-space: nowrap;
    }
    .export-icon { font-size: 15px; }
    .chevron     { font-size: 14px; opacity: .7; }
    .item-icon   { font-size: 14px; color: var(--text-muted); }

    /* ── Dropdown panel ──────────────────────────────────────────────── */
    .export-dropdown {
      position: absolute;
      top: calc(100% + 5px);
      right: 0;
      min-width: 170px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      box-shadow: 0 8px 24px rgba(0,0,0,.10);
      z-index: 300;
      overflow: hidden;
      animation: dropIn 140ms cubic-bezier(.4,0,.2,1) both;
    }

    @keyframes dropIn {
      from { opacity: 0; transform: translateY(-6px); }
      to   { opacity: 1; transform: translateY(0);    }
    }

    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      padding: 9px 14px;
      background: transparent;
      border: none;
      font-size: 13px;
      font-weight: 500;
      font-family: inherit;
      color: var(--text);
      cursor: pointer;
      text-align: left;
      transition: background .15s;

      &:hover {
        background: var(--surface-2);
      }

      & + & {
        border-top: 1px solid var(--border);
      }
    }

    /* ── Loading spinners ────────────────────────────────────────────── */
    .export-spinner {
      width: 13px;
      height: 13px;
      border: 2px solid rgba(22, 163, 74, .25);
      border-top-color: #15803d;
      border-radius: 50%;
      animation: spin .65s linear infinite;
      display: inline-block;
    }
    .export-spinner-pdf {
      border-color: rgba(220, 38, 38, .2);
      border-top-color: #b91c1c;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class ExportButtonGroupComponent {

  /** Pass true while the Excel export is in progress (shows spinner). */
  @Input() excelLoading = false;

  /** Pass true while the PDF export is in progress (shows spinner). */
  @Input() pdfLoading = false;

  /**
   * Set to false to hide the "Export All" option.
   * Use this when exporting requires a sub-selection first
   * (e.g. Modules / Enrollments where a course must be chosen).
   */
  @Input() showExportAll = true;

  /** Emits 'all' or 'current' when the user picks an Excel export option. */
  @Output() exportExcel = new EventEmitter<ExportScope>();

  /** Emits 'all' or 'current' when the user picks a PDF export option. */
  @Output() exportPdf = new EventEmitter<ExportScope>();

  excelOpen = false;
  pdfOpen   = false;

  private readonly el = inject(ElementRef);

  // ── Close dropdowns when clicking outside the component ──────────────────
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.el.nativeElement.contains(event.target)) {
      this.excelOpen = false;
      this.pdfOpen   = false;
    }
  }

  toggleExcel(event: MouseEvent): void {
    event.stopPropagation();
    this.pdfOpen   = false;
    this.excelOpen = !this.excelOpen;
  }

  togglePdf(event: MouseEvent): void {
    event.stopPropagation();
    this.excelOpen = false;
    this.pdfOpen   = !this.pdfOpen;
  }

  emitExcel(scope: ExportScope): void {
    this.excelOpen = false;
    this.exportExcel.emit(scope);
  }

  emitPdf(scope: ExportScope): void {
    this.pdfOpen = false;
    this.exportPdf.emit(scope);
  }
}
