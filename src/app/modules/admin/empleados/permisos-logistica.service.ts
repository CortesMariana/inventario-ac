import { Injectable } from '@angular/core';
import { Firestore, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from '@angular/fire/firestore';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PermisosLogisticaService {
  private readonly COLLECTION = environment.collections.permisos_logistica || '/permisos-logistica';
  private readonly DOC_ID = 'permisos';

  constructor(private firestore: Firestore) { }

  private async getPermisosDoc() {
    const docRef = doc(this.firestore, this.COLLECTION, this.DOC_ID);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      const initialData = {
        idsAutorizadosAdmin: [],
        idsAutorizadosTecnico: []
      };
      await setDoc(docRef, initialData);
      return initialData;
    }
    
    return docSnap.data();
  }

  async getAdmins(): Promise<Array<{ id: string; nombre: string }>> {
    const data = await this.getPermisosDoc();
    return data['idsAutorizadosAdmin'] || [];
  }

  async getTecnicos(): Promise<Array<{ id: string; nombre: string }>> {
    const data = await this.getPermisosDoc();
    return data['idsAutorizadosTecnico'] || [];
  }

  async esAdmin(empleadoId: string): Promise<boolean> {
    const admins = await this.getAdmins();
    return admins.some(admin => admin.id === empleadoId);
  }

  async esTecnico(empleadoId: string): Promise<boolean> {
    const tecnicos = await this.getTecnicos();
    return tecnicos.some(tecnico => tecnico.id === empleadoId);
  }

  async agregarAdmin(empleadoId: string, nombre: string): Promise<void> {
    const docRef = doc(this.firestore, this.COLLECTION, this.DOC_ID);
    await updateDoc(docRef, {
      idsAutorizadosAdmin: arrayUnion({ id: empleadoId, nombre })
    });
  }

  async agregarTecnico(empleadoId: string, nombre: string): Promise<void> {
    const docRef = doc(this.firestore, this.COLLECTION, this.DOC_ID);
    await updateDoc(docRef, {
      idsAutorizadosTecnico: arrayUnion({ id: empleadoId, nombre })
    });
  }

  async removerAdmin(empleadoId: string): Promise<void> {
    const admins = await this.getAdmins();
    const adminToRemove = admins.find(a => a.id === empleadoId);
    if (adminToRemove) {
      const docRef = doc(this.firestore, this.COLLECTION, this.DOC_ID);
      await updateDoc(docRef, {
        idsAutorizadosAdmin: arrayRemove(adminToRemove)
      });
    }
  }

  async removerTecnico(empleadoId: string): Promise<void> {
    const tecnicos = await this.getTecnicos();
    const tecnicoToRemove = tecnicos.find(t => t.id === empleadoId);
    if (tecnicoToRemove) {
      const docRef = doc(this.firestore, this.COLLECTION, this.DOC_ID);
      await updateDoc(docRef, {
        idsAutorizadosTecnico: arrayRemove(tecnicoToRemove)
      });
    }
  }

  async tienePermiso(empleadoId: string, rol: 'admin' | 'tecnico'): Promise<boolean> {
    if (rol === 'admin') {
      return this.esAdmin(empleadoId);
    }
    return this.esTecnico(empleadoId);
  }

  async yaEsTecnico(empleadoId: string): Promise<boolean> {
    return this.esTecnico(empleadoId);
  }
}