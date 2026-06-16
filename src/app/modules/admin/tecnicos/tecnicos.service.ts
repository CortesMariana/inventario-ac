import { Injectable } from '@angular/core';
import { collection, Firestore, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where } from '@angular/fire/firestore';
import { Observable, from, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Tecnico } from './models/tecnico.model';
import { ContadorTecnicosService } from '../empleados/contador-tecnicos.service';
import { PermisosService } from '../empleados/permisos.service';

@Injectable({
  providedIn: 'root'
})
export class TecnicoService {
  
  constructor(
    private firestore: Firestore,
    private contadorTecnicosService: ContadorTecnicosService,
    private permisosService: PermisosService 
  ) { }

  getTecnicos(): Observable<Tecnico[]> {
    const collectionRef = collection(this.firestore, `${environment.collections.tecnicos}`);
    
    return from(getDocs(collectionRef)).pipe(
      map(snapshot => {
        const data: Tecnico[] = [];
        snapshot.forEach((doc) => {
          const docData = doc.data() as any;
          if (docData.fechaCreacion) {
            docData.fechaCreacion = this.convertirFecha(docData.fechaCreacion);
          }
          data.push({ 
            firestoreId: doc.id, 
            ...docData
          } as Tecnico);
        });
        return data.sort((a, b) => {
          const numA = a.numeroConsecutivo || 0;
          const numB = b.numeroConsecutivo || 0;
          return numA - numB;
        });
      })
    );
  }

  async addTecnico(tecnico: Tecnico): Promise<string> {
    try {
      const tecnicoId = await this.contadorTecnicosService.getNextTecnicoId();
      const match = tecnicoId.match(/TEC-(\d+)/);
      const numeroConsecutivo = match ? parseInt(match[1], 10) : 0;
      const collectionRef = collection(this.firestore, `${environment.collections.tecnicos}`);
      
      if (!tecnico.empleadoId || !tecnico.nombre || !tecnico.tipo) {
        throw new Error('Datos incompletos para crear técnico');
      }
      
      const tecnicoData = {
        tecnicoId: tecnicoId,
        numeroConsecutivo: numeroConsecutivo,
        empleadoId: tecnico.empleadoId,
        nombre: tecnico.nombre,
        tipo: tecnico.tipo,
        fechaCreacion: new Date(),
        activo: true
      };
      
      const docRef = await addDoc(collectionRef, tecnicoData);
      
      try {
        await this.permisosService.asignarPermisoTecnico(tecnico.empleadoId, tecnico.nombre);
        console.log('Permisos de técnico asignados correctamente');
      } catch (permisoError) {
        console.error('Error al asignar permisos de técnico:', permisoError);
      }
      
      return docRef.id;
      
    } catch (error) {
      console.error('Error al agregar técnico:', error);
      throw error;
    }
  }

  async deleteTecnico(firestoreId: string, empleadoId?: string): Promise<void> {
    try {
      const docRef = doc(this.firestore, `${environment.collections.tecnicos}`, firestoreId);
      await deleteDoc(docRef);
      
      if (empleadoId) {
        try {
          await this.permisosService.removerPermisoTecnico(empleadoId);
          console.log('Permisos de técnico removidos correctamente');
        } catch (permisoError) {
          console.error('Error al remover permisos de técnico:', permisoError);
        }
      }
      
    } catch (error) {
      console.error('Error al eliminar técnico:', error);
      throw error;
    }
  }

  deleteTecnicoOld(firestoreId: string): Observable<void> {
    return from(this.deleteTecnico(firestoreId));
  }

  updateTecnico(firestoreId: string, data: Partial<Tecnico>): Observable<void> {
    const docRef = doc(this.firestore, `${environment.collections.tecnicos}`, firestoreId);
    return from(updateDoc(docRef, data));
  }

  async isEmpleadoTecnico(empleadoId: string): Promise<boolean> {
    try {
      if (!empleadoId || empleadoId.trim() === '') {
        console.warn('EmpleadoId inválido:', empleadoId);
        return false;
      }
      
      const collectionRef = collection(this.firestore, `${environment.collections.tecnicos}`);
      const q = query(collectionRef, where('empleadoId', '==', empleadoId));
      const querySnapshot = await getDocs(q);
      
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error verificando técnico:', error);
      return false;
    }
  }

  private convertirFecha(fecha: any): Date {
    if (fecha && fecha.toDate) {
      return fecha.toDate();
    } else if (fecha && fecha.seconds) {
      return new Date(fecha.seconds * 1000);
    } else if (typeof fecha === 'string') {
      return new Date(fecha);
    }
    return fecha;
  }
}