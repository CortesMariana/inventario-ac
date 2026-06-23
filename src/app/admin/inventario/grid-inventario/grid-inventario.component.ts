import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Table } from 'primeng/table';
import { InventarioItem, InventarioService } from '../inventario.service';

@Component({
    selector: 'app-grid-inventario',
    templateUrl: './grid-inventario.component.html',
    styleUrls: ['./grid-inventario.component.css'],
    standalone: false
})
export class GridInventarioComponent implements OnInit, OnDestroy {

  @ViewChild('dt') dt!: Table;

  inventario: InventarioItem[] = [];
  loading = true;
  totalProductos = 0;
  productosDisponibles = 0;
  productosStockBajo = 0;
  productosSinStock = 0;
  private destroy$ = new Subject<void>();

  constructor(
    private inventarioSrv: InventarioService,
    private router: Router,
    private confirmSrv: ConfirmationService,
    private messageSrv: MessageService
  ) {}

  ngOnInit(): void {
    this.inventarioSrv.getInventario$()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.inventario = data;
          this.totalProductos = data.length;
          this.productosDisponibles = data.filter(item => item.stock > item.stockMinimo).length;
          this.productosStockBajo = data.filter(item => item.stock > 0 && item.stock <= item.stockMinimo).length;
          this.productosSinStock = data.filter(item => item.stock === 0).length;
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
    const nombre = item.nombreProducto || item.productoId || 'este producto';
    this.confirmSrv.confirm({
      message: `¿Deseas eliminar ${nombre}?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.eliminar(item.id!)
    });
  }

  filtrarGlobal(event: Event): void {
    const valor = (event.target as HTMLInputElement).value;
    this.dt?.filterGlobal(valor, 'contains');
  }

  get porcentajeDisponibles(): number {
    if (!this.totalProductos) {
      return 0;
    }

    return Math.round((this.productosDisponibles / this.totalProductos) * 100);
  }

  getIniciales(nombre?: string): string {
    const tokens = String(nombre ?? '')
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

  private eliminar(id: string): void {
    this.inventarioSrv.deleteInventarioItem(id).then(() => {
      this.messageSrv.add({ severity: 'success', summary: 'Listo', detail: 'Producto eliminado del inventario' });
    }).catch(() => {
      this.messageSrv.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar' });
    });
  }
}
