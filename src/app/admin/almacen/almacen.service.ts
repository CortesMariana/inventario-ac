import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  orderBy,
  query,
  runTransaction,
  limit
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { InventarioItem } from '../inventario/inventario.service';
import { Pedido } from '../pedidos/pedidos.service';

export type AlmacenMovimientoTipo = 'entrada' | 'salida';

export interface AlmacenLineaSurtido {
  inventarioItemId: string;
  productoId: string;
  nombreProducto: string;
  codigoBarras: string;
  cantidadSolicitada: number;
  cantidadEscaneada: number;
}

export interface AlmacenMovimiento {
  id?: string;
  tipo: AlmacenMovimientoTipo;
  titulo: string;
  descripcion: string;
  cantidad: number;
  inventarioItemId?: string;
  productoId?: string;
  codigoBarras?: string;
  pedidoId?: string;
  pedidoCliente?: string;
  sucursalId?: string;
  sucursal?: string;
  stockAntes?: number;
  stockDespues?: number;
  lineas?: AlmacenLineaSurtido[];
  observaciones?: string;
  fechaCreacion?: any;
}

@Injectable({ providedIn: 'root' })
export class AlmacenService {

  private colMovimientos = environment.collections.almacenMovimientos;
  private colInventario = environment.collections.inventario;
  private colPedidos = environment.collections.pedidos;

  constructor(private firestore: Firestore) {}

  getMovimientos$(): Observable<AlmacenMovimiento[]> {
    const ref = collection(this.firestore, this.colMovimientos);
    const q = query(ref, orderBy('fechaCreacion', 'desc'), limit(12));
    return collectionData(q, { idField: 'id' }) as Observable<AlmacenMovimiento[]>;
  }

  async registrarEntrada(item: InventarioItem, cantidad: number, observaciones = ''): Promise<void> {
    if (!item.id) {
      throw new Error('No se pudo identificar el producto seleccionado');
    }

    await runTransaction(this.firestore, async (transaction) => {
      const invRef = doc(this.firestore, `${this.colInventario}/${item.id}`);
      const invSnap = await transaction.get(invRef);

      if (!invSnap.exists()) {
        throw new Error('El producto ya no existe en el inventario');
      }

      const stockAntes = Number(invSnap.data()['stock'] ?? 0);
      const stockDespues = stockAntes + cantidad;
      const movimientoRef = doc(collection(this.firestore, this.colMovimientos));

      transaction.update(invRef, {
        stock: stockDespues,
        fechaActualizacion: new Date()
      });

      transaction.set(movimientoRef, {
        tipo: 'entrada' as AlmacenMovimientoTipo,
        titulo: item.nombreProducto || 'Producto',
        descripcion: `Entrada de ${cantidad} ${item.unidad || 'pzas'}`,
        cantidad,
        inventarioItemId: item.id,
        productoId: item.productoId,
        codigoBarras: item.codigoBarras ?? '',
        sucursalId: item.sucursalId,
        sucursal: item.sucursal,
        stockAntes,
        stockDespues,
        observaciones: observaciones?.trim() || '',
        fechaCreacion: new Date()
      });
    });
  }

  async registrarSalidaPedido(pedido: Pedido, lineas: AlmacenLineaSurtido[], observaciones = ''): Promise<void> {
    if (!pedido.id) {
      throw new Error('No se pudo identificar el pedido');
    }

    if (!lineas.length) {
      throw new Error('No hay líneas para registrar');
    }

    const totalPiezas = lineas.reduce((acc, linea) => acc + Number(linea.cantidadEscaneada || 0), 0);

    await runTransaction(this.firestore, async (transaction) => {
      const pedidoRef = doc(this.firestore, `${this.colPedidos}/${pedido.id}`);
      const pedidoSnap = await transaction.get(pedidoRef);

      if (!pedidoSnap.exists()) {
        throw new Error('El pedido ya no existe');
      }

      const pedidoActual = pedidoSnap.data() as Pedido;
      if (pedidoActual.estado === 'en_transito') {
        throw new Error('Ese pedido ya salió a reparto');
      }

      if (pedidoActual.estado === 'entregado') {
        throw new Error('Ese pedido ya fue entregado');
      }

      if (pedidoActual.estado !== 'autorizado') {
        throw new Error('El pedido todavía no está autorizado para surtido');
      }

      const movimientoRef = doc(collection(this.firestore, this.colMovimientos));

      transaction.update(pedidoRef, {
        estado: 'en_transito',
        fechaActualizacion: new Date()
      });

      transaction.set(movimientoRef, {
        tipo: 'salida' as AlmacenMovimientoTipo,
        titulo: `Pedido ${pedido.id}`,
        descripcion: `Salida para ${pedido.clienteNombre}`,
        cantidad: totalPiezas,
        pedidoId: pedido.id,
        pedidoCliente: pedido.clienteNombre,
        sucursalId: pedido.sucursalId,
        sucursal: pedido.sucursal,
        lineas,
        observaciones: observaciones?.trim() || '',
        fechaCreacion: new Date()
      });
    });
  }
}
