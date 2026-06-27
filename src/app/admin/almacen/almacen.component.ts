import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Subject, take, takeUntil } from 'rxjs';
import { InventarioItem, InventarioService } from '../inventario/inventario.service';
import { Pedido, PedidosService, getPedidoEstadoLabel, getPedidoEstadoSeverity } from '../pedidos/pedidos.service';
import { AlmacenLineaSurtido, AlmacenMovimiento, AlmacenService } from './almacen.service';

interface LineaSurtidoView extends AlmacenLineaSurtido {}

@Component({
    selector: 'app-almacen',
    templateUrl: './almacen.component.html',
    styleUrls: ['./almacen.component.css'],
    standalone: false
})
export class AlmacenComponent implements OnInit, OnDestroy {

  @ViewChild('entradaCodigoInput') entradaCodigoInput?: ElementRef<HTMLInputElement>;
  @ViewChild('salidaPedidoInput') salidaPedidoInput?: ElementRef<HTMLInputElement>;
  @ViewChild('salidaCodigoInput') salidaCodigoInput?: ElementRef<HTMLInputElement>;

  entradaForm!: FormGroup;
  salidaForm!: FormGroup;

  inventario: InventarioItem[] = [];
  pedidosCache: Pedido[] = [];
  movimientos: AlmacenMovimiento[] = [];

  entradaSeleccionada: InventarioItem | null = null;
  pedidoActual: Pedido | null = null;
  lineasSurtido: LineaSurtidoView[] = [];
  pedidoBloqueadoMotivo: string | null = null;

  loadingInventario = true;
  loadingPedidos = true;
  loadingMovimientos = true;
  guardandoEntrada = false;
  guardandoSalida = false;

