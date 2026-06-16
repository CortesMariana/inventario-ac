import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, doc, updateDoc, getDoc, getDocs, query, where, orderBy, writeBatch, Timestamp, deleteDoc, arrayUnion } from '@angular/fire/firestore';
import { v4 as uuidv4 } from 'uuid';
import { environment } from 'src/environments/environment';
import { Vehiculo, EstadoVehiculo, VehiculoHistorial, TipoVehiculo, MarcaVehiculo } from './models/vehiculo.model';
import { firstValueFrom } from 'rxjs';
import { CartaResponsivaService } from './carta-responsiva.service';

@Injectable({
  providedIn: 'root'
})
export class VehiculosService {
  private vehiculosCollection = collection(this.firestore, environment.collections.vehiculos);
  private tiposCollection = collection(this.firestore, environment.collections.tipos_vehiculos);
  private marcasCollection = collection(this.firestore, environment.collections.marcas_vehiculos);

  constructor(private firestore: Firestore, private cartaResponsivaService: CartaResponsivaService ) { }

  private convertTimestampsToDates(obj: any): any {
    if (!obj) return obj;
    
    const converted = { ...obj };
    
    for (const key in converted) {
      if (converted[key] instanceof Timestamp) {
        converted[key] = converted[key].toDate();
      } else if (typeof converted[key] === 'object' && converted[key] !== null) {
        converted[key] = this.convertTimestampsToDates(converted[key]);
      }
    }
    
    return converted;
  }

