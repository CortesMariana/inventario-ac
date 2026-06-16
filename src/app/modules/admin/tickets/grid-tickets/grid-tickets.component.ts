import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { BaseComponent } from 'src/app/shared/base/base.component';
import { Empleado } from '../../empleados/models/empleado.model';
import { EmpleadoService } from '../../empleados/empleados.service';
import { TicketService } from '../tickets.service';
import { Tecnico } from '../../tecnicos/models/tecnico.model';
import { TecnicoService } from '../../tecnicos/tecnicos.service';

@Component({
  selector: 'app-grid-tickets',
  templateUrl: './grid-tickets.component.html',
  styleUrls: ['./grid-tickets.component.css']
})
export class GridTicketsAdminComponent extends BaseComponent implements OnInit {
  tickets: any[] = [];
  ticketsFiltrados: any[] = [];
  cargando: boolean = false;

  empleados: Empleado[] = [];
  tecnicos: Tecnico[] = [];
  opcionesTecnicos: any[] = [];

  filtroEstatus: string = 'todos';
  filtroPrioridad: string = 'todas';
  filtroTipo: string = 'todos';
  filtroTecnico: string = 'todos';
  filtroBusqueda: string = '';

  vistaActual: 'cards' | 'lista' = 'cards'; 
  vistaSidebar: string = 'pendientes'; 
  
  ticketsPendientes: any[] = [];
  ticketsTerminados: any[] = [];
  ticketsVencidos: any[] = [];

  ordenamientoColumnas: { [key: string]: 'asc' | 'desc' | null } = {
    id: null,
    titulo: null,
    creador: null,
    asignado: null,
    tipo: null,
    estatus: 'asc',
    prioridad: null,
    fechaCreacion: 'desc',
    fechaLimite: null,
    estado: null
  };
  
  columnaActiva: string = 'fechaCreacion';
  
  opcionesOrdenamientoColumnas: any[] = [
    { label: 'ID', value: 'id' },
    { label: 'Título', value: 'titulo' },
    { label: 'Creado por', value: 'creador' },
    { label: 'Asignado a', value: 'asignado' },
    { label: 'Tipo', value: 'tipo' },
    { label: 'Estatus', value: 'estatus' },
    { label: 'Prioridad', value: 'prioridad' },
    { label: 'Fecha Creación', value: 'fechaCreacion' },
    { label: 'Fecha Límite', value: 'fechaLimite' },
    { label: 'Estado', value: 'estado' }
  ];

  private ordenEstatus: { [key: string]: number } = {
    'Nuevo': 1,
    'Asignado': 2,
    'En proceso': 3,
    'Resuelto': 4,
    'Cerrado': 5,
    'Cancelado': 6
  };

  currentPage: number = 1;
  itemsPerPage: number = 10; 
  paginatedTickets: any[] = [];
  totalPages: number = 1;
  pageNumbers: number[] = [];

  private readonly STORAGE_KEYS = {
    VISTA: 'tickets_preferencia_vista',
    ITEMS_POR_PAGINA: 'tickets_items_por_pagina',
    ORDENAMIENTO_COLUMNAS: 'tickets_ordenamiento_columnas',
    COLUMNA_ACTIVA: 'tickets_columna_activa'
  };

  constructor(
    protected override messageService: MessageService,
    private router: Router,
    private ticketService: TicketService,
    private empleadoService: EmpleadoService,
    private tecnicoService: TecnicoService
  ) {
    super(messageService);
  }

  ngOnInit() {
    this.cargarPreferencias();
    this.cargarDatos();
  }

  private cargarPreferencias() {
    try {
      const vistaGuardada = localStorage.getItem(this.STORAGE_KEYS.VISTA);
      if (vistaGuardada && (vistaGuardada === 'cards' || vistaGuardada === 'lista')) {
        this.vistaActual = vistaGuardada as 'cards' | 'lista';
      }

      const itemsGuardados = localStorage.getItem(this.STORAGE_KEYS.ITEMS_POR_PAGINA);
      if (itemsGuardados) {
        const items = parseInt(itemsGuardados, 10);
        if ([5, 10, 20, 50, 100].includes(items)) {
          this.itemsPerPage = items;
        }
      }

      const ordenamientoGuardado = localStorage.getItem(this.STORAGE_KEYS.ORDENAMIENTO_COLUMNAS);
      if (ordenamientoGuardado) {
        this.ordenamientoColumnas = JSON.parse(ordenamientoGuardado);
      }

      const columnaActivaGuardada = localStorage.getItem(this.STORAGE_KEYS.COLUMNA_ACTIVA);
      if (columnaActivaGuardada) {
        this.columnaActiva = columnaActivaGuardada;
      }
    } catch (error) {
      console.error('Error al cargar preferencias:', error);
    }
  }

