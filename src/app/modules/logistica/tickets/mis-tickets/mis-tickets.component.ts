import {Component, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {Router} from '@angular/router';
import {FormsModule} from '@angular/forms';
import {firstValueFrom} from 'rxjs';
import {MessageService} from 'primeng/api';
import {ProgressSpinnerModule} from 'primeng/progressspinner';
import {ToastModule} from 'primeng/toast';

import {BaseComponent} from 'src/app/shared/base/base.component';
import {UserService} from 'src/app/shared/service/user.service';
import {TicketsLogisticaService} from '../tickets.service';
import {TicketLogistica} from '../models/ticket-logistica.model';

@Component({
  selector: 'app-mis-tickets',
  standalone: true,
  imports: [CommonModule, FormsModule, ProgressSpinnerModule, ToastModule],
  templateUrl: './mis-tickets.component.html',
  styleUrl: './mis-tickets.component.scss',
  providers: [MessageService],
})
export class MisTicketsComponent extends BaseComponent implements OnInit {

  cargando = true;
  tickets: TicketLogistica[] = [];
  ticketsFiltrados: TicketLogistica[] = [];

  filtroTipo: string = 'TODOS';
  filtroEstado: string = 'TODOS';
  filtroBusqueda: string = '';

  opcionesTipo = [
    { label: 'Todos los tipos', value: 'TODOS' },
    { label: 'Insumos',         value: 'PRODUCTO' },
    { label: 'Reparación',      value: 'REPARACION' },
    { label: 'Gasolina',        value: 'GASOLINA' },
  ];

  opcionesEstado = [
    { label: 'Todos los estados',     value: 'TODOS' },
    { label: 'Pendiente',             value: 'PENDIENTE' },
    { label: 'Autorizado',            value: 'AUTORIZADO' },
    { label: 'En cotización',         value: 'EN_COTIZACION' },
    { label: 'Cotización lista',      value: 'COTIZACION_LISTA' },
    { label: 'Completado',            value: 'COMPLETADO' },
    { label: 'Rechazado',             value: 'RECHAZADO' },
  ];

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
      if (!empleado?.id) throw new Error('Sin usuario');
        this.tickets = await this.ticketsService.getTicketsByUsuario(empleado.id);
      this.aplicarFiltros();
    } catch (e) {
      console.error('Error en mis-solicitudes:', e);
      this.handleAlertType('ERROR', 'Error al cargar tus tickets');
    } finally {
      this.cargando = false;
    }
  }

  aplicarFiltros() {
    let resultado = [...this.tickets];

    if (this.filtroTipo !== 'TODOS') {
      resultado = resultado.filter(t => t.tipoTicket === this.filtroTipo);
    }
    if (this.filtroEstado !== 'TODOS') {
      resultado = resultado.filter(t => t.estado === this.filtroEstado);
    }
    if (this.filtroBusqueda.trim()) {
      const q = this.filtroBusqueda.toLowerCase();
      resultado = resultado.filter(t =>
        (t.folio || '').toLowerCase().includes(q) ||
        (t.justificacion || '').toLowerCase().includes(q) ||
        (t.placas || '').toLowerCase().includes(q),
      );
    }

    this.ticketsFiltrados = resultado;
  }

  limpiarFiltros() {
    this.filtroTipo    = 'TODOS';
    this.filtroEstado  = 'TODOS';
    this.filtroBusqueda = '';
    this.aplicarFiltros();
  }

  nuevo() {
    this.router.navigate(['/logistica/tickets/nuevo']);
  }

  verDetalle(ticket: TicketLogistica) {
    this.router.navigate(['/logistica/tickets/detalle', ticket.firestoreId]);
  }

  getTipoLabel(tipo: string): string {
    if (tipo === 'PRODUCTO') return 'Insumos';
    if (tipo === 'GASOLINA') return 'Gasolina';
    return 'Reparación';
  }

  getTipoIcon(tipo: string): string {
    if (tipo === 'PRODUCTO') return 'pi pi-box';
    if (tipo === 'GASOLINA') return 'pi pi-bolt';
    return 'pi pi-wrench';
  }

  getEstadoLabel(estado: string): string {
    const map: Record<string, string> = {
      PENDIENTE:        'Pendiente',
      AUTORIZADO:       'Autorizado',
      EN_COTIZACION:    'En cotización',
      COTIZACION_LISTA: 'Cotización lista',
      COMPLETADO:       'Completado',
      RECHAZADO:        'Rechazado',
    };
    return map[estado] || estado;
  }

  getEstadoClass(estado: string): string {
    const map: Record<string, string> = {
      PENDIENTE:        'badge-pendiente',
      AUTORIZADO:       'badge-autorizado',
      EN_COTIZACION:    'badge-cotizacion',
      COTIZACION_LISTA: 'badge-cotizacion-lista',
      COMPLETADO:       'badge-completado',
      RECHAZADO:        'badge-rechazado',
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

  get conteoFiltrado() { return this.ticketsFiltrados.length; }
  get conteoTotal()    { return this.tickets.length; }
  get hasFiltros() {
    return this.filtroTipo !== 'TODOS' || this.filtroEstado !== 'TODOS' || !!this.filtroBusqueda.trim();
  }
}
