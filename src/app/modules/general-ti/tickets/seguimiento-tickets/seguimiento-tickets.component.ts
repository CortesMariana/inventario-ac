import { Component, OnInit, OnDestroy } from '@angular/core';
import { MessageService } from 'primeng/api';
import { BaseComponent } from 'src/app/shared/base/base.component';
import { UserTicketsService } from '../user-tickets.service';
import { UserTicketView, UserTicketDetail } from '../models/user-ticket.model';
import { Subscription } from 'rxjs';
import { UserService } from 'src/app/shared/service/user.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-seguimiento-tickets',
  templateUrl: './seguimiento-tickets.component.html',
  styleUrls: ['./seguimiento-tickets.component.css']
})
export class SeguimientoTicketsComponent extends BaseComponent implements OnInit, OnDestroy {
  tickets: UserTicketView[] = [];
  ticketsFiltrados: UserTicketView[] = [];
  cargando: boolean = false;
  
  ticketDetalle: UserTicketDetail | null = null;
  mostrarDetalle: boolean = false;
  cargandoDetalle: boolean = false;
  
  estadisticas: any = {};
  
  filtroEstatus: string = 'todos';
  filtroPrioridad: string = 'todas';
  filtroBusqueda: string = '';
  
  currentPage: number = 1;
  itemsPerPage: number = 5;
  paginatedTickets: UserTicketView[] = [];
  totalPages: number = 1;
  pageNumbers: number[] = [];
  
