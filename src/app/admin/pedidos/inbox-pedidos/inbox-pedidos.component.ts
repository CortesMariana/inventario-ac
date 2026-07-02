import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subject, takeUntil } from 'rxjs';
import {
  getPedidoEstadoLabel,
  getPedidoEstadoSeverity,
  getTipoPedidoLabel,
  getTipoPedidoSeverity,
  isPedidoEnRevision,
  Pedido,
  PedidosService,
  ProductoPedido
} from '../pedidos.service';

type VistaInbox = 'bandeja' | 'historial';
type TipoFiltro = 'todos' | 'factura' | 'consigna';

interface VistaMenu {
  value: VistaInbox;
  label: string;
  icon: string;
  hint: string;
}

interface TipoMenu {
  value: TipoFiltro;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-inbox-pedidos',
  templateUrl: './inbox-pedidos.component.html',
  styleUrls: ['./inbox-pedidos.component.css'],
  standalone: false
})
export class InboxPedidosComponent implements OnInit, OnDestroy {

  pedidos: Pedido[] = [];
  loading = true;
  vistaActiva: VistaInbox = 'bandeja';
  tipoFiltro: TipoFiltro = 'todos';
  searchTerm = '';
  pedidoSeleccionadoId: string | null = null;

  confirmVisible = false;
  confirmTitle = 'Autorizar pedido';
  confirmMessage = '';
  confirmLabel = 'Autorizar';
  confirmType: 'danger' | 'warning' | 'info' = 'warning';
  private confirmAction: (() => void) | null = null;

  readonly vistas: VistaMenu[] = [
    { value: 'bandeja', label: 'Bandeja', icon: 'pi pi-inbox', hint: 'Pedidos por revisar' },
    { value: 'historial', label: 'Historial', icon: 'pi pi-history', hint: 'Pedidos procesados' }
  ];

