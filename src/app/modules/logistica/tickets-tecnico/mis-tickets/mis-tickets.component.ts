import { Component, OnInit, OnDestroy } from '@angular/core';
import { MessageService } from 'primeng/api';
import { BaseComponent } from 'src/app/shared/base/base.component';
import { TicketsLogisticaService } from '../../tickets/tickets.service';
import { UserService } from 'src/app/shared/service/user.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-mis-tickets-tecnico',
  templateUrl: './mis-tickets.component.html',
  styleUrls: ['./mis-tickets.component.css']
})
export class MisTicketsTecnicoComponent extends BaseComponent implements OnInit, OnDestroy {
  tickets: any[] = [];
  ticketsFiltrados: any[] = [];
  cargando: boolean = false;
  
  ticketDetalle: any = null;
  mostrarDetalle: boolean = false;
  cargandoDetalle: boolean = false;
  
  estadisticas: any = {};
  
  filtroEstatus: string = 'todos';
  filtroPrioridad: string = 'todas';
  filtroBusqueda: string = '';
  
  currentPage: number = 1;
  itemsPerPage: number = 5;
  paginatedTickets: any[] = [];
  totalPages: number = 1;
  pageNumbers: number[] = [];
  
  private subscriptions: Subscription = new Subscription();
  userId: string = '';
  userName: string = '';
  
  opcionesEstatus: any[] = [
    { label: 'Todos', value: 'todos' },
    { label: 'Nuevo', value: 'Nuevo' },
    { label: 'Asignado', value: 'Asignado' },
    { label: 'En proceso', value: 'En proceso' },
    { label: 'Resuelto', value: 'Resuelto' },
    { label: 'Cerrado', value: 'Cerrado' },
    { label: 'Cancelado', value: 'Cancelado' }
  ];
  
  opcionesPrioridad: any[] = [
    { label: 'Todas', value: 'todas' },
    { label: 'Crítica', value: 'critica' },
    { label: 'Alta', value: 'alta' },
    { label: 'Media', value: 'media' },
    { label: 'Baja', value: 'baja' }
  ];

  tipos: any[] = [
    { label: 'Transporte', value: 'transporte', icon: 'pi pi-truck' },
    { label: 'Materiales', value: 'materiales', icon: 'pi pi-box' },
    { label: 'Almacén', value: 'almacen', icon: 'pi pi-warehouse' },
    { label: 'Inventario', value: 'inventario', icon: 'pi pi-chart-line' },
    { label: 'Otro', value: 'otro', icon: 'pi pi-ellipsis-h' }
  ];

  constructor(
    protected override messageService: MessageService,
    private ticketService: TicketsLogisticaService,
    private userService: UserService
  ) {
    super(messageService);
  }

