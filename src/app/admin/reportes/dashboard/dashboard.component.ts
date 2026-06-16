import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { KpiDashboard, ReportesService } from '../reportes.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {

  kpis: KpiDashboard = {
    totalClientes:     0,
    totalProductos:    0,
    totalPedidosMes:   0,
    valorAlmacen:      0,
    productosEnAlerta: [],
    ultimosPedidos:    []
  };

  loading = true;
  private destroy$ = new Subject<void>();

  constructor(private reportesSrv: ReportesService) {}

  ngOnInit(): void {
    this.reportesSrv.getDashboardKpis$()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.kpis = data;
          this.loading = false;
        },
        error: (err) => {
          console.error('Error cargando dashboard:', err);
          this.loading = false;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  formatValor(valor: number): string {
    if (valor >= 1000000) return `$${(valor / 1000000).toFixed(1)}M`;
    if (valor >= 1000) return `$${(valor / 1000).toFixed(0)}k`;
    return `$${valor.toFixed(0)}`;
  }

  getEstadoClass(estado: string): string {
    const map: Record<string, string> = {
      'entregado':   'pill-green',
      'en_transito': 'pill-amber',
      'pendiente':   'pill-amber',
      'cancelado':   'pill-red',
      'sin_stock':   'pill-red'
    };
    return map[estado] ?? 'pill-gray';
  }

  getEstadoLabel(estado: string): string {
    const map: Record<string, string> = {
      'entregado':   'Entregado',
      'en_transito': 'En tránsito',
      'pendiente':   'Pendiente',
      'cancelado':   'Cancelado',
      'sin_stock':   'Sin stock'
    };
    return map[estado] ?? estado;
  }

  getAlertaClass(stock: number): string {
    return stock === 0 ? 'dot-red' : 'dot-amber';
  }
}