  private guardarPreferencias() {
    try {
      localStorage.setItem(this.STORAGE_KEYS.VISTA, this.vistaActual);
      localStorage.setItem(this.STORAGE_KEYS.ITEMS_POR_PAGINA, this.itemsPerPage.toString());
      localStorage.setItem(this.STORAGE_KEYS.ORDENAMIENTO_COLUMNAS, JSON.stringify(this.ordenamientoColumnas));
      localStorage.setItem(this.STORAGE_KEYS.COLUMNA_ACTIVA, this.columnaActiva);
    } catch (error) {
      console.error('Error al guardar preferencias:', error);
    }
  }

  cambiarOrdenamientoColumna(columna: string) {
    if (this.columnaActiva === columna) {
      const direccionActual = this.ordenamientoColumnas[columna];
      if (direccionActual === 'asc') {
        this.ordenamientoColumnas[columna] = 'desc';
      } else if (direccionActual === 'desc') {
        this.ordenamientoColumnas[columna] = null;
        this.columnaActiva = '';
      } else {
        this.ordenamientoColumnas[columna] = 'asc';
        this.columnaActiva = columna;
      }
    } else {
      Object.keys(this.ordenamientoColumnas).forEach(key => {
        if (key !== columna) {
          this.ordenamientoColumnas[key] = null;
        }
      });
      this.ordenamientoColumnas[columna] = 'asc';
      this.columnaActiva = columna;
    }
    
    this.guardarPreferencias();
    this.aplicarOrdenamientoYFiltros();
  }

  getOrdenIcono(columna: string): string {
    if (this.columnaActiva === columna) {
      return this.ordenamientoColumnas[columna] === 'asc' ? 'pi pi-arrow-up' : 'pi pi-arrow-down';
    }
    return 'pi pi-sort';
  }

  async cargarDatos() {
    this.cargando = true;
    
    try {
      const [tickets, empleados, tecnicos] = await Promise.all([
        this.ticketService.getAllTickets(),
        this.empleadoService.getEmpleados().toPromise(),
        this.tecnicoService.getTecnicos().toPromise()
      ]);
      
      this.tickets = tickets || [];
      this.empleados = empleados || [];
      this.tecnicos = tecnicos || [];
      
      this.opcionesTecnicos = this.getOpcionesTecnicos();
      
      this.procesarTickets();
      this.aplicarOrdenamientoYFiltros();
      
    } catch (error) {
      console.error('Error al cargar datos:', error);
      this.handleAlertType('ERROR', 'Error al cargar los tickets');
    } finally {
      this.cargando = false;
    }
  }

  getTecnicosFiltrados(): Tecnico[] {
    if (!this.tecnicos || this.tecnicos.length === 0) {
      return [];
    }
    return this.tecnicos;
  }

  getOpcionesTecnicos(): any[] {
    const opciones = [
      { label: 'Todos los técnicos', value: 'todos' }
    ];
    
    if (!this.tecnicos || this.tecnicos.length === 0) {
      return opciones;
    }
    
    const tecnicosActivos = this.tecnicos.filter(t => t.activo !== false);
    
    const tecnicosOrdenados = tecnicosActivos.sort((a, b) => {
      const numA = a.numeroConsecutivo || 999999;
      const numB = b.numeroConsecutivo || 999999;
      return numA - numB;
    });
    
    tecnicosOrdenados.forEach(tecnico => {
      opciones.push({
        label: this.getLabelTecnico(tecnico),
        value: tecnico.empleadoId
      });
    });
    
    return opciones;
  }

  getLabelTecnico(tecnico: Tecnico): string {
    return tecnico.nombre || 'Sin nombre';
  }

