import { Injectable } from '@angular/core';
import { collection, Firestore, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy, where } from '@angular/fire/firestore';
import { environment } from 'src/environments/environment';
import { TipoSolicitud, TipoSolicitudView } from './models/tipo-solicitud.model';
import { Observable, from, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TiposSolicitudService {
  
  private collectionName = environment.collections.tipos_solicitud_rh;

  constructor(private firestore: Firestore) {}

  async getTiposActivos(): Promise<TipoSolicitudView[]> {
    try {
      const collectionRef = collection(this.firestore, this.collectionName);
      const q = query(
        collectionRef, 
        where('activo', '==', true),
        orderBy('orden', 'asc')
      );
      
      const querySnapshot = await getDocs(q);
      const tipos: TipoSolicitudView[] = [];
      
      querySnapshot.forEach(doc => {
        const data = doc.data() as TipoSolicitud;
        tipos.push({
          label: data.etiqueta,
          value: data.valor,
          icon: data.icono,
          color: data.color,
          descripcion: data.descripcion
        });
      });
      
      return tipos;
    } catch (error) {
      console.error('Error al cargar tipos de solicitud:', error);
      return this.getTiposDefault();
    }
  }

  async getTodosLosTipos(): Promise<TipoSolicitud[]> {
    try {
      const collectionRef = collection(this.firestore, this.collectionName);
      const q = query(collectionRef, orderBy('orden', 'asc'));
      
      const querySnapshot = await getDocs(q);
      const tipos: TipoSolicitud[] = [];
      
      querySnapshot.forEach(doc => {
        tipos.push({
          firestoreId: doc.id,
          ...doc.data() as TipoSolicitud
        });
      });
      
      return tipos;
    } catch (error) {
      console.error('Error al cargar tipos:', error);
      return [];
    }
  }

  async guardarTipo(tipo: Partial<TipoSolicitud>): Promise<string> {
    try {
      const tipoData = {
        ...tipo,
        fechaCreacion: new Date()
      };
      
      const collectionRef = collection(this.firestore, this.collectionName);
      const docRef = await addDoc(collectionRef, tipoData);
      return docRef.id;
    } catch (error) {
      console.error('Error al guardar tipo:', error);
      throw error;
    }
  }

  async actualizarTipo(firestoreId: string, tipo: Partial<TipoSolicitud>): Promise<void> {
    try {
      const docRef = doc(this.firestore, this.collectionName, firestoreId);
      await updateDoc(docRef, {
        ...tipo,
        fechaModificacion: new Date()
      });
    } catch (error) {
      console.error('Error al actualizar tipo:', error);
      throw error;
    }
  }

  async eliminarTipo(firestoreId: string): Promise<void> {
    try {
      const docRef = doc(this.firestore, this.collectionName, firestoreId);
      await updateDoc(docRef, { activo: false });
    } catch (error) {
      console.error('Error al eliminar tipo:', error);
      throw error;
    }
  }

  getTiposDefault(): TipoSolicitudView[] {
    return [
      { label: 'Vacaciones', value: 'vacaciones', icon: 'pi pi-sun', color: '#4299e1' },
      { label: 'Permiso', value: 'permiso', icon: 'pi pi-calendar-plus', color: '#48bb78' },
      { label: 'Incapacidad', value: 'incapacidad', icon: 'pi pi-heart', color: '#f56565' },
      { label: 'Préstamo', value: 'prestamo', icon: 'pi pi-credit-card', color: '#9f7aea' },
      { label: 'Constancia', value: 'constancia', icon: 'pi pi-file-pdf', color: '#ed8936' },
      { label: 'Cambio de datos', value: 'cambio-datos', icon: 'pi pi-pencil', color: '#667eea' },
      { label: 'Otro', value: 'otro', icon: 'pi pi-file', color: '#a0aec0' }
    ];
  }

  async inicializarTiposDefault() {
    const tipos = await this.getTodosLosTipos();
    if (tipos.length === 0) {
      const defaults = this.getTiposDefault();
      for (let i = 0; i < defaults.length; i++) {
        const def = defaults[i];
        await this.guardarTipo({
          valor: def.value,
          etiqueta: def.label,
          icono: def.icon,
          color: def.color,
          orden: i,
          activo: true,
          requiereAprobacion: true,
          fechaCreacion: new Date()
        });
      }
      console.log('Tipos de solicitud inicializados');
    }
  }
}