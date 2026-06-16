import { Component, OnInit, Injector } from '@angular/core'; 
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { BaseComponent } from 'src/app/shared/base/base.component';
import { ActivosService } from '../activos.service';
import { ActivosImportService } from '../activos-import.service';
import { LugaresTrabajoService } from '../../empleados/lugares-trabajo.service';
import { EmpleadoService } from '../../empleados/empleados.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-importar-activos',
  templateUrl: './importar-activos.component.html',
  styleUrls: ['./importar-activos.component.css']
})
export class ImportarActivosComponent extends BaseComponent implements OnInit {
  
  archivoSeleccionado: File | null = null;
  cargando: boolean = false;
  procesando: boolean = false;
  
  datosImportados: any[] = [];
  errores: any[] = [];
  activosAImportar: any[] = [];
  
  ubicacionesMap: Map<string, any> = new Map();
  usuariosMap: Map<string, string> = new Map();
  
  totalRegistros: number = 0;
  registrosValidos: number = 0;
  registrosConError: number = 0;
  
  pasoActual: number = 1;

  constructor(
    protected override messageService: MessageService,
    private router: Router,
    private activosService: ActivosService,
    private importService: ActivosImportService,
    private lugaresTrabajoSrv: LugaresTrabajoService,
    private empleadoService: EmpleadoService,
    private subalmacenesService: ActivosService,
    private injector: Injector 
  ) {
    super(messageService);
  }

  ngOnInit() {
    this.cargarDatosReferencia();
  }

  async cargarDatosReferencia() {
    try {
      const subalmacenes = await this.subalmacenesService.getSubalmacenes() || [];
      
      this.ubicacionesMap.clear();
      
      subalmacenes.forEach((s: any) => {
        this.ubicacionesMap.set(s.id, {
          id: s.id,
          nombre: s.nombre,
          lugarDeTrabajoId: s.lugarDeTrabajoId,
          lugarNombre: s.lugarDeTrabajoNombre || 'Sucursal',
          activo: s.activo
        });
      });

      const empleados = await this.empleadoService.getEmpleados().toPromise() || [];
      
      this.usuariosMap.clear();
      empleados.forEach(e => {
        const nombreCompleto = `${e.nombre} ${e.apellidoPaterno || ''} ${e.apellidoMaterno || ''}`.trim();
        this.usuariosMap.set(e.empleadoId, nombreCompleto);
      });

    } catch (error) {
      console.error('Error al cargar datos de referencia:', error);
      this.handleAlertType('ERROR', 'Error al cargar datos de referencia');
    }
  }

  onFileSelect(event: any) {
    const files = event.target.files;
    if (files && files.length > 0) {
      this.archivoSeleccionado = files[0];
      
      const extension = this.archivoSeleccionado!.name.split('.').pop()?.toLowerCase();
      const extensionesValidas = ['xlsx', 'xls', 'csv'];
      
      if (!extensionesValidas.includes(extension || '')) {
        this.handleAlertType('WARNING', 'Formato no válido', 
          'Por favor selecciona un archivo Excel (.xlsx, .xls) o CSV');
        this.archivoSeleccionado = null;
        event.target.value = '';
        return;
      }
      
      const maxSize = 10 * 1024 * 1024; 
      if (this.archivoSeleccionado!.size > maxSize) {
        this.handleAlertType('WARNING', 'Archivo demasiado grande', 
          'El tamaño máximo es 10MB');
        this.archivoSeleccionado = null;
        event.target.value = '';
      }
    }
  }