  readonly tipos: TipoMenu[] = [
    { value: 'todos', label: 'Todos', icon: 'pi pi-filter' },
    { value: 'factura', label: 'Factura', icon: 'pi pi-file-pdf' },
    { value: 'consigna', label: 'Consigna', icon: 'pi pi-file' }
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
          this.pedidos = data.map(pedido => this.normalizarPedido(pedido));
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

  get totalRevision(): number {
    return this.pedidos.filter(pedido => isPedidoEnRevision(pedido.estado)).length;
  }

  get totalAutorizados(): number {
    return this.pedidos.filter(pedido => pedido.estado === 'autorizado').length;
  }

  get totalRevisionFactura(): number {
    return this.pedidos.filter(pedido => isPedidoEnRevision(pedido.estado) && pedido.tipoPedido === 'factura').length;
  }

  get totalRevisionConsigna(): number {
    return this.pedidos.filter(pedido => isPedidoEnRevision(pedido.estado) && pedido.tipoPedido === 'consigna').length;
  }

  get totalHistorial(): number {
    return this.pedidos.filter(pedido => !isPedidoEnRevision(pedido.estado)).length;
  }

  get pedidosBandeja(): Pedido[] {
    return this.aplicarFiltros(this.pedidos.filter(pedido => isPedidoEnRevision(pedido.estado)));
  }

  get pedidosHistorial(): Pedido[] {
    return this.aplicarFiltros(this.pedidos.filter(pedido => !isPedidoEnRevision(pedido.estado)));
  }

  get pedidosVisibles(): Pedido[] {
    return this.vistaActiva === 'bandeja' ? this.pedidosBandeja : this.pedidosHistorial;
  }

  get pedidoSeleccionado(): Pedido | null {
    return this.pedidosVisibles.find(pedido => pedido.id === this.pedidoSeleccionadoId)
      ?? this.pedidosVisibles[0]
      ?? null;
  }

  get totalVisibles(): number {
    return this.pedidosVisibles.length;
  }

  getVistaCount(vista: VistaInbox): number {
    return vista === 'bandeja' ? this.totalRevision : this.totalHistorial;
  }

  activarVista(vista: VistaInbox): void {
    this.vistaActiva = vista;
  }

  activarFiltro(tipo: TipoFiltro): void {
    this.tipoFiltro = tipo;
  }

  abrirBandeja(): void {
    this.vistaActiva = 'bandeja';
    this.tipoFiltro = 'todos';
  }

  abrirHistorial(): void {
    this.vistaActiva = 'historial';
    this.tipoFiltro = 'todos';
  }

  filtrarFacturas(): void {
    this.vistaActiva = 'bandeja';
    this.tipoFiltro = 'factura';
  }

  filtrarConsignas(): void {
    this.vistaActiva = 'bandeja';
    this.tipoFiltro = 'consigna';
  }

  onSearch(event: Event): void {
    this.searchTerm = (event.target as HTMLInputElement).value ?? '';
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

  getTipoLabel(tipo: Pedido['tipoPedido']): string {
    return getTipoPedidoLabel(tipo);
  }

  isConsigna(tipo: Pedido['tipoPedido']): boolean {
    return tipo === 'consigna';
  }

  getTipoSeverity(tipo: Pedido['tipoPedido']): string {
    return getTipoPedidoSeverity(tipo);
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

  getEstadoLabel(estado: string): string {
    return getPedidoEstadoLabel(estado);
  }

  getEstadoSeverity(estado: string): string {
    return getPedidoEstadoSeverity(estado);
  }

  getProductoCodigo(item: ProductoPedido): string {
    return String(item.codigoProducto ?? item.productoId ?? item.inventarioItemId ?? '').trim();
  }

  getProductoNombre(item: ProductoPedido): string {
    const codigo = this.getProductoCodigo(item);
    const nombre = String(item.descripcion ?? item.nombreProducto ?? '').trim();
    return nombre && nombre !== codigo ? nombre : '';
  }

  esRevision(estado: string): boolean {
    return isPedidoEnRevision(estado);
  }

  formatFecha(valor?: any): string {
    const fecha = this.toDate(valor);
    if (!fecha) {
      return 'Sin fecha';
    }

    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(fecha);
  }

  verDetalle(id: string): void {
    this.router.navigate(['/admin/pedidos', id], {
      state: { returnUrl: '/admin/inbox-pedidos' }
    });
  }

  seleccionarPedido(pedido: Pedido): void {
    this.pedidoSeleccionadoId = pedido.id ?? null;
  }

  abrirAutorizacion(pedido: Pedido, event?: Event): void {
    event?.stopPropagation();

    if (!pedido.id || !this.esRevision(pedido.estado)) {
      return;
    }

    this.confirmTitle = 'Autorizar pedido';
    this.confirmLabel = 'Autorizar';
    this.confirmType = 'warning';
    this.confirmMessage = `El pedido de ${pedido.clienteNombre} saldrá de la bandeja y quedará autorizado para preparación.`;
    this.confirmAction = () => this.autorizarPedido(pedido.id!);
    this.confirmVisible = true;
  }

  autorizarSeleccionado(): void {
    if (this.pedidoSeleccionado) {
      this.abrirAutorizacion(this.pedidoSeleccionado);
    }
  }

  onConfirm(): void {
    if (this.confirmAction) {
      this.confirmAction();
    }

    this.confirmVisible = false;
    this.confirmAction = null;
  }

  onCancel(): void {
    this.confirmVisible = false;
    this.confirmAction = null;
  }

  private autorizarPedido(id: string): void {
    this.pedidosSrv.autorizar(id)
      .then(() => {
        this.messageSrv.add({
          severity: 'success',
          summary: 'Listo',
          detail: 'Pedido autorizado y enviado a preparación'
        });
      })
      .catch(() => {
        this.messageSrv.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo autorizar el pedido'
        });
      });
  }

  private aplicarFiltros(pedidos: Pedido[]): Pedido[] {
    const term = this.searchTerm.trim().toLowerCase();

    return [...pedidos]
      .filter(pedido => this.matchesTipo(pedido) && this.matchesTexto(pedido, term))
      .sort((a, b) => this.getSortValue(b) - this.getSortValue(a));
  }

  private matchesTipo(pedido: Pedido): boolean {
    return this.tipoFiltro === 'todos' || pedido.tipoPedido === this.tipoFiltro;
  }

  private matchesTexto(pedido: Pedido, term: string): boolean {
    if (!term) {
      return true;
    }

    const campos = [
      pedido.clienteNombre,
      pedido.clienteRfc,
      pedido.clienteEmail ?? '',
      pedido.sucursal,
      this.getPedidoReferencia(pedido),
      getPedidoEstadoLabel(pedido.estado),
      getTipoPedidoLabel(pedido.tipoPedido)
    ];

    return campos.some(campo => String(campo).toLowerCase().includes(term));
  }

  private getSortValue(pedido: Pedido): number {
    const fecha = this.toDate(pedido.fechaActualizacion ?? pedido.fechaCreacion);
    return fecha?.getTime() ?? 0;
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