  pedidosAutorizados = 0;
  confirmSalidaVisible = false;
  confirmSalidaMessage = '';

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private inventarioSrv: InventarioService,
    private pedidosSrv: PedidosService,
    private almacenSrv: AlmacenService,
    private messageSrv: MessageService
  ) {}

  ngOnInit(): void {
    this.buildForms();

    this.inventarioSrv.getInventario$()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.inventario = data;
          this.loadingInventario = false;
          this.revalidarEntradaSeleccionada();
        },
        error: () => {
          this.loadingInventario = false;
          this.messageSrv.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar el inventario' });
        }
      });

    this.pedidosSrv.getAll$()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.pedidosCache = data;
          this.pedidosAutorizados = data.filter(pedido => pedido.estado === 'autorizado').length;
          this.loadingPedidos = false;
        },
        error: () => {
          this.loadingPedidos = false;
        }
      });

    this.almacenSrv.getMovimientos$()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.movimientos = data;
          this.loadingMovimientos = false;
        },
        error: () => {
          this.loadingMovimientos = false;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private buildForms(): void {
    this.entradaForm = this.fb.group({
      codigoBarras: ['', [Validators.required]],
      cantidad: [1, [Validators.required, Validators.min(1)]],
      observaciones: ['']
    });

    this.salidaForm = this.fb.group({
      pedidoId: ['', [Validators.required]],
      codigoBarras: ['']
    });
  }

  get fEntrada() { return this.entradaForm.controls; }

  get fSalida() { return this.salidaForm.controls; }

  get entradaCantidad(): number {
    return Number(this.entradaForm.value.cantidad ?? 0);
  }

  get entradaStockAntes(): number {
    return Number(this.entradaSeleccionada?.stock ?? 0);
  }

  get entradaStockDespues(): number {
    return this.entradaStockAntes + this.entradaCantidad;
  }

  get puedeRegistrarEntrada(): boolean {
    return !!this.entradaSeleccionada?.id && this.entradaCantidad > 0;
  }

  get totalPedidoSolicitado(): number {
    return this.lineasSurtido.reduce((acc, linea) => acc + Number(linea.cantidadSolicitada || 0), 0);
  }

  get totalPedidoEscaneado(): number {
    return this.lineasSurtido.reduce((acc, linea) => acc + Number(linea.cantidadEscaneada || 0), 0);
  }

  get porcentajeSurtido(): number {
    if (!this.totalPedidoSolicitado) {
      return 0;
    }

    return Math.min(100, Math.round((this.totalPedidoEscaneado / this.totalPedidoSolicitado) * 100));
  }

  get pedidoListoParaConfirmar(): boolean {
    return !!this.pedidoActual
      && !this.pedidoBloqueadoMotivo
      && this.lineasSurtido.length > 0
      && this.lineasSurtido.every(linea => linea.cantidadEscaneada >= linea.cantidadSolicitada);
  }

  get totalMovimientos(): number {
    return this.movimientos.length;
  }

  get entradasRecientes(): number {
    return this.movimientos.filter(movimiento => movimiento.tipo === 'entrada').length;
  }

  get salidasRecientes(): number {
    return this.movimientos.filter(movimiento => movimiento.tipo === 'salida').length;
  }

  buscarProductoEntrada(): void {
    const codigo = this.normalize(this.entradaForm.value.codigoBarras);

    if (!codigo) {
      this.messageSrv.add({ severity: 'warn', summary: 'Atención', detail: 'Escanea o escribe el código de barras' });
      this.focusEntradaCodigo();
      return;
    }

    const item = this.findInventarioByCode(codigo);

    if (!item) {
      this.entradaSeleccionada = null;
      this.messageSrv.add({ severity: 'warn', summary: 'No encontrado', detail: 'No encontré ese código en el inventario' });
      this.focusEntradaCodigo();
      return;
    }

    this.entradaSeleccionada = item;
    this.entradaForm.patchValue({ codigoBarras: item.codigoBarras ?? codigo });
    this.focusEntradaCantidad();
  }

  async registrarEntrada(): Promise<void> {
    if (this.entradaForm.invalid || !this.entradaSeleccionada) {
      this.entradaForm.markAllAsTouched();
      this.messageSrv.add({ severity: 'warn', summary: 'Atención', detail: 'Selecciona un producto y captura una cantidad' });
      return;
    }

    const cantidad = Math.max(1, Math.floor(Number(this.entradaForm.value.cantidad ?? 0)));
    if (!Number.isFinite(cantidad) || cantidad < 1) {
      this.messageSrv.add({ severity: 'warn', summary: 'Atención', detail: 'La cantidad debe ser mayor a cero' });
      return;
    }

    this.guardandoEntrada = true;
    try {
      await this.almacenSrv.registrarEntrada(
        this.entradaSeleccionada,
        cantidad,
        this.normalize(this.entradaForm.value.observaciones)
      );

      this.messageSrv.add({
        severity: 'success',
        summary: 'Entrada registrada',
        detail: `Se agregaron ${cantidad} ${cantidad === 1 ? 'pieza' : 'piezas'} a ${this.entradaSeleccionada.nombreProducto}`
      });

      this.limpiarEntrada();
    } catch (err: any) {
      this.messageSrv.add({ severity: 'error', summary: 'Error', detail: err?.message ?? 'No se pudo registrar la entrada' });
    } finally {
      this.guardandoEntrada = false;
    }
  }

  limpiarEntrada(): void {
    this.entradaSeleccionada = null;
    this.entradaForm.reset({
      codigoBarras: '',
      cantidad: 1,
      observaciones: ''
    });
    this.focusEntradaCodigo();
  }

  buscarPedido(): void {
    const termino = this.normalize(this.salidaForm.value.pedidoId);

    if (!termino) {
      this.messageSrv.add({ severity: 'warn', summary: 'Atención', detail: 'Captura el número de pedido' });
      this.focusSalidaPedido();
      return;
    }

    const pedidoLocal = this.findPedidoLocal(termino);

    if (pedidoLocal) {
      this.cargarPedido(pedidoLocal);
      return;
    }

    this.pedidosSrv.getById$(termino)
      .pipe(take(1))
      .subscribe({
        next: (pedido) => this.cargarPedido(pedido),
        error: () => {
          this.messageSrv.add({ severity: 'warn', summary: 'No encontrado', detail: 'No se encontró ese pedido' });
          this.focusSalidaPedido();
        }
      });
  }

  agregarEscaneoSalida(): void {
    if (!this.pedidoActual) {
      this.messageSrv.add({ severity: 'warn', summary: 'Atención', detail: 'Primero busca un pedido' });
      this.focusSalidaPedido();
      return;
    }

    if (this.pedidoBloqueadoMotivo) {
      this.messageSrv.add({ severity: 'warn', summary: 'No disponible', detail: this.pedidoBloqueadoMotivo });
      return;
    }

    const codigo = this.normalize(this.salidaForm.value.codigoBarras);

    if (!codigo) {
      this.messageSrv.add({ severity: 'warn', summary: 'Atención', detail: 'Escanea el código del producto' });
      this.focusSalidaCodigo();
      return;
    }

    const item = this.findInventarioByCode(codigo);

    if (!item) {
      this.messageSrv.add({ severity: 'warn', summary: 'No encontrado', detail: 'Ese código no existe en el inventario' });
      this.focusSalidaCodigo();
      return;
    }

    const linea = this.lineasSurtido.find(entry => entry.inventarioItemId === item.id || entry.productoId === item.productoId);

    if (!linea) {
      this.messageSrv.add({ severity: 'warn', summary: 'No coincide', detail: `${item.nombreProducto} no pertenece a este pedido` });
      this.focusSalidaCodigo();
      return;
    }

    if (linea.cantidadEscaneada >= linea.cantidadSolicitada) {
      this.messageSrv.add({ severity: 'info', summary: 'Completado', detail: `${linea.nombreProducto} ya está completo` });
      this.focusSalidaCodigo();
      return;
    }

    linea.cantidadEscaneada += 1;
    this.salidaForm.patchValue({ codigoBarras: '' });

    if (linea.cantidadEscaneada === linea.cantidadSolicitada) {
      this.messageSrv.add({
        severity: 'success',
        summary: 'Producto completo',
        detail: `${linea.nombreProducto} llegó a ${linea.cantidadSolicitada}/${linea.cantidadSolicitada}`
      });
    }

    if (this.pedidoListoParaConfirmar) {
      this.messageSrv.add({
        severity: 'success',
        summary: 'Pedido completo',
        detail: 'Ya puedes confirmar la salida'
      });
    }

    this.focusSalidaCodigo();
  }

  confirmarSalida(): void {
    if (!this.pedidoActual) {
      return;
    }

    if (this.pedidoBloqueadoMotivo) {
      this.messageSrv.add({ severity: 'warn', summary: 'No disponible', detail: this.pedidoBloqueadoMotivo });
      return;
    }

    if (!this.pedidoListoParaConfirmar) {
      this.messageSrv.add({ severity: 'warn', summary: 'Atención', detail: 'Todavía faltan piezas por escanear' });
      return;
    }

    this.confirmSalidaMessage = `Se marcará el pedido ${this.getPedidoReferencia(this.pedidoActual)} como en tránsito.`;
    this.confirmSalidaVisible = true;
  }

  async onConfirmSalida(): Promise<void> {
    if (!this.pedidoActual) {
      return;
    }

    this.guardandoSalida = true;
    try {
      await this.almacenSrv.registrarSalidaPedido(this.pedidoActual, this.lineasSurtido);
      this.messageSrv.add({
        severity: 'success',
        summary: 'Salida registrada',
        detail: `El pedido ${this.getPedidoReferencia(this.pedidoActual)} ya salió del almacén`
      });
      this.limpiarPedido();
      this.confirmSalidaVisible = false;
    } catch (err: any) {
      this.messageSrv.add({ severity: 'error', summary: 'Error', detail: err?.message ?? 'No se pudo registrar la salida' });
    } finally {
      this.guardandoSalida = false;
    }
  }

  onCancelSalida(): void {
    this.confirmSalidaVisible = false;
  }

  limpiarPedido(): void {
    this.pedidoActual = null;
    this.lineasSurtido = [];
    this.pedidoBloqueadoMotivo = null;
    this.salidaForm.reset({
      pedidoId: '',
      codigoBarras: ''
    });
    this.focusSalidaPedido();
  }

  cargarPedido(pedido: Pedido): void {
    this.pedidoActual = pedido;
    this.salidaForm.patchValue({
      pedidoId: this.getPedidoReferencia(pedido),
      codigoBarras: ''
    });
    this.lineasSurtido = (pedido.productos || []).map(producto => ({
      inventarioItemId: producto.inventarioItemId,
      productoId: producto.productoId,
      nombreProducto: producto.nombreProducto,
      codigoBarras: this.findCodigoProducto(producto.inventarioItemId, producto.productoId),
      cantidadSolicitada: Number(producto.cantidad || 0),
      cantidadEscaneada: 0
    }));
    this.pedidoBloqueadoMotivo = pedido.estado !== 'autorizado'
      ? 'Este pedido todavía no está autorizado para surtido'
      : null;

    if (this.pedidoBloqueadoMotivo) {
      this.messageSrv.add({ severity: 'warn', summary: 'Pedido pendiente', detail: this.pedidoBloqueadoMotivo });
    } else {
      this.messageSrv.add({
        severity: 'success',
        summary: 'Pedido listo',
        detail: `Ahora puedes escanear los productos de ${pedido.clienteNombre}`
      });
    }

    this.focusSalidaCodigo();
  }

  getEstadoPedidoLabel(estado: string): string {
    return getPedidoEstadoLabel(estado);
  }

  getEstadoPedidoSeverity(estado: string): string {
    return getPedidoEstadoSeverity(estado);
  }

  getMovimientoSeverity(tipo: AlmacenMovimiento['tipo']): string {
    return tipo === 'entrada' ? 'success' : 'info';
  }

  getMovimientoEtiqueta(tipo: AlmacenMovimiento['tipo']): string {
    return tipo === 'entrada' ? 'Entrada' : 'Salida';
  }

  getMovimientoIcon(tipo: AlmacenMovimiento['tipo']): string {
    return tipo === 'entrada' ? 'pi pi-sign-in' : 'pi pi-sign-out';
  }

  getLineaProgreso(linea: LineaSurtidoView): number {
    if (!linea.cantidadSolicitada) {
      return 0;
    }

    return Math.min(100, Math.round((linea.cantidadEscaneada / linea.cantidadSolicitada) * 100));
  }

  getLineaPendiente(linea: LineaSurtidoView): number {
    return Math.max(0, linea.cantidadSolicitada - linea.cantidadEscaneada);
  }

  getPedidoReferencia(pedido: Pedido): string {
    const ref = this.pedidoReferenciaRaw(pedido);
    return ref || pedido.id || 'Pedido';
  }

  formatFecha(valor?: any): string {
    const fecha = valor ? new Date(valor?.toDate ? valor.toDate() : valor) : null;

    if (!fecha || Number.isNaN(fecha.getTime())) {
      return 'Sin fecha';
    }

    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(fecha);
  }

  private findInventarioByCode(codigo: string): InventarioItem | null {
    const exact = this.inventario.find(item => this.matchesCode(item, codigo));
    return exact ?? null;
  }

  private findPedidoLocal(termino: string): Pedido | null {
    const exact = this.pedidosCache.find(pedido => this.pedidoReferencias(pedido).some(ref => this.normalize(ref) === termino));
    if (exact) {
      return exact;
    }

    const partial = this.pedidosCache.filter(pedido => this.pedidoReferencias(pedido).some(ref => this.normalize(ref).includes(termino)));
    return partial.length === 1 ? partial[0] : null;
  }

  private pedidoReferencias(pedido: Pedido): string[] {
    const extra = pedido as any;
    return [
      pedido.id,
      extra.folio,
      extra.numeroPedido,
      extra.pedidoNumero,
      extra.consecutivo
    ].filter(Boolean).map(value => String(value));
  }

  private pedidoReferenciaRaw(pedido: Pedido): string {
    const extra = pedido as any;
    return String(extra.folio ?? extra.numeroPedido ?? extra.pedidoNumero ?? extra.consecutivo ?? pedido.id ?? '');
  }

  private findCodigoProducto(inventarioItemId: string, productoId: string): string {
    const item = this.inventario.find(entry => entry.id === inventarioItemId || entry.productoId === productoId);
    return String(item?.codigoBarras ?? item?.codigoProducto ?? item?.productoId ?? inventarioItemId ?? '');
  }

  private matchesCode(item: InventarioItem, codigo: string): boolean {
    const candidates = [
      item.codigoBarras,
      item.codigoProducto,
      item.productoId,
      item.id
    ].filter(Boolean).map(value => this.normalize(String(value)));

    return candidates.includes(codigo);
  }

  private normalize(value: any): string {
    return String(value ?? '').trim();
  }

  private revalidarEntradaSeleccionada(): void {
    if (!this.entradaSeleccionada?.id) {
      return;
    }

    const item = this.inventario.find(entry => entry.id === this.entradaSeleccionada?.id);
    this.entradaSeleccionada = item ?? null;
  }

  private focusEntradaCodigo(): void {
    setTimeout(() => this.entradaCodigoInput?.nativeElement.focus(), 0);
  }

  private focusEntradaCantidad(): void {
    const input = this.entradaCodigoInput?.nativeElement;
    if (input) {
      input.blur();
    }
  }

  private focusSalidaPedido(): void {
    setTimeout(() => this.salidaPedidoInput?.nativeElement.focus(), 0);
  }

  private focusSalidaCodigo(): void {
    setTimeout(() => this.salidaCodigoInput?.nativeElement.focus(), 0);
  }
}
