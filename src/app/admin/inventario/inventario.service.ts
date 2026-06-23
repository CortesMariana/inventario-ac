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
  orderBy,
  where
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface Producto {
  id?: string;
  nombre: string;
  descripcion: string;
  codigoBarras: string;
  costoUnitario: number;
  precioVenta: number;
  unidadMedida: string;
  activo: boolean;
  fechaCreacion?: Date;
}

export interface InventarioItem {
  id?: string;
  productoId: string;
  nombreProducto: string;
  sucursalId: string;
  sucursal: string;
  stock: number;
  stockMinimo: number;
  fechaActualizacion?: Date;
}

@Injectable({ providedIn: 'root' })
export class InventarioService {

  private colProductos  = environment.collections.productos;
  private colInventario = environment.collections.inventario;

  constructor(private firestore: Firestore) {}

  // Productos
  getProductos$(): Observable<Producto[]> {
    const ref = collection(this.firestore, this.colProductos);
    const q = query(ref, orderBy('nombre', 'asc'));
    return collectionData(q, { idField: 'id' }) as Observable<Producto[]>;
  }

  getProductoById$(id: string): Observable<Producto> {
    const ref = doc(this.firestore, `${this.colProductos}/${id}`);
    return docData(ref as any, { idField: 'id' }) as Observable<Producto>;
  }

  createProducto(producto: Producto): Promise<any> {
    const ref = collection(this.firestore, this.colProductos);
    return addDoc(ref, { ...producto, fechaCreacion: new Date() });
  }

  updateProducto(id: string, producto: Partial<Producto>): Promise<void> {
    const ref = doc(this.firestore, `${this.colProductos}/${id}`);
    return updateDoc(ref, { ...producto });
  }

  deleteProducto(id: string): Promise<void> {
    const ref = doc(this.firestore, `${this.colProductos}/${id}`);
    return deleteDoc(ref);
  }

  // Inventario por sucursal
  getInventario$(): Observable<InventarioItem[]> {
    const ref = collection(this.firestore, this.colInventario);
    const q = query(ref, orderBy('nombreProducto', 'asc'));
    return collectionData(q as any, { idField: 'id' }) as Observable<InventarioItem[]>;
  }

  getInventarioById$(id: string): Observable<InventarioItem> {
    const ref = doc(this.firestore, `${this.colInventario}/${id}`);
    return docData(ref as any, { idField: 'id' }) as Observable<InventarioItem>;
  }

  getInventarioBySucursal$(sucursalId: string): Observable<InventarioItem[]> {
    const ref = collection(this.firestore, this.colInventario);
    const q = query(ref, where('sucursalId', '==', sucursalId), orderBy('nombreProducto', 'asc'));
    return collectionData(q, { idField: 'id' }) as Observable<InventarioItem[]>;
  }

  getInventarioEnAlerta$(): Observable<InventarioItem[]> {
    const ref = collection(this.firestore, this.colInventario);
    const q = query(ref, where('stock', '<=', 5), orderBy('stock', 'asc'));
    return collectionData(q, { idField: 'id' }) as Observable<InventarioItem[]>;
  }

  updateStock(id: string, stock: number): Promise<void> {
    const ref = doc(this.firestore, `${this.colInventario}/${id}`);
    return updateDoc(ref, { stock, fechaActualizacion: new Date() });
  }

  createInventarioItem(item: InventarioItem): Promise<any> {
    const ref = collection(this.firestore, this.colInventario);
    return addDoc(ref, { ...item, fechaActualizacion: new Date() });
  }

  updateInventarioItem(id: string, item: Partial<InventarioItem>): Promise<void> {
    const ref = doc(this.firestore, `${this.colInventario}/${id}`);
    return updateDoc(ref, { ...item, fechaActualizacion: new Date() });
  }

  deleteInventarioItem(id: string): Promise<void> {
    const ref = doc(this.firestore, `${this.colInventario}/${id}`);
    return deleteDoc(ref);
  }
}
