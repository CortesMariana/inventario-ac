import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { formatDate } from 'src/app/shared/date-utils';
import { Pedido, PedidosService, getPedidoEstadoLabel, getPedidoEstadoSeverity } from '../../pedidos/pedidos.service';

@Component({
    selector: 'app-detalle-entregas',
    templateUrl: './detalle-entregas.component.html',
    styleUrls: ['./detalle-entregas.component.css'],
    standalone: false
})
export class DetalleEntregasComponent implements OnInit, OnDestroy {

  pedido: Pedido | null = null;
  loading = true;
  timeline: any[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private pedidosSrv: PedidosService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.pedidosSrv.getById$(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.pedido = this.normalizarPedido(data);
          this.buildTimeline(this.pedido);
          this.loading = false;
        },
        error: () => this.loading = false
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getPedidoReferencia(pedido: Pedido): string {
    return String(
      pedido.numeroPedido ??
      pedido.folio ??
      pedido.pedidoNumero ??
      pedido.consecutivoPedido ??
      pedido.consecutivo ??
      pedido.id ??
      ''
    );
  }

  private buildTimeline(pedido: Pedido): void {
    const esTransito = pedido.estado === 'en_transito';
    const esEntregado = pedido.estado === 'entregado';
    const esCancelado = pedido.estado === 'cancelado';

    this.timeline = [
      {
        status: 'Pedido registrado',
        date: this.toDate(pedido.fechaCreacion),
        icon: 'pi pi-file',
        color: '#16A34A',
        completado: true
      },
      {
        status: 'En tránsito',
        date: this.toDate(pedido.fechaActualizacion),
        icon: 'pi pi-truck',
        color: esTransito || esEntregado ? '#3B82F6' : '#d1d5db',
        completado: esTransito || esEntregado
      },
      {
        status: esCancelado ? 'Cancelado' : 'Entregado',
        date: this.toDate(pedido.fechaActualizacion),
        icon: esCancelado ? 'pi pi-times-circle' : 'pi pi-check-circle',
        color: esCancelado ? '#DC2626' : (esEntregado ? '#16A34A' : '#d1d5db'),
        completado: esCancelado || esEntregado
      }
    ];
  }

  getEstadoSeverity(estado: string): string {
    return getPedidoEstadoSeverity(estado);
  }

  getEstadoLabel(estado: string): string {
    return getPedidoEstadoLabel(estado);
  }

  formatFecha(valor?: unknown): string {
    return formatDate(valor, { includeTime: true });
  }

  volver(): void {
    this.router.navigate(['/admin/entregas']);
  }

  private normalizarPedido(pedido: Pedido): Pedido {
    return {
      ...pedido,
      estado: pedido.estado === 'pendiente' ? 'en_revision' : pedido.estado
    };
  }

  private toDate(valor?: any): Date | null {
    if (!valor) {
      return null;
    }

    if (valor instanceof Date) {
      return valor;
    }

    if (typeof valor?.toDate === 'function') {
      return valor.toDate();
    }

    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime()) ? null : fecha;
  }
}
