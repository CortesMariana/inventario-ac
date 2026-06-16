import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { EstadoTecnico } from './models/activo.model';

@Injectable({
  providedIn: 'root'
})
export class ActivosImportService {
  constructor() { }

  async procesarExcel(file: File): Promise<{ data: any[], errores: string[] }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      const errores: string[] = [];

      reader.onload = (e: any) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { 
            type: 'array',
            raw: true, 
            cellDates: true 
          });
          
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            defval: '',
            blankrows: false 
          });
          
          if (jsonData.length < 2) {
            errores.push('El archivo no contiene datos suficientes');
            resolve({ data: [], errores });
            return;
          }

          const headers = jsonData[0] as string[];
          
          const datos: any[] = [];
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i] as any[];
            
            if (!row || row.every(cell => !cell)) continue;
            
            const rowData: any = {};
            headers.forEach((header, index) => {
              if (header && header.trim()) { 
                rowData[header] = row[index] || '';
              }
            });
            
            datos.push(rowData);
          }
          resolve({ data: datos, errores });
        } catch (error) {
          console.error('Error al procesar Excel:', error);
          errores.push('Error al procesar el archivo Excel: ' + error);
          resolve({ data: [], errores });
        }
      };

      reader.onerror = (error) => {
        console.error('Error al leer archivo:', error);
        errores.push('Error al leer el archivo');
        reject({ data: [], errores });
      };

      reader.readAsArrayBuffer(file);
    });
  }

  transformarADatosActivo(
    excelData: any[], 
    ubicacionesMap: Map<string, any>,
    usuariosMap: Map<string, string>
  ): { activos: any[], errores: any[] } {

    const activos: any[] = [];
    const errores: any[] = [];

    excelData.forEach((row, index) => {
      try {
        const filaNumero = index + 2;
        
        if (!row['nombre']) {
          throw new Error('Campo "nombre" requerido');
        }
        
        const activo: any = {
          nombre: row['nombre'] || '',
          tipoActivo: row['tipoActivo'] || 'Equipo',
          marca: row['marca'] || 'Genérica',
          modelo: row['modelo'] || 'Estándar',
          estadoTecnico: 'DISPONIBLE',
          ubicacionId: '',
          ubicacionNombre: row['ubicacionNombre'] || ''
        };
        
        activos.push(activo);
        
      } catch (error: any) {
        errores.push({
          fila: index + 2,
          error: error.message,
          data: row
        });
      }
    });
    
    console.log('Errores:', errores);
    
    return { activos, errores };
  }

  private validarEstadoTecnico(estado: string): { valido: boolean; estado?: EstadoTecnico; valoresPermitidos: string } {
    const estadosValidos = ['DISPONIBLE', 'ASIGNADO', 'EN_REPARACION', 'FUERA_DE_SERVICIO', 'BAJA_TECNICA'];
    
    if (!estado) {
      return { 
        valido: true, 
        estado: 'DISPONIBLE',
        valoresPermitidos: estadosValidos.join(', ')
      };
    }

    const estadoUpper = String(estado).toUpperCase().trim();
    
    const mapaEstados: { [key: string]: EstadoTecnico } = {
      'DISPONIBLE': 'DISPONIBLE',
      'AVAILABLE': 'DISPONIBLE',
      'ASIGNADO': 'ASIGNADO',
      'ASSIGNED': 'ASIGNADO',
      'EN REPARACION': 'EN_REPARACION',
      'ENREPARACION': 'EN_REPARACION',
      'REPARACION': 'EN_REPARACION',
      'REPAIR': 'EN_REPARACION',
      'FUERA DE SERVICIO': 'FUERA_DE_SERVICIO',
      'OUT OF SERVICE': 'FUERA_DE_SERVICIO',
      'BAJA TECNICA': 'BAJA_TECNICA',
      'BAJA': 'BAJA_TECNICA',
      'SCRAP': 'BAJA_TECNICA'
    };

    if (mapaEstados[estadoUpper]) {
      return { valido: true, estado: mapaEstados[estadoUpper], valoresPermitidos: estadosValidos.join(', ') };
    }

    return { 
      valido: false, 
      valoresPermitidos: estadosValidos.join(', ')
    };
  }
}