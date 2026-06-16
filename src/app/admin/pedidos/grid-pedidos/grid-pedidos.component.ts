import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Pedido, PedidosService } from '../pedidos.service';

@Component({
  selector: 'app-grid-pedidos',
  templateUrl: './grid-pedidos.component.html',
  styleUrls: ['./grid-pedidos.component.css']
})
export class GridPedidosComponent implements OnInit, OnDestroy {

  pedidos: Pedido[] = [];
  loading = true;
  private destroy$ = new Subject<void>();

  estadoOpciones = [
    { label: 'Todos',        value: null },
    { label: 'Pendiente',    value: 'pendiente' },
    { label: 'En tránsito',  value: 'en_transito' },
    { label: 'Entregado',    value: 'entregado' },
    { label: 'Cancelado',    value: 'cancelado' },
  ];

  constructor(
    private pedidosSrv: PedidosService,
    private router: Router,
    private confirmSrv: ConfirmationService,
    private messageSrv: MessageService
  ) {}

  ngOnInit(): void {
    this.pedidosSrv.getAll$()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.pedidos = data;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.messageSrv.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los pedidos' });
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  nuevo(): void {
    this.router.navigate(['/admin/pedidos/nuevo']);
  }

  verDetalle(id: string): void {
    this.router.navigate(['/admin/pedidos', id]);
  }

  confirmarCancelar(pedido: Pedido): void {
    this.confirmSrv.confirm({
      message: `¿Deseas cancelar el pedido de ${pedido.clienteNombre}?`,
      header: 'Cancelar pedido',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.pedidosSrv.cancelar(pedido.id!).then(() => {
          this.messageSrv.add({ severity: 'success', summary: 'Listo', detail: 'Pedido cancelado' });
        }).catch(() => {
          this.messageSrv.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cancelar' });
        });
      }
    });
  }

  getEstadoSeverity(estado: string): string {
    const map: Record<string, string> = {
      pendiente:   'warning',
      en_transito: 'info',
      entregado:   'success',
      cancelado:   'danger',
      sin_stock:   'danger'
    };
    return map[estado] ?? 'info';
  }

  getEstadoLabel(estado: string): string {
    const map: Record<string, string> = {
      pendiente:   'Pendiente',
      en_transito: 'En tránsito',
      entregado:   'Entregado',
      cancelado:   'Cancelado',
      sin_stock:   'Sin stock'
    };
    return map[estado] ?? estado;
  }
}