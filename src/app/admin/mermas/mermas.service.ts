import { Injectable } from '@angular/core';
import {
  collection,
  collectionData,
  doc,
  Firestore,
  orderBy,
  query,
  runTransaction
} from '@angular/fire/firestore';
import { map, Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { toDate } from 'src/app/shared/date-utils';
import { InventarioItem, resolveInventarioCodigo, resolveInventarioEtiqueta } from '../inventario/inventario.service';

export type MermaTipo = 'merma' | 'devuelto' | 'caducado' | 'roto';

export interface MermaRegistro {
  id?: string;
  inventarioId: string;
  productoId: string;
  codigoProducto: string;
  nombreProducto: string;
  descripcion?: string;
  codigoBarras?: string;
  sucursalId: string;
  sucursal: string;
  cantidad: number;
  stockAntes: number;
  stockDespues: number;
  tipo: MermaTipo;
  motivo: string;
  responsable?: string;
  numeroLote?: string;
  fechaElaboracion?: string;
  fechaCaducidad?: string;
  fechaRegistro?: Date;
}

export interface RegistrarMermaInput {
  item: InventarioItem;
  cantidad: number;
  tipo: MermaTipo;
  motivo: string;
  responsable?: string;
}

export function getMermaTipoLabel(tipo: MermaTipo): string {
  const labels: Record<MermaTipo, string> = {
    merma: 'Otra merma',
    devuelto: 'Devuelto',
    caducado: 'Caducado',
    roto: 'Roto'
  };

  return labels[tipo] ?? 'Merma';
}

export function getMermaTipoSeverity(tipo: MermaTipo): string {
  const severities: Record<MermaTipo, string> = {
    merma: 'warning',
    devuelto: 'info',
    caducado: 'danger',
    roto: 'danger'
  };

  return severities[tipo] ?? 'warning';
}

@Injectable({ providedIn: 'root' })
export class MermasService {
  private readonly colInventario = environment.collections.inventario;
  private readonly colMermas = environment.collections.mermas;

  constructor(private firestore: Firestore) {}

  getMermas$(): Observable<MermaRegistro[]> {
    const ref = collection(this.firestore, this.colMermas);
    const q = query(ref, orderBy('fechaRegistro', 'desc'));

    return (collectionData(q as any, { idField: 'id' }) as Observable<Partial<MermaRegistro>[]>)
      .pipe(map(items => items.map(item => this.hydrateMerma(item))));
  }

  registrarMerma(input: RegistrarMermaInput): Promise<MermaRegistro> {
    const item = input.item;
    const inventarioId = String(item.id ?? '').trim();
    const cantidad = Math.max(0, Math.floor(Number(input.cantidad ?? 0)));
    const tipo = input.tipo;
    const motivo = String(input.motivo ?? '').trim();
    const responsable = String(input.responsable ?? '').trim();

    if (!inventarioId) {
      return Promise.reject(new Error('No se pudo identificar el producto del inventario'));
    }

    if (cantidad < 1) {
      return Promise.reject(new Error('La cantidad de merma debe ser mayor a cero'));
    }

    if (!motivo) {
      return Promise.reject(new Error('Captura el motivo de la merma'));
    }

    return runTransaction(this.firestore, async (transaction) => {
      const inventarioRef = doc(this.firestore, `${this.colInventario}/${inventarioId}`);
      const mermaRef = doc(collection(this.firestore, this.colMermas));
      const snapshot = await transaction.get(inventarioRef);

      if (!snapshot.exists()) {
        throw new Error('El producto ya no existe en el inventario');
      }

      const current = snapshot.data() as InventarioItem;
      const stockAntes = Math.max(0, Number(current.stock ?? 0));

      if (cantidad > stockAntes) {
        throw new Error(`No hay stock suficiente. Disponible: ${stockAntes}`);
      }

      const stockDespues = stockAntes - cantidad;
      const fechaRegistro = new Date();
      const descripcion = String(current.descripcion ?? item.descripcion ?? current.nombreProducto ?? item.nombreProducto ?? '').trim();
      const codigoBarras = String(current.codigoBarras ?? item.codigoBarras ?? '').trim();
      const numeroLote = String(current.numeroLote ?? item.numeroLote ?? '').trim();
      const fechaElaboracion = String(current.fechaElaboracion ?? item.fechaElaboracion ?? '').trim();
      const fechaCaducidad = String(current.fechaCaducidad ?? item.fechaCaducidad ?? '').trim();
      const registro: MermaRegistro = {
        inventarioId,
        productoId: String(current.productoId ?? item.productoId ?? '').trim(),
        codigoProducto: resolveInventarioCodigo(current) || resolveInventarioCodigo(item) || 'Sin codigo',
        nombreProducto: resolveInventarioEtiqueta(current) || resolveInventarioEtiqueta(item),
        sucursalId: String(current.sucursalId ?? item.sucursalId ?? '').trim(),
        sucursal: String(current.sucursal ?? item.sucursal ?? '').trim(),
        cantidad,
        stockAntes,
        stockDespues,
        tipo,
        motivo,
        fechaRegistro
      };

      if (descripcion) registro.descripcion = descripcion;
      if (codigoBarras) registro.codigoBarras = codigoBarras;
      if (responsable) registro.responsable = responsable;
      if (numeroLote) registro.numeroLote = numeroLote;
      if (fechaElaboracion) registro.fechaElaboracion = fechaElaboracion;
      if (fechaCaducidad) registro.fechaCaducidad = fechaCaducidad;

      transaction.update(inventarioRef, {
        stock: stockDespues,
        fechaActualizacion: fechaRegistro
      });
      transaction.set(mermaRef, registro);

      return {
        ...registro,
        id: mermaRef.id
      };
    });
  }

  private hydrateMerma(item: Partial<MermaRegistro>): MermaRegistro {
    return {
      id: item.id,
      inventarioId: String(item.inventarioId ?? '').trim(),
      productoId: String(item.productoId ?? '').trim(),
      codigoProducto: String(item.codigoProducto ?? item.productoId ?? '').trim() || 'Sin codigo',
      nombreProducto: String(item.nombreProducto ?? item.codigoProducto ?? 'Producto').trim(),
      descripcion: String(item.descripcion ?? '').trim() || undefined,
      codigoBarras: String(item.codigoBarras ?? '').trim() || undefined,
      sucursalId: String(item.sucursalId ?? '').trim(),
      sucursal: String(item.sucursal ?? 'Sucursal pendiente').trim(),
      cantidad: Number(item.cantidad ?? 0),
      stockAntes: Number(item.stockAntes ?? 0),
      stockDespues: Number(item.stockDespues ?? 0),
      tipo: (item.tipo ?? 'merma') as MermaTipo,
      motivo: String(item.motivo ?? '').trim(),
      responsable: String(item.responsable ?? '').trim() || undefined,
      numeroLote: String(item.numeroLote ?? '').trim() || undefined,
      fechaElaboracion: String(item.fechaElaboracion ?? '').trim() || undefined,
      fechaCaducidad: String(item.fechaCaducidad ?? '').trim() || undefined,
      fechaRegistro: toDate(item.fechaRegistro) ?? undefined
    };
  }
}