  getNombreCompleto(empleado: Empleado): string {
    return `${empleado.nombre} ${empleado.apellidoPaterno} ${empleado.apellidoMaterno}`.trim();
  }

  procesarTickets() {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    this.tickets.forEach(ticket => {
      ticket.fechaCreacionFormatted = this.formatFecha(ticket.fechaCreacion);
      ticket.fechaLimiteFormatted = ticket.fechaLimite ? 
        this.formatFecha(ticket.fechaLimite) : 'Sin fecha límite';
      
      if (ticket.fechaLimite) {
        const fechaLimite = this.getFecha(ticket.fechaLimite);
        if (fechaLimite) {
          fechaLimite.setHours(0, 0, 0, 0);
          ticket.vencido = fechaLimite < hoy && 
            !['Resuelto', 'Cerrado', 'Cancelado'].includes(ticket.estatus);
        } else {
          ticket.vencido = false;
        }
      } else {
        ticket.vencido = false;
      }

      if (ticket.fechaLimite && !ticket.vencido) {
        const fechaLimite = this.getFecha(ticket.fechaLimite);
        if (fechaLimite) {
          const diffTime = fechaLimite.getTime() - hoy.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          ticket.diasRestantes = diffDays >= 0 ? diffDays : 0;
        } else {
          ticket.diasRestantes = null;
        }
      } else {
        ticket.diasRestantes = null;
      }
    });

    this.ticketsPendientes = this.tickets.filter(t => 
        ['Nuevo', 'Asignado', 'En proceso'].includes(t.estatus)
    );
    
    this.ticketsTerminados = this.tickets.filter(t => 
        ['Resuelto', 'Cerrado'].includes(t.estatus)
    );
    
    this.ticketsVencidos = this.tickets.filter(t => t.vencido);
  }

  cambiarVista(tipo: 'cards' | 'lista') {
    this.vistaActual = tipo;
    this.guardarPreferencias(); 
  }

  cambiarVistaSidebar(vista: string) {
    this.vistaSidebar = vista;
  }

  getTicketsSidebarActual(): any[] {
    if (this.vistaSidebar === 'pendientes') {
        return this.ticketsPendientes.slice(0, 5);
    } else {
        return this.ticketsTerminados.slice(0, 5);
    }
  }

  getTicketsPendientes(): any[] {
    return this.ticketsPendientes;
  }

  getTicketsTerminados(): any[] {
    return this.ticketsTerminados;
  }

  getTicketsVencidos(): any[] {
    return this.ticketsVencidos;
  }

  aplicarOrdenamientoYFiltros() {
    let ticketsOrdenados = [...this.tickets];
    
    if (this.filtroEstatus !== 'todos') {
      ticketsOrdenados = ticketsOrdenados.filter(ticket => ticket.estatus === this.filtroEstatus);
    }

    if (this.filtroPrioridad !== 'todas') {
      ticketsOrdenados = ticketsOrdenados.filter(ticket => ticket.prioridad === this.filtroPrioridad);
    }

    if (this.filtroTipo !== 'todos') {
      ticketsOrdenados = ticketsOrdenados.filter(ticket => ticket.tipo === this.filtroTipo);
    }

    if (this.filtroTecnico !== 'todos') {
      ticketsOrdenados = ticketsOrdenados.filter(ticket => 
        ticket.asignadoA?.id === this.filtroTecnico
      );
    }

    if (this.filtroBusqueda.trim()) {
      const busqueda = this.filtroBusqueda.toLowerCase();
      ticketsOrdenados = ticketsOrdenados.filter(ticket => {
        const titulo = ticket.titulo || '';
        const descripcion = ticket.descripcion || '';
        const folio = ticket.folio || '';
        const creadoPorNombre = ticket.creadoPor?.nombre || '';
        const asignadoANombre = ticket.asignadoA?.nombre || '';
        const sucursal = (ticket.sucursal?.nombre || '').toString();
        
        return folio.toLowerCase().includes(busqueda) ||
               titulo.toLowerCase().includes(busqueda) ||
               descripcion.toLowerCase().includes(busqueda) ||
               creadoPorNombre.toLowerCase().includes(busqueda) ||
               asignadoANombre.toLowerCase().includes(busqueda) ||
               sucursal.toLowerCase().includes(busqueda); 
      });
    }

    ticketsOrdenados = this.aplicarOrdenamientoColumnaActiva(ticketsOrdenados);
    
    if (this.columnaActiva !== 'estatus') {
      ticketsOrdenados = this.ordenarCerradosAlFinal(ticketsOrdenados);
    }

    this.ticketsFiltrados = ticketsOrdenados;
    this.currentPage = 1; 
    this.updatePagination();
  }