  async procesarArchivo() {
    if (!this.archivoSeleccionado) {
      this.handleAlertType('WARNING', 'Selecciona un archivo');
      return;
    }

    this.procesando = true;
    this.errores = [];
    this.datosImportados = [];

    try {
      const resultado = await this.importService.procesarExcel(this.archivoSeleccionado);
      
      if (resultado.errores.length > 0) {
        this.errores = resultado.errores.map(e => ({ error: e }));
        this.procesando = false;
        return;
      }

      if (!resultado.data || resultado.data.length === 0) {
        this.handleAlertType('WARNING', 'El archivo está vacío');
        this.procesando = false;
        return;
      }

      this.datosImportados = resultado.data;
      
      const datosMapeados = this.datosImportados.map((row: any, index: number) => {
        return {
          nombre: row['Id Activo'] ? `Activo ${row['Id Activo']}` : `Activo ${index + 1}`,
          tipoActivo: row['Categorìa'] || 'Equipo',
          marca: row['Marca'] || 'Genérica',
          modelo: row['Modelo'] || 'Estándar',
          descripcion: row['Observaciones'] || '',
          numeroSerie: row['Folio']?.toString() || '',
          ubicacionNombre: row['Sucursal donde se encuentra'] || 'CEDIS León',
          estadoTecnico: this.mapearEstado(row['Condiciones del Activo']),
          usuarioAsignadoNombre: row['Responsable'] || '',
          color: row['Color'] || '',
          procesador: row['Procesador'] || '',
          memoriaRam: row['Memoria RAAM'] || '',
          imei: row['IMEI'] || '',
          observaciones: row['Observaciones'] || ''
        };
      });
      
      this.datosImportados = datosMapeados;
      this.totalRegistros = this.datosImportados.length;
      
      this.activosAImportar = datosMapeados.filter(d => d.nombre && d.nombre.trim() !== '');
      this.registrosValidos = this.activosAImportar.length;
      
      this.errores = datosMapeados
        .filter((d, i) => !d.nombre || d.nombre.trim() === '')
        .map(d => ({
          fila: datosMapeados.indexOf(d) + 2,
          error: 'Fila sin nombre de activo',
          data: d
        }));
      
      this.registrosConError = this.errores.length;
      
      if (this.activosAImportar.length > 0) {
        this.pasoActual = 2;
        this.handleAlertType('SUCCESS', `✅ ${this.registrosValidos} registros válidos`);
      } else {
        this.handleAlertType('WARNING', '❌ No hay registros válidos');
      }

    } catch (error: any) {
      console.error('Error:', error);
      this.handleAlertType('ERROR', 'Error al procesar', error.message);
    } finally {
      this.procesando = false;
    }
  }


  mapearEstado(condicion: string): string {
    if (!condicion) return 'DISPONIBLE';
    
    condicion = condicion.toLowerCase();
    if (condicion.includes('buen estado')) return 'DISPONIBLE';
    if (condicion.includes('roto') || condicion.includes('dañado')) return 'BAJA_TECNICA';
    if (condicion.includes('medio uso')) return 'DISPONIBLE';
    return 'DISPONIBLE';
  }

  async importarActivos() {
    if (this.activosAImportar.length === 0) {
      this.handleAlertType('WARNING', 'No hay activos válidos para importar');
      return;
    }

    this.procesando = true;
    
    try {
      const resultados = {
        exitosos: 0,
        fallidos: 0,
        errores: [] as any[]
      };

      const usuarioMovimiento = {
        id: 'sistema',
        nombre: 'Importación Masiva'
      };

      for (let i = 0; i < this.activosAImportar.length; i++) {
        const activo = this.activosAImportar[i];
        
        try {
          await this.activosService.createActivo(activo, usuarioMovimiento);
          resultados.exitosos++;
        } catch (error: any) {
          console.error(`Error al importar activo ${i + 1}:`, error);
          resultados.fallidos++;
          resultados.errores.push({
            fila: i + 2,
            error: error.message || 'Error desconocido',
            data: activo
          });
        }
      }

      this.handleAlertType(
        resultados.fallidos === 0 ? 'SUCCESS' : 'WARNING',
        'Importación completada',
        `Se importaron ${resultados.exitosos} activos correctamente. ${resultados.fallidos} fallaron.`
      );

      if (resultados.errores.length > 0) {
        this.errores = resultados.errores;
      }

      this.pasoActual = 3;

    } catch (error: any) {
      console.error('Error durante la importación:', error);
      this.handleAlertType('ERROR', 'Error durante la importación', error.message);
    } finally {
      this.procesando = false;
    }
  }

  descargarErrores() {
    if (this.errores.length === 0) return;

    const worksheet = XLSX.utils.json_to_sheet(this.errores);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Errores');
    XLSX.writeFile(workbook, 'errores_importacion.xlsx');
  }

  resetearImportacion() {
    this.pasoActual = 1;
    this.archivoSeleccionado = null;
    this.datosImportados = [];
    this.errores = [];
    this.activosAImportar = [];
    this.totalRegistros = 0;
    this.registrosValidos = 0;
    this.registrosConError = 0;
    
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  volver() {
    this.router.navigate(['/admin/activos']);
  }
}