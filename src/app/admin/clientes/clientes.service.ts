import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface Cliente {
  id?: string;
  nombre: string;
  rfc: string;
  direccion: string;
  telefono: string;
  descuento: number;
  activo: boolean;
  fechaCreacion?: Date;
}

@Injectable({ providedIn: 'root' })
export class ClientesService {

  private col = environment.collections.clientes;

  constructor(private firestore: Firestore) {}

  getAll$(): Observable<Cliente[]> {
    const ref = collection(this.firestore, this.col);
    const q = query(ref, orderBy('nombre', 'asc'));
    return collectionData(q, { idField: 'id' }) as Observable<Cliente[]>;
  }

  getById$(id: string): Observable<Cliente> {
    const ref = doc(this.firestore, `${this.col}/${id}`);
    return docData(ref as any, { idField: 'id' }) as Observable<Cliente>;
  }

  create(cliente: Cliente): Promise<any> {
    const ref = collection(this.firestore, this.col);
    return addDoc(ref, { ...cliente, fechaCreacion: new Date() });
  }

  update(id: string, cliente: Partial<Cliente>): Promise<void> {
    const ref = doc(this.firestore, `${this.col}/${id}`);
    return updateDoc(ref, { ...cliente });
  }

  delete(id: string): Promise<void> {
    const ref = doc(this.firestore, `${this.col}/${id}`);
    return deleteDoc(ref);
  }
}