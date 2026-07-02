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
import { map, Observable, of, switchMap } from 'rxjs';
import { environment } from 'src/environments/environment';
import { InventarioItem, resolveInventarioCodigo, resolveInventarioEtiqueta } from '../inventario/inventario.service';

export interface ProductoPedido {
  productoId: string;
  inventarioItemId: string;
  nombreProducto: string;
  codigoProducto?: string;
  descripcion?: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export type PedidoEstado =
  | 'en_revision'
  | 'autorizado'
  | 'en_transito'
  | 'entregado'
  | 'cancelado'
  | 'sin_stock'
  | 'pendiente';

export interface Pedido {
  id?: string;
  numeroPedido?: string;
  folio?: string;
  pedidoNumero?: string;
  consecutivoPedido?: number;
  consecutivo?: number;
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
  estado: PedidoEstado;
  fechaCreacion?: any;
  fechaActualizacion?: any;
}

const PEDIDO_ESTADO_LABELS: Record<PedidoEstado, string> = {
  en_revision: 'En revisión',
  autorizado: 'Autorizado',
  en_transito: 'En tránsito',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
  sin_stock: 'Sin stock',
  pendiente: 'En revisión'
};

const PEDIDO_ESTADO_SEVERITIES: Record<PedidoEstado, string> = {
  en_revision: 'warning',
  autorizado: 'success',
  en_transito: 'info',
  entregado: 'success',
  cancelado: 'danger',
  sin_stock: 'danger',
  pendiente: 'warning'
};

export function isPedidoEnRevision(estado?: string | null): boolean {
  return estado === 'en_revision' || estado === 'pendiente';
}

export function getPedidoEstadoLabel(estado?: string | null): string {
  if (!estado) return 'Sin estado';
  return PEDIDO_ESTADO_LABELS[estado as PedidoEstado] ?? estado;
}

export function getPedidoEstadoSeverity(estado?: string | null): string {
  if (!estado) return 'info';
  return PEDIDO_ESTADO_SEVERITIES[estado as PedidoEstado] ?? 'info';
}

export function getTipoPedidoLabel(tipo?: Pedido['tipoPedido'] | null): string {
  return tipo === 'consigna' ? 'Consigna' : 'Factura';
}

export function getTipoPedidoSeverity(tipo?: Pedido['tipoPedido'] | null): string {
  return tipo === 'consigna' ? 'warning' : 'info';
}

@Injectable({ providedIn: 'root' })
export class PedidosService {

