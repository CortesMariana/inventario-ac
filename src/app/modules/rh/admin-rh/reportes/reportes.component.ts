import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { MessageService } from 'primeng/api';
import { BaseComponent } from 'src/app/shared/base/base.component';
import { SolicitudesAdminService } from '../solicitudes/solicitudes-admin.service';
import { Chart } from 'chart.js';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-reportes',
  templateUrl: './reportes.component.html',
  styleUrls: ['./reportes.component.css']
})
export class ReportesComponent extends BaseComponent implements OnInit, OnDestroy {
  @ViewChild('estatusChart') estatusChartRef: any;
  @ViewChild('tendenciaChart') tendenciaChartRef: any;
  
  cargando: boolean = false;
  exportando: boolean = false;
  
  fechaInicio: Date = new Date(new Date().getFullYear(), new Date().getMonth() - 6, 1);
  fechaFin: Date = new Date();
  
  estatusChart: any;
  tendenciaChart: any;
  
  stats: any = {
    total: 0,
    porEstatus: {},
    porTipo: {},
    porPrioridad: {},
    vencidas: 0,
    tiempoPromedio: 0,
    solicitudesEsteMes: 0,
    tendencia: []
  };
  
  datosReporte: any[] = [];
  datosFiltrados: any[] = [];

  constructor(
    protected override messageService: MessageService,
    private solicitudesAdminSrv: SolicitudesAdminService
  ) {
    super(messageService);
  }

  ngOnInit() {
    this.cargarDatos();
  }

  ngOnDestroy() {
    if (this.estatusChart) {
      this.estatusChart.destroy();
    }
    if (this.tendenciaChart) {
      this.tendenciaChart.destroy();
    }
  }

  async cargarDatos() {
    this.cargando = true;
    try {
      this.stats = await this.solicitudesAdminSrv.getEstadisticas();
      
      const solicitudes = await this.solicitudesAdminSrv.getSolicitudes({
        fechaDesde: this.fechaInicio,
        fechaHasta: this.fechaFin
      });
      
      this.datosReporte = solicitudes;
      this.datosFiltrados = solicitudes;
      
      this.inicializarGraficos();
      
    } catch (error) {
      console.error('Error al cargar reportes:', error);
      this.handleAlertType('ERROR', 'Error al cargar los reportes');
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
          labels: ['Nuevas', 'En Revisión', 'Aprobadas', 'Rechazadas', 'Completadas', 'Canceladas'],
          datasets: [{
            data: [
              this.stats.porEstatus?.nuevas || 0,
              this.stats.porEstatus?.revision || 0,
              this.stats.porEstatus?.aprobadas || 0,
              this.stats.porEstatus?.rechazadas || 0,
              this.stats.porEstatus?.completadas || 0,
              this.stats.porEstatus?.canceladas || 0
            ],
            backgroundColor: [
              '#17a2b8',
              '#ffc107',
              '#28a745',
              '#dc3545',
              '#6c757d',
              '#6c757d'
            ],
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

    const tendenciaCtx = this.tendenciaChartRef?.nativeElement.getContext('2d');
    if (tendenciaCtx && this.stats.tendencia) {
      if (this.tendenciaChart) this.tendenciaChart.destroy();
      
      this.tendenciaChart = new Chart(tendenciaCtx, {
        type: 'line',
        data: {
          labels: this.stats.tendencia.map((t: any) => t.mes),
          datasets: [
            {
              label: 'Total Solicitudes',
              data: this.stats.tendencia.map((t: any) => t.total),
              borderColor: '#0d9488',
              backgroundColor: 'rgba(13, 148, 136, 0.1)',
              tension: 0.4,
              fill: true
            },
            {
              label: 'Aprobadas',
              data: this.stats.tendencia.map((t: any) => t.aprobadas),
              borderColor: '#28a745',
              tension: 0.4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom'
            }
          },
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

  aplicarFiltros() {
    let filtrados = this.datosReporte.filter(s => {
      const fechaS = new Date(s.fechas.creacion);
      return fechaS >= this.fechaInicio && fechaS <= this.fechaFin;
    });
    
    this.datosFiltrados = filtrados;
    
    this.actualizarKPIsFiltrados();
  }

  actualizarKPIsFiltrados() {
  }

  async exportarReporte() {
    this.exportando = true;
    try {
      const data = this.datosFiltrados.map(s => ({
        Folio: s.folio,
        Título: s.titulo,
        Tipo: s.tipoSolicitudLabel,
        Estatus: s.estatus,
        Prioridad: s.prioridad,
        Empleado: s.empleado.nombre,
        'No. Empleado': s.empleado.numeroEmpleado,
        Departamento: s.empleado.departamento,
        'Fecha Creación': s.fechasFormatted.creacion,
        'Días Transcurridos': s.tiempoTranscurrido
      }));
      
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte');
      
      const fecha = new Date().toISOString().split('T')[0];
      XLSX.writeFile(workbook, `reporte_rh_${fecha}.xlsx`);
      
      this.handleAlertType('SUCCESS', 'Reporte exportado correctamente');
    } catch (error) {
      console.error('Error al exportar:', error);
      this.handleAlertType('ERROR', 'Error al exportar reporte');
    } finally {
      this.exportando = false;
    }
  }

  formatNumber(num: number): string {
    return new Intl.NumberFormat('es-MX').format(num);
  }

  getTiempoPromedioText(dias: number): string {
    if (dias === 0) return 'N/A';
    if (dias === 1) return '1 día';
    if (dias < 7) return `${dias} días`;
    if (dias < 30) return `${Math.floor(dias / 7)} semanas`;
    return `${Math.floor(dias / 30)} meses`;
  }
}