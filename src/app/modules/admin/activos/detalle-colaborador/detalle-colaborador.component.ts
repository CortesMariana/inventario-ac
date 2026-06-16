import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { BaseComponent } from 'src/app/shared/base/base.component';
import { ColaboradoresActivosService } from '../colaboradores-activos.service';
import { ColaboradorActivo, ActivoAsignado } from '../models/colaborador-activo.model';
import * as XLSX from 'xlsx-js-style';
import * as FileSaver from 'file-saver';

@Component({
  selector: 'app-detalle-colaborador',
  templateUrl: './detalle-colaborador.component.html',
  styleUrls: ['./detalle-colaborador.component.css']
})
export class DetalleColaboradorComponent extends BaseComponent implements OnInit {
  colaborador: ColaboradorActivo | null = null;
  cargando: boolean = false;
  empleadoId: string = '';

  activosFiltrados: ActivoAsignado[] = [];
  filtroBusqueda: string = '';
  filtroTipo: string = 'todos';
  filtroCategoria: string = 'todos';
  
  opcionesTipo: any[] = [];
  opcionesCategoria: any[] = [];

  estadisticas: any = {
    porTipo: {},
    porCategoria: {},
    antiguedadPromedio: 0
  };

  vistaActivos: 'grid' | 'lista' = 'lista';

  constructor(
    protected override messageService: MessageService,
    private route: ActivatedRoute,
    private router: Router,
    private colaboradoresService: ColaboradoresActivosService
  ) {
    super(messageService);
  }

  ngOnInit() {
    this.empleadoId = this.route.snapshot.paramMap.get('empleadoId') || '';
    if (this.empleadoId) {
      this.cargarColaborador();
    } else {
      this.handleAlertType('ERROR', 'ID de colaborador no válido');
      this.volver();
    }
  }

  async cargarColaborador() {
    this.cargando = true;
    try {
      this.colaborador = await this.colaboradoresService.getColaboradorPorId(this.empleadoId);
      
      if (!this.colaborador) {
        this.handleAlertType('WARNING', 'No se encontró el colaborador o no tiene activos asignados');
        this.volver();
        return;
      }

      this.activosFiltrados = [...this.colaborador.activosAsignados];
      this.cargarOpcionesFiltros();
      this.calcularEstadisticas();
      
    } catch (error) {
      console.error('Error al cargar colaborador:', error);
      this.handleAlertType('ERROR', 'Error al cargar los datos del colaborador');
    } finally {
      this.cargando = false;
    }
  }

  cargarOpcionesFiltros() {
    if (!this.colaborador) return;

    const tipos = [...new Set(this.colaborador.activosAsignados.map(a => a.tipoActivo))];
    this.opcionesTipo = [
      { label: 'Todos los tipos', value: 'todos' },
      ...tipos.map(t => ({ label: t, value: t }))
    ];

    const categorias = [...new Set(this.colaborador.activosAsignados.map(a => a.categoriaNombre))];
    this.opcionesCategoria = [
      { label: 'Todas las categorías', value: 'todos' },
      ...categorias.map(c => ({ label: c, value: c }))
    ];
  }

  calcularEstadisticas() {
    if (!this.colaborador) return;

    const porTipo: any = {};
    this.colaborador.activosAsignados.forEach(a => {
      porTipo[a.tipoActivo] = (porTipo[a.tipoActivo] || 0) + 1;
    });
    this.estadisticas.porTipo = porTipo;

    const porCategoria: any = {};
    this.colaborador.activosAsignados.forEach(a => {
      porCategoria[a.categoriaNombre] = (porCategoria[a.categoriaNombre] || 0) + 1;
    });
    this.estadisticas.porCategoria = porCategoria;

    if (this.colaborador.activosAsignados.length > 0) {
      const ahora = new Date();
      const diasTotales = this.colaborador.activosAsignados.reduce((sum, a) => {
        const diff = ahora.getTime() - a.fechaAsignacion.getTime();
        const dias = diff / (1000 * 60 * 60 * 24);
        return sum + dias;
      }, 0);
      this.estadisticas.antiguedadPromedio = Math.round(diasTotales / this.colaborador.activosAsignados.length);
    }
  }

  aplicarFiltros() {
    if (!this.colaborador) return;

    let filtrados = [...this.colaborador.activosAsignados];

    if (this.filtroBusqueda.trim()) {
      const busqueda = this.filtroBusqueda.toLowerCase();
      filtrados = filtrados.filter(a => 
        a.nombre.toLowerCase().includes(busqueda) ||
        a.marca.toLowerCase().includes(busqueda) ||
        a.modelo.toLowerCase().includes(busqueda) ||
        a.numeroSerie.toLowerCase().includes(busqueda) ||
        a.activoFijo.toLowerCase().includes(busqueda)
      );
    }

    if (this.filtroTipo !== 'todos') {
      filtrados = filtrados.filter(a => a.tipoActivo === this.filtroTipo);
    }

    if (this.filtroCategoria !== 'todos') {
      filtrados = filtrados.filter(a => a.categoriaNombre === this.filtroCategoria);
    }

    this.activosFiltrados = filtrados;
  }

