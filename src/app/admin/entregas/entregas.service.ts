import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  docData,
  addDoc,
  updateDoc,
  query,
  orderBy,
  where
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface Entrega {
  id?: string;
  pedidoId: string;
  clienteNombre: string;
  clienteId: string;
  sucursalId: string;
  sucursal: string;
  repartidorId?: string;
  repartidorNombre?: string;
  estado: 'asignado' | 'en_transito' | 'entregado';
  fechaAsignacion?: any;
  fechaEntrega?: any;
  observaciones?: string;
}

@Injectable({ providedIn: 'root' })
export class EntregasService {

  private col = environment.collections.entregas;

  constructor(private firestore: Firestore) {}

  getAll$(): Observable<Entrega[]> {
    const ref = collection(this.firestore, this.col);
    const q = query(ref, orderBy('fechaAsignacion', 'desc'));
    return collectionData(q, { idField: 'id' }) as Observable<Entrega[]>;
  }

  getById$(id: string): Observable<Entrega> {
    const ref = doc(this.firestore, `${this.col}/${id}`);
    return docData(ref as any, { idField: 'id' }) as Observable<Entrega>;
  }

  getByEstado$(estado: string): Observable<Entrega[]> {
    const ref = collection(this.firestore, this.col);
    const q = query(
      ref,
      where('estado', '==', estado),
      orderBy('fechaAsignacion', 'desc')
    );
    return collectionData(q, { idField: 'id' }) as Observable<Entrega[]>;
  }

  create(entrega: Entrega): Promise<any> {
    const ref = collection(this.firestore, this.col);
    return addDoc(ref, { ...entrega, fechaAsignacion: new Date() });
  }

  marcarEnTransito(id: string, repartidorNombre: string): Promise<void> {
    const ref = doc(this.firestore, `${this.col}/${id}`);
    return updateDoc(ref, {
      estado: 'en_transito',
      repartidorNombre,
      fechaAsignacion: new Date()
    });
  }

  marcarEntregado(id: string, observaciones?: string): Promise<void> {
    const ref = doc(this.firestore, `${this.col}/${id}`);
    return updateDoc(ref, {
      estado: 'entregado',
      fechaEntrega: new Date(),
      observaciones: observaciones ?? ''
    });
  }

  updateEstado(id: string, estado: Entrega['estado']): Promise<void> {
    const ref = doc(this.firestore, `${this.col}/${id}`);
    return updateDoc(ref, { estado });
  }
}