  private subscriptions: Subscription = new Subscription();
  
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
    { label: 'Crítica', value: 'Critica' },
    { label: 'Alta', value: 'Alta' },
    { label: 'Mediana', value: 'Mediana' },
    { label: 'Baja', value: 'baja' }
  ];
  
  userId: string = '';
  userName: string = '';
  
  mostrarEvaluacion: boolean = false;
  evaluandoTicketId: string = '';
  formEvaluacion!: FormGroup;
  evaluando: boolean = false;

  opcionesCalificacion: any[] = [
    { label: '1 - Muy Malo', value: 1 },
    { label: '2 - Malo', value: 2 },
    { label: '3 - Regular', value: 3 },
    { label: '4 - Aceptable', value: 4 },
    { label: '5 - Bueno', value: 5 },
    { label: '6 - Muy Bueno', value: 6 },
    { label: '7 - Excelente', value: 7 },
    { label: '8 - Sobresaliente', value: 8 },
    { label: '9 - Excepcional', value: 9 },
    { label: '10 - Perfecto', value: 10 }
  ];

  estrellas: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  constructor(
    protected override messageService: MessageService,
    private userTicketsService: UserTicketsService,
    private userService: UserService,
    private fb: FormBuilder
  ) {
    super(messageService);
  }

  ngOnInit() {
    this.cargando = true;
    this.obtenerUsuarioActual();
    this.initFormEvaluacion(); 
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  initFormEvaluacion() {
    this.formEvaluacion = this.fb.group({
      calificacion: ['', [Validators.required, Validators.min(1), Validators.max(10)]],
      comentario: ['', [Validators.maxLength(500)]]
    });
  }

  abrirEvaluacion(ticketId: string, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    
    this.evaluandoTicketId = ticketId;
    this.mostrarEvaluacion = true;
    
    const ticket = this.tickets.find(t => t.firestoreId === ticketId);
    if (ticket?.evaluacion) {
      this.formEvaluacion.patchValue({
        calificacion: ticket.evaluacion.calificacion,
        comentario: ticket.evaluacion.comentario || ''
      });
    } else {
      this.formEvaluacion.reset();
    }
  }

  cerrarEvaluacion() {
    this.mostrarEvaluacion = false;
    this.formEvaluacion.reset();
    this.evaluandoTicketId = '';
  }

  async evaluarTicket() {
    if (this.formEvaluacion.invalid) {
      this.formEvaluacion.markAllAsTouched();
      return;
    }

    if (!this.evaluandoTicketId) {
      this.handleAlertType('ERROR', 'No se especificó el ticket a evaluar');
      return;
    }

    this.evaluando = true;

    try {
      const evaluacionData = {
        calificacion: this.formEvaluacion.get('calificacion')?.value,
        comentario: this.formEvaluacion.get('comentario')?.value || '',
        fechaEvaluacion: new Date(),
        evaluadoPor: {
          id: this.userId,
          nombre: this.userName
        }
      };

      const evaluado = await this.userTicketsService.evaluarTicket(
        this.evaluandoTicketId,
        this.userId,
        evaluacionData
      );

      if (evaluado) {
        this.handleAlertType('SUCCESS', 'Ticket evaluado correctamente');
        this.cerrarEvaluacion();
        this.refrescar(); 
      } else {
        this.handleAlertType('ERROR', 'No se pudo evaluar el ticket');
      }
    } catch (error) {
      console.error('Error al evaluar ticket:', error);
      this.handleAlertType('ERROR', 'Error al evaluar el ticket');
    } finally {
      this.evaluando = false;
    }
  }

  getCalificacionIcon(calificacion: number): string {
    if (calificacion >= 9) return 'pi pi-star-fill text-yellow-500';
    if (calificacion >= 7) return 'pi pi-star-fill text-green-500';
    if (calificacion >= 5) return 'pi pi-star-fill text-blue-500';
    if (calificacion >= 3) return 'pi pi-star text-orange-500';
    return 'pi pi-star text-red-500';
  }

  getCalificacionColor(calificacion: number): string {
    if (calificacion >= 9) return '#22c55e'; 
    if (calificacion >= 7) return '#10b981'; 
    if (calificacion >= 5) return '#3b82f6'; 
    if (calificacion >= 3) return '#f59e0b'; 
    return '#ef4444'; 
  }

  puedeEvaluar(ticket: UserTicketView): boolean {
    const puedePorEstatus = ticket.estatus === 'Resuelto' || ticket.estatus === 'Cerrado';
    const yaEvaluado = ticket.evaluado || ticket.evaluacion;
    return puedePorEstatus && !yaEvaluado;
  }

  getTextoCalificacion(calificacion: number): string {
    if (calificacion >= 9) return 'Excelente';
    if (calificacion >= 7) return 'Muy Bueno';
    if (calificacion >= 5) return 'Bueno';
    if (calificacion >= 3) return 'Regular';
    return 'Deficiente';
  }

  obtenerUsuarioActual() {
    this.userService.consultarEmpleado().subscribe({
        next: (empleado) => {
        
        if (empleado && empleado.id) {
            this.userId = empleado.id;
            this.userName = empleado.nombre || empleado.nombreCompleto || 'Usuario';
            this.cargarTickets();
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

  cargarTickets() {
    if (!this.userId) {
      console.error('No hay userId para cargar tickets');
      this.cargando = false;
      return;
    }

    this.cargando = true;
    
    const sub = this.userTicketsService.getUserTickets(this.userId).subscribe({
      next: (tickets) => {
        this.tickets = tickets;
        this.ticketsFiltrados = [...tickets];
        this.estadisticas = this.userTicketsService.getUserStats(tickets);
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

  verDetalle(ticket: UserTicketView) {
    this.cargandoDetalle = true;
    this.mostrarDetalle = true;
    
    const sub = this.userTicketsService.getUserTicketDetail(ticket.firestoreId, this.userId)
      .subscribe({
        next: (detalle) => {
          if (detalle) {
            this.ticketDetalle = detalle;
          } else {
            this.handleAlertType('ERROR', 'No se pudo cargar el detalle del ticket');
            this.mostrarDetalle = false;
          }
          this.cargandoDetalle = false;
        },
        error: (error) => {
          console.error('Error al cargar detalle:', error);
          this.handleAlertType('ERROR', 'Error al cargar el detalle del ticket');
          this.cargandoDetalle = false;
          this.mostrarDetalle = false;
        }
      });
    
    this.subscriptions.add(sub);
  }

  cerrarDetalle() {
    this.mostrarDetalle = false;
    this.ticketDetalle = null;
  }

  getEstatusClass(estatus: string): string {
    if (!estatus) return 'estatus-default';
    
    switch (estatus) {
        case 'Nuevo':
        return 'estatus-nuevo';
        case 'Asignado':
        return 'estatus-asignado';
        case 'En proceso':
        return 'estatus-proceso';
        case 'Resuelto':
        return 'estatus-resuelto';
        case 'Cerrado':
        return 'estatus-cerrado';
        case 'Cancelado':
        return 'estatus-cancelado';
        default:
        return 'estatus-default';
    }
    }

  getEstatusIcon(estatus: string): string {
    if (!estatus) return 'pi pi-ticket';
    
    switch (estatus) {
        case 'Nuevo':
        return 'pi pi-plus-circle';
        case 'Asignado':
        return 'pi pi-user-check';
        case 'En proceso':
        return 'pi pi-spinner';
        case 'Resuelto':
        return 'pi pi-check-circle';
        case 'Cerrado':
        return 'pi pi-lock';
        case 'Cancelado':
        return 'pi pi-times-circle';
        default:
        return 'pi pi-ticket';
    }
  }

  getDiasRestantesText(ticket: UserTicketView): string {
    if (ticket.vencido) {
      return 'VENCIDO';
    }
    
    if (ticket.diasRestantes === null) {
      return 'Sin fecha';
    }
    
    if (ticket.diasRestantes === 0) {
      return 'Hoy vence';
    }
    
    if (ticket.diasRestantes === 1) {
      return '1 día';
    }
    
    return `${ticket.diasRestantes} días`;
  }

  getDiasRestantesClass(ticket: UserTicketView): string {
    if (ticket.vencido) {
      return 'dias-vencido';
    }
    
    if (ticket.diasRestantes === null) {
      return 'dias-sin-fecha';
    }
    
    if (ticket.diasRestantes === 0) {
      return 'dias-hoy';
    }
    
    if (ticket.diasRestantes <= 3) {
      return 'dias-urgente';
    }
    
    if (ticket.diasRestantes <= 7) {
      return 'dias-proximo';
    }
    
    return 'dias-normal';
  }

  getDescripcionCorta(descripcion: string): string {
    if (!descripcion) return 'Sin descripción';
    return descripcion.length > 100 ? descripcion.substring(0, 100) + '...' : descripcion;
  }

  formatFechaDetalle(fecha: any): string {
    if (!fecha) return 'Sin fecha';
    
    try {
      let date: Date;
      
      if (fecha.toDate && typeof fecha.toDate === 'function') {
        date = fecha.toDate();
      } else if (fecha.seconds) {
        date = new Date(fecha.seconds * 1000);
      } else if (fecha instanceof Date) {
        date = fecha;
      } else {
        date = new Date(fecha);
      }
      
      return date.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Fecha no válida';
    }
  }

  getFileIcon(file: any): string {
    let extension = '';
    let type = '';
    
    if (file.tipo) {
      type = file.tipo;
      if (file.nombre) {
        extension = file.nombre.split('.').pop()?.toLowerCase() || '';
      }
    } else if (file.url) {
      const urlParts = file.url.split('.');
      extension = urlParts.length > 1 ? urlParts.pop()?.toLowerCase() || '' : '';
      type = file.tipo || '';
    }
    
    if (type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(extension)) {
      return 'pi pi-image text-primary';
    }
    
    switch (extension) {
      case 'pdf':
        return 'pi pi-file-pdf text-red-500';
      case 'doc':
      case 'docx':
        return 'pi pi-file-word text-blue-500';
      case 'xls':
      case 'xlsx':
        return 'pi pi-file-excel text-green-500';
      case 'zip':
      case 'rar':
        return 'pi pi-file-archive text-orange-500';
      default:
        return 'pi pi-file text-gray-500';
    }
  }

  verEvidencia(url: string) {
    window.open(url, '_blank');
  }

  getHistorialEstatus(): any[] {
    if (!this.ticketDetalle || !this.ticketDetalle.fechasEstatus) return [];
    if (!this.ticketDetalle?.fechasEstatus) return [];
    
    const historial = [];
    const estatusMap = {
      'fechaNuevo': 'Nuevo',
      'fechaAsignado': 'Asignado',
      'fechaEnProceso': 'En Proceso',
      'fechaResuelto': 'Resuelto',
      'fechaCerrado': 'Cerrado',
      'fechaCancelado': 'Cancelado'
    };
    
    for (const [key, value] of Object.entries(this.ticketDetalle.fechasEstatus)) {
      if (value) {
        historial.push({
          estatus: estatusMap[key as keyof typeof estatusMap] || key,
          fecha: this.formatFechaDetalle(value)
        });
      }
    }
    
    return historial.sort((a, b) => {
      const dateA = new Date(a.fecha);
      const dateB = new Date(b.fecha);
      return dateB.getTime() - dateA.getTime();
    });
  }

  refrescar() {
    this.cargarTickets();
  }
  
  getSucursalNombre(sucursal: any): string {
    if (!sucursal) return '';
    
    if (typeof sucursal === 'string') {
        return sucursal;
    }
    
    if (sucursal && typeof sucursal === 'object' && sucursal.nombre) {
        return sucursal.nombre;
    }
    
    if (sucursal && typeof sucursal === 'object') {
        return sucursal.nombre || sucursal.Nombre || sucursal.name || sucursal.Name || 'Sucursal';
    }
    
    return '';
    }
}