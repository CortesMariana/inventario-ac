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
  where,
  runTransaction
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface ProductoPedido {
  productoId: string;
  nombreProducto: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface Pedido {
  id?: string;
  clienteId: string;
  clienteNombre: string;
  clienteRfc: string;
  descuentoCliente: number;
  sucursalId: string;
  sucursal: string;
  productos: ProductoPedido[];
  subtotal: number;
  descuento: number;
  total: number;
  totalProductos: number;
  estado: 'pendiente' | 'en_transito' | 'entregado' | 'cancelado' | 'sin_stock';
  fechaCreacion?: any;
  fechaActualizacion?: any;
}

@Injectable({ providedIn: 'root' })
export class PedidosService {

  private col = environment.collections.pedidos;
  private colInventario = environment.collections.inventario;

  constructor(private firestore: Firestore) {}

  getAll$(): Observable<Pedido[]> {
    const ref = collection(this.firestore, this.col);
    const q = query(ref, orderBy('fechaCreacion', 'desc'));
    return collectionData(q as any, { idField: 'id' }) as Observable<Pedido[]>;
  }

  getById$(id: string): Observable<Pedido> {
    const ref = doc(this.firestore, `${this.col}/${id}`);
    return docData(ref as any, { idField: 'id' }) as Observable<Pedido>;
  }

  getByEstado$(estado: string): Observable<Pedido[]> {
    const ref = collection(this.firestore, this.col);
    const q = query(ref, where('estado', '==', estado), orderBy('fechaCreacion', 'desc'));
    return collectionData(q, { idField: 'id' }) as Observable<Pedido[]>;
  }

  async create(pedido: Pedido): Promise<any> {
    // Transacción atómica: verifica stock y crea pedido
    return runTransaction(this.firestore, async (transaction) => {
      // Verifica stock de cada producto
      for (const item of pedido.productos) {
        const invRef = doc(
          this.firestore,
          `${this.colInventario}/${pedido.sucursalId}_${item.productoId}`
        );
        const invSnap = await transaction.get(invRef);
        if (!invSnap.exists()) throw new Error(`Producto ${item.nombreProducto} no encontrado en inventario`);

        const stockActual = invSnap.data()['stock'] ?? 0;
        if (stockActual < item.cantidad) {
          throw new Error(`Stock insuficiente para ${item.nombreProducto}. Disponible: ${stockActual}`);
        }
      }

      // Descuenta stock
      for (const item of pedido.productos) {
        const invRef = doc(
          this.firestore,
          `${this.colInventario}/${pedido.sucursalId}_${item.productoId}`
        );
        const invSnap = await transaction.get(invRef);
        const stockActual = invSnap.data()!['stock'] ?? 0;
        transaction.update(invRef, { stock: stockActual - item.cantidad, fechaActualizacion: new Date() });
      }

      // Crea el pedido
      const pedidoRef = doc(collection(this.firestore, this.col));
      transaction.set(pedidoRef, { ...pedido, fechaCreacion: new Date(), fechaActualizacion: new Date() });
      return pedidoRef;
    });
  }

  updateEstado(id: string, estado: Pedido['estado']): Promise<void> {
    const ref = doc(this.firestore, `${this.col}/${id}`);
    return updateDoc(ref, { estado, fechaActualizacion: new Date() });
  }

  cancelar(id: string): Promise<void> {
    return this.updateEstado(id, 'cancelado');
  }
}