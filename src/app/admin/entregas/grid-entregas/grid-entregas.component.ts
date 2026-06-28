import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subject, takeUntil } from 'rxjs';
import { Pedido, PedidosService, getPedidoEstadoLabel, getPedidoEstadoSeverity } from '../../pedidos/pedidos.service';

type EstadoEntregaFiltro = 'todos' | 'en_transito' | 'entregado' | 'cancelado';

interface EstadoCard {
  value: EstadoEntregaFiltro;
  label: string;
  hint: string;
  icon: string;
}

@Component({
    selector: 'app-grid-entregas',
    templateUrl: './grid-entregas.component.html',
    styleUrls: ['./grid-entregas.component.css'],
    standalone: false
})
export class GridEntregasComponent implements OnInit, OnDestroy {

  pedidos: Pedido[] = [];
  pedidosFiltrados: Pedido[] = [];
  loading = true;
  searchTerm = '';
  estadoFiltro: EstadoEntregaFiltro = 'todos';

  readonly estados: EstadoCard[] = [
    { value: 'todos', label: 'Pedidos', hint: 'Todos los estados visibles', icon: 'pi pi-file-edit' },
    { value: 'en_transito', label: 'En tránsito', hint: 'Pedidos en ruta', icon: 'pi pi-truck' },
    { value: 'entregado', label: 'Entregados', hint: 'Pedidos completados', icon: 'pi pi-check-circle' },
    { value: 'cancelado', label: 'Cancelados', hint: 'Pedidos cancelados', icon: 'pi pi-times-circle' }
  ];

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
          this.pedidos = data.filter(pedido => this.esEstadoVisible(pedido.estado));
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

  get totalPedidos(): number {
    return this.pedidos.length;
  }

  get totalEnTransito(): number {
    return this.pedidos.filter(pedido => pedido.estado === 'en_transito').length;
  }

  get totalEntregados(): number {
    return this.pedidos.filter(pedido => pedido.estado === 'entregado').length;
  }

  get totalCancelados(): number {
    return this.pedidos.filter(pedido => pedido.estado === 'cancelado').length;
  }

  get totalFiltrados(): number {
    return this.pedidosFiltrados.length;
  }

  getCount(estado: EstadoEntregaFiltro): number {
    if (estado === 'todos') {
      return this.totalPedidos;
    }

    return this.pedidos.filter(pedido => pedido.estado === estado).length;
  }

  seleccionarFiltroEstado(estado: EstadoEntregaFiltro): void {
    this.estadoFiltro = estado;
    this.filtrar();
  }

  filtrar(): void {
    const term = this.searchTerm.trim().toLowerCase();

    this.pedidosFiltrados = [...this.pedidos]
      .filter(pedido => this.matchesEstado(pedido) && this.matchesTexto(pedido, term))
      .sort((a, b) => this.getSortValue(b) - this.getSortValue(a));
  }

  matchesEstado(pedido: Pedido): boolean {
    return this.estadoFiltro === 'todos' || pedido.estado === this.estadoFiltro;
  }

  matchesTexto(pedido: Pedido, term: string): boolean {
    if (!term) {
      return true;
    }

    const campos = [
      this.getPedidoReferencia(pedido),
      pedido.clienteNombre,
      pedido.clienteRfc,
      pedido.sucursal,
      getPedidoEstadoLabel(pedido.estado)
    ];

    return campos.some(campo => String(campo).toLowerCase().includes(term));
  }

  getIniciales(nombre?: string): string {
    const tokens = String(nombre ?? '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (!tokens.length) {
      return 'P';
    }

    return tokens.slice(0, 2).map(token => token.charAt(0).toUpperCase()).join('');
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

  verDetalle(id: string): void {
    this.router.navigate(['/admin/entregas', id], {
      state: { returnUrl: '/admin/entregas' }
    });
  }

  getEstadoSeverity(estado: string): string {
    return getPedidoEstadoSeverity(estado);
  }

  getEstadoLabel(estado: string): string {
    return getPedidoEstadoLabel(estado);
  }

  private getSortValue(pedido: Pedido): number {
    const fecha = this.toDate(pedido.fechaActualizacion ?? pedido.fechaCreacion);
    return fecha?.getTime() ?? 0;
  }

  private esEstadoVisible(estado: string): boolean {
    return estado === 'en_transito' || estado === 'entregado' || estado === 'cancelado';
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
