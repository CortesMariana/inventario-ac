import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { InventarioItem, InventarioService } from '../inventario.service';

@Component({
  selector: 'app-grid-inventario',
  templateUrl: './grid-inventario.component.html',
  styleUrls: ['./grid-inventario.component.css']
})
export class GridInventarioComponent implements OnInit, OnDestroy {

  inventario: InventarioItem[] = [];
  loading = true;
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
}