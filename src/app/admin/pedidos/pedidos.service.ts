import { Injectable, EnvironmentInjector, runInInjectionContext } from '@angular/core';
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
import { InventarioItem } from '../inventario/inventario.service';

export interface ProductoPedido {
  productoId: string;
  inventarioItemId: string;
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
  clienteEmail?: string;
  descuentoCliente: number;
  tipoPedido: 'factura' | 'consigna';
  sucursalId: string;
  sucursal: string;
  productos: ProductoPedido[];
  subtotal: number;
  descuento: number;
  total: number;
  totalProductos: number;
  estado: 'en_revision' | 'pendiente' | 'en_transito' | 'entregado' | 'cancelado' | 'sin_stock';
  fechaCreacion?: any;
  fechaActualizacion?: any;
}

@Injectable({ providedIn: 'root' })
export class PedidosService {

  private col           = environment.collections.pedidos;
  private colInventario = environment.collections.inventario;
  private colNotifProd  = 'notificaciones_produccion';
  private colMail       = 'mail';

  constructor(
    private firestore: Firestore,
    private injector: EnvironmentInjector
  ) {}

  private run<T>(fn: () => T): T {
    return runInInjectionContext(this.injector, fn);
  }

  getAll$(): Observable<Pedido[]> {
    return this.run(() => {
      const ref = collection(this.firestore, this.col);
      const q = query(ref, orderBy('fechaCreacion', 'desc'));
      return collectionData(q as any, { idField: 'id' }) as Observable<Pedido[]>;
    });
  }

  getById$(id: string): Observable<Pedido> {
    return this.run(() => {
      const ref = doc(this.firestore, `${this.col}/${id}`);
      return docData(ref as any, { idField: 'id' }) as Observable<Pedido>;
    });
  }

  getByEstado$(estado: string): Observable<Pedido[]> {
    return this.run(() => {
      const ref = collection(this.firestore, this.col);
      const q = query(ref, where('estado', '==', estado), orderBy('fechaCreacion', 'desc'));
      return collectionData(q, { idField: 'id' }) as Observable<Pedido[]>;
    });
  }

  async create(pedido: Pedido): Promise<any> {
    return this.run(() =>
      runTransaction(this.firestore, async (transaction) => {
        // Verifica stock usando el ID real del documento de inventario
        for (const item of pedido.productos) {
          const invRef = doc(this.firestore, `${this.colInventario}/${item.inventarioItemId}`);
          const invSnap = await transaction.get(invRef);

          if (!invSnap.exists()) {
            throw new Error(`Producto "${item.nombreProducto}" no encontrado en el inventario de esta sucursal`);
          }

          const stockActual = invSnap.data()['stock'] ?? 0;
          if (stockActual < item.cantidad) {
            throw new Error(`Stock insuficiente para "${item.nombreProducto}". Disponible: ${stockActual}`);
          }
        }

        // Descuenta stock
        for (const item of pedido.productos) {
          const invRef = doc(this.firestore, `${this.colInventario}/${item.inventarioItemId}`);
          const invSnap = await transaction.get(invRef);
          const stockActual = invSnap.data()!['stock'] ?? 0;
          transaction.update(invRef, {
            stock: stockActual - item.cantidad,
            fechaActualizacion: new Date()
          });
        }

        // Crea el pedido
        const pedidoRef = doc(collection(this.firestore, this.col));
        transaction.set(pedidoRef, {
          ...pedido,
          fechaCreacion: new Date(),
          fechaActualizacion: new Date()
        });
        return pedidoRef;
      })
    );
  }

  updateEstado(id: string, estado: Pedido['estado']): Promise<void> {
    return this.run(() => {
      const ref = doc(this.firestore, `${this.col}/${id}`);
      return updateDoc(ref, { estado, fechaActualizacion: new Date() });
    });
  }

  cancelar(id: string): Promise<void> {
    return this.updateEstado(id, 'cancelado');
  }

  async notificarProduccion(item: InventarioItem): Promise<void> {
    return this.run(async () => {
      const ref = collection(this.firestore, this.colNotifProd);
      await addDoc(ref, {
        productoId:     item.productoId,
        nombreProducto: item.descripcion || item.nombreProducto,
        codigoProducto: item.codigoProducto ?? '',
        sucursalId:     item.sucursalId,
        sucursal:       item.sucursal,
        stock:          item.stock,
        stockMinimo:    item.stockMinimo,
        fechaSolicitud: new Date(),
        atendido:       false
      });
    });
  }

  async enviarConfirmacionEmail(pedido: Pedido): Promise<void> {
    if (!pedido.clienteEmail) return;

    const lineas = pedido.productos
      .map(p => `<li>${p.nombreProducto} × ${p.cantidad} — $${p.subtotal.toFixed(2)}</li>`)
      .join('');

    return this.run(async () => {
      const ref = collection(this.firestore, this.colMail);
      await addDoc(ref, {
        to: pedido.clienteEmail,
        message: {
          subject: `Confirmación de pedido — ${pedido.clienteNombre}`,
          html: `
            <h2 style="color:#111827">¡Tu pedido fue recibido!</h2>
            <p>Estimado(a) <strong>${pedido.clienteNombre}</strong>,</p>
            <p>Hemos recibido tu pedido correctamente. Está actualmente <strong>en revisión</strong>.</p>
            <h3>Detalle</h3>
            <ul>${lineas}</ul>
            <table style="border-top:1px solid #e5e7eb;margin-top:12px;padding-top:12px;width:100%">
              <tr><td>Subtotal</td><td align="right">$${pedido.subtotal.toFixed(2)}</td></tr>
              ${pedido.descuento > 0 ? `<tr><td>Descuento (${pedido.descuentoCliente}%)</td><td align="right" style="color:#16A34A">-$${pedido.descuento.toFixed(2)}</td></tr>` : ''}
              <tr><td><strong>Total</strong></td><td align="right"><strong>$${pedido.total.toFixed(2)}</strong></td></tr>
            </table>
            <p style="margin-top:20px;color:#6b7280;font-size:13px">Tipo: ${pedido.tipoPedido === 'factura' ? 'Factura' : 'Consigna'} · Sucursal: ${pedido.sucursal}</p>
          `
        }
      });
    });
  }
}
