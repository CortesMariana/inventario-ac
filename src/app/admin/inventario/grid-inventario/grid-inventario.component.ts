import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MessageService } from 'primeng/api';
import { Table } from 'primeng/table';
import { InventarioItem, InventarioService, resolveInventarioEtiqueta } from '../inventario.service';
import { BarcodeLabelsService } from '../barcode-labels.service';
import { formatDate } from 'src/app/shared/date-utils';
import { MermaTipo, MermasService } from '../../mermas/mermas.service';

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
  mermaDialogVisible = false;
  guardandoMerma = false;
  mermaItem: InventarioItem | null = null;
  mermaForm!: FormGroup;
  readonly mermaTipoOptions: { label: string; value: MermaTipo }[] = [
    { label: 'Producto devuelto', value: 'devuelto' },
    { label: 'Caducado', value: 'caducado' },
    { label: 'Roto', value: 'roto' }
  ];
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
    private fb: FormBuilder,
    private inventarioSrv: InventarioService,
    private mermasSrv: MermasService,
    private barcodeLabelsSrv: BarcodeLabelsService,
    private router: Router,
    private messageSrv: MessageService
  ) {}

  ngOnInit(): void {
    this.buildMermaForm();

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

  abrirMerma(item: InventarioItem): void {
    if (!item.id) {
      this.messageSrv.add({ severity: 'error', summary: 'Error', detail: 'No se pudo identificar el producto' });
      return;
    }

    if (Number(item.stock ?? 0) < 1) {
      this.messageSrv.add({ severity: 'warn', summary: 'Sin stock', detail: 'No hay unidades disponibles para registrar como merma' });
      return;
    }

    this.mermaItem = item;
    this.mermaDialogVisible = true;
    this.mermaForm.reset({
      tipo: 'devuelto',
      cantidad: 1,
      motivo: '',
      responsable: ''
    });
  }

  cerrarMerma(): void {
    if (this.guardandoMerma) {
      return;
    }

    this.mermaDialogVisible = false;
    this.mermaItem = null;
  }

  async registrarMerma(): Promise<void> {
    if (!this.mermaItem) {
      return;
    }

    if (this.mermaForm.invalid) {
      this.mermaForm.markAllAsTouched();
      this.messageSrv.add({ severity: 'warn', summary: 'Atencion', detail: 'Completa causa, cantidad y motivo' });
      return;
    }

    const cantidad = this.cantidadMerma;
    const stockDisponible = Number(this.mermaItem.stock ?? 0);

    if (cantidad > stockDisponible) {
      this.messageSrv.add({
        severity: 'warn',
        summary: 'Stock insuficiente',
        detail: `Solo hay ${stockDisponible} unidad(es) disponibles`
      });
      return;
    }

    this.guardandoMerma = true;
    try {
      await this.mermasSrv.registrarMerma({
        item: this.mermaItem,
        cantidad,
        tipo: this.mermaForm.value.tipo,
        motivo: String(this.mermaForm.value.motivo ?? '').trim(),
        responsable: String(this.mermaForm.value.responsable ?? '').trim()
      });

      this.messageSrv.add({
        severity: 'success',
        summary: 'Merma registrada',
        detail: `Se descontaron ${cantidad} unidad(es) de ${resolveInventarioEtiqueta(this.mermaItem)}`
      });
      this.mermaDialogVisible = false;
      this.mermaItem = null;
    } catch (err: any) {
      this.messageSrv.add({
        severity: 'error',
        summary: 'Error',
        detail: err?.message ?? 'No se pudo registrar la merma'
      });
    } finally {
      this.guardandoMerma = false;
    }
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

  get cantidadMerma(): number {
    const cantidad = Number(this.mermaForm?.value?.cantidad ?? 0);
    return Math.max(0, Math.floor(Number.isFinite(cantidad) ? cantidad : 0));
  }

  get stockDespuesMerma(): number {
    if (!this.mermaItem) {
      return 0;
    }

    return Math.max(0, Number(this.mermaItem.stock ?? 0) - this.cantidadMerma);
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

  private buildMermaForm(): void {
    this.mermaForm = this.fb.group({
      tipo: ['devuelto', Validators.required],
      cantidad: [1, [Validators.required, Validators.min(1)]],
      motivo: ['', Validators.required],
      responsable: ['']
    });
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
