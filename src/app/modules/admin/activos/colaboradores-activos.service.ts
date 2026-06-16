import { Injectable } from '@angular/core';
import { Firestore, collection, query, where, getDocs } from '@angular/fire/firestore';
import { ActivosService } from './activos.service';
import { ColaboradorActivo, ActivoAsignado } from './models/colaborador-activo.model';
import { firstValueFrom } from 'rxjs';
import { Timestamp } from '@angular/fire/firestore';
import { EmpleadoService } from '../empleados/empleados.service';

@Injectable({
  providedIn: 'root'
})
export class ColaboradoresActivosService {

  constructor(
    private empleadoService: EmpleadoService,
    private activosService: ActivosService,
    private firestore: Firestore
  ) { }

  private convertirAFecha(valor: any): Date | null {
    if (!valor) return null;
    
    if (valor instanceof Timestamp) {
      return valor.toDate();
    }
    
    if (valor instanceof Date) {
      return valor;
    }
    
    if (valor && typeof valor === 'object' && 'seconds' in valor) {
      return new Date(valor.seconds * 1000);
    }
    
    if (typeof valor === 'string' || typeof valor === 'number') {
      const date = new Date(valor);
      return isNaN(date.getTime()) ? null : date;
    }
    
    return null;
  }

  async getColaboradoresConActivos(): Promise<ColaboradorActivo[]> {
    try {
      const empleados = await firstValueFrom(this.empleadoService.getEmpleados());
      const todosActivos = await this.activosService.getAllActivos();
      
      const activosAsignados = todosActivos.filter(a => 
        a.estadoTecnico === 'ASIGNADO' && 
        a.usuarioAsignadoId && 
        a.usuarioAsignadoNombre
      );

      const mapaActivosPorEmpleado = new Map<string, ActivoAsignado[]>();
      
      activosAsignados.forEach(activo => {
        if (activo.usuarioAsignadoId) {
          if (!mapaActivosPorEmpleado.has(activo.usuarioAsignadoId)) {
            mapaActivosPorEmpleado.set(activo.usuarioAsignadoId, []);
          }
          
          const fechaAsignacion = this.convertirAFecha(activo.fechaAsignacion);
          
          mapaActivosPorEmpleado.get(activo.usuarioAsignadoId)!.push({
            activoId: activo.id || '',
            firestoreId: activo.firestoreId || '',
            nombre: activo.nombre,
            tipoActivo: activo.tipoActivo || 'Activo',
            marca: activo.marca || '',
            modelo: activo.modelo || '',
            numeroSerie: activo.numeroSerie || '',
            activoFijo: activo.activoFijo || '',
            categoriaNombre: activo.categoriaNombre || 'Sin categoría',
            fechaAsignacion: fechaAsignacion || new Date(), 
            estadoTecnico: activo.estadoTecnico,
            ubicacionNombre: activo.ubicacionNombre || 'Sin ubicación'
          });
        }
      });

      const colaboradores: ColaboradorActivo[] = empleados.map(emp => {
        const activos = mapaActivosPorEmpleado.get(emp.empleadoId) || [];
        
        let ultimaAsignacion: Date | null = null;
        if (activos.length > 0) {
          const fechasValidas = activos
            .map(a => a.fechaAsignacion)
            .filter(f => f !== null) as Date[];
          
          if (fechasValidas.length > 0) {
            ultimaAsignacion = new Date(Math.max(...fechasValidas.map(f => f.getTime())));
          }
        }

        return {
          empleadoId: emp.empleadoId,
          nombre: emp.nombre,
          apellidoPaterno: emp.apellidoPaterno,
          apellidoMaterno: emp.apellidoMaterno,
          nombreCompleto: `${emp.nombre} ${emp.apellidoPaterno} ${emp.apellidoMaterno}`.trim(),
          puesto: emp.puesto?.nombre || 'Sin puesto',
          empresa: emp.empresa?.razonSocial || 'Sin empresa',
          lugarTrabajo: emp.lugarDeTrabajo?.nombre || 'Sin ubicación',
          fotografiaMiniatura: emp.fotografiaMiniatura,
          activosAsignados: activos,
          totalActivos: activos.length,
          ultimaAsignacion: ultimaAsignacion
        };
      });

      return colaboradores
        .filter(c => c.totalActivos > 0)
        .sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto));

    } catch (error) {
      console.error('Error al obtener colaboradores con activos:', error);
      throw error;
    }
  }

  async getColaboradorPorId(empleadoId: string): Promise<ColaboradorActivo | null> {
    try {
      const colaboradores = await this.getColaboradoresConActivos();
      return colaboradores.find(c => c.empleadoId === empleadoId) || null;
    } catch (error) {
      console.error('Error al obtener colaborador:', error);
      throw error;
    }
  }

  async buscarColaboradores(termino: string): Promise<ColaboradorActivo[]> {
    try {
      const colaboradores = await this.getColaboradoresConActivos();
      const busqueda = termino.toLowerCase();
      
      return colaboradores.filter(c => 
        c.nombreCompleto.toLowerCase().includes(busqueda) ||
        c.puesto.toLowerCase().includes(busqueda) ||
        c.empresa.toLowerCase().includes(busqueda) ||
        c.lugarTrabajo.toLowerCase().includes(busqueda) ||
        c.activosAsignados.some(a => 
          a.nombre.toLowerCase().includes(busqueda) ||
          a.marca.toLowerCase().includes(busqueda) ||
          a.numeroSerie.toLowerCase().includes(busqueda)
        )
      );
    } catch (error) {
      console.error('Error al buscar colaboradores:', error);
      throw error;
    }
  }
}