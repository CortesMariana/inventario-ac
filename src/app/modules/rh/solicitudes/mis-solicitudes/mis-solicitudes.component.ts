import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subject, takeUntil } from 'rxjs';
import { BaseComponent } from 'src/app/shared/base/base.component';
import { UserService } from 'src/app/shared/service/user.service';
import { SolicitudesService } from '../solicitudes.service';
import { UserSolicitudView, UserSolicitudDetail, HistorialItem } from '../models/user-solicitud.model';

@Component({
  selector: 'app-mis-solicitudes',
  templateUrl: './mis-solicitudes.component.html',
  styleUrls: ['./mis-solicitudes.component.css']
})
export class MisSolicitudesComponent extends BaseComponent implements OnInit, OnDestroy {
  solicitudes: UserSolicitudView[] = [];
  solicitudesFiltradas: UserSolicitudView[] = [];
  solicitudDetalle: UserSolicitudDetail | null = null;
  
  cargando: boolean = false;
  cargandoDetalle: boolean = false;
  mostrarDetalle: boolean = false;
  
  userId: string = '';
  userName: string = '';
  
  filtroEstatus: string = 'todos';
  filtroTipo: string = 'todos';
  filtroBusqueda: string = '';
  
  currentPage: number = 1;
  itemsPerPage: number = 6;
  paginatedSolicitudes: UserSolicitudView[] = [];
  totalPages: number = 1;
  pageNumbers: number[] = [];
  
  estadisticas: any = {};
  
  opcionesEstatus: any[] = [
    { label: 'Todos', value: 'todos' },
    { label: 'Nueva', value: 'Nueva' },
    { label: 'En revisión', value: 'En revision' },
    { label: 'Aprobada', value: 'Aprobada' },
    { label: 'Rechazada', value: 'Rechazada' },
    { label: 'Completada', value: 'Completada' },
    { label: 'Cancelada', value: 'Cancelada' }
  ];
  
  opcionesTipo: any[] = [
    { label: 'Todos', value: 'todos' },
    { label: 'Vacaciones', value: 'vacaciones' },
    { label: 'Permiso', value: 'permiso' },
    { label: 'Incapacidad', value: 'incapacidad' },
    { label: 'Préstamo', value: 'prestamo' },
    { label: 'Constancia', value: 'constancia' },
    { label: 'Cambio de datos', value: 'cambio-datos' },
    { label: 'Otro', value: 'otro' }
  ];
  
  private destroy$ = new Subject<void>();

  constructor(
    protected override messageService: MessageService,
    private userSrv: UserService,
    private solicitudesSrv: SolicitudesService,
    private router: Router
  ) {
    super(messageService);
  }

