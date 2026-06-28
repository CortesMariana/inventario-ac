import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MessageService } from 'primeng/api';
import { getPedidoEstadoLabel, getPedidoEstadoSeverity, isPedidoEnRevision, Pedido, PedidosService } from '../pedidos.service';

@Component({
    selector: 'app-grid-pedidos',
    templateUrl: './grid-pedidos.component.html',
    styleUrls: ['./grid-pedidos.component.css'],
    standalone: false
})
export class GridPedidosComponent implements OnInit, OnDestroy {

  pedidos: Pedido[] = [];
  pedidosFiltrados: Pedido[] = [];
  loading = true;
  searchTerm = '';
  filtroEstadoActivo: string | null = null;

  confirmVisible = false;
  confirmMessage = '';
  private confirmAction: (() => void) | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private pedidosSrv: PedidosService,
    private router: Router,
    private messageSrv: MessageService
  ) {}

  ngOnInit(): void {
    this.pedidosSrv.getAll$()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.pedidos = data;
          this.filtrar();
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

  get totalPendientes(): number { return this.pedidos.filter(p => isPedidoEnRevision(p.estado)).length; }
  get totalEnTransito(): number { return this.pedidos.filter(p => p.estado === 'en_transito').length; }
  get totalEntregados(): number { return this.pedidos.filter(p => p.estado === 'entregado').length; }
  get totalCancelados(): number { return this.pedidos.filter(p => p.estado === 'cancelado').length; }

  seleccionarFiltroEstado(estado: string | null): void {
    this.filtroEstadoActivo = estado;
    this.filtrar();
  }

  filtrar(): void {
    let lista = [...this.pedidos];
    if (this.filtroEstadoActivo) {
      if (isPedidoEnRevision(this.filtroEstadoActivo)) {
        lista = lista.filter(p => isPedidoEnRevision(p.estado));
      } else {
        lista = lista.filter(p => p.estado === this.filtroEstadoActivo);
      }
    }
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      lista = lista.filter(p =>
        p.clienteNombre?.toLowerCase().includes(term) ||
        p.clienteRfc?.toLowerCase().includes(term) ||
        p.sucursal?.toLowerCase().includes(term) ||
        String(p.numeroPedido ?? p.folio ?? p.pedidoNumero ?? '').toLowerCase().includes(term)
      );
    }
    this.pedidosFiltrados = lista;
  }

  getIniciales(nombre: string): string {
    if (!nombre) return '?';
    return nombre.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  }

  nuevo(): void {
    this.router.navigate(['/admin/pedidos/nuevo']);
  }

  verDetalle(id: string): void {
    this.router.navigate(['/admin/pedidos', id], {
      state: { returnUrl: '/admin/pedidos' }
    });
  }

  confirmarCancelar(pedido: Pedido): void {
    this.confirmMessage = `¿Deseas cancelar el pedido de ${pedido.clienteNombre}? Esta acción no se puede deshacer.`;
    this.confirmAction = () => this.cancelarPedido(pedido.id!);
    this.confirmVisible = true;
  }

  private cancelarPedido(id: string): void {
    this.pedidosSrv.cancelar(id).then(() => {
      this.messageSrv.add({ severity: 'success', summary: 'Listo', detail: 'Pedido cancelado' });
    }).catch(() => {
      this.messageSrv.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cancelar' });
    });
  }

  onConfirm(): void {
    if (this.confirmAction) this.confirmAction();
    this.confirmVisible = false;
  }

  onCancel(): void {
    this.confirmVisible = false;
    this.confirmAction = null;
  }

  getEstadoSeverity(estado: string): string {
    return getPedidoEstadoSeverity(estado);
  }

  getEstadoLabel(estado: string): string {
    return getPedidoEstadoLabel(estado);
  }
}
