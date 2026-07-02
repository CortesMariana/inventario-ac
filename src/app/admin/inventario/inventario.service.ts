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
  where,
  runTransaction
} from '@angular/fire/firestore';
import { map, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { formatDateInput, toDate } from 'src/app/shared/date-utils';

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
  codigoProducto?: string;
  codigoBarras?: string;
  claveSat?: string;
  fechaElaboracion?: string;
  fechaCaducidad?: string;
  numeroLote?: string;
  clasificacionProducto?: string;
  cantidad?: number;
  unidad?: string;
  claveProductoServicio?: string;
  descripcion?: string;
  valorUnitario?: number;
  tipoProducto?: string;
  abreviaturaClave?: string;
  descuento?: number;
  impuestos?: number;
  sucursalId: string;
  sucursal: string;
  stock: number;
  stockMinimo: number;
  fechaActualizacion?: Date;
}

export interface RegistrarProduccionInput {
  cantidad: number;
  fechaElaboracion: string;
  fechaCaducidad?: string;
  numeroLote?: string;
  observaciones?: string;
  codigoBarras?: string;
}

export function resolveInventarioCodigo(item?: Partial<InventarioItem> | null): string {
  return String(
    item?.codigoProducto ??
    item?.productoId ??
    item?.codigoBarras ??
    item?.id ??
    ''
  ).trim();
}

export function resolveInventarioEtiqueta(item?: Partial<InventarioItem> | null): string {
  return String(
    resolveInventarioCodigo(item) ||
    item?.descripcion ||
    item?.nombreProducto ||
    'Producto'
  ).trim();
}

function hydrateInventarioItem(item: Partial<InventarioItem>): InventarioItem {
  return {
    id: item.id,
    productoId: String(item.productoId ?? item.codigoProducto ?? item.codigoBarras ?? item.id ?? '').trim(),
    nombreProducto: String(item.codigoProducto ?? item.productoId ?? item.nombreProducto ?? item.descripcion ?? '').trim(),
    codigoProducto: String(item.codigoProducto ?? item.productoId ?? item.codigoBarras ?? item.id ?? '').trim() || undefined,
    codigoBarras: String(item.codigoBarras ?? '').trim() || undefined,
    claveSat: String(item.claveSat ?? '').trim() || undefined,
    fechaElaboracion: formatDateInput(item.fechaElaboracion),
    fechaCaducidad: formatDateInput(item.fechaCaducidad),
    numeroLote: String(item.numeroLote ?? '').trim() || undefined,
    clasificacionProducto: String(item.clasificacionProducto ?? '').trim() || undefined,
    cantidad: Number(item.cantidad ?? 0),
    unidad: String(item.unidad ?? '').trim() || undefined,
    claveProductoServicio: String(item.claveProductoServicio ?? '').trim() || undefined,
    descripcion: String(item.descripcion ?? item.nombreProducto ?? '').trim() || undefined,
    valorUnitario: Number(item.valorUnitario ?? 0),
    tipoProducto: String(item.tipoProducto ?? '').trim() || undefined,
    abreviaturaClave: String(item.abreviaturaClave ?? '').trim() || undefined,
    descuento: Number(item.descuento ?? 0),
    impuestos: Number(item.impuestos ?? 0),
    sucursalId: String(item.sucursalId ?? '').trim(),
    sucursal: String(item.sucursal ?? '').trim(),
    stock: Number(item.stock ?? 0),
    stockMinimo: Number(item.stockMinimo ?? 0),
    fechaActualizacion: toDate(item.fechaActualizacion) ?? undefined
  };
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
    const q = query(ref, orderBy('codigoProducto', 'asc'));
    return (collectionData(q as any, { idField: 'id' }) as Observable<Partial<InventarioItem>[]>)
      .pipe(map(items => items.map(item => hydrateInventarioItem(item))));
  }

  getInventarioById$(id: string): Observable<InventarioItem> {
    const ref = doc(this.firestore, `${this.colInventario}/${id}`);
    return (docData(ref as any, { idField: 'id' }) as Observable<Partial<InventarioItem>>)
      .pipe(map(item => hydrateInventarioItem(item)));
  }

  getInventarioBySucursal$(sucursalId: string): Observable<InventarioItem[]> {
    const ref = collection(this.firestore, this.colInventario);
    const q = query(ref, where('sucursalId', '==', sucursalId), orderBy('codigoProducto', 'asc'));
    return (collectionData(q, { idField: 'id' }) as Observable<Partial<InventarioItem>[]>)
      .pipe(map(items => items.map(item => hydrateInventarioItem(item))));
  }

  getInventarioEnAlerta$(): Observable<InventarioItem[]> {
    const ref = collection(this.firestore, this.colInventario);
    const q = query(ref, where('stock', '<=', 5), orderBy('stock', 'asc'));
    return (collectionData(q, { idField: 'id' }) as Observable<Partial<InventarioItem>[]>)
      .pipe(map(items => items.map(item => hydrateInventarioItem(item))));
  }

  updateStock(id: string, stock: number): Promise<void> {
    const ref = doc(this.firestore, `${this.colInventario}/${id}`);
    return updateDoc(ref, { stock, fechaActualizacion: new Date() });
  }

  registrarProduccion(id: string, input: RegistrarProduccionInput): Promise<InventarioItem> {
    const cantidad = Math.max(0, Math.floor(Number(input.cantidad || 0)));

    if (!id) {
      return Promise.reject(new Error('No se pudo identificar el producto de producción'));
    }

    if (cantidad < 1) {
      return Promise.reject(new Error('La cantidad producida debe ser mayor a cero'));
    }

    return runTransaction(this.firestore, async (transaction) => {
      const ref = doc(this.firestore, `${this.colInventario}/${id}`);
      const snapshot = await transaction.get(ref);

      if (!snapshot.exists()) {
        throw new Error('El producto ya no existe en el inventario');
      }

      const current = snapshot.data() as InventarioItem;
      const stockAntes = Number(current.stock ?? 0);
      const stockDespues = stockAntes + cantidad;
      const fechaElaboracion = String(input.fechaElaboracion ?? '').trim() || current.fechaElaboracion || '';
      const fechaCaducidad = String(input.fechaCaducidad ?? '').trim() || current.fechaCaducidad || '';
      const numeroLote = String(input.numeroLote ?? '').trim() || current.numeroLote || '';

      const patch: Partial<InventarioItem> = {
        stock: stockDespues,
        fechaElaboracion,
        fechaCaducidad,
        numeroLote,
        fechaActualizacion: new Date()
      };

      const codigoBarras = String(input.codigoBarras ?? '').trim();
      if (codigoBarras) {
        patch.codigoBarras = codigoBarras;
      }

      transaction.update(ref, patch);

      return {
        ...current,
        ...patch,
        id
      };
    });
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
