import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, doc, updateDoc, getDoc, getDocs, query, where, orderBy, writeBatch, Timestamp, deleteDoc, increment } from '@angular/fire/firestore';
import { v4 as uuidv4 } from 'uuid';
import { environment } from 'src/environments/environment';
import { Insumo, MovimientoInsumo } from './models/insumo.model';

@Injectable({
  providedIn: 'root'
})
export class InsumosService {
  private insumosCollection = collection(this.firestore, environment.collections.insumos);

  constructor(private firestore: Firestore) { }

  async getAllInsumos(): Promise<Insumo[]> {
    try {
      const q = query(this.insumosCollection, orderBy('nombre', 'asc'));
      const querySnapshot = await getDocs(q);
      const insumos: Insumo[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as Insumo;
        insumos.push({
          ...data,
          firestoreId: doc.id
        });
      });
      return insumos;
    } catch (error) {
      console.error('Error al obtener insumos:', error);
      throw error;
    }
  }

  async getInsumo(firestoreId: string): Promise<Insumo | null> {
    try {
      const docRef = doc(this.firestore, `${environment.collections.insumos}/${firestoreId}`);
      const docSnapshot = await getDoc(docRef);
      if (docSnapshot.exists()) {
        return {
          firestoreId: docSnapshot.id,
          ...docSnapshot.data() as Insumo
        };
      }
      return null;
    } catch (error) {
      console.error('Error al obtener insumo:', error);
      throw error;
    }
  }

  async createInsumo(insumoData: any, usuarioMovimiento: { id: string, nombre: string }): Promise<string> {
    try {
      const ahora = new Date();
      const id = uuidv4();
      
      const nuevoInsumo: any = {
        id: id,
        nombre: insumoData.nombre || '',
        tipoEmpaque: insumoData.tipoEmpaque || 'Unitario',
        cantidad: insumoData.cantidad || 0,
        marca: insumoData.marca || 'Generico',
        estado: insumoData.estado || 'Usado',
        precioUnitario: insumoData.precioUnitario || 0,
        precioTotal: (insumoData.cantidad || 0) * (insumoData.precioUnitario || 0),
        subalmacenId: insumoData.subalmacenId || '',
        subalmacenNombre: insumoData.subalmacenNombre || '',
        lugarTrabajoId: insumoData.lugarTrabajoId || null,
        lugarTrabajoNombre: insumoData.lugarTrabajoNombre || null,
        notas: insumoData.notas || '',
        stockMinimo: insumoData.stockMinimo ?? 5,
        fechaCreacion: ahora,
        fechaModificacion: ahora,
        historialMovimientos: [],
        activo: true
      };
      
      if (insumoData.unidadesPorEmpaque !== undefined && insumoData.unidadesPorEmpaque !== null) {
        nuevoInsumo.unidadesPorEmpaque = insumoData.unidadesPorEmpaque;
        nuevoInsumo.tipoContenido = insumoData.tipoContenido || 'PIEZAS';
        nuevoInsumo.cantidadUnidades = (insumoData.cantidad || 0) * insumoData.unidadesPorEmpaque;
      }
      
      const docRef = await addDoc(this.insumosCollection, nuevoInsumo);
      
      const movimientoCreacion: MovimientoInsumo = {
        id: uuidv4(),
        tipoMovimiento: 'CREACION',
        cantidadAnterior: 0,
        cantidadNueva: nuevoInsumo.cantidad,
        cantidadCambio: nuevoInsumo.cantidad,
        observaciones: `Insumo creado con cantidad inicial: ${nuevoInsumo.cantidad}`,
        fechaMovimiento: ahora,
        usuarioMovimientoId: usuarioMovimiento.id,
        usuarioMovimientoNombre: usuarioMovimiento.nombre
      };
      
      const historialActualizado = [movimientoCreacion];
      await updateDoc(docRef, { historialMovimientos: historialActualizado });
      
      return docRef.id;
    } catch (error) {
      console.error('Error al crear insumo:', error);
      throw error;
    }
  }

  async updateInsumo(firestoreId: string, data: Partial<Insumo>, usuarioMovimiento: { id: string, nombre: string }): Promise<void> {
    try {
      const docRef = doc(this.firestore, `${environment.collections.insumos}/${firestoreId}`);
      const insumoActual = await this.getInsumo(firestoreId);
      
      if (!insumoActual) {
        throw new Error('Insumo no encontrado');
      }

      const ahora = new Date();
      const cambios: string[] = [];
      
      if (data.nombre && data.nombre !== insumoActual.nombre) {
        cambios.push(`nombre: "${insumoActual.nombre}" → "${data.nombre}"`);
      }
      if (data.tipoEmpaque && data.tipoEmpaque !== insumoActual.tipoEmpaque) {
        cambios.push(`tipo empaque: ${insumoActual.tipoEmpaque} → ${data.tipoEmpaque}`);
      }
      if (data.marca && data.marca !== insumoActual.marca) {
        cambios.push(`marca: ${insumoActual.marca} → ${data.marca}`);
      }
      if (data.estado && data.estado !== insumoActual.estado) {
        cambios.push(`estado: ${insumoActual.estado} → ${data.estado}`);
      }
      if (data.precioUnitario !== undefined && data.precioUnitario !== insumoActual.precioUnitario) {
        cambios.push(`precio unitario: $${insumoActual.precioUnitario} → $${data.precioUnitario}`);
      }
      if (data.subalmacenId && data.subalmacenId !== insumoActual.subalmacenId) {
        cambios.push(`subalmacén: ${insumoActual.subalmacenNombre} → ${data.subalmacenNombre}`);
      }

      const movimientoEdicion: MovimientoInsumo = {
        id: uuidv4(),
        tipoMovimiento: 'EDICION',
        cantidadAnterior: insumoActual.cantidad,
        cantidadNueva: data.cantidad !== undefined ? data.cantidad : insumoActual.cantidad,
        cantidadCambio: 0,
        observaciones: cambios.length > 0 ? `Campos modificados: ${cambios.join(', ')}` : 'Edición general',
        fechaMovimiento: ahora,
        usuarioMovimientoId: usuarioMovimiento.id,
        usuarioMovimientoNombre: usuarioMovimiento.nombre
      };

      const nuevoHistorial = [...(insumoActual.historialMovimientos || []), movimientoEdicion];

      const updateData: any = {};
      
      Object.keys(data).forEach(key => {
        if (data[key as keyof Insumo] !== undefined) {
          updateData[key] = data[key as keyof Insumo];
        }
      });
      
      if (data.cantidad !== undefined || data.precioUnitario !== undefined) {
        const nuevaCantidad = data.cantidad !== undefined ? data.cantidad : insumoActual.cantidad;
        const nuevoPrecioUnitario = data.precioUnitario !== undefined ? data.precioUnitario : insumoActual.precioUnitario;
        updateData.precioTotal = nuevaCantidad * nuevoPrecioUnitario;
      }
      
      updateData.fechaModificacion = ahora;
      updateData.historialMovimientos = nuevoHistorial;

      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('Error al actualizar insumo:', error);
      throw error;
    }
  }

  async incrementarCantidad(
    firestoreId: string, 
    cantidad: number,
    usuarioMovimiento: { id: string, nombre: string },
    observaciones: string = '',
    motivo?: string,
    ticketRelacionadoId?: string
  ): Promise<void> {
    try {
      const docRef = doc(this.firestore, `${environment.collections.insumos}/${firestoreId}`);
      const insumoActual = await this.getInsumo(firestoreId);
      
      if (!insumoActual) {
        throw new Error('Insumo no encontrado');
      }

      const ahora = new Date();
      
      if (insumoActual.unidadesPorEmpaque && insumoActual.unidadesPorEmpaque > 0) {
        const unidadesPorEmpaque = insumoActual.unidadesPorEmpaque;
        const unidadesActuales = insumoActual.cantidadUnidades || (insumoActual.cantidad * unidadesPorEmpaque);
        const nuevasUnidades = cantidad * unidadesPorEmpaque;
        const nuevoTotalUnidades = unidadesActuales + nuevasUnidades;
        
        let nuevaCantidadEmpaques = 0;
        if (nuevoTotalUnidades > 0) {
          nuevaCantidadEmpaques = Math.ceil(nuevoTotalUnidades / unidadesPorEmpaque);
        }
        
        const empaquesCompletosReales = Math.floor(nuevoTotalUnidades / unidadesPorEmpaque);
        const nuevoPrecioTotal = empaquesCompletosReales * insumoActual.precioUnitario;
        
        const movimiento: MovimientoInsumo = {
          id: uuidv4(),
          tipoMovimiento: 'INCREMENTO',
          cantidadAnterior: insumoActual.cantidad,
          cantidadNueva: nuevaCantidadEmpaques,
          cantidadCambio: cantidad,
          observaciones: observaciones || `Incremento de ${cantidad} ${insumoActual.tipoEmpaque}(s) (${nuevasUnidades} ${insumoActual.tipoContenido === 'METROS' ? 'metros' : 'piezas'})`,
          fechaMovimiento: ahora,
          usuarioMovimientoId: usuarioMovimiento.id,
          usuarioMovimientoNombre: usuarioMovimiento.nombre
        };
        
        if (motivo) {
          movimiento.motivo = motivo;
        }
        
        if (ticketRelacionadoId) {
          movimiento.ticketRelacionadoId = ticketRelacionadoId;
        }
        
        const nuevoHistorial = [...(insumoActual.historialMovimientos || []), movimiento];
        
        const updateData: any = {
          cantidad: nuevaCantidadEmpaques,
          cantidadUnidades: nuevoTotalUnidades,
          precioTotal: nuevoPrecioTotal,
          fechaModificacion: ahora,
          historialMovimientos: nuevoHistorial
        };
        
        await updateDoc(docRef, updateData);
        
      } else {
        const nuevaCantidad = insumoActual.cantidad + cantidad;
        
        const movimiento: MovimientoInsumo = {
          id: uuidv4(),
          tipoMovimiento: 'INCREMENTO',
          cantidadAnterior: insumoActual.cantidad,
          cantidadNueva: nuevaCantidad,
          cantidadCambio: cantidad,
          observaciones: observaciones || `Incremento de ${cantidad} unidades`,
          fechaMovimiento: ahora,
          usuarioMovimientoId: usuarioMovimiento.id,
          usuarioMovimientoNombre: usuarioMovimiento.nombre
        };
        
        if (motivo) {
          movimiento.motivo = motivo;
        }
        
        if (ticketRelacionadoId) {
          movimiento.ticketRelacionadoId = ticketRelacionadoId;
        }
        
        const nuevoHistorial = [...(insumoActual.historialMovimientos || []), movimiento];
        
        const updateData: any = {
          cantidad: nuevaCantidad,
          precioTotal: nuevaCantidad * insumoActual.precioUnitario,
          fechaModificacion: ahora,
          historialMovimientos: nuevoHistorial
        };
        
        await updateDoc(docRef, updateData);
      }
    } catch (error) {
      console.error('Error al incrementar cantidad:', error);
      throw error;
    }
  }

  async decrementarCantidad(
    firestoreId: string,
    cantidad: number,  
    usuarioMovimiento: { id: string, nombre: string },
    observaciones: string = '',
    motivo?: string,
    ticketRelacionadoId?: string
  ): Promise<void> {
    try {
      const docRef = doc(this.firestore, `${environment.collections.insumos}/${firestoreId}`);
      const insumoActual = await this.getInsumo(firestoreId);
      
      if (!insumoActual) {
        throw new Error('Insumo no encontrado');
      }

      if (insumoActual.unidadesPorEmpaque && insumoActual.unidadesPorEmpaque > 0) {
        const unidadesPorEmpaque = insumoActual.unidadesPorEmpaque;
        const empaquesActuales = insumoActual.cantidad;
        const unidadesTotalesActuales = insumoActual.cantidadUnidades || (empaquesActuales * unidadesPorEmpaque);
        
        const unidadesADescontar = cantidad * unidadesPorEmpaque;
        
        if (unidadesTotalesActuales < unidadesADescontar) {
          throw new Error(`No hay suficientes unidades. Unidades disponibles: ${unidadesTotalesActuales}`);
        }
        
        const nuevoTotalUnidades = unidadesTotalesActuales - unidadesADescontar;
        const nuevaCantidadEmpaques = Math.floor(nuevoTotalUnidades / unidadesPorEmpaque);
        const unidadesRestantes = nuevoTotalUnidades % unidadesPorEmpaque;
        
        const empaquesConsumidos = empaquesActuales - nuevaCantidadEmpaques;
        const ahora = new Date();
        
        let detalleConsumo = `Se descontaron ${cantidad} ${insumoActual.tipoEmpaque}(s) (${unidadesADescontar} ${insumoActual.tipoContenido === 'METROS' ? 'metros' : 'piezas'})`;
        if (unidadesRestantes > 0) {
          detalleConsumo += `. Quedan ${nuevaCantidadEmpaques} ${insumoActual.tipoEmpaque}(s) con ${unidadesRestantes} ${insumoActual.tipoContenido === 'METROS' ? 'metros' : 'piezas'}`;
        } else {
          detalleConsumo += `. Se consumieron ${empaquesConsumidos} ${insumoActual.tipoEmpaque}(s) completos`;
        }
        
        const movimiento: MovimientoInsumo = {
          id: uuidv4(),
          tipoMovimiento: 'DECREMENTO',
          cantidadAnterior: empaquesActuales,
          cantidadNueva: nuevaCantidadEmpaques,
          cantidadCambio: -cantidad,  
          empaquesAfectados: empaquesConsumidos,
          unidadesRestantesEnEmpaque: unidadesRestantes,
          observaciones: observaciones || detalleConsumo,
          fechaMovimiento: ahora,
          usuarioMovimientoId: usuarioMovimiento.id,
          usuarioMovimientoNombre: usuarioMovimiento.nombre
        };
        
        if (motivo) {
          movimiento.motivo = motivo;
        }
        
        if (ticketRelacionadoId) {
          movimiento.ticketRelacionadoId = ticketRelacionadoId;
        }
        
        const nuevoHistorial = [...(insumoActual.historialMovimientos || []), movimiento];
        
        const updateData: any = {
          cantidad: nuevaCantidadEmpaques,
          cantidadUnidades: nuevoTotalUnidades,
          precioTotal: nuevaCantidadEmpaques * insumoActual.precioUnitario,
          fechaModificacion: ahora,
          historialMovimientos: nuevoHistorial
        };
        
        await updateDoc(docRef, updateData);
        
      } else {
        if (insumoActual.cantidad < cantidad) {
          throw new Error(`No hay suficiente stock. Stock actual: ${insumoActual.cantidad}, solicita: ${cantidad}`);
        }
        
        const nuevaCantidad = insumoActual.cantidad - cantidad;
        const ahora = new Date();
        
        const movimiento: MovimientoInsumo = {
          id: uuidv4(),
          tipoMovimiento: 'DECREMENTO',
          cantidadAnterior: insumoActual.cantidad,
          cantidadNueva: nuevaCantidad,
          cantidadCambio: -cantidad,
          observaciones: observaciones || `Decremento de ${cantidad} unidades`,
          fechaMovimiento: ahora,
          usuarioMovimientoId: usuarioMovimiento.id,
          usuarioMovimientoNombre: usuarioMovimiento.nombre
        };
        
        if (motivo) {
          movimiento.motivo = motivo;
        }
        
        if (ticketRelacionadoId) {
          movimiento.ticketRelacionadoId = ticketRelacionadoId;
        }
        
        const nuevoHistorial = [...(insumoActual.historialMovimientos || []), movimiento];
        
        const updateData: any = {
          cantidad: nuevaCantidad,
          precioTotal: nuevaCantidad * insumoActual.precioUnitario,
          fechaModificacion: ahora,
          historialMovimientos: nuevoHistorial
        };
        
        if (insumoActual.cantidadUnidades !== undefined) {
          updateData.cantidadUnidades = nuevaCantidad * (insumoActual.unidadesPorEmpaque || 1);
        }
        
        await updateDoc(docRef, updateData);
      }
    } catch (error) {
      console.error('Error al decrementar cantidad:', error);
      throw error;
    }
  }

  async deleteInsumo(firestoreId: string, usuarioMovimiento: { id: string, nombre: string }, motivo?: string): Promise<void> {
    try {
      const docRef = doc(this.firestore, `${environment.collections.insumos}/${firestoreId}`);
      const insumoActual = await this.getInsumo(firestoreId);
      
      if (!insumoActual) {
        throw new Error('Insumo no encontrado');
      }

      const ahora = new Date();

      const movimientoEliminacion: MovimientoInsumo = {
        id: uuidv4(),
        tipoMovimiento: 'ELIMINACION',
        cantidadAnterior: insumoActual.cantidad,
        cantidadNueva: 0,
        cantidadCambio: -insumoActual.cantidad,
        observaciones: motivo || 'Insumo eliminado/desactivado del sistema',
        fechaMovimiento: ahora,
        usuarioMovimientoId: usuarioMovimiento.id,
        usuarioMovimientoNombre: usuarioMovimiento.nombre
      };
      
      if (motivo) {
        movimientoEliminacion.motivo = motivo;
      }

      const nuevoHistorial = [...(insumoActual.historialMovimientos || []), movimientoEliminacion];

      await updateDoc(docRef, {
        activo: false,
        fechaModificacion: ahora,
        historialMovimientos: nuevoHistorial
      });
    } catch (error) {
      console.error('Error al eliminar insumo:', error);
      throw error;
    }
  }

  async reactivarInsumo(firestoreId: string, usuarioMovimiento: { id: string, nombre: string }): Promise<void> {
    try {
      const docRef = doc(this.firestore, `${environment.collections.insumos}/${firestoreId}`);
      const insumoActual = await this.getInsumo(firestoreId);
      
      if (!insumoActual) {
        throw new Error('Insumo no encontrado');
      }

      const ahora = new Date();

      const movimientoReactivacion: MovimientoInsumo = {
        id: uuidv4(),
        tipoMovimiento: 'REACTIVACION', 
        cantidadAnterior: insumoActual.cantidad,
        cantidadNueva: insumoActual.cantidad,
        cantidadCambio: 0,
        observaciones: 'Insumo reactivado - vuelve a estar disponible en el inventario',
        fechaMovimiento: ahora,
        usuarioMovimientoId: usuarioMovimiento.id,
        usuarioMovimientoNombre: usuarioMovimiento.nombre
      };

      const nuevoHistorial = [...(insumoActual.historialMovimientos || []), movimientoReactivacion];

      await updateDoc(docRef, {
        activo: true,
        fechaModificacion: ahora,
        historialMovimientos: nuevoHistorial
      });
    } catch (error) {
      console.error('Error al reactivar insumo:', error);
      throw error;
    }
  }

  async getHistorialMovimientos(firestoreId: string): Promise<MovimientoInsumo[]> {
    try {
      const insumo = await this.getInsumo(firestoreId);
      if (!insumo) {
        return [];
      }
      
      const historial = insumo.historialMovimientos || [];
      return historial.sort((a, b) => {
        const fechaA = a.fechaMovimiento instanceof Date ? a.fechaMovimiento : (a.fechaMovimiento as any).toDate();
        const fechaB = b.fechaMovimiento instanceof Date ? b.fechaMovimiento : (b.fechaMovimiento as any).toDate();
        return fechaB.getTime() - fechaA.getTime();
      });
    } catch (error) {
      console.error('Error al obtener historial:', error);
      throw error;
    }
  }
  
  private sanitizeDocument(data: any): any {
    const result: any = {};
    Object.keys(data).forEach(key => {
      const value = data[key];
      if (value !== undefined) {
        result[key] = value === null ? null : value;
      }
    });
    return result;
  }

  async decrementarPorUnidades(
    firestoreId: string,
    unidades: number,
    usuarioMovimiento: { id: string, nombre: string },
    observaciones: string = '',
    motivo?: string,
    ticketRelacionadoId?: string
  ): Promise<{ success: boolean, mensaje: string }> {
    try {
      const docRef = doc(this.firestore, `${environment.collections.insumos}/${firestoreId}`);
      const insumoActual = await this.getInsumo(firestoreId);
      
      if (!insumoActual) {
        throw new Error('Insumo no encontrado');
      }
      
      if (!insumoActual.unidadesPorEmpaque || insumoActual.unidadesPorEmpaque <= 0) {
        throw new Error('Este insumo no está configurado para descuento por unidades');
      }
      
      let unidadesTotales = insumoActual.cantidadUnidades || (insumoActual.cantidad * insumoActual.unidadesPorEmpaque);
      
      if (unidadesTotales < unidades) {
        throw new Error(`No hay suficientes unidades. Unidades disponibles: ${unidadesTotales}`);
      }
      
      const nuevoTotalUnidades = unidadesTotales - unidades;
      
      let nuevaCantidadEmpaquesGuardar = 0;
      let unidadesRestantes = 0;
      
      if (nuevoTotalUnidades > 0) {
        nuevaCantidadEmpaquesGuardar = 1;
        unidadesRestantes = nuevoTotalUnidades;
      } else {
        nuevaCantidadEmpaquesGuardar = 0;
        unidadesRestantes = 0;
      }
      
      const empaquesCompletosReales = Math.floor(nuevoTotalUnidades / insumoActual.unidadesPorEmpaque);
      const nuevoPrecioTotal = empaquesCompletosReales * insumoActual.precioUnitario;
      
      const empaquesConsumidos = insumoActual.cantidad - empaquesCompletosReales;
      
      const ahora = new Date();
      
      let detalleConsumo = '';
      if (nuevoTotalUnidades > 0) {
        if (unidadesRestantes === insumoActual.unidadesPorEmpaque) {
          detalleConsumo = `Se consumieron ${unidades} ${insumoActual.tipoContenido === 'METROS' ? 'metros' : 'piezas'}. Queda 1 ${insumoActual.tipoEmpaque} completo (${insumoActual.unidadesPorEmpaque} ${insumoActual.tipoContenido === 'METROS' ? 'metros' : 'piezas'})`;
        } else {
          detalleConsumo = `Se consumieron ${unidades} ${insumoActual.tipoContenido === 'METROS' ? 'metros' : 'piezas'}. Queda 1 ${insumoActual.tipoEmpaque} con ${nuevoTotalUnidades} ${insumoActual.tipoContenido === 'METROS' ? 'metros' : 'piezas'}`;
        }
      } else {
        detalleConsumo = `Se consumieron todas las ${unidadesTotales} ${insumoActual.tipoContenido === 'METROS' ? 'metros' : 'piezas'}. Ya no hay stock.`;
      }
      
      const movimiento: MovimientoInsumo = {
        id: uuidv4(),
        tipoMovimiento: 'DECREMENTO',
        cantidadAnterior: insumoActual.cantidad,
        cantidadNueva: nuevaCantidadEmpaquesGuardar,
        cantidadCambio: -unidades,
        empaquesAfectados: empaquesConsumidos,
        unidadesRestantesEnEmpaque: nuevoTotalUnidades > 0 ? nuevoTotalUnidades : 0,
        observaciones: observaciones || `Consumo de ${unidades} ${insumoActual.tipoContenido === 'METROS' ? 'metros' : 'piezas'}. ${detalleConsumo}`,
        fechaMovimiento: ahora,
        usuarioMovimientoId: usuarioMovimiento.id,
        usuarioMovimientoNombre: usuarioMovimiento.nombre
      };
      
      if (motivo) {
        movimiento.motivo = motivo;
      }
      
      if (ticketRelacionadoId) {
        movimiento.ticketRelacionadoId = ticketRelacionadoId;
      }
      
      const nuevoHistorial = [...(insumoActual.historialMovimientos || []), movimiento];
      
      const updateData: any = {
        cantidad: nuevaCantidadEmpaquesGuardar,  
        cantidadUnidades: nuevoTotalUnidades,     
        precioTotal: nuevoPrecioTotal,            
        fechaModificacion: ahora,
        historialMovimientos: nuevoHistorial
      };
      
      await updateDoc(docRef, updateData);
      
      return { 
        success: true, 
        mensaje: `Se descontaron ${unidades} ${insumoActual.tipoContenido === 'METROS' ? 'metros' : 'piezas'}. ${detalleConsumo}` 
      };
      
    } catch (error) {
      console.error('Error al decrementar por unidades:', error);
      throw error;
    }
  }

  async getResumenUnidades(firestoreId: string): Promise<{ empaques: number, unidades: number, tipoUnidad: string }> {
    const insumo = await this.getInsumo(firestoreId);
    if (!insumo) {
      return { empaques: 0, unidades: 0, tipoUnidad: '' };
    }
    
    if (insumo.unidadesPorEmpaque && insumo.unidadesPorEmpaque > 0) {
      const tipo = insumo.tipoContenido === 'METROS' ? 'metros' : 'piezas';
      const unidades = insumo.cantidadUnidades || (insumo.cantidad * insumo.unidadesPorEmpaque);
      return {
        empaques: insumo.cantidad,
        unidades: unidades,
        tipoUnidad: tipo
      };
    }
    
    return {
      empaques: insumo.cantidad,
      unidades: insumo.cantidad,
      tipoUnidad: 'unidades'
    };
  }

  async getInsumosPorTicket(ticketId: string): Promise<{ 
    insumo: Insumo, 
    cantidad: number, 
    tipoDescuento: string,
    fecha: Date,
    motivo: string,
    observaciones: string 
  }[]> {
    try {
      const todosInsumos = await this.getAllInsumos();
      const insumosConMovimientos: any[] = [];
      
      for (const insumo of todosInsumos) {
        if (insumo.historialMovimientos && insumo.historialMovimientos.length > 0) {
          const movimientosTicket = insumo.historialMovimientos.filter(
            mov => mov.ticketRelacionadoId === ticketId && mov.tipoMovimiento === 'DECREMENTO'
          );
          
          for (const movimiento of movimientosTicket) {
            insumosConMovimientos.push({
              insumo: insumo,
              cantidad: Math.abs(movimiento.cantidadCambio),
              tipoDescuento: movimiento.empaquesAfectados !== undefined ? 'UNIDADES' : 'EMPAQUES',
              fecha: movimiento.fechaMovimiento,
              motivo: movimiento.motivo || '',
              observaciones: movimiento.observaciones || ''
            });
          }
        }
      }
      
      return insumosConMovimientos.sort((a, b) => {
        const fechaA = this.getFecha(a.fecha);
        const fechaB = this.getFecha(b.fecha);
        if (!fechaA || !fechaB) return 0;
        return fechaB.getTime() - fechaA.getTime();
      });
    } catch (error) {
      console.error('Error al obtener insumos por ticket:', error);
      return [];
    }
  }

  private getFecha(fecha: any): Date | null {
    if (!fecha) return null;
    try {
      if (fecha.toDate) return fecha.toDate();
      if (fecha instanceof Date) return fecha;
      if (typeof fecha === 'string') return new Date(fecha);
      if (fecha && typeof fecha === 'object' && fecha.seconds) return new Date(fecha.seconds * 1000);
      return null;
    } catch {
      return null;
    }
  }
}