  ngOnInit() {
    this.cargando = true;
    this.obtenerUsuarioActual();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  obtenerUsuarioActual() {
    this.userService.consultarEmpleado().subscribe({
      next: (empleado) => {
        if (empleado && empleado.id) {
          this.userId = empleado.id;
          this.userName = empleado.nombreCompleto || empleado.nombre || 'Técnico';
          this.cargarMisTickets();
        } else {
          this.cargando = false;
          this.handleAlertType('ERROR', 'No se pudo obtener la información del empleado');
        }
      },
      error: (error) => {
        console.error('Error al obtener empleado:', error);
        this.cargando = false;
        this.handleAlertType('ERROR', 'Error al obtener información del usuario');
      }
    });
  }

  cargarMisTickets() {
    if (!this.userId) return;

    this.cargando = true;
    
    const sub = this.ticketService.getTicketsAsignadosATecnico(this.userId).subscribe({
      next: (tickets) => {
        this.tickets = tickets;
        this.ticketsFiltrados = [...tickets];
        this.calcularEstadisticas();
        this.aplicarFiltros();
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar tickets:', error);
        this.handleAlertType('ERROR', 'Error al cargar tus tickets');
        this.cargando = false;
      }
    });
    
    this.subscriptions.add(sub);
  }

  calcularEstadisticas() {
    const total = this.tickets.length;
    const pendientes = this.tickets.filter(t => 
      ['Nuevo', 'Asignado', 'En proceso'].includes(t.estatus)
    ).length;
    const enProceso = this.tickets.filter(t => t.estatus === 'En proceso').length;
    const resueltos = this.tickets.filter(t => 
      ['Resuelto', 'Cerrado'].includes(t.estatus)
    ).length;
    const vencidos = this.tickets.filter(t => t.vencido).length;

    this.estadisticas = {
      total,
      pendientes,
      enProceso,
      resueltos,
      vencidos
    };
  }

  aplicarFiltros() {
    let filtrados = [...this.tickets];

    if (this.filtroEstatus !== 'todos') {
      filtrados = filtrados.filter(ticket => ticket.estatus === this.filtroEstatus);
    }

    if (this.filtroPrioridad !== 'todas') {
      filtrados = filtrados.filter(ticket => ticket.prioridad === this.filtroPrioridad);
    }

    if (this.filtroBusqueda.trim()) {
      const busqueda = this.filtroBusqueda.toLowerCase();
      filtrados = filtrados.filter(ticket => {
        return (ticket.folio && ticket.folio.toLowerCase().includes(busqueda)) ||
               (ticket.titulo && ticket.titulo.toLowerCase().includes(busqueda)) ||
               (ticket.descripcion && ticket.descripcion.toLowerCase().includes(busqueda));
      });
    }

    this.ticketsFiltrados = filtrados;
    this.currentPage = 1;
    this.updatePagination();
  }

  limpiarFiltros() {
    this.filtroEstatus = 'todos';
    this.filtroPrioridad = 'todas';
    this.filtroBusqueda = '';
    this.aplicarFiltros();
  }

  updatePagination() {
    this.totalPages = Math.ceil(this.ticketsFiltrados.length / this.itemsPerPage);
    this.pageNumbers = Array.from({ length: this.totalPages }, (_, i) => i + 1);
    this.updatePaginatedTickets();
  }

  updatePaginatedTickets() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedTickets = this.ticketsFiltrados.slice(startIndex, endIndex);
  }

  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedTickets();
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.changePage(this.currentPage - 1);
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.changePage(this.currentPage + 1);
    }
  }

  getDisplayRange(): string {
    const start = (this.currentPage - 1) * this.itemsPerPage + 1;
    const end = Math.min(this.currentPage * this.itemsPerPage, this.ticketsFiltrados.length);
    return `${start}-${end}`;
  }

  verDetalle(ticket: any) {
    this.cargandoDetalle = true;
    this.mostrarDetalle = true;
    
    this.ticketService.getTicket(ticket.firestoreId).then(detalle => {
      if (detalle) {
        this.ticketDetalle = this.procesarDetalle(detalle);
      } else {
        this.handleAlertType('ERROR', 'No se pudo cargar el detalle');
        this.mostrarDetalle = false;
      }
      this.cargandoDetalle = false;
    }).catch(error => {
      console.error('Error al cargar detalle:', error);
      this.handleAlertType('ERROR', 'Error al cargar el detalle');
      this.cargandoDetalle = false;
      this.mostrarDetalle = false;
    });
  }

  procesarDetalle(ticket: any): any {
    const fechaCreacion = this.getFecha(ticket.fechaCreacion);
    const fechaLimite = this.getFecha(ticket.fechaLimite);
    
    return {
      ...ticket,
      fechaCreacionFormatted: this.formatFecha(fechaCreacion),
      fechaLimiteFormatted: fechaLimite ? this.formatFecha(fechaLimite) : 'Sin fecha límite',
      colorPrioridad: this.getColorPrioridad(ticket.prioridad),
      iconoTipo: this.getTipoIcon(ticket.tipo),
      diasRestantes: this.calcularDiasRestantes(fechaLimite),
      vencido: this.estaVencido(ticket, fechaLimite)
    };
  }

  cerrarDetalle() {
    this.mostrarDetalle = false;
    this.ticketDetalle = null;
  }

  getEstatusClass(estatus: string): string {
    const classes: Record<string, string> = {
      'Nuevo': 'estatus-nuevo',
      'Asignado': 'estatus-asignado',
      'En proceso': 'estatus-proceso',
      'Resuelto': 'estatus-resuelto',
      'Cerrado': 'estatus-cerrado',
      'Cancelado': 'estatus-cancelado'
    };
    return classes[estatus] || 'estatus-default';
  }

  getEstatusIcon(estatus: string): string {
    const icons: Record<string, string> = {
      'Nuevo': 'pi pi-plus-circle',
      'Asignado': 'pi pi-user-check',
      'En proceso': 'pi pi-spinner',
      'Resuelto': 'pi pi-check-circle',
      'Cerrado': 'pi pi-lock',
      'Cancelado': 'pi pi-times-circle'
    };
    return icons[estatus] || 'pi pi-ticket';
  }

  getTipoLabel(tipo: string): string {
    const tipoObj = this.tipos.find(t => t.value === tipo);
    return tipoObj?.label || tipo;
  }

  getTipoIcon(tipo: string): string {
    const tipoObj = this.tipos.find(t => t.value === tipo);
    return tipoObj?.icon || 'pi pi-ticket';
  }

  getColorPrioridad(prioridad: string): string {
    switch (prioridad) {
      case 'critica': return '#F44336';
      case 'alta': return '#FF9800';
      case 'media': return '#FFC107';
      case 'baja': return '#4CAF50';
      default: return '#607D8B';
    }
  }

  getDiasRestantesText(ticket: any): string {
    if (ticket.estatus === 'Cerrado' || ticket.estatus === 'Cancelado') {
      return 'Cerrado';
    }
    if (ticket.vencido) return 'VENCIDO';
    if (ticket.diasRestantes === null) return 'Sin fecha';
    if (ticket.diasRestantes === 0) return 'Hoy vence';
    if (ticket.diasRestantes === 1) return '1 día';
    return `${ticket.diasRestantes} días`;
  }

  getDiasRestantesClass(ticket: any): string {
    if (ticket.estatus === 'Cerrado' || ticket.estatus === 'Cancelado') return 'dias-cerrado';
    if (ticket.vencido) return 'dias-vencido';
    if (ticket.diasRestantes === null) return 'dias-sin-fecha';
    if (ticket.diasRestantes === 0) return 'dias-hoy';
    if (ticket.diasRestantes <= 3) return 'dias-urgente';
    if (ticket.diasRestantes <= 7) return 'dias-proximo';
    return 'dias-normal';
  }

  getDescripcionCorta(descripcion: string): string {
    if (!descripcion) return 'Sin descripción';
    return descripcion.length > 100 ? descripcion.substring(0, 100) + '...' : descripcion;
  }

  private getFecha(fecha: any): Date | null {
    if (!fecha) return null;
    try {
      if (fecha.toDate) return fecha.toDate();
      if (fecha instanceof Date) return fecha;
      if (typeof fecha === 'string') return new Date(fecha);
      if (fecha.seconds) return new Date(fecha.seconds * 1000);
      return null;
    } catch {
      return null;
    }
  }

  private formatFecha(fecha: Date | null): string {
    if (!fecha) return 'Sin fecha';
    return fecha.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private calcularDiasRestantes(fechaLimite: Date | null): number | null {
    if (!fechaLimite) return null;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const diffTime = fechaLimite.getTime() - hoy.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 ? diffDays : 0;
  }

  private estaVencido(ticket: any, fechaLimite: Date | null): boolean {
    if (!fechaLimite) return false;
    if (['Resuelto', 'Cerrado', 'Cancelado'].includes(ticket.estatus)) return false;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return fechaLimite < hoy;
  }

  refrescar() {
    this.cargarMisTickets();
  }

  async actualizarEstatus(ticket: any, nuevoEstatus: string | null) {
    if (!nuevoEstatus || nuevoEstatus === ticket.estatus) return;
    
    try {
        const fechaKey = `fecha${nuevoEstatus.replace(/\s+/g, '')}`;
        const fechasEstatusActualizadas = { ...ticket.fechasEstatus };
        fechasEstatusActualizadas[fechaKey] = new Date();
        
        await this.ticketService.updateTicket(ticket.firestoreId, {
        estatus: nuevoEstatus,
        fechasEstatus: fechasEstatusActualizadas,
        fechaModificacion: new Date()
        });
        
        this.handleAlertType('SUCCESS', `Ticket actualizado a ${nuevoEstatus}`);
        this.refrescar();
    } catch (error) {
        console.error('Error al actualizar estatus:', error);
        this.handleAlertType('ERROR', 'Error al actualizar el ticket');
    }
  }

  puedeActualizarEstatus(ticket: any): boolean {
    return !['Cerrado', 'Cancelado'].includes(ticket.estatus);
  }

  getSiguienteEstatus(ticket: any): string | null {
    const secuencia = ['Nuevo', 'Asignado', 'En proceso', 'Resuelto', 'Cerrado'];
    const indiceActual = secuencia.indexOf(ticket.estatus);
    if (indiceActual === -1 || indiceActual >= secuencia.length - 1) {
      return null;
    }
    return secuencia[indiceActual + 1];
  }

  getTextoBotonEstatus(ticket: any): string {
    const textos: Record<string, string> = {
      'Nuevo': 'Comenzar',
      'Asignado': 'Iniciar Trabajo',
      'En proceso': 'Marcar como Resuelto',
      'Resuelto': 'Cerrar Ticket'
    };
    return textos[ticket.estatus] || 'Avanzar';
  }

    abrirEvidencia(url: string) {
    window.open(url, '_blank');
    }
}