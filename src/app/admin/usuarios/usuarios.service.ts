import { Injectable, EnvironmentInjector, runInInjectionContext } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy
} from '@angular/fire/firestore';
import { Auth, createUserWithEmailAndPassword } from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export type RolUsuario = 'admin' | 'gerente' | 'cajero' | 'repartidor';

export interface Usuario {
  id?: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
  sucursalId?: string;
  sucursal?: string;
  activo: boolean;
  fechaCreacion?: any;
}

@Injectable({ providedIn: 'root' })
export class UsuariosService {

  private col = environment.collections.usuarios;

  constructor(
    private firestore: Firestore,
    private auth: Auth,
    private injector: EnvironmentInjector
  ) {}

  // Helper para no repetir runInInjectionContext en cada método
  private runInContext<T>(fn: () => T): T {
    return runInInjectionContext(this.injector, fn);
  }

  getAll$(): Observable<Usuario[]> {
    return this.runInContext(() => {
      const ref = collection(this.firestore, this.col);
      const q = query(ref, orderBy('nombre', 'asc'));
      return collectionData(q, { idField: 'id' }) as Observable<Usuario[]>;
    });
  }

  getById$(id: string): Observable<Usuario> {
    return this.runInContext(() => {
      const ref = doc(this.firestore, `${this.col}/${id}`);
      return docData(ref, { idField: 'id' }) as Observable<Usuario>;
    });
  }

  async create(usuario: Usuario, password: string): Promise<void> {
    return this.runInContext(async () => {
      const cred = await createUserWithEmailAndPassword(
        this.auth,
        usuario.email,
        password
      );
      const ref = doc(this.firestore, `${this.col}/${cred.user.uid}`);
      await setDoc(ref, {
        ...usuario,
        id: cred.user.uid,
        fechaCreacion: new Date()
      });
    });
  }

  update(id: string, usuario: Partial<Usuario>): Promise<void> {
    return this.runInContext(() => {
      const ref = doc(this.firestore, `${this.col}/${id}`);
      return updateDoc(ref, { ...usuario });
    });
  }

  toggleActivo(id: string, activo: boolean): Promise<void> {
    return this.runInContext(() => {
      const ref = doc(this.firestore, `${this.col}/${id}`);
      return updateDoc(ref, { activo });
    });
  }

  delete(id: string): Promise<void> {
    return this.runInContext(() => {
      const ref = doc(this.firestore, `${this.col}/${id}`);
      return deleteDoc(ref);
    });
  }
}