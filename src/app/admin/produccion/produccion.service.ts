import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { InventarioItem, InventarioService } from '../inventario/inventario.service';

export type ProduccionAlertaNivel = 'critical' | 'warning';

export interface ProduccionAlerta {
  id?: string;
  nombreProducto: string;
  productoId: string;
  codigoProducto: string;
  sucursal: string;
  sucursalId: string;
  stock: number;
  stockMinimo: number;
  faltante: number;
  cobertura: number;
  nivel: ProduccionAlertaNivel;
}

export interface ProduccionDashboardKpis {
  totalProductos: number;
  alertasActivas: number;
  alertasCriticas: number;
  alertasBajas: number;
  stockCero: number;
  sucursalesAfectadas: number;
  unidadesPorReponer: number;
  alertasPrioritarias: ProduccionAlerta[];
  alertas: ProduccionAlerta[];
}

@Injectable({ providedIn: 'root' })
export class ProduccionService {

  constructor(private inventarioSrv: InventarioService) {}

  getDashboard$(): Observable<ProduccionDashboardKpis> {
    return this.inventarioSrv.getInventario$().pipe(
      map(items => this.buildDashboard(items))
    );
  }

  private buildDashboard(items: InventarioItem[]): ProduccionDashboardKpis {
    const alertas = items
      .map(item => this.buildAlerta(item))
      .filter((alerta): alerta is ProduccionAlerta => alerta !== null)
      .sort((a, b) => {
        if (a.nivel !== b.nivel) {
          return a.nivel === 'critical' ? -1 : 1;
        }

        if (b.faltante !== a.faltante) {
          return b.faltante - a.faltante;
        }

        return a.nombreProducto.localeCompare(b.nombreProducto);
      });

    const alertasCriticas = alertas.filter(alerta => alerta.nivel === 'critical').length;
    const alertasBajas = alertas.filter(alerta => alerta.nivel === 'warning').length;
    const stockCero = alertasCriticas;
    const sucursalesAfectadas = new Set(
      alertas.map(alerta => alerta.sucursalId || alerta.sucursal).filter(Boolean)
    ).size;
    const unidadesPorReponer = alertas.reduce((acc, alerta) => acc + alerta.faltante, 0);

    return {
      totalProductos: items.length,
      alertasActivas: alertas.length,
      alertasCriticas,
      alertasBajas,
      stockCero,
      sucursalesAfectadas,
      unidadesPorReponer,
      alertasPrioritarias: alertas.slice(0, 5),
      alertas
    };
  }

  private buildAlerta(item: InventarioItem): ProduccionAlerta | null {
    const stock = Number(item.stock ?? 0);
    const stockMinimo = Number(item.stockMinimo ?? 5);

    if (stock > stockMinimo) {
      return null;
    }

    const faltante = Math.max(stockMinimo - stock, 0);
    const cobertura = stockMinimo > 0 ? Math.max(0, Math.min(100, Math.round((stock / stockMinimo) * 100))) : 0;

    return {
      id: item.id,
      nombreProducto: String(item.descripcion ?? item.nombreProducto ?? 'Producto'),
      productoId: String(item.productoId ?? item.codigoProducto ?? 'Sin codigo'),
      codigoProducto: String(item.codigoProducto ?? item.productoId ?? 'Sin codigo'),
      sucursal: String(item.sucursal ?? 'Sucursal pendiente'),
      sucursalId: String(item.sucursalId ?? ''),
      stock,
      stockMinimo,
      faltante,
      cobertura,
      nivel: stock === 0 ? 'critical' : 'warning'
    };
  }
}
