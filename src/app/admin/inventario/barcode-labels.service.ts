import { Injectable } from '@angular/core';
import bwipjs from '@bwip-js/browser';
import { InventarioItem } from './inventario.service';

export interface BarcodeLabelItem extends Partial<InventarioItem> {
  quimicoResponsable?: string;
  sucursalDestino?: string;
}

@Injectable({ providedIn: 'root' })
export class BarcodeLabelsService {

  openPrintWindow(): Window | null {
    if (typeof window === 'undefined') {
      return null;
    }

    return window.open('', '_blank', 'width=900,height=700,scrollbars=yes,resizable=yes');
  }

  generateUniqueCode(item: Partial<InventarioItem> = {}): string {
    const prefix = this.normalizeCodeSegment(
      item.codigoProducto ?? item.productoId ?? item.descripcion ?? item.nombreProducto ?? 'INV'
    ) || 'INV';
    const timePart = Date.now().toString(36).toUpperCase();
    const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();

    return `${prefix}-${timePart}-${randomPart}`;
  }

  printLabels(item: BarcodeLabelItem, quantity: number, printWindow?: Window | null): boolean {
    const total = Math.max(0, Math.floor(Number(quantity) || 0));
    if (total < 1) {
      return false;
    }

    const targetWindow = printWindow ?? this.openPrintWindow();
    if (!targetWindow || targetWindow.closed) {
      return false;
    }

    const rawCode = String(item.codigoBarras ?? '').trim() || this.generateUniqueCode(item);
    const code = this.normalizeCodeSegment(rawCode);
    const labels = Array.from({ length: total }, (_, index) => this.renderLabel(item, code, index + 1)).join('');

    try {
      targetWindow.document.open();
      targetWindow.document.write(this.buildDocument(labels));
      targetWindow.document.close();
      targetWindow.focus();

      setTimeout(() => {
        try {
          targetWindow.focus();
          targetWindow.print();
        } catch {
          // Ignore print errors from blocked dialogs or closed windows.
        }
      }, 150);

      return true;
    } catch {
      try {
        targetWindow.close();
      } catch {
        // Ignore cleanup errors.
      }
      return false;
    }
  }

  private renderLabel(item: BarcodeLabelItem, code: string, index: number): string {
    const title = this.escapeHtml(item.codigoProducto ?? item.productoId ?? item.descripcion ?? item.nombreProducto ?? 'Producto');
    const sucursalDestino = String(item.sucursalDestino ?? '').trim();
    const quimicoResponsable = String(item.quimicoResponsable ?? '').trim();
    const subtitle = this.escapeHtml(
      [!sucursalDestino && item.sucursal ? `Sucursal: ${item.sucursal}` : '', item.sucursalId ? `ID: ${item.sucursalId}` : '']
        .filter(Boolean)
        .join(' · ')
    );
    const productionDetails = this.renderProductionDetails(quimicoResponsable, sucursalDestino);
    const stock = Number(item.stock ?? 0);
    const stockMinimo = Number(item.stockMinimo ?? 0);
    const status = stock === 0 ? 'Sin stock' : stock <= stockMinimo ? 'Stock bajo' : 'Disponible';

    return `
      <article class="label">
        <div class="label-head">
          <div>
            <div class="label-title">${title}</div>
            <div class="label-subtitle">${subtitle || '&nbsp;'}</div>
          </div>
          <div class="label-index">#${index}</div>
        </div>

        <div class="barcode-wrap">
          ${this.renderBarcodeSvg(code)}
        </div>

        <div class="label-code">${this.escapeHtml(code)}</div>
        ${productionDetails}
        <div class="label-meta">
          <span>${this.escapeHtml(status)}</span>
          <span>${this.escapeHtml(String(stock))} uds</span>
        </div>
      </article>
    `;
  }

  private renderProductionDetails(quimicoResponsable: string, sucursalDestino: string): string {
    const rows = [
      quimicoResponsable
        ? `<div class="label-detail-row"><span class="detail-label">Químico responsable</span><span class="detail-value">${this.escapeHtml(quimicoResponsable)}</span></div>`
        : '',
      sucursalDestino
        ? `<div class="label-detail-row"><span class="detail-label">Destino</span><span class="detail-value">${this.escapeHtml(sucursalDestino)}</span></div>`
        : ''
    ].filter(Boolean);

    if (rows.length === 0) {
      return '';
    }

    return `<div class="label-details">${rows.join('')}</div>`;
  }

  private renderBarcodeSvg(code: string): string {
    try {
      return bwipjs.toSVG({
        bcid: 'code128',
        text: code,
        scale: 2,
        height: 12,
        includetext: true,
        textxalign: 'center',
        textcolor: '111827',
        barcolor: '111827',
        backgroundcolor: 'FFFFFF'
      });
    } catch {
      return `<div class="barcode-fallback">${this.escapeHtml(code)}</div>`;
    }
  }

  private buildDocument(labelsHtml: string): string {
    return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Etiquetas de inventario</title>
  <style>
    @page {
      margin: 8mm;
    }

    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #111827;
      font-family: Arial, Helvetica, sans-serif;
    }

    body {
      padding: 0;
    }

    .sheet {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(62mm, 1fr));
      gap: 5mm;
      align-items: start;
    }

    .label {
      box-sizing: border-box;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      padding: 4mm;
      break-inside: avoid;
      page-break-inside: avoid;
      min-height: 34mm;
      display: flex;
      flex-direction: column;
      gap: 2.5mm;
    }

    .label-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 3mm;
    }

    .label-title {
      font-size: 12pt;
      line-height: 1.15;
      font-weight: 700;
      word-break: break-word;
    }

    .label-subtitle {
      margin-top: 1mm;
      font-size: 8pt;
      color: #6b7280;
      line-height: 1.2;
      word-break: break-word;
    }

    .label-index {
      flex-shrink: 0;
      font-size: 8pt;
      font-weight: 700;
      color: #6b7280;
    }

    .barcode-wrap {
      display: flex;
      justify-content: center;
      align-items: center;
      overflow: hidden;
      min-height: 16mm;
    }

    .barcode-wrap svg {
      width: 100%;
      height: auto;
      display: block;
    }

    .barcode-fallback {
      width: 100%;
      padding: 4mm 0;
      text-align: center;
      font-family: 'Courier New', Courier, monospace;
      font-size: 10pt;
      font-weight: 700;
      letter-spacing: 0.08em;
      border-top: 1px solid #d1d5db;
      border-bottom: 1px solid #d1d5db;
    }

    .label-code {
      text-align: center;
      font-family: 'Courier New', Courier, monospace;
      font-size: 9pt;
      letter-spacing: 0.06em;
      word-break: break-all;
    }

    .label-details {
      display: flex;
      flex-direction: column;
      gap: 1.5mm;
      padding-top: 2mm;
      border-top: 1px solid #e5e7eb;
    }

    .label-detail-row {
      display: flex;
      justify-content: space-between;
      gap: 3mm;
      font-size: 7.5pt;
      line-height: 1.25;
    }

    .detail-label {
      flex-shrink: 0;
      color: #6b7280;
      font-weight: 700;
    }

    .detail-value {
      min-width: 0;
      color: #111827;
      font-weight: 700;
      text-align: right;
      word-break: break-word;
    }

    .label-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 3mm;
      font-size: 7.5pt;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <main class="sheet">
    ${labelsHtml}
  </main>
</body>
</html>`;
  }

  private normalizeCodeSegment(value: unknown): string {
    return String(value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-+/g, '-');
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