  limpiarFiltros() {
    this.filtroBusqueda = '';
    this.filtroTipo = 'todos';
    this.filtroCategoria = 'todos';
    this.aplicarFiltros();
  }

  verDetalleActivo(activo: ActivoAsignado, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.router.navigate(['/admin/activos/detalle', activo.firestoreId]);
  }

  volver() {
    this.router.navigate(['/admin/activos/colaboradores']);
  }

  getInitials(nombre: string): string {
    return nombre
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  getColorPorEmpresa(empresa: string): string {
    const colores = [
      '#667eea', '#4CAF50', '#FF9800', '#9C27B0', '#F44336', '#00BCD4'
    ];
    let hash = 0;
    for (let i = 0; i < empresa.length; i++) {
      hash = empresa.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colores[Math.abs(hash) % colores.length];
  }

  getEstadoClass(estado: string): string {
    switch (estado) {
      case 'DISPONIBLE': return 'estado-disponible';
      case 'ASIGNADO': return 'estado-asignado';
      case 'EN_REPARACION': return 'estado-reparacion';
      default: return 'estado-default';
    }
  }

  getTipoIcon(tipo: string): string {
    const iconos: any = {
      'Tablet': 'pi pi-tablet',
      'Laptop': 'pi pi-laptop',
      'Desktop': 'pi pi-desktop',
      'Impresora': 'pi pi-print',
      'Monitor': 'pi pi-desktop',
      'Celular': 'pi pi-mobile',
      'Accesorio': 'pi pi-box'
    };
    return iconos[tipo] || 'pi pi-box';
  }

  formatFecha(fecha: Date | null | undefined): string {
    if (!fecha) return 'N/A';
    try {
      const date = fecha instanceof Date ? fecha : new Date(fecha);
      if (isNaN(date.getTime())) return 'Fecha inválida';
      
      return date.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return 'Fecha inválida';
    }
  }

  formatFechaDetalle(fecha: Date | null | undefined): string {
    if (!fecha) return 'No disponible';
    try {
      const date = fecha instanceof Date ? fecha : new Date(fecha);
      if (isNaN(date.getTime())) return 'Fecha inválida';
      
      return date.toLocaleDateString('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Fecha inválida';
    }
  }

  getCantidadTipos(): number {
    return Object.keys(this.estadisticas.porTipo).length;
    }

  getCantidadCategorias(): number {
    return Object.keys(this.estadisticas.porCategoria).length;
  }

  exportarExcel() {
    if (!this.colaborador || this.activosFiltrados.length === 0) {
      this.handleAlertType('WARNING', 'No hay activos para exportar');
      return;
    }

    const data = this.activosFiltrados.map((activo, index) => ({
      '#': index + 1,
      'Colaborador': this.colaborador?.nombreCompleto,
      'Puesto': this.colaborador?.puesto,
      'Ubicación': this.colaborador?.lugarTrabajo,
      'Activo': activo.nombre,
      'Tipo': activo.tipoActivo,
      'Marca': activo.marca,
      'Modelo': activo.modelo,
      'Número de Serie': activo.numeroSerie,
      'Activo Fijo': activo.activoFijo,
      'Categoría': activo.categoriaNombre,
      'Estado': activo.estadoTecnico,
      'Ubicación del Activo': activo.ubicacionNombre,
      'Fecha Asignación': this.formatFecha(activo.fechaAsignacion)
    }));

    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);

    /* Ajustar ancho automático de columnas */
    const columnas = Object.keys(data[0]).map(key => {
      const maxLength = Math.max(
        key.length,
        ...data.map(row => (row[key as keyof typeof row] || '').toString().length)
      );

      return {
        wch: maxLength + 5
      };
    });

    worksheet['!cols'] = columnas;

    /* Wrap text y altura automática */
    const range = XLSX.utils.decode_range(worksheet['!ref'] || '');

    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {

        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });

        if (!worksheet[cellAddress]) continue;

        worksheet[cellAddress].s = {
          alignment: {
            wrapText: true,
            vertical: 'top'
          }
        };
      }
    }

    /* Altura dinámica de filas */
    worksheet['!rows'] = data.map(row => {
      const maxLines = Math.max(
        ...Object.values(row).map(value => {
          const text = value ? value.toString() : '';
          return Math.ceil(text.length / 40);
        })
      );

      return {
        hpt: Math.max(25, maxLines * 18)
      };
    });

    const workbook: XLSX.WorkBook = {
      Sheets: {
        'Activos': worksheet
      },
      SheetNames: ['Activos']
    };

    const excelBuffer: any = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });

    this.guardarExcel(excelBuffer);
  }

  guardarExcel(buffer: any): void {
    const data: Blob = new Blob(
      [buffer],
      {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8'
      }
    );

    const nombreArchivo = `Activos_${this.colaborador?.nombreCompleto.replace(/\s+/g, '_')}_${new Date().getTime()}.xlsx`;

    FileSaver.saveAs(data, nombreArchivo);
  }
}