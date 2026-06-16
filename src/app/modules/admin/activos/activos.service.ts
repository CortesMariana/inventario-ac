import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, doc, updateDoc, getDoc, getDocs, query, where, orderBy, writeBatch, Timestamp, deleteDoc, arrayUnion } from '@angular/fire/firestore';
import { Storage, ref, uploadBytes, getDownloadURL, deleteObject } from '@angular/fire/storage';
import { v4 as uuidv4 } from 'uuid';
import { environment } from 'src/environments/environment';
import { ActivoTI, ActivoHistorial, EstadoTecnico, CategoriaActivo, Subalmacen, Evidencia } from './models/activo.model';
import { firstValueFrom } from 'rxjs';
import { LugaresTrabajoService } from '../empleados/lugares-trabajo.service';

@Injectable({
  providedIn: 'root'
})
export class ActivosService {
  private activosCollection = collection(this.firestore, environment.collections.activos);
  private categoriasCollection = collection(this.firestore, environment.collections.categorias_activos);
  private subalmacenesCollection = collection(this.firestore, environment.collections.subalmacenes);

  constructor(
    private firestore: Firestore, 
    private storage: Storage,
    private lugaresTrabajoService: LugaresTrabajoService
  ) { }

  // ==================== MÉTODOS DE CATEGORÍAS ====================

