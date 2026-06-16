import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { InputNumberModule } from 'primeng/inputnumber';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';

import { BaseComponent } from 'src/app/shared/base/base.component';
import { UserService } from 'src/app/shared/service/user.service';
import { TicketsLogisticaService } from '../tickets.service';
import { TicketLogistica } from '../models/ticket-logistica.model';

@Component({
  selector: 'app-admin-tickets',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ProgressSpinnerModule,
    ToastModule,
    DialogModule,
    InputTextareaModule,
    InputNumberModule,
    ConfirmDialogModule,
    TooltipModule,
  ],
  templateUrl: './admin-tickets.component.html',
  styleUrl: './admin-tickets.component.scss',
  providers: [MessageService, ConfirmationService],
})
export class AdminTicketsComponent extends BaseComponent implements OnInit {

  cargando = true;
  procesando = false;

  tickets: TicketLogistica[] = [];
  ticketsFiltrados: TicketLogistica[] = [];

  filtroTipo: string   = 'TODOS';
  filtroEstado: string = 'TODOS';
  filtroBusqueda: string = '';

  opcionesTipo = [
    { label: 'Todos', value: 'TODOS' },
    { label: 'Insumos',    value: 'PRODUCTO' },
    { label: 'Reparación', value: 'REPARACION' },
    { label: 'Gasolina',   value: 'GASOLINA' },
  ];

  opcionesEstado = [
    { label: 'Todos',            value: 'TODOS' },
    { label: 'Pendiente',        value: 'PENDIENTE' },
    { label: 'Autorizado',       value: 'AUTORIZADO' },
    { label: 'En cotización',    value: 'EN_COTIZACION' },
    { label: 'Cotización lista', value: 'COTIZACION_LISTA' },
    { label: 'Completado',       value: 'COMPLETADO' },
    { label: 'Rechazado',        value: 'RECHAZADO' },
  ];

  usuarioActual: { id: string; nombre: string } | null = null;
  esAutorizador        = false;   // puede autorizar/rechazar insumos
  esCompletaInsumos    = false;   // puede marcar insumos entregados
  esCompletaReparacion = false;   // puede gestionar flujo de reparaciones
  esAutorizadorGas     = false;   // puede autorizar/rechazar gasolina

  ticketAccion: TicketLogistica | null = null;

  dlgRechazo  = false;
  motivoRechazo = '';

  dlgCotizacion = false;
  montoCotizacion: number | null = null;
  obsCotizacion = '';
  nombreTaller = '';
  ubicacionTaller = '';
  fechaEntradaTallerStr = '';   // string YYYY-MM-DD del input type=date
  fechaSalidaEstimadaStr = '';
  archivosCotizacion: File[] = [];
  subiendoArchivos = false;

  dlgCompletar = false;
  obsCompletar = '';
  archivosCompletar: File[] = [];

  dlgGasolina = false;
  litrosAutorizados: number | null = null;
  montoDepositado: number | null = null;
  obsGasolina = '';
  archivosGasolina: File[] = [];

  constructor(
    protected override messageService: MessageService,
    private router: Router,
    private userService: UserService,
    private ticketsService: TicketsLogisticaService,
  ) {
    super(messageService);
  }

  async ngOnInit() {
    try {
      const empleado = await firstValueFrom(this.userService.consultarEmpleado());
      if (empleado?.id) {
        this.usuarioActual = { id: empleado.id, nombre: empleado.nombreCompleto || empleado.nombre || 'Admin' };

        const [esAutorizador, esCompletaInsumos, esCompletaReparacion, esAutorizadorGas] = await Promise.all([
          this.userService.esAutorizadorTicketsLogistica(empleado.id),
          this.userService.esResponsableCompletarInsumosLogistica(empleado.id),
          this.userService.esResponsableCompletarReparacionLogistica(empleado.id),
          this.userService.esAutorizadorGasolina(empleado.id),
        ]);

        this.esAutorizador        = esAutorizador;
        this.esCompletaInsumos    = esCompletaInsumos;
        this.esCompletaReparacion = esCompletaReparacion;
        this.esAutorizadorGas     = esAutorizadorGas;
      }
    } catch { /* no bloquear */ }

    await this.cargarTickets();
  }

  async cargarTickets() {
    this.cargando = true;
    try {
      this.tickets = await this.ticketsService.getAllTickets();
      this.aplicarFiltros();
    } catch {
      this.handleAlertType('ERROR', 'Error al cargar los tickets');
    } finally {
      this.cargando = false;
    }
  }

