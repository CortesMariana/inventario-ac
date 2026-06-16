import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { InventarioItem, InventarioService } from '../inventario.service';

@Component({
  selector: 'app-detalle-inventario',
  templateUrl: './detalle-inventario.component.html',
  styleUrls: ['./detalle-inventario.component.css']
})
export class DetalleInventarioComponent implements OnInit, OnDestroy {

  item: InventarioItem | null = null;
  loading = true;
  private destroy$ = new Subject<void>();

  constructor(
    private inventarioSrv: InventarioService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.inventarioSrv.getInventario$()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (items) => {
          this.item = items.find(i => i.id === id) ?? null;
          this.loading = false;
        },
        error: () => this.loading = false
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getStockSeverity(): string {
    if (!this.item) return 'info';
    if (this.item.stock === 0) return 'danger';
    if (this.item.stock <= this.item.stockMinimo) return 'warning';
    return 'success';
  }

  getStockLabel(): string {
    if (!this.item) return '';
    if (this.item.stock === 0) return 'Sin stock';
    if (this.item.stock <= this.item.stockMinimo) return 'Stock bajo';
    return 'Disponible';
  }

  editar(): void {
    this.router.navigate(['/admin/inventario', this.item?.id, 'editar']);
  }

  volver(): void {
    this.router.navigate(['/admin/inventario']);
  }
}