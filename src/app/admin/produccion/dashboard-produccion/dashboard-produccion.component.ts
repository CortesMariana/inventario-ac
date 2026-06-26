import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { ProduccionAlerta, ProduccionDashboardKpis, ProduccionService } from '../produccion.service';

@Component({
    selector: 'app-dashboard-produccion',
    templateUrl: './dashboard-produccion.component.html',
    styleUrls: ['./dashboard-produccion.component.css'],
    standalone: false
})
export class DashboardProduccionComponent implements OnInit, OnDestroy {

  kpis: ProduccionDashboardKpis = {
    totalProductos: 0,
    alertasActivas: 0,
    alertasCriticas: 0,
    alertasBajas: 0,
    stockCero: 0,
    sucursalesAfectadas: 0,
    unidadesPorReponer: 0,
    alertasPrioritarias: [],
    alertas: []
  };

  loading = true;
  private destroy$ = new Subject<void>();

  constructor(private produccionSrv: ProduccionService) {}

  ngOnInit(): void {
    this.produccionSrv.getDashboard$()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.kpis = data;
          this.loading = false;
        },
        error: (err) => {
          console.error('Error cargando produccion:', err);
          this.loading = false;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get tieneAlertas(): boolean {
    return this.kpis.alertasActivas > 0;
  }

  get notificationClass(): string {
    if (this.kpis.alertasCriticas > 0) {
      return 'production-notification notification-critical';
    }

    if (this.kpis.alertasActivas > 0) {
      return 'production-notification notification-warning';
    }

    return 'production-notification notification-safe';
  }

  get notificationTitle(): string {
    if (this.kpis.alertasCriticas > 0) {
      return 'Atencion inmediata requerida';
    }

    if (this.kpis.alertasActivas > 0) {
      return 'Alertas activas en produccion';
    }

    return 'Produccion estable';
  }

  get notificationText(): string {
    if (this.kpis.alertasCriticas > 0) {
      return `${this.kpis.alertasCriticas} productos estan en cero y necesitan reposicion urgente.`;
    }

    if (this.kpis.alertasActivas > 0) {
      return `${this.kpis.alertasActivas} productos estan por debajo del minimo y deben revisarse hoy.`;
    }

    return 'No hay alertas activas de stock bajo.';
  }

  get notificationLabel(): string {
    if (this.kpis.alertasCriticas > 0) {
      return 'Urgente';
    }

    if (this.kpis.alertasActivas > 0) {
      return 'Pendiente';
    }

    return 'OK';
  }

  get kpiCardClass(): string {
    return this.kpis.alertasCriticas > 0 ? 'kpi-card kpi-card-critical' : 'kpi-card';
  }

  trackByAlerta(_: number, alerta: ProduccionAlerta): string {
    return alerta.id ?? `${alerta.productoId}-${alerta.sucursalId}-${alerta.nombreProducto}`;
  }

  getTagSeverity(alerta: ProduccionAlerta): 'danger' | 'warning' {
    return alerta.nivel === 'critical' ? 'danger' : 'warning';
  }

  getTagLabel(alerta: ProduccionAlerta): string {
    return alerta.nivel === 'critical' ? 'Critica' : 'Baja';
  }

  getAlertClass(alerta: ProduccionAlerta): string {
    return alerta.nivel === 'critical' ? 'alert-item alert-critical' : 'alert-item alert-warning';
  }

  getMarkerClass(alerta: ProduccionAlerta): string {
    return alerta.nivel === 'critical' ? 'alert-dot dot-red' : 'alert-dot dot-amber';
  }

  getProgressWidth(alerta: ProduccionAlerta): number {
    return alerta.cobertura;
  }

  formatUnits(value: number): string {
    return `${value} unidades`;
  }

  formatRatio(alerta: ProduccionAlerta): string {
    return `${alerta.stock}/${alerta.stockMinimo}`;
  }
}