  private ordenarCerradosAlFinal(tickets: any[]): any[] {
    return tickets.sort((a, b) => {
      const aCerrado = a.estatus === 'Cerrado' || a.estatus === 'Cancelado';
      const bCerrado = b.estatus === 'Cerrado' || b.estatus === 'Cancelado';
      
      if (aCerrado && !bCerrado) return 1;
      if (!aCerrado && bCerrado) return -1;
      return 0;
    });
  }

  private aplicarOrdenamientoColumnaActiva(tickets: any[]): any[] {
    if (!this.columnaActiva || !this.ordenamientoColumnas[this.columnaActiva]) {
      return this.ordenarPorEstatusDefault(tickets);
    }
    
    const direccion = this.ordenamientoColumnas[this.columnaActiva];
    const orden = direccion === 'asc' ? 1 : -1;
    
    return [...tickets].sort((a, b) => {
      let valorA: any;
      let valorB: any;
      
      switch (this.columnaActiva) {
        case 'id':
          valorA = a.folio || '';
          valorB = b.folio || '';
          break;
        case 'titulo':
          valorA = a.titulo || '';
          valorB = b.titulo || '';
          break;
        case 'creador':
          valorA = a.creadoPor?.nombre || '';
          valorB = b.creadoPor?.nombre || '';
          break;
        case 'asignado':
          valorA = a.asignadoA?.nombre || '';
          valorB = b.asignadoA?.nombre || '';
          break;
        case 'tipo':
          valorA = a.tipo || '';
          valorB = b.tipo || '';
          break;
        case 'estatus':
          valorA = this.ordenEstatus[a.estatus] || 999;
          valorB = this.ordenEstatus[b.estatus] || 999;
          break;
        case 'prioridad':
          const prioridadOrden: { [key: string]: number } = { 
            'Critica': 1, 
            'Alta': 2, 
            'Mediana': 3, 
            'baja': 4 
          };
          valorA = prioridadOrden[a.prioridad] !== undefined ? prioridadOrden[a.prioridad] : 5;
          valorB = prioridadOrden[b.prioridad] !== undefined ? prioridadOrden[b.prioridad] : 5;
          break;
        case 'fechaCreacion':
          valorA = this.getFecha(a.fechaCreacion)?.getTime() || 0;
          valorB = this.getFecha(b.fechaCreacion)?.getTime() || 0;
          break;
        case 'fechaLimite':
          valorA = this.getFecha(a.fechaLimite)?.getTime() || 0;
          valorB = this.getFecha(b.fechaLimite)?.getTime() || 0;
          break;
        case 'estado':
          valorA = a.vencido ? 0 : (a.diasRestantes !== null ? a.diasRestantes : 999);
          valorB = b.vencido ? 0 : (b.diasRestantes !== null ? b.diasRestantes : 999);
          break;
        default:
          return 0;
      }
      
      if (valorA < valorB) return -1 * orden;
      if (valorA > valorB) return 1 * orden;
      return 0;
    });
  }

