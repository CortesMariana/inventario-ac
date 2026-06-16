import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  query,
  where,
  orderBy,
  limit
} from '@angular/fire/firestore';
import { Observable, combineLatest, map } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface KpiDashboard {
  totalClientes: number;
  totalProductos: number;
  totalPedidosMes: number;
  valorAlmacen: number;
  productosEnAlerta: any[];
  ultimosPedidos: any[];
}

@Injectable({ providedIn: 'root' })
export class ReportesService {

  constructor(private firestore: Firestore) {}

  getClientes$(): Observable<any[]> {
    const ref = collection(this.firestore, `${environment.collections.clientes}`);
    return collectionData(ref, { idField: 'id' });
  }

  getProductos$(): Observable<any[]> {
    const ref = collection(this.firestore, `${environment.collections.productos}`);
    return collectionData(ref, { idField: 'id' });
  }

  getProductosEnAlerta$(): Observable<any[]> {
    const ref = collection(this.firestore, `${environment.collections.inventario}`);
    const q = query(ref, where('stock', '<=', 5), orderBy('stock', 'asc'));
    return collectionData(q, { idField: 'id' });
  }

  getUltimosPedidos$(): Observable<any[]> {
    const ref = collection(this.firestore, `${environment.collections.pedidos}`);
    const q = query(ref, orderBy('fechaCreacion', 'desc'), limit(5));
    return collectionData(q, { idField: 'id' });
  }

  getPedidosMes$(): Observable<any[]> {
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const ref = collection(this.firestore, `${environment.collections.pedidos}`);
    const q = query(ref, where('fechaCreacion', '>=', inicioMes));
    return collectionData(q, { idField: 'id' });
  }

  getDashboardKpis$(): Observable<KpiDashboard> {
    return combineLatest({
      clientes:       this.getClientes$(),
      productos:      this.getProductos$(),
      pedidosMes:     this.getPedidosMes$(),
      alertas:        this.getProductosEnAlerta$(),
      ultimosPedidos: this.getUltimosPedidos$()
    }).pipe(
      map(({ clientes, productos, pedidosMes, alertas, ultimosPedidos }) => {
        const valorAlmacen = productos.reduce((acc, p) => {
          return acc + ((p.stock ?? 0) * (p.costoUnitario ?? 0));
        }, 0);

        return {
          totalClientes:    clientes.length,
          totalProductos:   productos.length,
          totalPedidosMes:  pedidosMes.length,
          valorAlmacen,
          productosEnAlerta: alertas,
          ultimosPedidos
        };
      })
    );
  }
}