  ngOnInit() {
    this.cargando = true;
    this.obtenerUsuario();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  obtenerUsuario() {
    this.userSrv.consultarEmpleado()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (empleado) => {
          this.userId = empleado.id;
          this.userName = empleado.nombreCompleto || empleado.nombre || 'Usuario';
          this.cargarSolicitudes();
        },
        error: (error) => {
          console.error('Error al obtener usuario:', error);
          this.handleAlertType('ERROR', 'Error al obtener información del usuario');
          this.cargando = false;
        }
      });
  }

  cargarSolicitudes() {
    this.solicitudesSrv.getUserSolicitudes(this.userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (solicitudes) => {
          this.solicitudes = solicitudes;
          this.solicitudesFiltradas = [...solicitudes];
          this.estadisticas = this.solicitudesSrv.getUserStats(solicitudes);
          this.aplicarFiltros();
          this.cargando = false;
        },
        error: (error) => {
          console.error('Error al cargar solicitudes:', error);
          this.handleAlertType('ERROR', 'Error al cargar sus solicitudes');
          this.cargando = false;
        }
      });
  }

  aplicarFiltros() {
    let filtradas = [...this.solicitudes];
    
    if (this.filtroEstatus !== 'todos') {
      filtradas = filtradas.filter(s => s.estatus === this.filtroEstatus);
    }
    
    if (this.filtroTipo !== 'todos') {
      filtradas = filtradas.filter(s => s.tipoSolicitud === this.filtroTipo);
    }
    
    if (this.filtroBusqueda.trim()) {
      const busqueda = this.filtroBusqueda.toLowerCase();
      filtradas = filtradas.filter(s => 
        s.folio.toLowerCase().includes(busqueda) ||
        s.titulo.toLowerCase().includes(busqueda) ||
        s.descripcion.toLowerCase().includes(busqueda)
      );
    }
    
    this.solicitudesFiltradas = filtradas;
    this.currentPage = 1;
    this.updatePagination();
  }

  limpiarFiltros() {
    this.filtroEstatus = 'todos';
    this.filtroTipo = 'todos';
    this.filtroBusqueda = '';
    this.aplicarFiltros();
  }

  updatePagination() {
    this.totalPages = Math.ceil(this.solicitudesFiltradas.length / this.itemsPerPage);
    this.pageNumbers = Array.from({ length: this.totalPages }, (_, i) => i + 1);
    this.updatePaginatedSolicitudes();
  }

  updatePaginatedSolicitudes() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    this.paginatedSolicitudes = this.solicitudesFiltradas.slice(start, end);
  }

  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedSolicitudes();
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
    const end = Math.min(this.currentPage * this.itemsPerPage, this.solicitudesFiltradas.length);
    return `${start}-${end}`;
  }

  verDetalle(solicitud: UserSolicitudView) {
    this.cargandoDetalle = true;
    this.mostrarDetalle = true;
    
    this.solicitudesSrv.getUserSolicitudDetail(solicitud.firestoreId, this.userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (detalle) => {
          if (detalle) {
            this.solicitudDetalle = detalle;
          } else {
            this.handleAlertType('ERROR', 'No se pudo cargar el detalle');
            this.mostrarDetalle = false;
          }
          this.cargandoDetalle = false;
        },
        error: (error) => {
          console.error('Error al cargar detalle:', error);
          this.handleAlertType('ERROR', 'Error al cargar el detalle');
          this.cargandoDetalle = false;
          this.mostrarDetalle = false;
        }
      });
  }

  cerrarDetalle() {
    this.mostrarDetalle = false;
    this.solicitudDetalle = null;
  }

  getEstatusClass(estatus: string): string {
    const classes: Record<string, string> = {
      'Nueva': 'estatus-nueva',
      'En revision': 'estatus-revision',
      'Aprobada': 'estatus-aprobada',
      'Rechazada': 'estatus-rechazada',
      'Completada': 'estatus-completada',
      'Cancelada': 'estatus-cancelada'
    };
    return classes[estatus] || '';
  }

  getDiasTranscurridosText(dias: number): string {
    if (dias === 0) return 'Hoy';
    if (dias === 1) return '1 día';
    if (dias < 7) return `${dias} días`;
    if (dias < 30) return `${Math.floor(dias / 7)} semana(s)`;
    return `${Math.floor(dias / 30)} mes(es)`;
  }

  getMontoFormateado(monto: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(monto);
  }

  nuevaSolicitud() {
    this.router.navigate(['/rh/nueva-solicitud']);
  }

  refrescar() {
    this.cargarSolicitudes();
  }

  getHistorialArray(): HistorialItem[] {
    if (!this.solicitudDetalle?.fechasEstatus) return [];
    
    return Object.entries(this.solicitudDetalle.fechasEstatus)
      .filter(([_, value]) => value) 
      .map(([key, value]) => ({
      key: this.formatEstatusKey(key),
      value: value
    }));
  }

  private formatEstatusKey(key: string): string {
    const map: Record<string, string> = {
      'fechaNueva': 'Nueva',
      'fechaEnRevision': 'En revisión',
      'fechaAprobada': 'Aprobada',
      'fechaRechazada': 'Rechazada',
      'fechaCompletada': 'Completada',
      'fechaCancelada': 'Cancelada'
    };
    return map[key] || key.replace('fecha', '');
  }
  
  tieneComentarios(): boolean {
    return !!this.solicitudDetalle?.comentarios && this.solicitudDetalle.comentarios.length > 0;
  }

  tieneDocumentos(): boolean {
    return !!this.solicitudDetalle?.documentos && this.solicitudDetalle.documentos.length > 0;
  }
}