  private ordenarPorEstatusDefault(tickets: any[]): any[] {
    return [...tickets].sort((a, b) => {
      const ordenA = this.ordenEstatus[a.estatus] || 999;
      const ordenB = this.ordenEstatus[b.estatus] || 999;
      if (ordenA !== ordenB) return ordenA - ordenB;
      
      const fechaA = this.getFecha(a.fechaCreacion)?.getTime() || 0;
      const fechaB = this.getFecha(b.fechaCreacion)?.getTime() || 0;
      return fechaB - fechaA;
    });
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

  onItemsPerPageChange() {
    this.updatePagination();
    this.guardarPreferencias(); 
  }

  getDisplayRange(): string {
    const start = (this.currentPage - 1) * this.itemsPerPage + 1;
    const end = Math.min(this.currentPage * this.itemsPerPage, this.ticketsFiltrados.length);
    return `${start}-${end}`;
  }

  getTotalTickets(): number {
    return this.tickets.length;
  }

  getTicketsPorEstatus(estatus: string): number {
    return this.tickets.filter(ticket => ticket.estatus === estatus).length;
  }

  getDescripcionCorta(descripcion: string): string {
    if (!descripcion) return 'Sin descripción';
    return descripcion.length > 120 ? descripcion.substring(0, 120) + '...' : descripcion;
  }

  getDescripcionLista(descripcion: string): string {
    if (!descripcion) return 'Sin descripción';
    return descripcion.length > 60 ? descripcion.substring(0, 60) + '...' : descripcion;
  }

  limpiarFiltros() {
    this.filtroEstatus = 'todos';
    this.filtroPrioridad = 'todas';
    this.filtroTipo = 'todos';
    this.filtroTecnico = 'todos';
    this.filtroBusqueda = '';
    this.aplicarOrdenamientoYFiltros();
  }

  verDetalle(ticket: any, event?: Event) {
    if (event) {
      const target = event.target as HTMLElement;
      if (target.closest('.btn-estatus') || target.closest('.btn-cancelar')) {
        return;
      }
    }
    
    if (ticket.firestoreId) {
      this.router.navigate(['/admin/tickets/tickets', ticket.firestoreId]);
    }
  }

  asignarTicket(ticket: any) {
    this.router.navigate(['/admin/tickets/asignar-tickets']);
  }

  private getFecha(fecha: any): Date | null {
    if (!fecha) return null;
    
    try {
      if (fecha.toDate) {
        return fecha.toDate();
      } else if (fecha instanceof Date) {
        return fecha;
      } else if (typeof fecha === 'string') {
        return new Date(fecha);
      } else if (fecha && typeof fecha === 'object' && fecha.seconds) {
        return new Date(fecha.seconds * 1000);
      }
      return null;
    } catch (error) {
      console.error('Error al convertir fecha:', error);
      return null;
    }
  }

  formatFecha(fecha: any): string {
    const date = this.getFecha(fecha);
    if (!date) return 'Sin fecha';
    
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  getColorPrioridad(prioridad: string, estatus?: string): string {
    if (estatus === 'Cerrado' || estatus === 'Cancelado') {
      return '#9E9E9E';
    }
    
    switch (prioridad) {
      case 'Critica':
        return '#F44336';
      case 'Alta':
        return '#FF9800';
      case 'Mediana':
        return '#FFC107';
      case 'baja':
        return '#4CAF50';
      default:
        return '#607D8B';
    }
  }

  getFechaClass(estatus: string, fechaLimite?: any): string {
    if (estatus === 'Cerrado' || estatus === 'Cancelado') {
      return 'fecha-cerrado';
    }
    
    if (this.isFechaVencida(fechaLimite)) {
      return 'fecha-roja';
    }
    
    return 'fecha-verde';
  }
  
  isFechaVencida(fechaLimite: any): boolean {
    if (!fechaLimite) return false;
    const fecha = this.getFecha(fechaLimite);
    if (!fecha) return false;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    fecha.setHours(0, 0, 0, 0);
    return fecha < hoy;
  }

  getIconoTipo(tipo: string): string {
    switch (tipo) {
      case 'mantenimiento':
        return 'pi pi-wrench';
      case 'incidente':
        return 'pi pi-exclamation-triangle';
      case 'requerimiento':
        return 'pi pi-pencil';
      case 'asignacion activo/dispositivo':
        return 'pi pi-desktop';
      default:
        return 'pi pi-ticket';
    }
  }

  getEstatusClass(estatus: string): string {
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

  getDiasRestantesText(ticket: any): string {
    if (ticket.estatus === 'Cerrado' || ticket.estatus === 'Cancelado') {
      return 'Cerrado';
    }
    
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

  getDiasRestantesClass(ticket: any): string {
    if (ticket.estatus === 'Cerrado' || ticket.estatus === 'Cancelado') {
      return 'dias-cerrado';
    }
    
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

  refrescar() {
    this.cargarDatos();
  }
}