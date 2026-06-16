import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subject, takeUntil } from 'rxjs';
import { BaseComponent } from 'src/app/shared/base/base.component';
import { UserService } from 'src/app/shared/service/user.service';
import { SolicitudesAsignadasService, SolicitudTecnicoView } from '../solicitudes-asignadas.service';

@Component({
  selector: 'app-grid-solicitudes-asignadas',
  templateUrl: './grid-solicitudes-asignadas.component.html',
  styleUrls: ['./grid-solicitudes-asignadas.component.css']
})
export class GridSolicitudesAsignadasComponent extends BaseComponent implements OnInit, OnDestroy {
  solicitudes: SolicitudTecnicoView[] = [];
  solicitudesFiltradas: SolicitudTecnicoView[] = [];
  cargando: boolean = false;
  
  userId: string = '';
  userName: string = '';
  
  filtros = {
    estatus: 'todos',
    tipo: 'todos',
    busqueda: ''
  };
  
  opcionesEstatus: any[] = [
    { label: 'Todas', value: 'todos' },
    { label: 'Nueva', value: 'Nueva' },
    { label: 'En revisión', value: 'En revision' },
    { label: 'Aprobada', value: 'Aprobada' },
    { label: 'Completada', value: 'Completada' }
  ];
  
  opcionesTipo: any[] = [
    { label: 'Todos', value: 'todos' },
    { label: 'Vacaciones', value: 'vacaciones' },
    { label: 'Permiso', value: 'permiso' },
    { label: 'Préstamo', value: 'prestamo' },
    { label: 'Constancia', value: 'constancia' }
  ];
  
  estadisticas = {
    total: 0,
    pendientes: 0,
    urgentes: 0,
    completadas: 0
  };
  
  private destroy$ = new Subject<void>();

  constructor(
    protected override messageService: MessageService,
    private userSrv: UserService,
    private solicitudesSrv: SolicitudesAsignadasService,
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
          this.userName = empleado.nombreCompleto || empleado.nombre || 'Técnico';
          this.cargarSolicitudes();
        },
        error: (error) => {
          console.error('Error al obtener usuario:', error);
          this.handleAlertType('ERROR', 'Error al obtener información del usuario');
          this.cargando = false;
        }
      });
  }

  async cargarSolicitudes() {
    try {
      this.solicitudes = await this.solicitudesSrv.getSolicitudesAsignadas(this.userId);
      this.calcularEstadisticas();
      this.aplicarFiltros();
    } catch (error) {
      console.error('Error al cargar solicitudes:', error);
      this.handleAlertType('ERROR', 'Error al cargar las solicitudes');
    } finally {
      this.cargando = false;
    }
  }

  calcularEstadisticas() {
    this.estadisticas = {
      total: this.solicitudes.length,
      pendientes: this.solicitudes.filter(s => ['Nueva', 'En revision'].includes(s.estatus)).length,
      urgentes: this.solicitudes.filter(s => s.prioridad === 'urgente').length,
      completadas: this.solicitudes.filter(s => s.estatus === 'Completada').length
    };
  }

  aplicarFiltros() {
    let filtradas = [...this.solicitudes];
    
    if (this.filtros.estatus !== 'todos') {
      filtradas = filtradas.filter(s => s.estatus === this.filtros.estatus);
    }
    
    if (this.filtros.tipo !== 'todos') {
      filtradas = filtradas.filter(s => s.tipoSolicitud === this.filtros.tipo);
    }
    
    if (this.filtros.busqueda) {
      const busqueda = this.filtros.busqueda.toLowerCase();
      filtradas = filtradas.filter(s => 
        s.folio.toLowerCase().includes(busqueda) ||
        s.titulo.toLowerCase().includes(busqueda) ||
        s.empleado.nombre.toLowerCase().includes(busqueda)
      );
    }
    
    this.solicitudesFiltradas = filtradas;
  }

  limpiarFiltros() {
    this.filtros = {
      estatus: 'todos',
      tipo: 'todos',
      busqueda: ''
    };
    this.aplicarFiltros();
  }

  verDetalle(solicitud: SolicitudTecnicoView) {
    this.router.navigate(['/rh/tecnico/solicitudes', solicitud.firestoreId]);
  }

  getEstatusClass(estatus: string): string {
    const classes: Record<string, string> = {
      'Nueva': 'estatus-nueva',
      'En revision': 'estatus-revision',
      'Aprobada': 'estatus-aprobada',
      'Completada': 'estatus-completada'
    };
    return classes[estatus] || '';
  }

  getPrioridadIcon(prioridad: string): string {
    switch (prioridad) {
      case 'urgente': return 'pi pi-exclamation-triangle';
      case 'alta': return 'pi pi-arrow-up';
      case 'media': return 'pi pi-minus';
      case 'baja': return 'pi pi-arrow-down';
      default: return 'pi pi-circle';
    }
  }

  refrescar() {
    this.cargarSolicitudes();
  }
}