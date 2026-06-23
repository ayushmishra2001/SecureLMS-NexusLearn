// FILE: src/app/core/services/export.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ToastService } from './toast.service';
import { ExportColumn } from '../models';
import * as XLSX from 'xlsx';
(window as any).XLSX = XLSX;


@Injectable({ providedIn: 'root' })
export class ExportService {

  private readonly http  = inject(HttpClient);
  private readonly toast = inject(ToastService);

  private readonly BASE = '/api/export';

  // ── Excel (SheetJS, browser-side) ────────────────────────────────────────

  /**
   * Builds an .xlsx workbook from an in-memory array and triggers a download.
   *
   * @param data     Array of objects (can be typed or plain)
   * @param columns  Column definitions — controls header names, field mapping, formatting
   * @param filename Desired filename WITHOUT extension (e.g. "securelms_users_2026-05-21")
   */
  exportToExcel(data: any[], columns: ExportColumn[], filename: string): void {
    // Dynamic import keeps SheetJS out of the initial bundle
    this.loadXlsx().then((xlsxModule: any) => {
      const XLSX = xlsxModule?.default ?? xlsxModule;
      if (!data || data.length === 0) {
        this.toast.info('No data to export.');
        return;
      }

      // ── Build worksheet rows ─────────────────────────────────────────────
      // Row 0: column headers
      const headerRow = columns.map(c => c.header);

      // Rows 1..n: data values, with format transforms applied
      const dataRows = data.map(item =>
        columns.map(col => this.applyFormat(item[col.field], col.format))
      );

      const wsData = [headerRow, ...dataRows];

      // ── Create worksheet ─────────────────────────────────────────────────
      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // ── Column widths — generous default based on header length ──────────
      ws['!cols'] = columns.map(col => ({
        wch: Math.max(col.header.length + 4, 14)
      }));

      // ── Workbook ─────────────────────────────────────────────────────────
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Report');

      // ── Download ─────────────────────────────────────────────────────────
      XLSX.writeFile(wb, filename + '.xlsx');
    }).catch(() => {
      this.toast.error('Excel export failed — SheetJS library could not be loaded.');
    });
  }

  // ── PDF (backend stream) ─────────────────────────────────────────────────

  /**
   * Calls a backend PDF export endpoint and triggers a browser file download.
   *
   * @param endpoint  Path relative to /api/export, e.g. 'users/pdf'
   * @param params    HttpParams carrying filter / scope query params
   * @param filename  Desired filename WITHOUT extension
   * @returns Observable<void> — completes on success, errors on failure.
   *          Subscribe and set a loading flag while it is pending.
   */
  exportToPdf(endpoint: string, params: HttpParams, filename: string): Observable<void> {
    const url = `${this.BASE}/${endpoint}`;

    return new Observable<void>(observer => {
      this.http
        .get(url, { params, responseType: 'blob', observe: 'response' })
        .subscribe({
          next: response => {
            const blob = response.body;
            if (!blob || blob.size === 0) {
              this.toast.info('No data to export.');
              observer.complete();
              return;
            }

            // ── Trigger browser download ──────────────────────────────────
            const objectUrl = URL.createObjectURL(blob);
            const anchor    = document.createElement('a');
            anchor.href     = objectUrl;
            anchor.download = filename + '.pdf';
            anchor.style.display = 'none';
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);

            // Revoke after a short delay so the browser has time to start
            // the download before the object URL is invalidated.
            setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);

            observer.next();
            observer.complete();
          },
          error: err => {
            // Try to parse a JSON error body from the blob
            if (err.error instanceof Blob) {
              const reader = new FileReader();
              reader.onload = () => {
                try {
                  const parsed = JSON.parse(reader.result as string);
                  this.toast.error(parsed?.message || 'PDF export failed.');
                } catch {
                  this.toast.error('PDF export failed.');
                }
              };
              reader.readAsText(err.error);
            } else {
              this.toast.error(err?.error?.message || 'PDF export failed.');
            }
            observer.error(err);
          }
        });
    });
  }

  // ── Format transforms ────────────────────────────────────────────────────

  private applyFormat(value: any, format?: string): string | number {
    if (value === null || value === undefined) return '—';

    switch (format) {
      case 'date':
        return this.fmtDate(value);
      case 'datetime':
        return this.fmtDateTime(value);
      case 'percent':
        return typeof value === 'number' ? `${value}%` : `${value}%`;
      case 'boolean':
        return value === true ? 'Yes' : value === false ? 'No' : String(value);
      case 'yesno_inv':
        // Inverted: used for "Locked" column where accountNonLocked=false means locked
        return value === true ? 'No' : value === false ? 'Yes' : String(value);
      default:
        return value !== null && value !== undefined ? String(value) : '—';
    }
  }

  private fmtDate(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
      });
    } catch { return String(iso); }
  }

  private fmtDateTime(iso: string): string {
    try {
      return new Date(iso).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
      });
    } catch { return String(iso); }
  }

  private loadXlsx(): Promise<any> {
    const moduleName = 'xlsx';
    return import(moduleName).catch(err => {
      const xlsxGlobal = (window as any)?.XLSX;
      if (xlsxGlobal) return xlsxGlobal;
      throw err;
    });
  }
}