  async getCategorias(activas: boolean = true): Promise<CategoriaActivo[]> {
    try {
      const q = query(this.categoriasCollection, orderBy('nombre'));
      const querySnapshot = await getDocs(q);
      const categorias: CategoriaActivo[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data() as CategoriaActivo;
        if (!activas || data.activo !== false) {
          categorias.push({
            ...data,
            id: doc.id
          });
        }
      });
      
      return categorias;
    } catch (error) {
      console.error('Error al obtener categorías:', error);
      throw error;
    }
  }
  
  async createCategoria(categoria: Omit<CategoriaActivo, 'id' | 'fechaCreacion'>): Promise<string> {
    try {
      const nuevaCategoria = {
        ...categoria,
        fechaCreacion: new Date(),
        activo: true
      };
      const docRef = await addDoc(this.categoriasCollection, nuevaCategoria);
      return docRef.id;
    } catch (error) {
      console.error('Error al crear categoría:', error);
      throw error;
    }
  }

  async updateCategoria(id: string, data: Partial<CategoriaActivo>): Promise<void> {
    try {
      const docRef = doc(this.firestore, `${environment.collections.categorias_activos}/${id}`);
      await updateDoc(docRef, {
        ...data,
        fechaModificacion: new Date()
      });
    } catch (error) {
      console.error('Error al actualizar categoría:', error);
      throw error;
    }
  }

  async deleteCategoria(id: string): Promise<void> {
    try {
      const q = query(this.activosCollection, where('categoriaId', '==', id));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const activosNombres = querySnapshot.docs.map(doc => doc.data()['nombre']).join(', ');
        throw new Error(`No se puede eliminar: ${querySnapshot.size} activo(s) usan esta categoría (${activosNombres})`);
      }

      const docRef = doc(this.firestore, `${environment.collections.categorias_activos}/${id}`);
      
      await deleteDoc(docRef);
      console.log('Categoría eliminada exitosamente');
      
    } catch (error) {
      console.error('Error en deleteCategoria:', error);
      throw error;
    }
  }

  async desactivarCategoria(id: string): Promise<void> {
    try {
      const docRef = doc(this.firestore, `${environment.collections.categorias_activos}/${id}`);
      
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        throw new Error('Categoría no encontrada');
      }
      
      await updateDoc(docRef, { 
        activo: false,
        fechaModificacion: new Date()
      });
      
      console.log('Categoría desactivada');
      
    } catch (error) {
      console.error('Error al desactivar:', error);
      throw error;
    }
  }

  async activarCategoria(id: string): Promise<void> {
    try {
      const docRef = doc(this.firestore, `${environment.collections.categorias_activos}/${id}`);
      
      await updateDoc(docRef, { 
        activo: true,
        fechaModificacion: new Date()
      });
      
      console.log('Categoría activada');
      
    } catch (error) {
      console.error('Error al activar categoría:', error);
      throw error;
    }
  }

  // ==================== MÉTODOS DE SUBALMACENES ====================

  async getSubalmacenes(activas: boolean = true): Promise<Subalmacen[]> {
    try {
      let q;
      if (activas) {
        q = query(this.subalmacenesCollection, where('activo', '==', true), orderBy('nombre'));
      } else {
        q = query(this.subalmacenesCollection, orderBy('nombre'));
      }
      
      const querySnapshot = await getDocs(q);
      const subalmacenes: Subalmacen[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data() as Subalmacen;
        subalmacenes.push({
          ...data,
          id: doc.id
        });
      });
      
      return subalmacenes;
    } catch (error) {
      console.error('Error al obtener subalmacenes:', error);
      throw error;
    }
  }

  async getSubalmacenesPorLugarTrabajo(lugarTrabajoId: string): Promise<Subalmacen[]> {
    try {
      const q = query(
        this.subalmacenesCollection, 
        where('lugarDeTrabajoId', '==', lugarTrabajoId),
        where('activo', '==', true),
        orderBy('nombre')
      );
      
      const querySnapshot = await getDocs(q);
      const subalmacenes: Subalmacen[] = [];
      
      querySnapshot.forEach((doc) => {
        subalmacenes.push({
          ...doc.data() as Subalmacen,
          id: doc.id
        });
      });
      
      return subalmacenes;
    } catch (error) {
      console.error('Error al obtener subalmacenes por lugar:', error);
      throw error;
    }
  }

  async createSubalmacen(subalmacen: Omit<Subalmacen, 'id' | 'fechaCreacion'>): Promise<string> {
    try {
      const lugarTrabajoRef = doc(this.firestore, `lugares-trabajo/${subalmacen.lugarDeTrabajoId}`);
      const lugarSnap = await getDoc(lugarTrabajoRef);
      const lugarNombre = lugarSnap.exists() ? lugarSnap.data()['nombre'] : '';
      
      const nuevoSubalmacen = {
        ...subalmacen,
        lugarDeTrabajoNombre: lugarNombre,
        fechaCreacion: new Date(),
        activo: true
      };
      
      const docRef = await addDoc(this.subalmacenesCollection, nuevoSubalmacen);
      return docRef.id;
    } catch (error) {
      console.error('Error al crear subalmacén:', error);
      throw error;
    }
  }

  async updateSubalmacen(id: string, data: Partial<Subalmacen>): Promise<void> {
    try {
      const docRef = doc(this.firestore, `${environment.collections.subalmacenes}/${id}`);
      
      let updateData: any = { ...data };
      
      if (data.lugarDeTrabajoId) {
        const lugarTrabajoRef = doc(this.firestore, `lugares-trabajo/${data.lugarDeTrabajoId}`);
        const lugarSnap = await getDoc(lugarTrabajoRef);
        if (lugarSnap.exists()) {
          updateData.lugarDeTrabajoNombre = lugarSnap.data()['nombre'];
        }
      }
      
      updateData.fechaModificacion = new Date();
      
      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('Error al actualizar subalmacén:', error);
      throw error;
    }
  }

  async deleteSubalmacen(id: string): Promise<void> {
    try {
      const q = query(this.activosCollection, where('ubicacionId', '==', id));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const activosNombres = querySnapshot.docs.map(doc => doc.data()['nombre']).join(', ');
        throw new Error(`No se puede eliminar: El almacén contiene ${querySnapshot.size} activo(s) (${activosNombres})`);
      }

      const docRef = doc(this.firestore, `${environment.collections.subalmacenes}/${id}`);
      
      await deleteDoc(docRef);
      console.log('Subalmacén eliminado exitosamente');
      
    } catch (error) {
      console.error('Error al eliminar subalmacén:', error);
      throw error;
    }
  }

  async desactivarSubalmacen(id: string): Promise<void> {
    try {
      if (!id) {
        throw new Error('ID no proporcionado');
      }
      
      const rutaCompleta = `${environment.collections.subalmacenes}/${id}`;
      const docRef = doc(this.firestore, rutaCompleta);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
      } else {
        console.log('El documento NO existe en Firestore');
      }
      
      const updateData = { 
        activo: false,
        fechaModificacion: new Date()
      };
      
      await updateDoc(docRef, updateData);
      console.log('ACTUALIZACIÓN EXITOSA');
      
    } catch (error) {
      console.error('ERROR EN SERVICE:', error);
      throw error;
    }
  }

  async activarSubalmacen(id: string): Promise<void> {
    try {
      const docRef = doc(this.firestore, `${environment.collections.subalmacenes}/${id}`);
      
      await updateDoc(docRef, { 
        activo: true,
        fechaModificacion: new Date()
      });
      
      console.log('Subalmacén activado');
      
    } catch (error) {
      console.error('Error al activar subalmacén:', error);
      throw error;
    }
  }

  async getJerarquiaCompleta(): Promise<any[]> {
    try {
      const lugares = await firstValueFrom(this.lugaresTrabajoService.getLugaresTrabajo());
      const subalmacenesSnap = await getDocs(this.subalmacenesCollection);
      const subalmacenesPorLugar = new Map();
      
      subalmacenesSnap.forEach(doc => {
        const data = doc.data();
        const lugarId = data['lugarDeTrabajoId'];
        
        if (!subalmacenesPorLugar.has(lugarId)) {
          subalmacenesPorLugar.set(lugarId, []);
        }
        
        subalmacenesPorLugar.get(lugarId).push({
          id: doc.id,
          nombre: data['nombre'] || 'Sin nombre',
          descripcion: data['descripcion'] || '',
          lugarDeTrabajoId: lugarId,
          activo: data['activo'] !== false,
          fechaCreacion: data['fechaCreacion']
        });
      });
      
      const jerarquia = lugares.map(lugar => ({
        id: lugar.id,
        nombre: lugar.nombre,
        direccion: lugar.direccion || '',
        activo: lugar.activo !== false,
        subalmacenes: subalmacenesPorLugar.get(lugar.id) || []
      }));
      
      return jerarquia;
      
    } catch (error) {
      console.error('Error en getJerarquiaCompleta:', error);
      return [];
    }
  }

  // ==================== MÉTODOS DE ACTIVOS ====================

  async getAllActivos(): Promise<ActivoTI[]> {
    try {
      const q = query(this.activosCollection, orderBy('fechaCreacion', 'desc'));
      const querySnapshot = await getDocs(q);
      const activos: ActivoTI[] = [];
      querySnapshot.forEach((doc) => {
        activos.push({
          firestoreId: doc.id,
          ...doc.data() as ActivoTI
        });
      });
      return activos;
    } catch (error) {
      console.error('Error al obtener activos:', error);
      throw error;
    }
  }

  async getActivo(firestoreId: string): Promise<ActivoTI | null> {
    try {
      const docRef = doc(this.firestore, `${environment.collections.activos}/${firestoreId}`);
      const docSnapshot = await getDoc(docRef);
      if (docSnapshot.exists()) {
        return {
          firestoreId: docSnapshot.id,
          ...docSnapshot.data() as ActivoTI
        };
      }
      return null;
    } catch (error) {
      console.error('Error al obtener activo:', error);
      throw error;
    }
  }

  async createActivo(activoData: any, usuarioMovimiento: { id: string, nombre: string }): Promise<string> {
    try {
      if (activoData.folio) {
        const folioQuery = query(this.activosCollection, where('folio', '==', activoData.folio));
        const existing = await getDocs(folioQuery);
        if (!existing.empty) {
          throw new Error(`Ya existe un activo con el folio ${activoData.folio}`);
        }
      }

      const nuevoActivo = {
        id: uuidv4(),
        ...activoData,
        fechaCreacion: new Date(),
      };

      const batch = writeBatch(this.firestore);
      const activoDocRef = doc(this.activosCollection);

      batch.set(activoDocRef, nuevoActivo);

      const historialCreacion = {
        activoId: nuevoActivo.id,
        tipoEvento: 'CREACION',
        observaciones: `Activo creado en el sistema.`,
        fechaMovimiento: new Date(),
        usuarioMovimientoId: usuarioMovimiento.id,
        usuarioMovimientoNombre: usuarioMovimiento.nombre,
        estadoTecnico: nuevoActivo.estadoTecnico,
        usuarioAsignadoId: nuevoActivo.usuarioAsignadoId || null,
        usuarioAsignadoNombre: nuevoActivo.usuarioAsignadoNombre || null,
        ubicacionId: nuevoActivo.ubicacionId || null,
        ubicacionNombre: nuevoActivo.ubicacionNombre || null,
      };

      const historialCreacionRef = doc(collection(this.firestore, `${environment.collections.activos}/${activoDocRef.id}/historial`));
      batch.set(historialCreacionRef, historialCreacion);

      if (nuevoActivo.estadoTecnico === 'ASIGNADO' && nuevoActivo.usuarioAsignadoId) {
        const historialAsignacion = {
          activoId: nuevoActivo.id,
          tipoEvento: 'ASIGNACION',
          observaciones: activoData.observacionesAsignacion || 'Asignación inicial',
          fechaMovimiento: new Date(),
          usuarioMovimientoId: usuarioMovimiento.id,
          usuarioMovimientoNombre: usuarioMovimiento.nombre,
          estadoTecnico: 'ASIGNADO',
          usuarioAsignadoId: nuevoActivo.usuarioAsignadoId,
          usuarioAsignadoNombre: nuevoActivo.usuarioAsignadoNombre,
          ubicacionId: nuevoActivo.ubicacionId,
          ubicacionNombre: nuevoActivo.ubicacionNombre,
        };

        const historialAsignacionRef = doc(collection(this.firestore, `${environment.collections.activos}/${activoDocRef.id}/historial`));
        batch.set(historialAsignacionRef, historialAsignacion);
      }

      await batch.commit();
      return activoDocRef.id;

    } catch (error) {
      console.error('Error al crear activo:', error);
      throw error;
    }
  }

  async updateActivo(firestoreId: string, data: Partial<ActivoTI>): Promise<void> {
    try {
      const docRef = doc(this.firestore, `${environment.collections.activos}/${firestoreId}`);
      await updateDoc(docRef, {
        ...data,
        fechaModificacion: new Date()
      });
    } catch (error) {
      console.error('Error al actualizar activo:', error);
      throw error;
    }
  }

  async getHistorialActivo(activoFirestoreId: string): Promise<ActivoHistorial[]> {
    try {
      const historialRef = collection(this.firestore, `${environment.collections.activos}/${activoFirestoreId}/historial`);
      const q = query(historialRef, orderBy('fechaMovimiento', 'desc'));
      const querySnapshot = await getDocs(q);
      const historial: ActivoHistorial[] = [];
      querySnapshot.forEach((doc) => {
        historial.push({
          ...doc.data() as ActivoHistorial
        });
      });
      return historial;
    } catch (error) {
      console.error('Error al obtener historial:', error);
      throw error;
    }
  }

  async getActivosPorUbicacion(ubicacionId: string): Promise<ActivoTI[]> {
    try {
      const q = query(this.activosCollection, where('ubicacionId', '==', ubicacionId));
      const querySnapshot = await getDocs(q);
      const activos: ActivoTI[] = [];
      querySnapshot.forEach((doc) => {
        activos.push({
          firestoreId: doc.id,
          ...doc.data() as ActivoTI
        });
      });
      return activos;
    } catch (error) {
      console.error('Error al obtener activos por ubicación:', error);
      throw error;
    }
  }

  async asignarActivo(
    firestoreId: string,
    usuario: { id: string, nombre: string },
    ubicacion: { id: string, nombre: string },
    usuarioMovimiento: { id: string, nombre: string },
    observaciones: string = ''
  ): Promise<boolean> {
    try {
      const activoRef = doc(this.firestore, `${environment.collections.activos}/${firestoreId}`);
      const activoSnap = await getDoc(activoRef);

      if (!activoSnap.exists()) {
        throw new Error('Activo no encontrado');
      }

      const activo = activoSnap.data() as ActivoTI;

      if (activo.estadoTecnico !== 'DISPONIBLE') {
        throw new Error(`El activo no está disponible. Estado: ${activo.estadoTecnico}`);
      }

      const batch = writeBatch(this.firestore);
      const ahora = new Date();

      batch.update(activoRef, {
        usuarioAsignadoId: usuario.id,
        usuarioAsignadoNombre: usuario.nombre,
        ubicacionId: ubicacion.id,
        ubicacionNombre: ubicacion.nombre,
        estadoTecnico: 'ASIGNADO',
        fechaAsignacion: ahora,
        fechaModificacion: ahora
      });

      const historialEvent = {
        activoId: activo.id,
        tipoEvento: 'ASIGNACION',
        observaciones: observaciones || `Asignado a ${usuario.nombre}`,
        fechaMovimiento: ahora,
        usuarioMovimientoId: usuarioMovimiento.id,
        usuarioMovimientoNombre: usuarioMovimiento.nombre,
        estadoTecnico: 'ASIGNADO',
        usuarioAsignadoId: usuario.id,
        usuarioAsignadoNombre: usuario.nombre,
        ubicacionId: ubicacion.id,
        ubicacionNombre: ubicacion.nombre,
      };

      const historialRef = doc(collection(this.firestore, `${environment.collections.activos}/${firestoreId}/historial`));
      batch.set(historialRef, historialEvent);

      await batch.commit();
      return true;

    } catch (error) {
      console.error('Error al asignar activo:', error);
      throw error;
    }
  }

  async cambiarEstadoTecnico(
    firestoreId: string,
    nuevoEstado: EstadoTecnico,
    usuarioMovimiento: { id: string, nombre: string },
    observaciones: string = '',
    ticketRelacionadoId?: string
  ): Promise<boolean> {
    try {
      const activoRef = doc(this.firestore, `${environment.collections.activos}/${firestoreId}`);
      const activoSnap = await getDoc(activoRef);

      if (!activoSnap.exists()) {
        throw new Error('Activo no encontrado');
      }

      const activo = activoSnap.data() as ActivoTI;
      const batch = writeBatch(this.firestore);
      const ahora = new Date();

      const updateData: any = {
        estadoTecnico: nuevoEstado,
        fechaModificacion: ahora
      };

      if (nuevoEstado === 'BAJA_TECNICA') {
        updateData.usuarioAsignadoId = null;
        updateData.usuarioAsignadoNombre = null;
        updateData.fechaAsignacion = null;
      }

      if (nuevoEstado === 'EN_REPARACION' && ticketRelacionadoId) {
        updateData.ticketReparacionId = ticketRelacionadoId;
      }

      if (activo.estadoTecnico === 'EN_REPARACION' && nuevoEstado !== 'EN_REPARACION') {
        updateData.ticketReparacionId = null;
      }

      batch.update(activoRef, updateData);

      const historialEvent = {
        activoId: activo.id,
        tipoEvento: 'CAMBIO_ESTADO',
        observaciones: observaciones || `Cambio de estado: ${activo.estadoTecnico} -> ${nuevoEstado}`,
        fechaMovimiento: ahora,
        usuarioMovimientoId: usuarioMovimiento.id,
        usuarioMovimientoNombre: usuarioMovimiento.nombre,
        estadoTecnico: nuevoEstado,
        usuarioAsignadoId: activo.usuarioAsignadoId || null,
        usuarioAsignadoNombre: activo.usuarioAsignadoNombre || null,
        ubicacionId: activo.ubicacionId || null,
        ubicacionNombre: activo.ubicacionNombre || null,
        ticketRelacionadoId: ticketRelacionadoId || null,
      };

      const historialRef = doc(collection(this.firestore, `${environment.collections.activos}/${firestoreId}/historial`));
      batch.set(historialRef, historialEvent);

      await batch.commit();
      return true;

    } catch (error) {
      console.error('Error al cambiar estado:', error);
      throw error;
    }
  }

  async cambiarUbicacion(
    firestoreId: string,
    nuevaUbicacion: { id: string, nombre: string },
    usuarioMovimiento: { id: string, nombre: string },
    observaciones: string = ''
  ): Promise<boolean> {
    try {
      const activoRef = doc(this.firestore, `${environment.collections.activos}/${firestoreId}`);
      const activoSnap = await getDoc(activoRef);

      if (!activoSnap.exists()) {
        throw new Error('Activo no encontrado');
      }

      const activo = activoSnap.data() as ActivoTI;
      const batch = writeBatch(this.firestore);
      const ahora = new Date();

      batch.update(activoRef, {
        ubicacionId: nuevaUbicacion.id,
        ubicacionNombre: nuevaUbicacion.nombre,
        fechaModificacion: ahora
      });

      const historialEvent = {
        activoId: activo.id,
        tipoEvento: 'CAMBIO_UBICACION',
        observaciones: observaciones || `Cambio de ubicación: ${activo.ubicacionNombre || 'N/A'} -> ${nuevaUbicacion.nombre}`,
        fechaMovimiento: ahora,
        usuarioMovimientoId: usuarioMovimiento.id,
        usuarioMovimientoNombre: usuarioMovimiento.nombre,
        estadoTecnico: activo.estadoTecnico,
        usuarioAsignadoId: activo.usuarioAsignadoId || null,
        usuarioAsignadoNombre: activo.usuarioAsignadoNombre || null,
        ubicacionId: nuevaUbicacion.id,
        ubicacionNombre: nuevaUbicacion.nombre,
      };

      const historialRef = doc(collection(this.firestore, `${environment.collections.activos}/${firestoreId}/historial`));
      batch.set(historialRef, historialEvent);

      await batch.commit();
      return true;

    } catch (error) {
      console.error('Error al cambiar ubicación:', error);
      throw error;
    }
  }

  // ==================== MÉTODOS DE EVIDENCIAS ====================

  async subirEvidencia(
    activoId: string,
    archivo: File,
    usuario: { id: string, nombre: string },
    descripcion?: string
  ): Promise<Evidencia> {
    try {
      this.validarArchivo(archivo);

      const extension = archivo.name.split('.').pop();
      const fileName = `${uuidv4()}.${extension}`;
      const filePath = `activos/${activoId}/evidencias/${fileName}`;
      const storageRef = ref(this.storage, filePath);
      const snapshot = await uploadBytes(storageRef, archivo);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      
      const evidencia: Evidencia = {
        id: uuidv4(),
        nombre: archivo.name,
        url: downloadUrl,
        tipo: archivo.type,
        tamaño: archivo.size,
        fechaSubida: new Date(),
        usuarioSubidaId: usuario.id,
        usuarioSubidaNombre: usuario.nombre,
        descripcion: descripcion,
        storagePath: filePath 
      };
      
      const activoRef = doc(this.firestore, `${environment.collections.activos}/${activoId}`);
      await updateDoc(activoRef, {
        evidencias: arrayUnion(evidencia)
      });
      
      await this.registrarEventoEvidencia(
        activoId, 
        'EVIDENCIA_AGREGADA', 
        `Se agregó evidencia: ${archivo.name}`,
        usuario,
        [evidencia.id]
      );
      
      return evidencia;
      
    } catch (error) {
      console.error('Error al subir evidencia:', error);
      throw error;
    }
  }

  async subirMultiplesEvidencias(
    activoId: string,
    archivos: File[],
    usuario: { id: string, nombre: string },
    descripcionGeneral?: string
  ): Promise<Evidencia[]> {
    const evidencias: Evidencia[] = [];
    const errores: { archivo: string, error: string }[] = [];

    for (const archivo of archivos) {
      try {
        const evidencia = await this.subirEvidencia(
          activoId, 
          archivo, 
          usuario, 
          descripcionGeneral ? `${descripcionGeneral} - ${archivo.name}` : undefined
        );
        evidencias.push(evidencia);
      } catch (error: any) {
        errores.push({
          archivo: archivo.name,
          error: error.message || 'Error al subir'
        });
      }
    }

    if (errores.length > 0) {
      throw {
        message: `Se subieron ${evidencias.length} archivos, ${errores.length} fallaron`,
        errores,
        evidencias
      };
    }

    return evidencias;
  }

  async eliminarEvidencia(
    activoId: string,
    evidencia: Evidencia,
    usuario: { id: string, nombre: string }
  ): Promise<void> {
    try {
      const batch = writeBatch(this.firestore);
      const ahora = new Date();

      if (evidencia.storagePath) {
        try {
          const storageRef = ref(this.storage, evidencia.storagePath);
          await deleteObject(storageRef);
        } catch (storageError) {
          console.warn('Error al eliminar archivo de Storage:', storageError);
        }
      } else {
        const pathFromUrl = this.getFilePathFromUrl(evidencia.url);
        if (pathFromUrl) {
          try {
            const storageRef = ref(this.storage, pathFromUrl);
            await deleteObject(storageRef);
          } catch (storageError) {
            console.warn('Error al eliminar archivo de Storage:', storageError);
          }
        }
      }
      
      const activoRef = doc(this.firestore, `${environment.collections.activos}/${activoId}`);
      const activoSnap = await getDoc(activoRef);
      
      if (!activoSnap.exists()) {
        throw new Error('Activo no encontrado');
      }
      
      const activoData = activoSnap.data() as ActivoTI;
      
      if (activoData.evidencias && activoData.evidencias.length > 0) {
        const evidenciasActualizadas = activoData.evidencias.filter(
          (e: Evidencia) => e.id !== evidencia.id
        );
        
        batch.update(activoRef, {
          evidencias: evidenciasActualizadas,
          fechaModificacion: ahora
        });
      }
      
      const historialRef = doc(collection(this.firestore, `${environment.collections.activos}/${activoId}/historial`));
      
      batch.set(historialRef, {
        activoId: activoId,
        tipoEvento: 'EVIDENCIA_ELIMINADA',
        observaciones: `Se eliminó evidencia: ${evidencia.nombre}`,
        fechaMovimiento: ahora,
        usuarioMovimientoId: usuario.id,
        usuarioMovimientoNombre: usuario.nombre,
        estadoTecnico: null,
        metadata: {
          evidenciaId: evidencia.id,
          evidenciaNombre: evidencia.nombre
        }
      });

      await batch.commit();
      
    } catch (error) {
      console.error('Error al eliminar evidencia:', error);
      throw error;
    }
  }

  async getEvidencias(activoId: string): Promise<Evidencia[]> {
    try {
      const activoRef = doc(this.firestore, `${environment.collections.activos}/${activoId}`);
      const activoSnap = await getDoc(activoRef);
      
      if (!activoSnap.exists()) {
        throw new Error('Activo no encontrado');
      }
      
      const activoData = activoSnap.data() as ActivoTI;
      return activoData.evidencias || [];
      
    } catch (error) {
      console.error('Error al obtener evidencias:', error);
      throw error;
    }
  }

  async actualizarDescripcionEvidencia(
    activoId: string,
    evidenciaId: string,
    nuevaDescripcion: string,
    usuario: { id: string, nombre: string }
  ): Promise<void> {
    try {
      const activoRef = doc(this.firestore, `${environment.collections.activos}/${activoId}`);
      const activoSnap = await getDoc(activoRef);
      
      if (!activoSnap.exists()) {
        throw new Error('Activo no encontrado');
      }
      
      const activoData = activoSnap.data() as ActivoTI;
      
      if (!activoData.evidencias) {
        throw new Error('El activo no tiene evidencias');
      }
      
      const evidenciasActualizadas = activoData.evidencias.map(ev => {
        if (ev.id === evidenciaId) {
          return { ...ev, descripcion: nuevaDescripcion };
        }
        return ev;
      });
      
      await updateDoc(activoRef, {
        evidencias: evidenciasActualizadas,
        fechaModificacion: new Date()
      });
      
    } catch (error) {
      console.error('Error al actualizar descripción:', error);
      throw error;
    }
  }

  private async registrarEventoEvidencia(
    activoId: string,
    tipoEvento: string,
    observaciones: string,
    usuario: { id: string, nombre: string },
    evidenciaIds: string[]
  ): Promise<void> {
    try {
      const historialRef = collection(this.firestore, `${environment.collections.activos}/${activoId}/historial`);
      
      await addDoc(historialRef, {
        activoId: activoId,
        tipoEvento: tipoEvento,
        observaciones: observaciones,
        fechaMovimiento: new Date(),
        usuarioMovimientoId: usuario.id,
        usuarioMovimientoNombre: usuario.nombre,
        evidenciaIds: evidenciaIds,
        estadoTecnico: null
      });
      
    } catch (error) {
      console.error('Error al registrar evento de evidencia:', error);
    }
  }

  private validarArchivo(archivo: File): void {
    const tiposPermitidos = [
      'image/jpeg', 
      'image/png', 
      'image/gif', 
      'image/webp', 
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (!tiposPermitidos.includes(archivo.type)) {
      throw new Error(`Tipo de archivo no permitido: ${archivo.type}. Solo imágenes, PDF y documentos de Office`);
    }

    const maxSize = 20 * 1024 * 1024;
    if (archivo.size > maxSize) {
      throw new Error(`El archivo no puede ser mayor a 20MB (tamaño actual: ${(archivo.size / 1024 / 1024).toFixed(2)}MB)`);
    }
  }

  private getFilePathFromUrl(url: string): string | null {
    try {
      const decodedUrl = decodeURIComponent(url);
      const match = decodedUrl.match(/\/o\/(.+?)\?/);
      if (match && match[1]) {
        return match[1];
      }
      return null;
    } catch {
      return null;
    }
  }

  async getEstadisticasEvidencias(activoId: string): Promise<{
    total: number,
    imagenes: number,
    documentos: number,
    pesoTotal: number,
    ultimaSubida: Date | null
  }> {
    try {
      const evidencias = await this.getEvidencias(activoId);
      
      const estadisticas = {
        total: evidencias.length,
        imagenes: evidencias.filter(e => e.tipo.startsWith('image/')).length,
        documentos: evidencias.filter(e => !e.tipo.startsWith('image/')).length,
        pesoTotal: evidencias.reduce((sum, e) => sum + (e.tamaño || 0), 0),
        ultimaSubida: evidencias.length > 0 
          ? new Date(Math.max(...evidencias.map(e => new Date(e.fechaSubida).getTime())))
          : null
      };
      
      return estadisticas;
      
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      throw error;
    }
  }
  
  async tieneEvidencias(activoId: string): Promise<boolean> {
    try {
      const evidencias = await this.getEvidencias(activoId);
      return evidencias.length > 0;
    } catch {
      return false;
    }
  }
  
}