  aplicarFiltros() {
    let r = [...this.tickets];
    if (this.filtroTipo !== 'TODOS')   r = r.filter(t => t.tipoTicket === this.filtroTipo);
    if (this.filtroEstado !== 'TODOS') r = r.filter(t => t.estado === this.filtroEstado);
    if (this.filtroBusqueda.trim()) {
      const q = this.filtroBusqueda.toLowerCase();
      r = r.filter(t =>
        (t.folio || '').toLowerCase().includes(q) ||
        (t.solicitante?.nombre || '').toLowerCase().includes(q) ||
        (t.placas || '').toLowerCase().includes(q) ||
        (t.justificacion || '').toLowerCase().includes(q),
      );
    }
    this.ticketsFiltrados = r;
  }

  limpiarFiltros() {
    this.filtroTipo = 'TODOS'; this.filtroEstado = 'TODOS'; this.filtroBusqueda = '';
    this.aplicarFiltros();
  }

  verDetalle(ticket: TicketLogistica) {
    this.router.navigate(['/logistica/tickets/detalle', ticket.firestoreId]);
  }

  async autorizar(ticket: TicketLogistica) {
    if (!this.usuarioActual || this.procesando) return;
    this.procesando = true;
    try {
      await this.ticketsService.autorizarProducto(ticket.firestoreId!, this.usuarioActual);

      try {

        if (!ticket.solicitante?.nombre) {
          console.warn('[Tickets] Ticket sin solicitante — folio:', ticket.folio, '| firestoreId:', ticket.firestoreId);
        }
        const ids = await this.userService.getIdsResponsablesCompletarInsumos();
        ids.forEach(id =>
          this.ticketsService.mandarNotificacionResponsableCompletarInsumo({
            empleadoNotificacionId: id,
            solicitante: ticket.solicitante?.nombre ?? 'Solicitante desconocido',
          }).subscribe({ error: (e: any) => console.warn('Notificación fallida para', id, e) })
        );
      } catch (e) {
        console.warn('Error al obtener responsables para notificación:', e);
      }

      this.handleAlertType('SUCCESS', 'Ticket autorizado correctamente');
      await this.cargarTickets();
    } catch (e: any) {
      this.handleAlertType('ERROR', e?.message || 'Error al autorizar');
    } finally {
      this.procesando = false;
    }
  }

  abrirRechazo(ticket: TicketLogistica) {
    this.ticketAccion = ticket;
    this.motivoRechazo = '';
    this.dlgRechazo = true;
  }

  async confirmarRechazo() {
    if (!this.ticketAccion || !this.usuarioActual || !this.motivoRechazo.trim()) return;
    this.procesando = true;
    try {
      if (this.ticketAccion.tipoTicket === 'PRODUCTO') {
        await this.ticketsService.rechazarProducto(this.ticketAccion.firestoreId!, this.usuarioActual, this.motivoRechazo.trim());
      } else if (this.ticketAccion.tipoTicket === 'GASOLINA') {
        await this.ticketsService.rechazarGasolina(this.ticketAccion.firestoreId!, this.usuarioActual, this.motivoRechazo.trim());
      } else {
        await this.ticketsService.rechazarReparacion(this.ticketAccion.firestoreId!, this.usuarioActual, this.motivoRechazo.trim());
      }
      this.dlgRechazo = false;
      this.handleAlertType('SUCCESS', 'Ticket rechazado');
      await this.cargarTickets();
    } catch (e: any) {
      this.handleAlertType('ERROR', e?.message || 'Error al rechazar');
    } finally {
      this.procesando = false;
    }
  }

  abrirAutorizarGasolina(ticket: TicketLogistica) {
    this.ticketAccion = ticket;
    this.litrosAutorizados = ticket.litrosSolicitados || null;
    this.montoDepositado = null;
    this.obsGasolina = '';
    this.archivosGasolina = [];
    this.dlgGasolina = true;
  }

