import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MessageService } from 'primeng/api';
import { Table } from 'primeng/table';
import { InventarioItem, InventarioService, resolveInventarioEtiqueta } from '../inventario.service';
import { BarcodeLabelsService } from '../barcode-labels.service';
import { formatDate } from 'src/app/shared/date-utils';

type StockFilter = 'todos' | 'disponibles' | 'stockBajo' | 'sinStock';

@Component({
    selector: 'app-grid-inventario',
    templateUrl: './grid-inventario.component.html',
    styleUrls: ['./grid-inventario.component.css'],
    standalone: false
})
export class GridInventarioComponent implements OnInit, OnDestroy {

  @ViewChild('dt') dt!: Table;

  inventario: InventarioItem[] = [];
  inventarioFiltrado: InventarioItem[] = [];
  filtroStockActivo: StockFilter = 'todos';
  loading = true;
  totalProductos = 0;
  productosDisponibles = 0;
  productosStockBajo = 0;
  productosSinStock = 0;
  confirmVisible = false;
  confirmMessage = '';
  private confirmAction: (() => void) | null = null;
  private readonly moneyFormatter = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  private readonly percentFormatter = new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  private destroy$ = new Subject<void>();

  constructor(
    private inventarioSrv: InventarioService,
    private barcodeLabelsSrv: BarcodeLabelsService,
    private router: Router,
    private messageSrv: MessageService
  ) {}

  ngOnInit(): void {
    this.inventarioSrv.getInventario$()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.inventario = data;
          this.actualizarConteos(data);
          this.aplicarFiltroStock(false);
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.messageSrv.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el inventario' });
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  nuevo(): void {
    this.router.navigate(['/admin/inventario/nuevo']);
  }

  verDetalle(id: string): void {
    this.router.navigate(['/admin/inventario', id]);
  }

  editar(id: string): void {
    this.router.navigate(['/admin/inventario', id, 'editar']);
  }

  confirmarEliminar(item: InventarioItem): void {
    const nombre = resolveInventarioEtiqueta(item);
    this.confirmMessage = `¿Deseas eliminar ${nombre}? Esta acción no se puede deshacer.`;
    this.confirmAction = () => this.eliminar(item.id!);
    this.confirmVisible = true;
  }

  onConfirm(): void {
    if (this.confirmAction) {
      this.confirmAction();
    }
    this.confirmVisible = false;
  }

  onCancel(): void {
    this.confirmVisible = false;
    this.confirmAction = null;
  }

  async reimprimirEtiquetas(item: InventarioItem): Promise<void> {
    const itemConCodigo = { ...item };
    const etiquetas = Math.max(0, Math.floor(Number(itemConCodigo.stock) || 0));
    const itemId = itemConCodigo.id ?? '';

    if (etiquetas < 1) {
      this.messageSrv.add({ severity: 'warn', summary: 'Sin etiquetas', detail: 'El producto no tiene stock disponible' });
      return;
    }

    if (!itemConCodigo.codigoBarras) {
      if (!itemId) {
        this.messageSrv.add({ severity: 'error', summary: 'Error', detail: 'No se pudo generar el codigo de barras' });
        return;
      }
    }

    const printWindow = this.barcodeLabelsSrv.openPrintWindow();

    if (!itemConCodigo.codigoBarras) {
      itemConCodigo.codigoBarras = this.barcodeLabelsSrv.generateUniqueCode(itemConCodigo);
      try {
        await this.inventarioSrv.updateInventarioItem(itemId, { codigoBarras: itemConCodigo.codigoBarras });
      } catch {
        printWindow?.close();
        this.messageSrv.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar el codigo de barras' });
        return;
      }
    }

    const printed = this.barcodeLabelsSrv.printLabels(itemConCodigo, etiquetas, printWindow);
    if (!printed) {
      this.messageSrv.add({ severity: 'warn', summary: 'Impresion bloqueada', detail: 'Permite ventanas emergentes para imprimir etiquetas' });
    }
  }

  filtrarGlobal(event: Event): void {
    const valor = (event.target as HTMLInputElement).value;
    this.dt?.filterGlobal(valor, 'contains');
  }

  seleccionarFiltroStock(filtro: StockFilter): void {
    this.filtroStockActivo = filtro;
    this.aplicarFiltroStock();
  }

  get productosFiltrados(): number {
    return this.inventarioFiltrado.length;
  }

  get porcentajeDisponibles(): number {
    if (!this.totalProductos) {
      return 0;
    }

    return Math.round((this.productosDisponibles / this.totalProductos) * 100);
  }

  getIniciales(valor?: string): string {
    const tokens = String(valor ?? '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (tokens.length === 0) {
      return 'I';
    }

    return tokens
      .slice(0, 2)
      .map(token => token.charAt(0).toUpperCase())
      .join('');
  }

  formatMoney(value: number | null | undefined): string {
    const amount = Number(value ?? 0);
    return this.moneyFormatter.format(Number.isFinite(amount) ? amount : 0);
  }

  formatPercent(value: number | null | undefined): string {
    const amount = Number(value ?? 0);
    return `${this.percentFormatter.format(Number.isFinite(amount) ? amount : 0)}%`;
  }

  formatFecha(valor?: unknown): string {
    return formatDate(valor, { includeTime: false });
  }

  getStockSeverity(item: InventarioItem): string {
    if (item.stock === 0) return 'danger';
    if (item.stock <= item.stockMinimo) return 'warning';
    return 'success';
  }

  getStockLabel(item: InventarioItem): string {
    if (item.stock === 0) return 'Sin stock';
    if (item.stock <= item.stockMinimo) return 'Stock bajo';
    return 'Disponible';
  }

  private actualizarConteos(data: InventarioItem[]): void {
    this.totalProductos = data.length;
    this.productosDisponibles = data.filter(item => this.esDisponible(item)).length;
    this.productosStockBajo = data.filter(item => this.esStockBajo(item)).length;
    this.productosSinStock = data.filter(item => this.esSinStock(item)).length;
  }

  private aplicarFiltroStock(resetPagina = true): void {
    this.inventarioFiltrado = this.inventario.filter(item => {
      switch (this.filtroStockActivo) {
        case 'disponibles':
          return this.esDisponible(item);
        case 'stockBajo':
          return this.esStockBajo(item);
        case 'sinStock':
          return this.esSinStock(item);
        default:
          return true;
      }
    });

    if (resetPagina && this.dt) {
      this.dt.first = 0;
    }
  }

  private esDisponible(item: InventarioItem): boolean {
    return item.stock > item.stockMinimo;
  }

  private esStockBajo(item: InventarioItem): boolean {
    return item.stock > 0 && item.stock <= item.stockMinimo;
  }

  private esSinStock(item: InventarioItem): boolean {
    return item.stock === 0;
  }

  private eliminar(id: string): void {
    this.inventarioSrv.deleteInventarioItem(id).then(() => {
      this.messageSrv.add({ severity: 'success', summary: 'Listo', detail: 'Producto eliminado del inventario' });
    }).catch(() => {
      this.messageSrv.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar' });
    });
  }
}
