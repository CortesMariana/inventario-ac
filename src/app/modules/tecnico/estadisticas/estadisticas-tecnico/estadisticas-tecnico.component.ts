import { Component, OnInit, OnDestroy } from '@angular/core';
import { MessageService } from 'primeng/api';
import { BaseComponent } from 'src/app/shared/base/base.component';
import { UserService } from 'src/app/shared/service/user.service';
import { EstadisticasService } from '../estadisticas.service';
import { catchError, takeUntil } from 'rxjs/operators';
import { Subject, of } from 'rxjs';

@Component({
  selector: 'app-estadisticas-tecnico',
  templateUrl: './estadisticas-tecnico.component.html',
  styleUrls: ['./estadisticas-tecnico.component.css']
})
export class EstadisticasTecnicoComponent extends BaseComponent implements OnInit, OnDestroy {
  usuario: any;

  estadisticas: any = null;
  cargando: boolean = false;

  optionsBar: any;
  optionsPie: any;
  optionsLine: any;
  optionsHistogram: any;

  tendenciaData: any;
  distribucionEstatusData: any;
  distribucionPrioridadData: any;
  tasaResolucionData: any;
  histogramaData: any;

  periodo: string = 'mes';
  mostrarDetalles: boolean = false;

  private destroy$ = new Subject<void>();

  constructor(
    protected override messageService: MessageService,
    private userSrv: UserService,
    private estadisticasService: EstadisticasService
  ) {
    super(messageService);
  }

