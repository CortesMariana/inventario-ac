import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';

import { BaseComponent } from 'src/app/shared/base/base.component';
import { TicketsLogisticaService } from '../tickets.service';
import { TicketLogistica } from '../models/ticket-logistica.model';

@Component({
  selector: 'app-detalle-ticket',
  standalone: true,
  imports: [CommonModule, ProgressSpinnerModule, ToastModule],
  templateUrl: './detalle-ticket.component.html',
  styleUrl: './detalle-ticket.component.scss',
  providers: [MessageService],
})
export class DetalleTicketComponent extends BaseComponent implements OnInit {

  cargando = true;
  ticket: TicketLogistica | null = null;

  constructor(
    protected override messageService: MessageService,
    private route: ActivatedRoute,
    private router: Router,
    private ticketsService: TicketsLogisticaService,
  ) {
    super(messageService);
  }

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('firestoreId') || '';
    if (!id) { this.volver(); return; }

    try {
      this.ticket = await this.ticketsService.getTicket(id);
      if (!this.ticket) { this.handleAlertType('ERROR', 'Ticket no encontrado'); this.volver(); }
    } catch {
      this.handleAlertType('ERROR', 'Error al cargar el ticket');
    } finally {
      this.cargando = false;
    }
  }

  volver() {
    this.router.navigate(['/logistica/tickets/mis-solicitudes']);
  }

  getEstadoClass(estado: string): string {
    const map: Record<string, string> = {
      PENDIENTE: 'estado-pendiente',
      AUTORIZADO: 'estado-autorizado',
      EN_COTIZACION: 'estado-cotizacion',
      COTIZACION_LISTA: 'estado-cotizacion-lista',
      COMPLETADO: 'estado-completado',
      RECHAZADO: 'estado-rechazado',
    };
    return map[estado] || '';
  }

  getEstadoLabel(estado: string): string {
    const map: Record<string, string> = {
      PENDIENTE: 'Pendiente de autorización',
      AUTORIZADO: 'Autorizado',
      EN_COTIZACION: 'En cotización',
      COTIZACION_LISTA: 'Cotización lista',
      COMPLETADO: 'Completado',
      RECHAZADO: 'Rechazado',
    };
    return map[estado] || estado;
  }

  getMovimientoIcon(tipo: string): string {
    const map: Record<string, string> = {
      CREACION: 'pi pi-plus',
      AUTORIZACION: 'pi pi-check',
      RECHAZO: 'pi pi-times',
      INICIO_COTIZACION: 'pi pi-search',
      COTIZACION_LISTA: 'pi pi-dollar',
      COMPLETADO: 'pi pi-check-square',
      COMENTARIO: 'pi pi-comment',
    };
    return map[tipo] || 'pi pi-circle';
  }

  getMovimientoClass(tipo: string): string {
    const map: Record<string, string> = {
      CREACION: 'mov-creacion',
      AUTORIZACION: 'mov-autorizacion',
      RECHAZO: 'mov-rechazo',
      INICIO_COTIZACION: 'mov-cotizacion',
      COTIZACION_LISTA: 'mov-cotizacion-lista',
      COMPLETADO: 'mov-completado',
      COMENTARIO: 'mov-comentario',
    };
    return map[tipo] || '';
  }

  getMovimientoLabel(tipo: string): string {
    const map: Record<string, string> = {
      CREACION: 'Solicitud creada',
      AUTORIZACION: 'Autorizado',
      RECHAZO: 'Rechazado',
      INICIO_COTIZACION: 'Inicio de cotización',
      COTIZACION_LISTA: 'Cotización registrada',
      COMPLETADO: 'Completado',
      COMENTARIO: 'Comentario',
    };
    return map[tipo] || tipo;
  }

  formatFecha(fecha: any): string {
    const d = this.ticketsService.getFecha(fecha);
    if (!d) return '—';
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  formatPrecio(precio: number): string {
    return precio.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
  }
}