  onArchivosGasolina(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) this.archivosGasolina = Array.from(input.files);
  }

  removerArchivoGasolina(index: number) {
    this.archivosGasolina = this.archivosGasolina.filter((_, i) => i !== index);
  }

  async confirmarAutorizarGasolina() {
    if (!this.ticketAccion || !this.usuarioActual || !this.litrosAutorizados) return;
    this.procesando = true;
    try {
      await this.ticketsService.autorizarGasolina(
        this.ticketAccion.firestoreId!,
        this.usuarioActual,
        this.litrosAutorizados,
        {
          montoDepositado: this.montoDepositado ?? undefined,
          observaciones: this.obsGasolina.trim() || undefined,
        },
        this.archivosGasolina.length > 0 ? this.archivosGasolina : undefined,
      );
      this.dlgGasolina = false;
      this.handleAlertType('SUCCESS', 'Gasolina autorizada correctamente');
      await this.cargarTickets();
    } catch (e: any) {
      this.handleAlertType('ERROR', e?.message || 'Error al autorizar');
    } finally {
      this.procesando = false;
    }
  }

  async iniciarCotizacion(ticket: TicketLogistica) {
    if (!this.usuarioActual || this.procesando) return;
    this.procesando = true;
    try {
      await this.ticketsService.iniciarCotizacion(ticket.firestoreId!, this.usuarioActual);
      this.handleAlertType('SUCCESS', 'Cotización iniciada');
      await this.cargarTickets();
    } catch (e: any) {
      this.handleAlertType('ERROR', e?.message || 'Error al iniciar cotización');
    } finally {
      this.procesando = false;
    }
  }

  abrirRegistrarCotizacion(ticket: TicketLogistica) {
    this.ticketAccion = ticket;
    this.montoCotizacion = null;
    this.obsCotizacion = '';
    this.nombreTaller = '';
    this.ubicacionTaller = '';
    this.fechaEntradaTallerStr = '';
    this.fechaSalidaEstimadaStr = '';
    this.archivosCotizacion = [];
    this.dlgCotizacion = true;
  }

  onArchivosCotizacion(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.archivosCotizacion = Array.from(input.files);
    }
  }

  removerArchivoCotizacion(index: number) {
    this.archivosCotizacion = this.archivosCotizacion.filter((_, i) => i !== index);
  }

  async confirmarCotizacion() {
    if (!this.ticketAccion || !this.usuarioActual || !this.montoCotizacion) return;
    this.procesando = true;
    try {
      await this.ticketsService.registrarCotizacion(
        this.ticketAccion.firestoreId!,
        this.usuarioActual,
        this.montoCotizacion,
        {
          observaciones: this.obsCotizacion.trim() || undefined,
          nombreTaller: this.nombreTaller.trim() || undefined,
          ubicacionTaller: this.ubicacionTaller.trim() || undefined,
          fechaEntradaTaller: this.fechaEntradaTallerStr ? new Date(this.fechaEntradaTallerStr + 'T12:00:00') : undefined,
          fechaSalidaEstimada: this.fechaSalidaEstimadaStr ? new Date(this.fechaSalidaEstimadaStr + 'T12:00:00') : undefined,
        },
        this.archivosCotizacion.length > 0 ? this.archivosCotizacion : undefined,
      );

      try {
        if (!this.ticketAccion?.solicitante?.nombre) {
          console.warn('[Tickets] Ticket sin solicitante — folio:', this.ticketAccion?.folio, '| firestoreId:', this.ticketAccion?.firestoreId);
        }
        const ids = await this.userService.getIdsResponsablesCompletarReparacion();
        ids.forEach(id =>
          this.ticketsService.mandarNotificacionResponsableCompletarReparacion({
            empleadoNotificacionId: id,
            solicitante: this.ticketAccion?.solicitante?.nombre ?? 'Solicitante desconocido',
          }).subscribe({ error: (e: any) => console.warn('Notificación fallida para', id, e) })
        );
      } catch (e) {
        console.warn('Error al obtener responsables para notificación:', e);
      }

      this.dlgCotizacion = false;
      this.handleAlertType('SUCCESS', 'Cotización registrada');
      await this.cargarTickets();
    } catch (e: any) {
      this.handleAlertType('ERROR', e?.message || 'Error al registrar cotización');
    } finally {
      this.procesando = false;
    }
  }

  abrirCompletar(ticket: TicketLogistica) {
    this.ticketAccion = ticket;
    this.obsCompletar = '';
    this.archivosCompletar = [];
    this.dlgCompletar = true;
  }

  onArchivosCompletar(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) this.archivosCompletar = Array.from(input.files);
  }

  removerArchivoCompletar(index: number) {
    this.archivosCompletar = this.archivosCompletar.filter((_, i) => i !== index);
  }

  async confirmarCompletar() {
    if (!this.ticketAccion || !this.usuarioActual) return;
    this.procesando = true;
    try {
      const obs      = this.obsCompletar.trim() || undefined;
      const archivos = this.archivosCompletar.length > 0 ? this.archivosCompletar : undefined;
      if (this.ticketAccion.tipoTicket === 'PRODUCTO') {
        await this.ticketsService.completarProducto(this.ticketAccion.firestoreId!, this.usuarioActual, obs, archivos);
      } else {
        await this.ticketsService.completarReparacion(this.ticketAccion.firestoreId!, this.usuarioActual, obs, archivos);
      }
      this.dlgCompletar = false;
      this.handleAlertType('SUCCESS', 'Ticket completado');
      await this.cargarTickets();
    } catch (e: any) {
      this.handleAlertType('ERROR', e?.message || 'Error al completar');
    } finally {
      this.procesando = false;
    }
  }


  getAccionesDisponibles(ticket: TicketLogistica): string[] {
    const acciones: string[] = [];

    if (ticket.tipoTicket === 'PRODUCTO') {
      if (ticket.estado === 'PENDIENTE' && this.esAutorizador) {
        acciones.push('autorizar', 'rechazar');
      }
      if (ticket.estado === 'AUTORIZADO' && this.esCompletaInsumos) {
        acciones.push('completar');
      }
    }

    if (ticket.tipoTicket === 'GASOLINA') {
      if (ticket.estado === 'PENDIENTE' && this.esAutorizadorGas) {
        acciones.push('autorizar-gas', 'rechazar');
      }
    }

    if (ticket.tipoTicket === 'REPARACION') {
      if (ticket.estado === 'PENDIENTE' && this.esAutorizador) {
        acciones.push('iniciar-cotizacion', 'rechazar');
      }
      if (ticket.estado === 'EN_COTIZACION' && this.esAutorizador) {
        acciones.push('registrar-cotizacion');
      }
      if (ticket.estado === 'COTIZACION_LISTA' && this.esAutorizador) {
        acciones.push('rechazar');
      }
      if (ticket.estado === 'COTIZACION_LISTA' && this.esCompletaReparacion) {
        acciones.push('completar');
      }
    }

    return acciones;
  }

  getTipoLabel(tipo: string) {
    if (tipo === 'PRODUCTO') return 'Insumos';
    if (tipo === 'GASOLINA') return 'Gasolina';
    return 'Reparación';
  }
  getTipoIcon(tipo: string) {
    if (tipo === 'PRODUCTO') return 'pi pi-box';
    if (tipo === 'GASOLINA') return 'pi pi-bolt';
    return 'pi pi-wrench';
  }

  getEstadoLabel(estado: string): string {
    const map: Record<string, string> = {
      PENDIENTE: 'Pendiente', AUTORIZADO: 'Autorizado',
      EN_COTIZACION: 'En cotización', COTIZACION_LISTA: 'Cotización lista',
      COMPLETADO: 'Completado', RECHAZADO: 'Rechazado',
    };
    return map[estado] || estado;
  }

  getEstadoClass(estado: string): string {
    const map: Record<string, string> = {
      PENDIENTE: 'badge-pendiente', AUTORIZADO: 'badge-autorizado',
      EN_COTIZACION: 'badge-cotizacion', COTIZACION_LISTA: 'badge-cotizacion-lista',
      COMPLETADO: 'badge-completado', RECHAZADO: 'badge-rechazado',
    };
    return map[estado] || '';
  }

  formatFecha(fecha: any): string {
    const d = this.ticketsService.getFecha(fecha);
    if (!d) return '—';
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  formatPrecio(precio: number): string {
    return precio.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
  }

  get hasFiltros() {
    return this.filtroTipo !== 'TODOS' || this.filtroEstado !== 'TODOS' || !!this.filtroBusqueda.trim();
  }

  get conteoPendientes()  { return this.tickets.filter(t => t.estado === 'PENDIENTE').length; }
  get conteoEnProceso()   { return this.tickets.filter(t => ['AUTORIZADO','EN_COTIZACION','COTIZACION_LISTA'].includes(t.estado)).length; }
  get conteoCompletados() { return this.tickets.filter(t => t.estado === 'COMPLETADO').length; }
  get conteoTotal()       { return this.tickets.length; }
}
