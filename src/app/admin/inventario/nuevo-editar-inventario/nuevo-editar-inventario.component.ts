import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MessageService } from 'primeng/api';
import { InventarioItem, InventarioService } from '../inventario.service';
import { BarcodeLabelsService } from '../barcode-labels.service';

@Component({
    selector: 'app-nuevo-editar-inventario',
    templateUrl: './nuevo-editar-inventario.component.html',
    styleUrls: ['./nuevo-editar-inventario.component.css'],
    standalone: false
})
export class NuevoEditarInventarioComponent implements OnInit, OnDestroy {

  form!: FormGroup;
  editMode = false;
  itemId: string | null = null;
  loading = false;
  private destroy$ = new Subject<void>();

  sucursales = [
    { label: 'León',      value: 'leon' },
    { label: 'Silao',     value: 'silao' },
    { label: 'Irapuato',  value: 'irapuato' },
    { label: 'Salamanca', value: 'salamanca' }
  ];

  constructor(
    private fb: FormBuilder,
    private inventarioSrv: InventarioService,
    private barcodeLabelsSrv: BarcodeLabelsService,
    private route: ActivatedRoute,
    private router: Router,
    private messageSrv: MessageService
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.setupImpuestosCalculation();
    this.setupProductIdentitySync();
    this.itemId = this.route.snapshot.paramMap.get('id');
    if (this.itemId) {
      this.editMode = true;
      this.loadInventario(this.itemId);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private buildForm(): void {
    this.form = this.fb.group({
      nombreProducto: [''],
      productoId:     [''],
      codigoProducto: [''],
      codigoBarras:   [''],
      imprimirEtiquetas: [true],
      claveSat:       [''],
      fechaElaboracion: [''],
      fechaCaducidad: [''],
      numeroLote:     [''],
      clasificacionProducto: [''],
      cantidad:       [0, [Validators.min(0)]],
      unidad:         [''],
      claveProductoServicio: [''],
      descripcion:    [''],
      valorUnitario:  [0, [Validators.min(0)]],
      tipoProducto:   [''],
      abreviaturaClave: [''],
      descuento:      [0, [Validators.min(0)]],
      impuestos:      [{ value: 0, disabled: true }],
      sucursalId:     ['', Validators.required],
      sucursal:       ['', Validators.required],
      stock:          [0, [Validators.required, Validators.min(0)]],
      stockMinimo:    [5, [Validators.required, Validators.min(0)]]
    });
  }

  private setupImpuestosCalculation(): void {
    this.form.get('valorUnitario')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.calcularImpuestos());
  }

  private setupProductIdentitySync(): void {
    this.form.get('codigoProducto')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.syncProductIdentity());

    this.form.get('descripcion')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.syncProductIdentity());
  }

  private syncProductIdentity(): void {
    const codigoProducto = String(this.form.get('codigoProducto')?.value ?? '').trim();
    const descripcion = String(this.form.get('descripcion')?.value ?? '').trim();

    this.form.patchValue({
      productoId: codigoProducto,
      nombreProducto: codigoProducto || descripcion
    }, { emitEvent: false });
  }

  private calcularImpuestos(): void {
    const valorUnitario = Number(this.form.get('valorUnitario')?.value ?? 0);
    const impuestos = Number((valorUnitario * 0.16).toFixed(2));
    this.form.patchValue({ impuestos }, { emitEvent: false });
  }

  private loadInventario(id: string): void {
    this.inventarioSrv.getInventarioById$(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (item) => {
          if (!item) {
            this.messageSrv.add({ severity: 'error', summary: 'Error', detail: 'No se encontró el producto' });
            this.router.navigate(['/admin/inventario']);
            return;
          }

          this.form.patchValue({
            nombreProducto: item.codigoProducto ?? item.productoId ?? item.nombreProducto ?? '',
            productoId: item.codigoProducto ?? item.productoId ?? '',
            codigoProducto: item.codigoProducto ?? item.productoId ?? '',
            codigoBarras: item.codigoBarras ?? '',
            imprimirEtiquetas: false,
            claveSat: item.claveSat ?? '',
            fechaElaboracion: item.fechaElaboracion ?? '',
            fechaCaducidad: item.fechaCaducidad ?? '',
            numeroLote: item.numeroLote ?? '',
            clasificacionProducto: item.clasificacionProducto ?? '',
            cantidad: item.cantidad ?? 0,
            unidad: item.unidad ?? '',
            claveProductoServicio: item.claveProductoServicio ?? '',
            descripcion: item.descripcion ?? item.nombreProducto ?? '',
            valorUnitario: item.valorUnitario ?? 0,
            tipoProducto: item.tipoProducto ?? '',
            abreviaturaClave: item.abreviaturaClave ?? '',
            descuento: item.descuento ?? 0,
            impuestos: item.impuestos ?? 0,
            sucursalId: item.sucursalId ?? '',
            sucursal: item.sucursal ?? '',
            stock: item.stock ?? 0,
            stockMinimo: item.stockMinimo ?? 5
          }, { emitEvent: false });

          this.calcularImpuestos();
          this.syncProductIdentity();
          this.syncSucursalLabel(item.sucursalId, item.sucursal ?? '');
        },
        error: () => {
          this.messageSrv.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el producto' });
          this.router.navigate(['/admin/inventario']);
        }
      });
  }

  get f() { return this.form.controls; }

  onSucursalChange(event: any): void {
    this.syncSucursalLabel(event.value);
  }

  generarCodigoBarras(): void {
    this.syncProductIdentity();
    const data = this.form.getRawValue() as Partial<InventarioItem>;
    const codigoBarras = this.barcodeLabelsSrv.generateUniqueCode(data);
    this.form.patchValue({
      codigoBarras,
      imprimirEtiquetas: true
    });
  }

  private syncSucursalLabel(sucursalId: string | null | undefined, fallback = ''): void {
    const found = this.sucursales.find(s => s.value === sucursalId);
    this.form.patchValue({ sucursal: found?.label ?? fallback }, { emitEvent: false });
  }

  get resumenInicial(): string {
    const nombre = String(this.form?.get('descripcion')?.value ?? this.form?.get('codigoProducto')?.value ?? '').trim();
    return nombre ? nombre.charAt(0).toUpperCase() : 'I';
  }

  get resumenProducto(): string {
    return String(this.form?.get('descripcion')?.value ?? '').trim() || 'Sin descripcion';
  }

  get resumenProductoId(): string {
    return String(this.form?.get('codigoProducto')?.value ?? '').trim() || 'Pendiente';
  }

  get resumenSucursal(): string {
    return String(this.form?.get('sucursal')?.value ?? '').trim() || 'Sucursal pendiente';
  }

  get resumenSucursalId(): string {
    return String(this.form?.get('sucursalId')?.value ?? '').trim() || 'Pendiente';
  }

  get resumenCodigoBarras(): string {
    return String(this.form?.get('codigoBarras')?.value ?? '').trim() || 'Sin generar';
  }

  get resumenStock(): string {
    const stock = Number(this.form?.get('stock')?.value ?? 0);
    return `${stock} unidades`;
  }

  get resumenStockMinimo(): string {
    const stockMinimo = Number(this.form?.get('stockMinimo')?.value ?? 0);
    return `${stockMinimo} unidades`;
  }

  get resumenMargen(): number {
    const stock = Number(this.form?.get('stock')?.value ?? 0);
    const stockMinimo = Number(this.form?.get('stockMinimo')?.value ?? 0);
    return stock - stockMinimo;
  }

  get resumenMargenTexto(): string {
    const margen = this.resumenMargen;
    const prefijo = margen > 0 ? '+' : '';
    return `${prefijo}${margen} unidades`;
  }

  get resumenEstado(): string {
    const stock = Number(this.form?.get('stock')?.value ?? 0);
    const stockMinimo = Number(this.form?.get('stockMinimo')?.value ?? 0);

    if (stock === 0) return 'Sin stock';
    if (stock <= stockMinimo) return 'Stock bajo';
    return 'Disponible';
  }

  get resumenEstadoSeverity(): string {
    const stock = Number(this.form?.get('stock')?.value ?? 0);
    const stockMinimo = Number(this.form?.get('stockMinimo')?.value ?? 0);

    if (stock === 0) return 'danger';
    if (stock <= stockMinimo) return 'warning';
    return 'success';
  }

  get resumenModo(): string {
    return this.editMode ? 'Edición' : 'Nuevo';
  }

  get etiquetasAImprimir(): number {
    const stock = Number(this.form?.get('stock')?.value ?? 0);
    return Math.max(0, Math.floor(Number.isFinite(stock) ? stock : 0));
  }

  async guardar(): Promise<void> {
    this.syncProductIdentity();
    this.calcularImpuestos();

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    const rawData = this.form.getRawValue() as Partial<InventarioItem> & { imprimirEtiquetas?: boolean };
    const { imprimirEtiquetas, ...data } = rawData;
    const debeImprimirEtiquetas = !this.editMode && Boolean(data.codigoBarras) && Boolean(imprimirEtiquetas);
    const printWindow = debeImprimirEtiquetas && this.etiquetasAImprimir > 0
      ? this.barcodeLabelsSrv.openPrintWindow()
      : null;
    try {
      if (this.editMode && this.itemId) {
        await this.inventarioSrv.updateInventarioItem(this.itemId, data);
        this.messageSrv.add({ severity: 'success', summary: 'Listo', detail: 'Producto actualizado en el inventario' });
      } else {
        await this.inventarioSrv.createInventarioItem(data as InventarioItem);
        this.messageSrv.add({ severity: 'success', summary: 'Listo', detail: 'Producto agregado al inventario' });
        if (debeImprimirEtiquetas) {
          this.imprimirEtiquetas(data, printWindow);
        }
      }
      this.router.navigate(['/admin/inventario']);
    } catch {
      printWindow?.close();
      this.messageSrv.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar' });
    } finally {
      this.loading = false;
    }
  }

  cancelar(): void {
    this.router.navigate(['/admin/inventario']);
  }

  private imprimirEtiquetas(item: Partial<InventarioItem>, printWindow?: Window | null): void {
    if (this.etiquetasAImprimir < 1) {
      this.messageSrv.add({ severity: 'warn', summary: 'Sin etiquetas', detail: 'El stock capturado es 0' });
      return;
    }

    const printed = this.barcodeLabelsSrv.printLabels(item, this.etiquetasAImprimir, printWindow);
    if (!printed) {
      this.messageSrv.add({ severity: 'warn', summary: 'Impresion bloqueada', detail: 'Permite ventanas emergentes para imprimir etiquetas' });
    }
  }
}
