import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { MessageService } from 'primeng/api';
import { BaseComponent } from 'src/app/shared/base/base.component';
import { UserService } from 'src/app/shared/service/user.service';
import { SolicitudesAsignadasService } from '../solicitudes-asignadas/solicitudes-asignadas.service';
import { TiposSolicitudService } from '../../admin-rh/campos-solicitud/tipos-solicitud.service';
import { Chart } from 'chart.js';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-estadisticas-tecnico',
  templateUrl: './estadisticas-tecnico.component.html',
  styleUrls: ['./estadisticas-tecnico.component.css']
})
export class EstadisticasTecnicoComponent extends BaseComponent implements OnInit, OnDestroy {
  @ViewChild('estatusChart') estatusChartRef: any;
  @ViewChild('tiemposChart') tiemposChartRef: any;
  
  cargando: boolean = false;
  userId: string = '';
  userName: string = '';
  
  tiposSolicitud: any[] = [];
  
  stats: any = {
    total: 0,
    pendientes: 0,
    completadas: 0,
    urgentes: 0,
    porEstatus: {},
    porTipo: {},
    tiempos: {
      promedio: 0,
      minimo: 0,
      maximo: 0
    }
  };
  
  estatusChart: any;
  tiemposChart: any;
  
  solicitudesRecientes: any[] = [];
  
  private destroy$ = new Subject<void>();

  constructor(
    protected override messageService: MessageService,
    private userSrv: UserService,
    private solicitudesSrv: SolicitudesAsignadasService,
    private tiposSrv: TiposSolicitudService 
  ) {
    super(messageService);
  }

  ngOnInit() {
    this.cargando = true;
    this.obtenerUsuario();
  }

  ngOnDestroy() {
    if (this.estatusChart) {
      this.estatusChart.destroy();
    }
    if (this.tiemposChart) {
      this.tiemposChart.destroy();
    }
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
          this.cargarTiposSolicitud();
        },
        error: (error) => {
          console.error('Error al obtener usuario:', error);
          this.handleAlertType('ERROR', 'Error al obtener información del usuario');
          this.cargando = false;
        }
      });
  }

  async cargarTiposSolicitud() {
    try {
      this.tiposSolicitud = await this.tiposSrv.getTiposActivos();
      
      this.tiposSolicitud.forEach(tipo => {
        this.stats.porTipo[tipo.value] = 0;
      });
      
      await this.cargarEstadisticas();
      
    } catch (error) {
      console.error('Error al cargar tipos:', error);
      this.tiposSolicitud = this.tiposSrv.getTiposDefault();
      this.tiposSolicitud.forEach(tipo => {
        this.stats.porTipo[tipo.value] = 0;
      });
      await this.cargarEstadisticas();
    }
  }

async cargarEstadisticas() {
  try {
    const solicitudes = await this.solicitudesSrv.getSolicitudesAsignadas(this.userId);
    
    const porTipo: any = {};
    this.tiposSolicitud.forEach(tipo => {
      porTipo[tipo.value] = solicitudes.filter(s => s.tipoSolicitud === tipo.value).length;
    });
    
    this.stats = {
      total: solicitudes.length,
      pendientes: solicitudes.filter(s => ['Nueva', 'En revision'].includes(s.estatus)).length,
      completadas: solicitudes.filter(s => s.estatus === 'Completada').length,
      urgentes: solicitudes.filter(s => s.prioridad === 'urgente').length,
      
      porEstatus: {
        nuevas: solicitudes.filter(s => s.estatus === 'Nueva').length,
        revision: solicitudes.filter(s => s.estatus === 'En revision').length,
        aprobadas: solicitudes.filter(s => s.estatus === 'Aprobada').length,
        completadas: solicitudes.filter(s => s.estatus === 'Completada').length
      },
      
      porTipo: porTipo,
      
      tiempos: {
        promedio: 0,
        minimo: 0,
        maximo: 0
      }
    };
    
    const completadas = solicitudes.filter(s => s.estatus === 'Completada');
    if (completadas.length > 0) {
      const tiempos = completadas.map(s => s.diasTranscurridos);
      this.stats.tiempos = {
        promedio: Math.round(tiempos.reduce((a, b) => a + b, 0) / tiempos.length),
        minimo: Math.min(...tiempos),
        maximo: Math.max(...tiempos)
      };
    }
    
    this.solicitudesRecientes = solicitudes
      .sort((a, b) => b.fechas.creacion.getTime() - a.fechas.creacion.getTime())
      .slice(0, 5);
    
    setTimeout(() => {
      this.inicializarGraficos();
    }, 100);
    
  } catch (error) {
    console.error('Error al cargar estadísticas:', error);
    this.handleAlertType('ERROR', 'Error al cargar estadísticas');
  } finally {
    this.cargando = false;
  }
}

  inicializarGraficos() {
    const estatusCtx = this.estatusChartRef?.nativeElement.getContext('2d');
    if (estatusCtx) {
      if (this.estatusChart) this.estatusChart.destroy();
      
      this.estatusChart = new Chart(estatusCtx, {
        type: 'doughnut',
        data: {
          labels: ['Nuevas', 'En Revisión', 'Aprobadas', 'Completadas'],
          datasets: [{
            data: [
              this.stats.porEstatus.nuevas,
              this.stats.porEstatus.revision,
              this.stats.porEstatus.aprobadas,
              this.stats.porEstatus.completadas
            ],
            backgroundColor: ['#17a2b8', '#ffc107', '#28a745', '#6c757d'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom'
            }
          }
        }
      });
    }

    const tiemposCtx = this.tiemposChartRef?.nativeElement.getContext('2d');
    if (tiemposCtx && this.stats.tiempos.promedio > 0) {
      if (this.tiemposChart) this.tiemposChart.destroy();
      
      this.tiemposChart = new Chart(tiemposCtx, {
        type: 'bar',
        data: {
          labels: ['Mínimo', 'Promedio', 'Máximo'],
          datasets: [{
            label: 'Días de resolución',
            data: [
              this.stats.tiempos.minimo,
              this.stats.tiempos.promedio,
              this.stats.tiempos.maximo
            ],
            backgroundColor: ['#28a745', '#ffc107', '#dc3545']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                stepSize: 1
              }
            }
          }
        }
      });
    }
  }

  formatNumber(num: number): string {
    return new Intl.NumberFormat('es-MX').format(num);
  }

  getPorcentaje(valor: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((valor / total) * 100);
  }

  refrescar() {
    this.cargarTiposSolicitud();
  }

  getIconoTipo(tipoValue: string): string {
    const tipo = this.tiposSolicitud.find(t => t.value === tipoValue);
    return tipo?.icon || 'pi pi-file';
  }

  getColorTipo(tipoValue: string): string {
    const tipo = this.tiposSolicitud.find(t => t.value === tipoValue);
    return tipo?.color || '#a0aec0';
  }

  getLabelTipo(tipoValue: string): string {
    const tipo = this.tiposSolicitud.find(t => t.value === tipoValue);
    return tipo?.label || tipoValue;
  }

    ngAfterViewInit() {
    console.log('Stats después de view init:', this.stats);
    setTimeout(() => {
        if (this.stats.tiempos) {
        console.log('Tiempos:', this.stats.tiempos);
        } else {
        console.log('Tiempos es undefined');
        }
    }, 500);
    }
}