  private col           = environment.collections.pedidos;
  private colInventario = environment.collections.inventario;
  private colContadores = environment.collections.pedidoContadores;
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
      return (collectionData(q as any, { idField: 'id' }) as Observable<Pedido[]>)
        .pipe(switchMap(pedidos => this.enriquecerPedidosConInventario$(pedidos)));
    });
  }

  getById$(id: string): Observable<Pedido> {
    return this.run(() => {
      const ref = doc(this.firestore, `${this.col}/${id}`);
      return (docData(ref as any, { idField: 'id' }) as Observable<Pedido>)
        .pipe(switchMap(pedido => this.enriquecerPedidosConInventario$([pedido]).pipe(
          map(([pedidoEnriquecido]) => pedidoEnriquecido ?? pedido)
        )));
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
        const referencia = await this.obtenerSiguienteReferenciaPedido(transaction, pedido.sucursalId, pedido.sucursal);
        pedido.numeroPedido = referencia.numeroPedido;
        pedido.folio = referencia.numeroPedido;
        pedido.pedidoNumero = referencia.numeroPedido;
        pedido.consecutivoPedido = referencia.consecutivo;
        pedido.consecutivo = referencia.consecutivo;

        const inventarioActualizado: Array<{ ref: any; stockActual: number; cantidad: number }> = [];

        // Verifica stock usando el ID real del documento de inventario
        for (const item of pedido.productos) {
          const invRef = doc(this.firestore, `${this.colInventario}/${item.inventarioItemId}`);
          const invSnap = await transaction.get(invRef);

          if (!invSnap.exists()) {
            const etiqueta = String(item.nombreProducto || item.productoId || 'Producto');
            throw new Error(`Producto "${etiqueta}" no encontrado en el inventario de esta sucursal`);
          }

          const invData = invSnap.data() as Partial<InventarioItem>;
          const etiqueta = String(item.nombreProducto || resolveInventarioCodigo(invData) || item.productoId || 'Producto');
          const stockActual = Number(invData.stock ?? 0);
          if (stockActual < item.cantidad) {
            throw new Error(`Stock insuficiente para "${etiqueta}". Disponible: ${stockActual}`);
          }

          inventarioActualizado.push({
            ref: invRef,
            stockActual,
            cantidad: item.cantidad
          });
        }

        const contadorRef = doc(this.firestore, `${this.colContadores}/${pedido.sucursalId}`);

        transaction.set(contadorRef, {
          sucursalId: pedido.sucursalId,
          sucursal: pedido.sucursal,
          prefijo: referencia.prefijo,
          ultimoConsecutivo: referencia.consecutivo,
          fechaActualizacion: new Date()
        }, { merge: true });

        // Descuenta stock
        for (const item of inventarioActualizado) {
          transaction.update(item.ref, {
            stock: item.stockActual - item.cantidad,
            fechaActualizacion: new Date()
          });
        }

        // Crea el pedido
        const pedidoRef = doc(collection(this.firestore, this.col));
        transaction.set(pedidoRef, {
          ...pedido,
          estado: 'en_revision',
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

  autorizar(id: string): Promise<void> {
    return this.updateEstado(id, 'autorizado');
  }

  cancelar(id: string): Promise<void> {
    return this.updateEstado(id, 'cancelado');
  }

  async notificarProduccion(item: InventarioItem): Promise<void> {
    return this.run(async () => {
      const ref = collection(this.firestore, this.colNotifProd);
      const codigo = resolveInventarioCodigo(item);
      await addDoc(ref, {
        productoId:     codigo,
        nombreProducto: codigo || resolveInventarioEtiqueta(item),
        codigoProducto: codigo,
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

    const referencia = this.getPedidoReferencia(pedido);
    const lineas = pedido.productos
      .map(p => `<li>${p.nombreProducto} × ${p.cantidad} — $${p.subtotal.toFixed(2)}</li>`)
      .join('');

    return this.run(async () => {
      const ref = collection(this.firestore, this.colMail);
      await addDoc(ref, {
        to: pedido.clienteEmail,
        message: {
          subject: `Confirmación de pedido — ${referencia} — ${pedido.clienteNombre}`,
          html: `
            <h2 style="color:#111827">¡Tu pedido fue recibido!</h2>
            <p>Estimado(a) <strong>${pedido.clienteNombre}</strong>,</p>
            <p>Referencia del pedido: <strong>${referencia}</strong>.</p>
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

  getPedidoReferencia(pedido: Pedido): string {
    return String(
      pedido.numeroPedido ??
      pedido.folio ??
      pedido.pedidoNumero ??
      pedido.consecutivoPedido ??
      pedido.consecutivo ??
      pedido.id ??
      ''
    );
  }

  private enriquecerPedidosConInventario$(pedidos: Pedido[]): Observable<Pedido[]> {
    if (!pedidos.length) {
      return of([]);
    }

    const ref = collection(this.firestore, this.colInventario);
    return (collectionData(ref as any, { idField: 'id' }) as Observable<Partial<InventarioItem>[]>).pipe(
      map(inventario => {
        const byId = new Map<string, Partial<InventarioItem>>();
        const byCode = new Map<string, Partial<InventarioItem>>();

        inventario.forEach(item => {
          const id = String(item.id ?? '').trim();
          const codigo = resolveInventarioCodigo(item);

          if (id) byId.set(id, item);
          [
            codigo,
            item.productoId,
            item.codigoProducto,
            item.codigoBarras
          ].forEach(value => {
            const key = String(value ?? '').trim();
            if (key) byCode.set(key, item);
          });
        });

        return pedidos.map(pedido => ({
          ...pedido,
          productos: (pedido.productos ?? []).map(producto => {
            const inventarioItem = this.findInventarioItem(producto, byId, byCode);
            const codigo = String(
              producto.codigoProducto ||
              resolveInventarioCodigo(inventarioItem) ||
              producto.productoId ||
              ''
            ).trim();
            const descripcion = String(
              producto.descripcion ||
              inventarioItem?.descripcion ||
              inventarioItem?.nombreProducto ||
              producto.nombreProducto ||
              ''
            ).trim();

            return {
              ...producto,
              productoId: producto.productoId || codigo,
              codigoProducto: codigo || undefined,
              nombreProducto: descripcion || producto.nombreProducto || codigo || 'Producto',
              descripcion: descripcion || undefined
            };
          })
        }));
      })
    );
  }

  private findInventarioItem(
    producto: ProductoPedido,
    byId: Map<string, Partial<InventarioItem>>,
    byCode: Map<string, Partial<InventarioItem>>
  ): Partial<InventarioItem> | undefined {
    const candidates = [
      producto.inventarioItemId,
      producto.productoId,
      producto.codigoProducto
    ].map(value => String(value ?? '').trim()).filter(Boolean);

    return candidates.map(value => byId.get(value)).find(Boolean)
      ?? candidates.map(value => byCode.get(value)).find(Boolean);
  }

  private async obtenerSiguienteReferenciaPedido(transaction: any, sucursalId: string, sucursal: string): Promise<{ numeroPedido: string; consecutivo: number; prefijo: string }> {
    const contadorRef = doc(this.firestore, `${this.colContadores}/${sucursalId}`);
    const contadorSnap = await transaction.get(contadorRef);

    const consecutivo = Number(contadorSnap.exists() ? contadorSnap.data()?.['ultimoConsecutivo'] : 0) || 0;
    const siguiente = consecutivo + 1;
    const prefijo = String(contadorSnap.data()?.['prefijo'] ?? this.getPrefijoSucursal(sucursal, sucursalId)).toUpperCase();
    const numeroPedido = `${prefijo}-${siguiente}`;

    return { numeroPedido, consecutivo: siguiente, prefijo };
  }

  private getPrefijoSucursal(sucursal: string, sucursalId: string): string {
    const base = String(sucursal ?? sucursalId ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

    const letra = base.charAt(0) || String(sucursalId ?? '').charAt(0) || 'P';
    return letra.toUpperCase();
  }
}
