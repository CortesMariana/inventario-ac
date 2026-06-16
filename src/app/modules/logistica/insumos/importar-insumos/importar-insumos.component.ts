import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { BlockUIModule } from 'primeng/blockui';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import * as XLSX from 'xlsx';
import { firstValueFrom, catchError, of } from 'rxjs';

import { BaseComponent } from 'src/app/shared/base/base.component';
import { InsumosLogisticaService } from '../insumos-logistica.service';
import { UserService } from 'src/app/shared/service/user.service';

interface FilaInsumo {
  nombre: string;
  sku: string;
  familia: string;
  marca: string;
  precioUnitario: number;
  idERP: string;
  descripcion: string;
  notas: string;
  // validación
  _valido: boolean;
  _errores: string[];
}

@Component({
  selector: 'app-importar-insumos',
  standalone: true,
  imports: [CommonModule, ToastModule, BlockUIModule, ProgressSpinnerModule],
  templateUrl: './importar-insumos.component.html',
  styleUrl: './importar-insumos.component.scss',
  providers: [MessageService],
})
export class ImportarInsumosComponent extends BaseComponent implements OnInit {

  archivoSeleccionado: File | null = null;
  procesando = false;
  pasoActual = 1;

  filas: FilaInsumo[] = [];
  filasValidas: FilaInsumo[] = [];
  filasConError: FilaInsumo[] = [];

  totalRegistros = 0;
  registrosValidos = 0;
  registrosConError = 0;

  // resultado del paso 3
  importados = 0;
  fallidos = 0;
  erroresImport: { fila: number; nombre: string; error: string }[] = [];

  usuario: { id: string; nombre: string } = { id: 'sistema', nombre: 'Importación Masiva' };

  constructor(
    protected override messageService: MessageService,
    private router: Router,
    private insumosService: InsumosLogisticaService,
    private userSrv: UserService,
  ) {
    super(messageService);
  }

  async ngOnInit() {
    try {
      const emp = await firstValueFrom(this.userSrv.consultarEmpleado().pipe(catchError(() => of(null))));
      if (emp) {
        this.usuario = {
          id: emp.empleadoId || emp.id || 'sistema',
          nombre: `${emp.nombre || ''} ${emp.apellidoPaterno || ''}`.trim() || 'Sistema',
        };
      }
    } catch { /* no-op */ }
  }

  // ── Paso 1: selección de archivo ─────────────────────────────────────────

  onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.procesarFile(input.files[0]);
    input.value = '';
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLElement).classList.add('drag-over');
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    (event.currentTarget as HTMLElement).classList.remove('drag-over');
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLElement).classList.remove('drag-over');
    const file = event.dataTransfer?.files?.[0];
    if (file) this.procesarFile(file);
  }

  private procesarFile(file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext || '')) {
      this.handleAlertType('WARNING', 'Formato no válido. Usa .xlsx, .xls o .csv');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.handleAlertType('WARNING', 'El archivo supera el límite de 10 MB');
      return;
    }
    this.archivoSeleccionado = file;
  }

  async procesarArchivo() {
    if (!this.archivoSeleccionado) {
      this.handleAlertType('WARNING', 'Selecciona un archivo primero');
      return;
    }

    this.procesando = true;
    this.filas = [];
    this.filasValidas = [];
    this.filasConError = [];

    try {
      const buffer = await this.archivoSeleccionado.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

      if (!rows.length) {
        this.handleAlertType('WARNING', 'El archivo está vacío o no tiene datos');
        return;
      }

      this.filas = rows.map((row, i) => this.mapearFila(row, i + 2));
      this.filasValidas   = this.filas.filter(f => f._valido);
      this.filasConError  = this.filas.filter(f => !f._valido);
      this.totalRegistros = this.filas.length;
      this.registrosValidos    = this.filasValidas.length;
      this.registrosConError   = this.filasConError.length;

      if (this.filasValidas.length === 0) {
        this.handleAlertType('WARNING', 'No se encontraron registros válidos. Revisa el formato del archivo.');
        return;
      }

      this.pasoActual = 2;
    } catch (e: any) {
      this.handleAlertType('ERROR', 'Error al leer el archivo: ' + (e.message || ''));
    } finally {
      this.procesando = false;
    }
  }

  private mapearFila(row: any, numFila: number): FilaInsumo {
    const errores: string[] = [];

    const nombre = (row['Nombre'] || row['nombre'] || '').toString().trim();
    const precioRaw = row['Precio Unitario'] ?? row['precioUnitario'] ?? row['Precio'] ?? '';
    const precioUnitario = parseFloat(String(precioRaw).replace(/[^0-9.]/g, ''));

    if (!nombre) errores.push('Nombre requerido');
    if (isNaN(precioUnitario) || precioUnitario < 0) errores.push('Precio Unitario inválido (debe ser número ≥ 0)');

    return {
      nombre,
      sku:          (row['SKU'] || row['sku'] || '').toString().trim(),
      familia:      (row['Familia'] || row['familia'] || '').toString().trim(),
      marca:        (row['Marca'] || row['marca'] || '').toString().trim(),
      precioUnitario: isNaN(precioUnitario) ? 0 : precioUnitario,
      idERP:        (row['ID ERP'] || row['idERP'] || row['id_erp'] || '').toString().trim(),
      descripcion:  (row['Descripción'] || row['Descripcion'] || row['descripcion'] || '').toString().trim(),
      notas:        (row['Notas'] || row['notas'] || '').toString().trim(),
      _valido:      errores.length === 0,
      _errores:     errores,
    };
  }

  // ── Paso 2: importar ──────────────────────────────────────────────────────

  async importar() {
    if (!this.filasValidas.length) return;

    this.procesando = true;
    this.importados = 0;
    this.fallidos = 0;
    this.erroresImport = [];

    for (let i = 0; i < this.filasValidas.length; i++) {
      const fila = this.filasValidas[i];
      try {
        await this.insumosService.createInsumo({
          nombre:         fila.nombre,
          SKU:            fila.sku || undefined,
          familia:        fila.familia || undefined,
          marca:          fila.marca || undefined,
          precioUnitario: fila.precioUnitario,
          idERP:          fila.idERP || undefined,
          descripcion:    fila.descripcion || undefined,
          notas:          fila.notas || undefined,
          activo:         true,
        }, this.usuario);
        this.importados++;
      } catch (e: any) {
        this.fallidos++;
        this.erroresImport.push({ fila: i + 2, nombre: fila.nombre, error: e.message || 'Error desconocido' });
      }
    }

    this.pasoActual = 3;
    this.procesando = false;
  }

  // ── Utilidades ────────────────────────────────────────────────────────────

  descargarPlantilla() {
    const plantilla = [
      ['Nombre', 'SKU', 'Familia', 'Marca', 'Precio Unitario', 'ID ERP', 'Descripción', 'Notas'],
      ['Cinta de embalaje', 'CINTA-001', 'Empaque', 'Genérica', 15.50, 'ERP-001', 'Cinta café 48mm', ''],
      ['Guantes de látex (caja)', 'GUAN-100', 'Seguridad', '3M', 120.00, '', 'Caja de 100 piezas', 'Talla M'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(plantilla);
    ws['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 18 }, { wch: 12 }, { wch: 35 }, { wch: 25 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Insumos');
    XLSX.writeFile(wb, 'plantilla_insumos.xlsx');
  }

  descargarErrores() {
    const rows = [
      ['Fila', 'Nombre', 'Error'],
      ...this.erroresImport.map(e => [e.fila, e.nombre, e.error]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Errores');
    XLSX.writeFile(wb, 'errores_importacion_insumos.xlsx');
  }

  resetear() {
    this.pasoActual = 1;
    this.archivoSeleccionado = null;
    this.filas = [];
    this.filasValidas = [];
    this.filasConError = [];
    this.totalRegistros = 0;
    this.registrosValidos = 0;
    this.registrosConError = 0;
    this.importados = 0;
    this.fallidos = 0;
    this.erroresImport = [];
    const input = document.getElementById('fileInput') as HTMLInputElement;
    if (input) input.value = '';
  }

  volver() {
    this.router.navigate(['/logistica/insumos/insumos']);
  }
}
