import { Injectable } from '@angular/core';
import { Firestore, collection, doc, getDocs, updateDoc, arrayUnion, query, where } from '@angular/fire/firestore';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PermisosService {
  
  constructor(private firestore: Firestore) {}

  async asignarPermisoTecnico(empleadoId: string, nombreEmpleado: string): Promise<void> {
    try {
      const permisosRef = collection(this.firestore, environment.collections.permisos);
      const querySnapshot = await getDocs(permisosRef);
      
      if (querySnapshot.empty) {
        await this.crearPrimerPermiso(empleadoId, nombreEmpleado);
      } else {
        const permisoDoc = querySnapshot.docs[0];
        await this.agregarATecnicos(permisoDoc.id, empleadoId, nombreEmpleado);
      }
      
      console.log(`Permiso de técnico asignado a ${nombreEmpleado} (${empleadoId})`);
      
    } catch (error) {
      console.error('Error al asignar permiso de técnico:', error);
      throw error;
    }
  }

  private async crearPrimerPermiso(empleadoId: string, nombreEmpleado: string): Promise<void> {
    const permisosRef = collection(this.firestore, environment.collections.permisos);
    
    const nuevoPermiso = {
      idsAutorizadosAdmin: [], 
      idsAutorizadosTec: [{
        id: empleadoId,
        usuario: nombreEmpleado
      }]
    };
    
    await updateDoc(doc(permisosRef), nuevoPermiso);
  }

  private async agregarATecnicos(docId: string, empleadoId: string, nombreEmpleado: string): Promise<void> {
    const permisoRef = doc(this.firestore, `${environment.collections.permisos}`, docId);
    
    await updateDoc(permisoRef, {
      idsAutorizadosTec: arrayUnion({
        id: empleadoId,
        usuario: nombreEmpleado
      })
    });
  }

  async tienePermisoTecnico(empleadoId: string): Promise<boolean> {
    try {
      const permisosRef = collection(this.firestore, environment.collections.permisos);
      const querySnapshot = await getDocs(permisosRef);
      
      if (querySnapshot.empty) return false;
      
      const permisoDoc = querySnapshot.docs[0];
      const data = permisoDoc.data();
      const tecnicos = data['idsAutorizadosTec'] || [];
      
      return tecnicos.some((t: any) => t.id === empleadoId);
      
    } catch (error) {
      console.error('Error al verificar permiso de técnico:', error);
      return false;
    }
  }

  async removerPermisoTecnico(empleadoId: string): Promise<void> {
    try {
      const permisosRef = collection(this.firestore, environment.collections.permisos);
      const querySnapshot = await getDocs(permisosRef);
      
      if (querySnapshot.empty) return;
      
      const permisoDoc = querySnapshot.docs[0];
      const data = permisoDoc.data();
      const tecnicosActuales = data['idsAutorizadosTec'] || [];
      const tecnicosActualizados = tecnicosActuales.filter((t: any) => t.id !== empleadoId);
      
      await updateDoc(doc(this.firestore, `${environment.collections.permisos}`, permisoDoc.id), {
        idsAutorizadosTec: tecnicosActualizados
      });
      
    } catch (error) {
      console.error('Error al remover permiso de técnico:', error);
      throw error;
    }
  }
}