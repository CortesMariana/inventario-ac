import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MessageService } from 'primeng/api';
import { InventarioItem, InventarioService } from '../inventario.service';

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
    private route: ActivatedRoute,
    private router: Router,
    private messageSrv: MessageService
  ) {}

  ngOnInit(): void {
    this.buildForm();
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
      nombreProducto: ['', Validators.required],
      productoId:     ['', Validators.required],
      sucursalId:     ['', Validators.required],
      sucursal:       ['', Validators.required],
      stock:          [0, [Validators.required, Validators.min(0)]],
      stockMinimo:    [5, [Validators.required, Validators.min(0)]]
    });
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
            nombreProducto: item.nombreProducto ?? '',
            productoId: item.productoId ?? '',
            sucursalId: item.sucursalId ?? '',
            sucursal: item.sucursal ?? '',
            stock: item.stock ?? 0,
            stockMinimo: item.stockMinimo ?? 5
          }, { emitEvent: false });

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

  private syncSucursalLabel(sucursalId: string | null | undefined, fallback = ''): void {
    const found = this.sucursales.find(s => s.value === sucursalId);
    this.form.patchValue({ sucursal: found?.label ?? fallback }, { emitEvent: false });
  }

  get resumenInicial(): string {
    const nombre = String(this.form?.get('nombreProducto')?.value ?? '').trim();
    return nombre ? nombre.charAt(0).toUpperCase() : 'I';
  }

  get resumenProducto(): string {
    return String(this.form?.get('nombreProducto')?.value ?? '').trim() || 'Sin nombre';
  }

  get resumenProductoId(): string {
    return String(this.form?.get('productoId')?.value ?? '').trim() || 'Pendiente';
  }

  get resumenSucursal(): string {
    return String(this.form?.get('sucursal')?.value ?? '').trim() || 'Sucursal pendiente';
  }

  get resumenSucursalId(): string {
    return String(this.form?.get('sucursalId')?.value ?? '').trim() || 'Pendiente';
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

  async guardar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    const data = this.form.getRawValue() as Partial<InventarioItem>;
    try {
      if (this.editMode && this.itemId) {
        await this.inventarioSrv.updateInventarioItem(this.itemId, data);
        this.messageSrv.add({ severity: 'success', summary: 'Listo', detail: 'Producto actualizado en el inventario' });
      } else {
        await this.inventarioSrv.createInventarioItem(data as InventarioItem);
        this.messageSrv.add({ severity: 'success', summary: 'Listo', detail: 'Producto agregado al inventario' });
      }
      this.router.navigate(['/admin/inventario']);
    } catch {
      this.messageSrv.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar' });
    } finally {
      this.loading = false;
    }
  }

  cancelar(): void {
    this.router.navigate(['/admin/inventario']);
  }
}
