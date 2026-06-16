import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Table } from 'primeng/table';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { BaseComponent } from 'src/app/shared/base/base.component';
import { SolicitudesAdminService, SolicitudAdminView } from '../solicitudes-admin.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-grid-solicitudes',
  templateUrl: './grid-solicitudes.component.html',
  styleUrls: ['./grid-solicitudes.component.css']
})
export class GridSolicitudesComponent extends BaseComponent implements OnInit, OnDestroy {
  @ViewChild('dt') table!: Table;
  
  solicitudes: SolicitudAdminView[] = [];
  solicitudesFiltradas: SolicitudAdminView[] = [];
  cargando: boolean = false;
  exportando: boolean = false;
  
  filtros = {
    busqueda: '',
    estatus: 'todos',
    tipoSolicitud: 'todos',
    prioridad: 'todos',
    departamento: 'todos',
    fechaDesde: null as Date | null,
    fechaHasta: null as Date | null
  };
  
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
  
  opcionesPrioridad: any[] = [
    { label: 'Todas', value: 'todos' },
    { label: 'Urgente', value: 'urgente' },
    { label: 'Alta', value: 'alta' },
    { label: 'Media', value: 'media' },
    { label: 'Baja', value: 'baja' }
  ];
  
  departamentos: string[] = [];
  
  columnasExportar: any[] = [
    { label: 'Folio', value: 'folio' },
    { label: 'Título', value: 'titulo' },
    { label: 'Tipo', value: 'tipoSolicitudLabel' },
    { label: 'Estatus', value: 'estatus' },
    { label: 'Prioridad', value: 'prioridad' },
    { label: 'Empleado', value: 'empleado.nombre' },
    { label: 'No. Empleado', value: 'empleado.numeroEmpleado' },
    { label: 'Departamento', value: 'empleado.departamento' },
    { label: 'Fecha Creación', value: 'fechasFormatted.creacion' },
    { label: 'Días', value: 'tiempoTranscurrido' }
  ];
  
  columnasSeleccionadas: any[] = this.columnasExportar;
  
  estadisticas = {
    total: 0,
    pendientes: 0,
    urgentes: 0,
    vencidas: 0
  };
  
  private searchSubject = new Subject<string>();

  constructor(
    protected override messageService: MessageService,
    private solicitudesAdminSrv: SolicitudesAdminService,
    private router: Router
  ) {
    super(messageService);
    
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(() => {
      this.aplicarFiltros();
    });
  }

  ngOnInit() {
    this.cargarSolicitudes();
  }

  ngOnDestroy() {
    this.searchSubject.complete();
  }

  async cargarSolicitudes() {
    this.cargando = true;
    try {
      this.solicitudes = await this.solicitudesAdminSrv.getSolicitudes();
      this.calcularEstadisticas();
      this.extraerDepartamentos();
      this.aplicarFiltros();
    } catch (error) {
      console.error('Error al cargar solicitudes:', error);
      this.handleAlertType('ERROR', 'Error al cargar las solicitudes');
    } finally {
      this.cargando = false;
    }
  }

  extraerDepartamentos() {
    const deptos = new Set(this.solicitudes.map(s => s.empleado.departamento));
    this.departamentos = Array.from(deptos).filter(d => d && d !== 'No especificado').sort();
  }

  calcularEstadisticas() {
    this.estadisticas = {
      total: this.solicitudes.length,
      pendientes: this.solicitudes.filter(s => ['Nueva', 'En revision'].includes(s.estatus)).length,
      urgentes: this.solicitudes.filter(s => s.prioridad === 'urgente').length,
      vencidas: this.solicitudes.filter(s => s.vencido).length
    };
  }

  onBusquedaChange(texto: string) {
    this.searchSubject.next(texto);
  }

  aplicarFiltros() {
    let filtradas = [...this.solicitudes];
    
    if (this.filtros.busqueda) {
      const busqueda = this.filtros.busqueda.toLowerCase();
      filtradas = filtradas.filter(s => 
        s.folio.toLowerCase().includes(busqueda) ||
        s.titulo.toLowerCase().includes(busqueda) ||
        s.empleado.nombre.toLowerCase().includes(busqueda) ||
        s.empleado.numeroEmpleado.toLowerCase().includes(busqueda)
      );
    }
    
    if (this.filtros.estatus !== 'todos') {
      filtradas = filtradas.filter(s => s.estatus === this.filtros.estatus);
    }
    
    if (this.filtros.tipoSolicitud !== 'todos') {
      filtradas = filtradas.filter(s => s.tipoSolicitud === this.filtros.tipoSolicitud);
    }
    
    if (this.filtros.prioridad !== 'todos') {
      filtradas = filtradas.filter(s => s.prioridad === this.filtros.prioridad);
    }
    
    if (this.filtros.departamento !== 'todos') {
      filtradas = filtradas.filter(s => s.empleado.departamento === this.filtros.departamento);
    }
    
    if (this.filtros.fechaDesde) {
      filtradas = filtradas.filter(s => s.fechas.creacion >= this.filtros.fechaDesde!);
    }
    if (this.filtros.fechaHasta) {
      const hasta = new Date(this.filtros.fechaHasta);
      hasta.setHours(23, 59, 59);
      filtradas = filtradas.filter(s => s.fechas.creacion <= hasta);
    }
    
    this.solicitudesFiltradas = filtradas;
  }

  limpiarFiltros() {
    this.filtros = {
      busqueda: '',
      estatus: 'todos',
      tipoSolicitud: 'todos',
      prioridad: 'todos',
      departamento: 'todos',
      fechaDesde: null,
      fechaHasta: null
    };
    this.aplicarFiltros();
  }

  verDetalle(solicitud: SolicitudAdminView) {
    this.router.navigate(['/rh/admin/solicitudes', solicitud.firestoreId]);
  }

  async exportarExcel() {
    this.exportando = true;
    try {
      const data = await this.solicitudesAdminSrv.exportarSolicitudes(this.filtros);
      
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Solicitudes');
      
      const fecha = new Date().toISOString().split('T')[0];
      XLSX.writeFile(workbook, `solicitudes_rh_${fecha}.xlsx`);
      
      this.handleAlertType('SUCCESS', 'Exportación completada');
    } catch (error) {
      console.error('Error al exportar:', error);
      this.handleAlertType('ERROR', 'Error al exportar datos');
    } finally {
      this.exportando = false;
    }
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

  getPrioridadIcon(prioridad: string): string {
    switch (prioridad) {
      case 'urgente': return 'pi pi-exclamation-triangle';
      case 'alta': return 'pi pi-arrow-up';
      case 'media': return 'pi pi-minus';
      case 'baja': return 'pi pi-arrow-down';
      default: return 'pi pi-circle';
    }
  }

  formatFecha(fecha: Date): string {
    return fecha.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  formatMonto(monto: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(monto);
  }
}