  // ==================== GENERAR FOLIO ====================
  async generarFolio(): Promise<string> {
    try {
      const q = query(this.vehiculosCollection, orderBy('folio', 'desc'));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return 'VHC-001';
      }
      
      const ultimoVehiculo = querySnapshot.docs[0].data() as Vehiculo;
      const ultimoNumero = parseInt(ultimoVehiculo.folio.split('-')[1]);
      const nuevoNumero = ultimoNumero + 1;
      
      return `VHC-${nuevoNumero.toString().padStart(3, '0')}`;
    } catch (error) {
      console.error('Error al generar folio:', error);
      return 'VHC-001';
    }
  }

  // ==================== TIPOS DE VEHÍCULOS ====================
  async getTiposVehiculos(): Promise<TipoVehiculo[]> {
    const tiposHardcodeados: TipoVehiculo[] = [
      { id: '1', nombre: 'Auto', activo: true },
      { id: '2', nombre: 'Camión', activo: true },
      { id: '3', nombre: 'Camioneta', activo: true },
      { id: '4', nombre: 'Furgón', activo: true },
      { id: '5', nombre: 'Motocicleta', activo: true },
      { id: '6', nombre: 'Otro', activo: true }
    ];
    
    return tiposHardcodeados;
  }

  async createTipoVehiculo(nombre: string): Promise<string> {
    try {
      const docRef = await addDoc(this.tiposCollection, {
        nombre,
        activo: true,
        fechaCreacion: new Date()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error al crear tipo:', error);
      throw error;
    }
  }

  // ==================== MARCAS DE VEHÍCULOS ====================
  async getMarcasVehiculos(): Promise<MarcaVehiculo[]> {
    const marcasHardcodeadas: MarcaVehiculo[] = [
      { id: '1', nombre: 'Nissan', activo: true },
      { id: '2', nombre: 'Toyota', activo: true },
      { id: '3', nombre: 'Ford', activo: true },
      { id: '4', nombre: 'Volkswagen', activo: true },
      { id: '5', nombre: 'Chevrolet', activo: true },
      { id: '6', nombre: 'Honda', activo: true },
      { id: '7', nombre: 'Mazda', activo: true },
      { id: '8', nombre: 'Hyundai', activo: true },
      { id: '9', nombre: 'Kia', activo: true },
      { id: '10', nombre: 'Mercedes-Benz', activo: true },
      { id: '11', nombre: 'BMW', activo: true },
      { id: '12', nombre: 'Audi', activo: true },
      { id: '13', nombre: 'Renault', activo: true },
      { id: '14', nombre: 'Peugeot', activo: true },
      { id: '15', nombre: 'Otro', activo: true }
    ];
    
    return marcasHardcodeadas;
  }

  async createMarcaVehiculo(nombre: string): Promise<string> {
    try {
      const docRef = await addDoc(this.marcasCollection, {
        nombre,
        activo: true,
        fechaCreacion: new Date()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error al crear marca:', error);
      throw error;
    }
  }

  // ==================== CRUD VEHÍCULOS ====================
  async getAllVehiculos(): Promise<Vehiculo[]> {
    try {
      const q = query(this.vehiculosCollection, orderBy('fechaCreacion', 'desc'));
      const querySnapshot = await getDocs(q);
      const vehiculos: Vehiculo[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const convertedData = this.convertTimestampsToDates(data);
        vehiculos.push({
          firestoreId: doc.id,
          ...convertedData as Vehiculo
        });
      });
      
      return vehiculos;
    } catch (error) {
      console.error('Error al obtener vehículos:', error);
      throw error;
    }
  }

  async getVehiculo(firestoreId: string): Promise<Vehiculo | null> {
    try {
      const docRef = doc(this.firestore, `${environment.collections.vehiculos}/${firestoreId}`);
      const docSnapshot = await getDoc(docRef);
      
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        const convertedData = this.convertTimestampsToDates(data);
        return {
          firestoreId: docSnapshot.id,
          ...convertedData as Vehiculo
        };
      }
      return null;
    } catch (error) {
      console.error('Error al obtener vehículo:', error);
      throw error;
    }
  }

  async createVehiculo(
    vehiculoData: any, 
    usuarioMovimiento: { id: string, nombre: string }
  ): Promise<string> {
    try {
      const folio = await this.generarFolio();
      
      const nuevoVehiculo = {
        id: uuidv4(),
        folio,
        ...vehiculoData,
        fechaCreacion: new Date(),
        historial: []
      };

      const batch = writeBatch(this.firestore);
      const vehiculoDocRef = doc(this.vehiculosCollection);

      batch.set(vehiculoDocRef, nuevoVehiculo);

      const historialEvent = {
        id: uuidv4(),
        vehiculoId: nuevoVehiculo.id,
        tipoEvento: 'CREACION',
        observaciones: `Vehículo creado en el sistema. Folio: ${folio}`,
        fechaMovimiento: new Date(),
        usuarioMovimientoId: usuarioMovimiento.id,
        usuarioMovimientoNombre: usuarioMovimiento.nombre,
        estadoNuevo: nuevoVehiculo.estadoVehiculo
      };

      const historialRef = doc(collection(this.firestore, `${environment.collections.vehiculos}/${vehiculoDocRef.id}/historial`));
      batch.set(historialRef, historialEvent);

      await batch.commit();
      return vehiculoDocRef.id;

    } catch (error) {
      console.error('Error al crear vehículo:', error);
      throw error;
    }
  }

  async updateVehiculo(firestoreId: string, data: Partial<Vehiculo>): Promise<void> {
    try {
      const docRef = doc(this.firestore, `${environment.collections.vehiculos}/${firestoreId}`);
      
      const updateData: any = {
        ...data,
        fechaModificacion: new Date()
      };
      
      if (updateData.fechaVencimientoSeguro) {
        updateData.fechaVencimientoSeguro = new Date(updateData.fechaVencimientoSeguro);
      }
      
      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('Error al actualizar vehículo:', error);
      throw error;
    }
  }

  async cambiarEstadoVehiculo(
    firestoreId: string,
    nuevoEstado: EstadoVehiculo,
    usuarioMovimiento: { id: string, nombre: string },
    observaciones: string = '',
    otroEstadoTexto?: string,
    asignadoA?: { id: string, nombre: string }
  ): Promise<boolean> {
    try {
      const vehiculoRef = doc(this.firestore, `${environment.collections.vehiculos}/${firestoreId}`);
      const vehiculoSnap = await getDoc(vehiculoRef);

      if (!vehiculoSnap.exists()) {
        throw new Error('Vehículo no encontrado');
      }

      const vehiculo = vehiculoSnap.data() as Vehiculo;
      const batch = writeBatch(this.firestore);
      const ahora = new Date();

      const updateData: any = {
        estadoVehiculo: nuevoEstado,
        fechaModificacion: ahora
      };

      if (nuevoEstado === 'OTRO' && otroEstadoTexto) {
        updateData.otroEstadoTexto = otroEstadoTexto;
      } else if (nuevoEstado !== 'OTRO') {
        updateData.otroEstadoTexto = null;
      }

      if (nuevoEstado === 'ASIGNADO' && asignadoA) {
        updateData.asignadoAId = asignadoA.id;
        updateData.asignadoANombre = asignadoA.nombre;
        updateData.asignadoAFecha = ahora;
      } else if (nuevoEstado !== 'ASIGNADO') {
        updateData.asignadoAId = null;
        updateData.asignadoANombre = null;
        updateData.asignadoAFecha = null;
      }

      if (nuevoEstado === 'SEGURO_VENCIDO') {
        updateData.seguroVencidoNotificado = true;
      }

      batch.update(vehiculoRef, updateData);

      const historialEvent = {
        id: uuidv4(),
        vehiculoId: vehiculo.id,
        tipoEvento: 'CAMBIO_ESTADO',
        observaciones: observaciones || `Cambio de estado: ${vehiculo.estadoVehiculo} -> ${nuevoEstado}`,
        fechaMovimiento: ahora,
        usuarioMovimientoId: usuarioMovimiento.id,
        usuarioMovimientoNombre: usuarioMovimiento.nombre,
        estadoAnterior: vehiculo.estadoVehiculo,
        estadoNuevo: nuevoEstado,
        otroEstadoTexto: nuevoEstado === 'OTRO' ? otroEstadoTexto : null,
        asignadoAId: nuevoEstado === 'ASIGNADO' ? asignadoA?.id : null,
        asignadoANombre: nuevoEstado === 'ASIGNADO' ? asignadoA?.nombre : null
      };

      const historialRef = doc(collection(this.firestore, `${environment.collections.vehiculos}/${firestoreId}/historial`));
      batch.set(historialRef, historialEvent);

      await batch.commit();
      return true;

    } catch (error) {
      console.error('Error al cambiar estado:', error);
      throw error;
    }
  }

  async getHistorialVehiculo(vehiculoFirestoreId: string): Promise<VehiculoHistorial[]> {
    try {
      const historialRef = collection(this.firestore, `${environment.collections.vehiculos}/${vehiculoFirestoreId}/historial`);
      const q = query(historialRef, orderBy('fechaMovimiento', 'desc'));
      const querySnapshot = await getDocs(q);
      const historial: VehiculoHistorial[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const convertedData = this.convertTimestampsToDates(data);
        historial.push({
          ...convertedData as VehiculoHistorial
        });
      });
      
      return historial;
    } catch (error) {
      console.error('Error al obtener historial:', error);
      return [];
    }
  }

  /** Registra un evento genérico en el historial del vehículo (subcolección /historial). */
  async registrarEventoHistorial(
    firestoreId: string,
    evento: Omit<VehiculoHistorial, 'id' | 'vehiculoId' | 'fechaMovimiento' | 'fechaMovimientoFormatted'>,
  ): Promise<void> {
    const historialRef = collection(this.firestore, `${environment.collections.vehiculos}/${firestoreId}/historial`);
    await addDoc(historialRef, {
      id: uuidv4(),
      vehiculoId: firestoreId,
      fechaMovimiento: new Date(),
      ...evento,
    });
  }

  async actualizarSeguro(
    firestoreId: string,
    fechaVencimiento: Date,
    usuarioMovimiento: { id: string, nombre: string }
  ): Promise<void> {
    try {
      const vehiculoRef = doc(this.firestore, `${environment.collections.vehiculos}/${firestoreId}`);
      const ahora = new Date();

      await updateDoc(vehiculoRef, {
        fechaVencimientoSeguro: fechaVencimiento,
        seguroVencidoNotificado: false,
        fechaModificacion: ahora
      });

      const historialRef = collection(this.firestore, `${environment.collections.vehiculos}/${firestoreId}/historial`);
      await addDoc(historialRef, {
        id: uuidv4(),
        vehiculoId: firestoreId,
        tipoEvento: 'CAMBIO_SEGURO',
        observaciones: `Fecha de vencimiento de seguro actualizada: ${fechaVencimiento.toLocaleDateString()}`,
        fechaMovimiento: ahora,
        usuarioMovimientoId: usuarioMovimiento.id,
        usuarioMovimientoNombre: usuarioMovimiento.nombre
      });

    } catch (error) {
      console.error('Error al actualizar seguro:', error);
      throw error;
    }
  }

  async asignarVehiculo(
    firestoreId: string,
    empleadoId: string,
    empleadoNombre: string,
    usuarioMovimiento: { id: string, nombre: string },
    observaciones?: string
  ): Promise<boolean> {
    try {
      const vehiculoRef = doc(this.firestore, `${environment.collections.vehiculos}/${firestoreId}`);
      const vehiculoSnap = await getDoc(vehiculoRef);

      if (!vehiculoSnap.exists()) {
        throw new Error('Vehículo no encontrado');
      }

      const vehiculo = vehiculoSnap.data() as Vehiculo;

      if (vehiculo.estadoVehiculo === 'ASIGNADO') {
        throw new Error('El vehículo ya está asignado a otro colaborador');
      }

      const batch = writeBatch(this.firestore);
      const ahora = new Date();

      batch.update(vehiculoRef, {
        estadoVehiculo: 'ASIGNADO',
        asignadoAId: empleadoId,
        asignadoANombre: empleadoNombre,
        asignadoAFecha: ahora,
        fechaModificacion: ahora
      });

      const historialEvent = {
        id: uuidv4(),
        vehiculoId: vehiculo.id,
        tipoEvento: 'ASIGNACION',
        observaciones: observaciones || `Vehículo asignado a ${empleadoNombre}`,
        fechaMovimiento: ahora,
        usuarioMovimientoId: usuarioMovimiento.id,
        usuarioMovimientoNombre: usuarioMovimiento.nombre,
        estadoAnterior: vehiculo.estadoVehiculo,
        estadoNuevo: 'ASIGNADO',
        asignadoAId: empleadoId,
        asignadoANombre: empleadoNombre,
        otroEstadoTexto: null
      };

      const historialRef = doc(collection(this.firestore, `${environment.collections.vehiculos}/${firestoreId}/historial`));
      batch.set(historialRef, historialEvent);

      await batch.commit();

      await this.crearCartaResponsivaAutomatica(firestoreId, empleadoId, usuarioMovimiento);

      return true;

    } catch (error) {
      console.error('Error al asignar vehículo:', error);
      throw error;
    }
  }

  private async crearCartaResponsivaAutomatica(
    vehiculoId: string,
    empleadoId: string,
    usuarioMovimiento: { id: string, nombre: string }
  ): Promise<void> {
    try {
      const vehiculo = await this.getVehiculo(vehiculoId);
      
      if (!vehiculo) {
        console.error('Vehículo no encontrado para crear carta');
        return;
      }

      await this.cartaResponsivaService.crearCartaAutomatica(
        vehiculoId,
        { 
          empleadoId: empleadoId,
          nombre: vehiculo.asignadoANombre || '',
        },
        vehiculo,
        usuarioMovimiento
      );
      
      console.log('Carta responsiva creada automáticamente para vehículo:', vehiculoId);
      
    } catch (error) {
      console.error('Error al crear carta responsiva automática:', error);
    }
  }
    
}