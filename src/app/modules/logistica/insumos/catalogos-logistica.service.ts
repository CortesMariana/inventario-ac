import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  getDocs,
  orderBy,
  query,
} from '@angular/fire/firestore';
import { v4 as uuidv4 } from 'uuid';
import { CatalogoItemLogistica } from './models/insumo-logistica.model';

@Injectable({
  providedIn: 'root',
})
export class CatalogosLogisticaService {
  private familiasCollection = collection(this.firestore, 'familias');
  private marcasCollection   = collection(this.firestore, 'marcas');

  constructor(private firestore: Firestore) {}

  async getFamilias(): Promise<CatalogoItemLogistica[]> {
    try {
      const q = query(this.familiasCollection, orderBy('nombre', 'asc'));
      const snap = await getDocs(q);
      return snap.docs.map((doc) => ({
        firestoreId: doc.id,
        ...(doc.data() as CatalogoItemLogistica),
      }));
    } catch (error) {
      console.error('Error al obtener familias:', error);
      throw error;
    }
  }

  async createFamilia(nombre: string): Promise<CatalogoItemLogistica> {
    try {
      const item: CatalogoItemLogistica = { id: uuidv4(), nombre: nombre.trim() };
      const docRef = await addDoc(this.familiasCollection, item);
      return { ...item, firestoreId: docRef.id };
    } catch (error) {
      console.error('Error al crear familia:', error);
      throw error;
    }
  }

  async getMarcas(): Promise<CatalogoItemLogistica[]> {
    try {
      const q = query(this.marcasCollection, orderBy('nombre', 'asc'));
      const snap = await getDocs(q);
      return snap.docs.map((doc) => ({
        firestoreId: doc.id,
        ...(doc.data() as CatalogoItemLogistica),
      }));
    } catch (error) {
      console.error('Error al obtener marcas:', error);
      throw error;
    }
  }

  async createMarca(nombre: string): Promise<CatalogoItemLogistica> {
    try {
      const item: CatalogoItemLogistica = { id: uuidv4(), nombre: nombre.trim() };
      const docRef = await addDoc(this.marcasCollection, item);
      return { ...item, firestoreId: docRef.id };
    } catch (error) {
      console.error('Error al crear marca:', error);
      throw error;
    }
  }
}