  ngOnInit() {
    this.cargando = true;
    
    this.configurarGraficos();
    
    this.cargarDatos();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  configurarGraficos() {
    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-color') || '#495057';
    const textColorSecondary = getComputedStyle(document.documentElement).getPropertyValue('--text-color-secondary') || '#6c757d';
    const surfaceBorder = getComputedStyle(document.documentElement).getPropertyValue('--surface-border') || '#dee2e6';

    this.optionsBar = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: textColor
          }
        },
        tooltip: {
          callbacks: {
            label: function(context: any) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                label += context.parsed.y + ' tickets';
              }
              return label;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: textColorSecondary
          },
          grid: {
            color: surfaceBorder
          }
        },
        y: {
          ticks: {
            color: textColorSecondary,
            stepSize: 1
          },
          grid: {
            color: surfaceBorder
          },
          beginAtZero: true
        }
      }
    };

    this.optionsPie = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: textColor,
            usePointStyle: true,
            padding: 20
          }
        },
        tooltip: {
          callbacks: {
            label: function(context: any) {
              const label = context.label || '';
              const value = context.raw || 0;
              const dataset = context.dataset;
              const percentage = dataset.percentage ? dataset.percentage[context.dataIndex] : '0';
              return `${label}: ${value} (${percentage}%)`;
            }
          }
        }
      }
    };

    this.optionsLine = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: textColor
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: textColorSecondary
          },
          grid: {
            color: surfaceBorder
          }
        },
        y: {
          ticks: {
            color: textColorSecondary,
            callback: function(value: any) {
              return value + '%';
            }
          },
          grid: {
            color: surfaceBorder
          },
          min: 0,
          max: 100
        }
      }
    };

    this.optionsHistogram = {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y' as const,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        x: {
          ticks: {
            color: textColorSecondary,
            callback: function(value: any) {
              return value + '%';
            }
          },
          grid: {
            color: surfaceBorder
          },
          min: 0,
          max: 100
        },
        y: {
          ticks: {
            color: textColorSecondary
          },
          grid: {
            color: surfaceBorder,
            display: false
          }
        }
      }
    };
  }

  async cargarDatos() {
    try {
      this.userSrv.consultarEmpleado().pipe(
        catchError((error) => {
          console.error('Error al obtener usuario:', error);
          this.handleAlertType('ERROR', 'No se pudo obtener información del usuario');
          return of(null);
        }),
        takeUntil(this.destroy$)
      ).subscribe(async (usuario: any) => {
        this.usuario = usuario;

        if (!this.usuario || !this.usuario.id) {
          this.handleAlertType('ERROR', 'No se pudo obtener información del usuario');
          this.cargando = false;
          return;
        }

        try {
          this.estadisticas = await this.estadisticasService.getEstadisticasDetalladas(this.usuario.id);
          
          this.prepararDatosGraficos();
          
          this.cargando = false;
        } catch (error) {
          console.error('Error al cargar estadísticas:', error);
          this.handleAlertType('ERROR', 'Error al cargar las estadísticas');
          this.cargando = false;
        }
      });

    } catch (error) {
      console.error('Error en cargarDatos:', error);
      this.handleAlertType('ERROR', 'Error al cargar los datos');
      this.cargando = false;
    }
  }

  prepararDatosGraficos() {
    if (this.estadisticas?.tendenciaMensual) {
      this.tendenciaData = {
        labels: this.estadisticas.tendenciaMensual.map((item: any) => item.mes),
        datasets: [
          {
            label: 'Tickets Creados',
            data: this.estadisticas.tendenciaMensual.map((item: any) => item.creados),
            backgroundColor: '#667eea',
            borderColor: '#667eea'
          },
          {
            label: 'Tickets Resueltos',
            data: this.estadisticas.tendenciaMensual.map((item: any) => item.resueltos),
            backgroundColor: '#4CAF50',
            borderColor: '#4CAF50'
          }
        ]
      };
    }

    if (this.estadisticas?.distribucionEstatus) {
      this.distribucionEstatusData = {
        labels: this.estadisticas.distribucionEstatus.map((item: any) => item.estatus),
        datasets: [{
          data: this.estadisticas.distribucionEstatus.map((item: any) => item.cantidad),
          backgroundColor: this.estadisticas.distribucionEstatus.map((item: any) => item.color),
          percentage: this.estadisticas.distribucionEstatus.map((item: any) => item.porcentaje?.toFixed(1) || '0')
        }]
      };
    }

    if (this.estadisticas?.distribucionPrioridad) {
      this.distribucionPrioridadData = {
        labels: this.estadisticas.distribucionPrioridad.map((item: any) => item.prioridad),
        datasets: [{
          data: this.estadisticas.distribucionPrioridad.map((item: any) => item.cantidad),
          backgroundColor: this.estadisticas.distribucionPrioridad.map((item: any) => item.color),
          percentage: this.estadisticas.distribucionPrioridad.map((item: any) => item.porcentaje?.toFixed(1) || '0')
        }]
      };
    }

    if (this.estadisticas?.tendenciaMensual) {
      this.tasaResolucionData = {
        labels: this.estadisticas.tendenciaMensual.map((item: any) => item.mes),
        datasets: [{
          label: 'Tasa de Resolución',
          data: this.estadisticas.tendenciaMensual.map((item: any) => item.tasaResolucion || 0),
          fill: true,
          borderColor: '#9C27B0',
          backgroundColor: 'rgba(156, 39, 176, 0.1)',
          tension: 0.4
        }]
      };
    }

    if (this.estadisticas?.histogramaTiempos) {
      this.histogramaData = {
        labels: this.estadisticas.histogramaTiempos.map((item: any) => item.rango),
        datasets: [{
          data: this.estadisticas.histogramaTiempos.map((item: any) => item.porcentaje || 0),
          backgroundColor: '#2196F3',
          borderColor: '#2196F3',
          borderWidth: 1
        }]
      };
    }
  }

  formatTiempo(tiempoHoras: number): string {
    if (!tiempoHoras || tiempoHoras < 0) return '0 min';
    
    if (tiempoHoras < 1) {
      const minutos = Math.round(tiempoHoras * 60);
      return `${minutos} min`;
    } else if (tiempoHoras < 24) {
      return `${tiempoHoras.toFixed(1)} hrs`;
    } else {
      const dias = (tiempoHoras / 24).toFixed(1);
      return `${dias} días`;
    }
  }

  getNivelProductividad(productividad: number): string {
    if (!productividad) return 'Sin datos';
    if (productividad >= 80) return 'Excelente';
    if (productividad >= 60) return 'Buena';
    if (productividad >= 40) return 'Regular';
    return 'Necesita mejora';
  }

  getColorProductividad(productividad: number): string {
    if (!productividad) return '#757575';
    if (productividad >= 80) return '#4CAF50';
    if (productividad >= 60) return '#FFC107';
    if (productividad >= 40) return '#FF9800';
    return '#F44336';
  }

  cambiarPeriodo(periodo: string) {
    this.periodo = periodo;
    this.cargando = true;
    setTimeout(() => {
      this.cargando = false;
    }, 500);
  }

  toggleDetalles() {
    this.mostrarDetalles = !this.mostrarDetalles;
  }

  refrescar() {
    this.cargando = true;
    this.cargarDatos();
  }

  getEmojiNivel(nivel: string): string {
    switch (nivel) {
      case 'Excelente': return '🏆';
      case 'Buena': return '👍';
      case 'Regular': return '😐';
      case 'Necesita mejora': return '📈';
      default: return '📊';
    }
  }

  getColorPrioridad(prioridad: string): string {
    if (!prioridad) return '#607D8B';
    
    switch (prioridad.toLowerCase()) {
      case 'critica': return '#F44336';
      case 'alta': return '#FF9800';
      case 'mediana': return '#FFC107';
      case 'baja': return '#4CAF50';
      default: return '#607D8B';
    }
  }
}