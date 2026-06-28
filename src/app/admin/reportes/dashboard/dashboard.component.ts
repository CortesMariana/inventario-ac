import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import Chart from 'chart.js/auto';
import { Subject, combineLatest, takeUntil } from 'rxjs';
import { Cliente, ClientesService } from '../../clientes/clientes.service';
import { Pedido, PedidosService, isPedidoEnRevision } from '../../pedidos/pedidos.service';
import { ProduccionDashboardKpis, ProduccionService } from '../../produccion/produccion.service';
import { KpiDashboard, ReportesService } from '../reportes.service';

interface TrendPoint {
  label: string;
  ventas: number;
  pedidos: number;
}

interface EstadoResumen {
  estado: string;
  label: string;
  value: number;
  color: string;
}

interface TopProducto {
  nombre: string;
  unidades: number;
  importe: number;
}

interface TopCliente {
  clienteNombre: string;
  pedidos: number;
  importe: number;
  ticketPromedio: number;
}

interface SucursalResumen {
  sucursal: string;
  pedidos: number;
  ventas: number;
}

interface AlertaOperativa {
  titulo: string;
  detalle: string;
  etiqueta: string;
  icono: string;
  ruta: string;
  tipo: 'danger' | 'warning' | 'info';
}

interface AccionRapida {
  label: string;
  icon: string;
  route: string;
  hint: string;
}

interface DashboardSnapshot {
  ventasMes: number;
  pedidosMes: number;
  ticketPromedio: number;
  clientesActivos: number;
  productosStock: number;
  valorAlmacen: number;
  alertasStock: number;
  alertasProduccion: number;
  pedidosEnRevision: number;
  pedidosAutorizados: number;
  pedidosEnTransito: number;
  pedidosEntregados: number;
  pedidosCancelados: number;
  tendencia: TrendPoint[];
  estados: EstadoResumen[];
  topProductos: TopProducto[];
  topClientes: TopCliente[];
  sucursales: SucursalResumen[];
  alertas: AlertaOperativa[];
  pedidosRecientes: Pedido[];
}

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.css'],
    standalone: false
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('trendCanvas') trendCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('estadoCanvas') estadoCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('productosCanvas') productosCanvas?: ElementRef<HTMLCanvasElement>;

  resumenBase: KpiDashboard = {
    totalClientes: 0,
    totalProductos: 0,
    totalPedidosMes: 0,
    valorAlmacen: 0,
    productosEnAlerta: [],
    ultimosPedidos: []
  };

  produccionBase: ProduccionDashboardKpis = {
    totalProductos: 0,
    alertasActivas: 0,
    alertasCriticas: 0,
    alertasBajas: 0,
    stockCero: 0,
    sucursalesAfectadas: 0,
    unidadesPorReponer: 0,
    alertasPrioritarias: [],
    alertas: []
  };

  loading = true;
  lastUpdated = new Date();
  snapshot: DashboardSnapshot = this.emptySnapshot();
  accionesRapidas: AccionRapida[] = [
    { label: 'Nuevo pedido', icon: 'pi pi-plus', route: '/admin/pedidos/nuevo', hint: 'Capturar una venta' },
    { label: 'Producción', icon: 'pi pi-bell', route: '/admin/produccion/dashboard', hint: 'Atender stock bajo' },
    { label: 'Almacén', icon: 'pi pi-warehouse', route: '/admin/almacen', hint: 'Entradas y salidas' },
    { label: 'Inventario', icon: 'pi pi-box', route: '/admin/inventario', hint: 'Consultar existencias' },
    { label: 'Analytics', icon: 'pi pi-chart-line', route: '/admin/reportes/analytics', hint: 'Análisis gerencial' }
  ];

  private pedidos: Pedido[] = [];
  private clientes: Cliente[] = [];
  private viewReady = false;
  private destroy$ = new Subject<void>();
  private charts: {
    trend?: Chart<any, any, any>;
    estado?: Chart<any, any, any>;
    productos?: Chart<any, any, any>;
  } = {};

  constructor(
    private reportesSrv: ReportesService,
    private pedidosSrv: PedidosService,
    private clientesSrv: ClientesService,
    private produccionSrv: ProduccionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    combineLatest({
      resumen: this.reportesSrv.getDashboardKpis$(),
      pedidos: this.pedidosSrv.getAll$(),
      clientes: this.clientesSrv.getAll$(),
      produccion: this.produccionSrv.getDashboard$()
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ resumen, pedidos, clientes, produccion }) => {
          this.resumenBase = resumen;
          this.pedidos = pedidos.map(pedido => this.normalizarPedido(pedido));
          this.clientes = clientes;
          this.produccionBase = produccion;
          this.lastUpdated = new Date();
          this.snapshot = this.buildSnapshot();
          this.loading = false;
          this.renderCharts();
        },
        error: (err) => {
          console.error('Error cargando dashboard:', err);
          this.loading = false;
        }
      });
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.renderCharts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.destroyCharts();
  }

  navegar(ruta: string): void {
    this.router.navigateByUrl(ruta);
  }

  getEstadoClass(estado: string): string {
    const map: Record<string, string> = {
      en_revision: 'pill-amber',
      autorizado: 'pill-blue',
      en_transito: 'pill-amber',
      entregado: 'pill-green',
      cancelado: 'pill-red',
      sin_stock: 'pill-red',
      pendiente: 'pill-amber'
    };
    return map[estado] ?? 'pill-gray';
  }

  getEstadoLabel(estado: string): string {
    const map: Record<string, string> = {
      en_revision: 'En revisión',
      autorizado: 'Autorizado',
      en_transito: 'En tránsito',
      entregado: 'Entregado',
      cancelado: 'Cancelado',
      sin_stock: 'Sin stock',
      pendiente: 'En revisión'
    };
    return map[estado] ?? estado;
  }

  getAlertaClass(stock: number): string {
    return stock === 0 ? 'dot-red' : 'dot-amber';
  }

  formatMoney(valor: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 0
    }).format(valor || 0);
  }

  private buildSnapshot(): DashboardSnapshot {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);

    const pedidosMes = this.pedidos.filter(pedido => {
      const fecha = this.toDate(pedido.fechaCreacion ?? pedido.fechaActualizacion);
      return !!fecha && fecha >= startOfMonth && fecha <= endOfMonth;
    });

    const pedidosActivosMes = pedidosMes.filter(pedido => pedido.estado !== 'cancelado');
    const ventasMes = pedidosActivosMes.reduce((acc, pedido) => acc + this.toNumber(pedido.total), 0);
    const pedidosEnRevision = pedidosMes.filter(pedido => isPedidoEnRevision(pedido.estado)).length;
    const pedidosAutorizados = pedidosMes.filter(pedido => pedido.estado === 'autorizado').length;
    const pedidosEnTransito = pedidosMes.filter(pedido => pedido.estado === 'en_transito').length;
    const pedidosEntregados = pedidosMes.filter(pedido => pedido.estado === 'entregado').length;
    const pedidosCancelados = pedidosMes.filter(pedido => pedido.estado === 'cancelado').length;
    const clientesActivos = new Set(
      pedidosActivosMes.map(pedido => String(pedido.clienteId || pedido.clienteNombre || pedido.id || '')).filter(Boolean)
    ).size;
    const ticketPromedio = pedidosActivosMes.length ? ventasMes / pedidosActivosMes.length : 0;

    const tendencia = this.buildTendencia(now);
    const estados = this.buildEstados(pedidosMes);
    const topProductos = this.buildTopProductos(pedidosActivosMes);
    const topClientes = this.buildTopClientes(pedidosActivosMes);
    const sucursales = this.buildSucursales(pedidosActivosMes);
    const alertas = this.buildAlertas();

    return {
      ventasMes,
      pedidosMes: pedidosMes.length,
      ticketPromedio,
      clientesActivos,
      productosStock: this.resumenBase.totalProductos,
      valorAlmacen: this.resumenBase.valorAlmacen,
      alertasStock: this.resumenBase.productosEnAlerta.length,
      alertasProduccion: this.produccionBase.alertasActivas,
      pedidosEnRevision,
      pedidosAutorizados,
      pedidosEnTransito,
      pedidosEntregados,
      pedidosCancelados,
      tendencia,
      estados,
      topProductos,
      topClientes,
      sucursales,
      alertas,
      pedidosRecientes: this.resumenBase.ultimosPedidos.map(pedido => this.normalizarPedido(pedido)),
    };
  }

  private buildTendencia(now: Date): TrendPoint[] {
    const start = new Date(now);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);

    const buckets = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return {
        date,
        label: new Intl.DateTimeFormat('es-MX', {
          weekday: 'short',
          day: '2-digit'
        }).format(date),
        ventas: 0,
        pedidos: 0
      };
    });

    this.pedidos.forEach(pedido => {
      const fecha = this.toDate(pedido.fechaCreacion ?? pedido.fechaActualizacion);
      if (!fecha || fecha < start || fecha > now) {
        return;
      }

      const index = Math.floor((this.midnight(fecha).getTime() - start.getTime()) / 86400000);
      if (index < 0 || index >= buckets.length) {
        return;
      }

      if (pedido.estado !== 'cancelado') {
        buckets[index].ventas += this.toNumber(pedido.total);
      }
      buckets[index].pedidos += 1;
    });

    return buckets.map(({ label, ventas, pedidos }) => ({ label, ventas, pedidos }));
  }

  private buildEstados(pedidosMes: Pedido[]): EstadoResumen[] {
    const estados: EstadoResumen[] = [
      { estado: 'en_revision', label: 'En revisión', value: 0, color: '#f59e0b' },
      { estado: 'autorizado', label: 'Autorizado', value: 0, color: '#2563eb' },
      { estado: 'en_transito', label: 'En tránsito', value: 0, color: '#3b82f6' },
      { estado: 'entregado', label: 'Entregado', value: 0, color: '#16a34a' },
      { estado: 'cancelado', label: 'Cancelado', value: 0, color: '#dc2626' }
    ];

    pedidosMes.forEach(pedido => {
      const estado = pedido.estado === 'pendiente' ? 'en_revision' : pedido.estado;
      const match = estados.find(item => item.estado === estado);
      if (match) {
        match.value += 1;
      }
    });

    return estados;
  }

  private buildTopProductos(pedidos: Pedido[]): TopProducto[] {
    const mapa = new Map<string, TopProducto>();

    pedidos.forEach(pedido => {
      (pedido.productos ?? []).forEach(producto => {
        const key = String(producto.productoId || producto.inventarioItemId || producto.nombreProducto);
        const actual = mapa.get(key) ?? { nombre: producto.nombreProducto, unidades: 0, importe: 0 };
        actual.nombre = producto.nombreProducto || actual.nombre;
        actual.unidades += this.toNumber(producto.cantidad);
        actual.importe += this.toNumber(producto.subtotal);
        mapa.set(key, actual);
      });
    });

    return Array.from(mapa.values())
      .sort((a, b) => b.unidades - a.unidades || b.importe - a.importe)
      .slice(0, 5);
  }

  private buildTopClientes(pedidos: Pedido[]): TopCliente[] {
    const mapa = new Map<string, TopCliente>();

    pedidos.forEach(pedido => {
      const key = String(pedido.clienteId || pedido.clienteNombre || pedido.id);
      const actual = mapa.get(key) ?? {
        clienteNombre: pedido.clienteNombre,
        pedidos: 0,
        importe: 0,
        ticketPromedio: 0
      };

      actual.clienteNombre = pedido.clienteNombre || actual.clienteNombre;
      actual.pedidos += 1;
      actual.importe += this.toNumber(pedido.total);
      actual.ticketPromedio = actual.pedidos ? actual.importe / actual.pedidos : 0;
      mapa.set(key, actual);
    });

    return Array.from(mapa.values())
      .sort((a, b) => b.importe - a.importe || b.pedidos - a.pedidos)
      .slice(0, 5);
  }

  private buildSucursales(pedidos: Pedido[]): SucursalResumen[] {
    const mapa = new Map<string, SucursalResumen>();

    pedidos.forEach(pedido => {
      const key = pedido.sucursal || 'Sucursal';
      const actual = mapa.get(key) ?? { sucursal: key, pedidos: 0, ventas: 0 };
      actual.pedidos += 1;
      actual.ventas += this.toNumber(pedido.total);
      mapa.set(key, actual);
    });

    return Array.from(mapa.values())
      .sort((a, b) => b.ventas - a.ventas || b.pedidos - a.pedidos)
      .slice(0, 4);
  }

  private buildAlertas(): AlertaOperativa[] {
    const alertasStock: AlertaOperativa[] = this.resumenBase.productosEnAlerta.slice(0, 3).map((item: any) => ({
      titulo: item.nombreProducto ?? 'Producto en alerta',
      detalle: `${item.sucursal ?? 'Sucursal'} — ${item.stock ?? 0} unidades`,
      etiqueta: (item.stock ?? 0) === 0 ? 'Crítica' : 'Stock bajo',
      icono: (item.stock ?? 0) === 0 ? 'pi pi-exclamation-circle' : 'pi pi-exclamation-triangle',
      ruta: '/admin/inventario',
      tipo: (item.stock ?? 0) === 0 ? 'danger' : 'warning'
    } as AlertaOperativa));

    const alertasProduccion: AlertaOperativa[] = this.produccionBase.alertasPrioritarias.slice(0, 3).map(alerta => ({
      titulo: alerta.nombreProducto,
      detalle: `${alerta.sucursal} — faltan ${alerta.faltante} unidades`,
      etiqueta: alerta.nivel === 'critical' ? 'Producción crítica' : 'Reponer',
      icono: alerta.nivel === 'critical' ? 'pi pi-bolt' : 'pi pi-cog',
      ruta: '/admin/produccion/dashboard',
      tipo: alerta.nivel === 'critical' ? 'danger' : 'warning'
    } as AlertaOperativa));

    const pedidosRevision: AlertaOperativa[] = this.pedidos.filter(pedido => isPedidoEnRevision(pedido.estado)).slice(0, 2).map(pedido => ({
      titulo: 'Pedido en revisión',
      detalle: `${this.getPedidoReferencia(pedido)} · ${pedido.clienteNombre}`,
      etiqueta: 'Pendiente',
      icono: 'pi pi-file-edit',
      ruta: '/admin/inbox-pedidos',
      tipo: 'info' as const
    }));

    return [...alertasProduccion, ...alertasStock, ...pedidosRevision].slice(0, 7);
  }

  private getPedidoReferencia(pedido: Pedido): string {
    return String(
      pedido.numeroPedido ||
      pedido.folio ||
      pedido.pedidoNumero ||
      pedido.consecutivoPedido ||
      pedido.consecutivo ||
      pedido.id ||
      'Pedido'
    );
  }

  private renderCharts(): void {
    if (!this.viewReady || this.loading) {
      return;
    }

    this.destroyCharts();

    const trendCtx = this.trendCanvas?.nativeElement.getContext('2d');
    const estadoCtx = this.estadoCanvas?.nativeElement.getContext('2d');
    const productosCtx = this.productosCanvas?.nativeElement.getContext('2d');

    if (trendCtx) {
      this.charts.trend = new Chart(trendCtx as any, {
        type: 'bar',
        data: {
          labels: this.snapshot.tendencia.map(item => item.label),
          datasets: [
            {
              label: 'Ventas',
              data: this.snapshot.tendencia.map(item => item.ventas),
              backgroundColor: 'rgba(37, 99, 235, 0.24)',
              borderColor: '#2563eb',
              borderWidth: 1,
              borderRadius: 8,
              yAxisID: 'y'
            },
            {
              label: 'Pedidos',
              data: this.snapshot.tendencia.map(item => item.pedidos),
              type: 'line',
              borderColor: '#16a34a',
              backgroundColor: '#16a34a',
              tension: 0.35,
              pointRadius: 3,
              fill: false,
              yAxisID: 'y1'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: {
                usePointStyle: true,
                pointStyle: 'circle'
              }
            },
            tooltip: {
              mode: 'index',
              intersect: false,
              callbacks: {
                label: (context: any) => {
                  if (context.dataset.label === 'Ventas') {
                    return ` Ventas: ${this.formatMoney(Number(context.raw ?? 0))}`;
                  }
                  return ` Pedidos: ${Number(context.raw ?? 0)}`;
                }
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: '#6b7280', maxRotation: 0, autoSkip: true }
            },
            y: {
              beginAtZero: true,
              grid: { color: 'rgba(229, 231, 235, 0.7)' },
              ticks: {
                color: '#6b7280',
                callback: (value: any) => this.formatMoney(Number(value))
              }
            },
            y1: {
              beginAtZero: true,
              position: 'right',
              grid: { drawOnChartArea: false },
              ticks: { color: '#6b7280', precision: 0 }
            }
          }
        } as any
      });
    }

    if (estadoCtx) {
      const estados = this.snapshot.estados.filter(item => item.value > 0);
      this.charts.estado = new Chart(estadoCtx as any, {
        type: 'doughnut',
        data: {
          labels: estados.map(item => item.label),
          datasets: [{
            data: estados.map(item => item.value),
            backgroundColor: estados.map(item => item.color),
            borderWidth: 0,
            hoverOffset: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '68%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                usePointStyle: true,
                pointStyle: 'circle'
              }
            }
          }
        } as any
      } as any);
    }

    if (productosCtx) {
      this.charts.productos = new Chart(productosCtx as any, {
        type: 'bar',
        data: {
          labels: this.snapshot.topProductos.map(item => item.nombre),
          datasets: [{
            label: 'Unidades',
            data: this.snapshot.topProductos.map(item => item.unidades),
            backgroundColor: 'rgba(249, 115, 22, 0.24)',
            borderColor: '#f97316',
            borderWidth: 1,
            borderRadius: 8
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: {
              beginAtZero: true,
              grid: { color: 'rgba(229, 231, 235, 0.7)' },
              ticks: { color: '#6b7280', precision: 0 }
            },
            y: {
              grid: { display: false },
              ticks: { color: '#111827' }
            }
          }
        } as any
      });
    }
  }

  private destroyCharts(): void {
    this.charts.trend?.destroy();
    this.charts.estado?.destroy();
    this.charts.productos?.destroy();
    this.charts = {};
  }

  private emptySnapshot(): DashboardSnapshot {
    return {
      ventasMes: 0,
      pedidosMes: 0,
      ticketPromedio: 0,
      clientesActivos: 0,
      productosStock: 0,
      valorAlmacen: 0,
      alertasStock: 0,
      alertasProduccion: 0,
      pedidosEnRevision: 0,
      pedidosAutorizados: 0,
      pedidosEnTransito: 0,
      pedidosEntregados: 0,
      pedidosCancelados: 0,
      tendencia: [],
      estados: [],
      topProductos: [],
      topClientes: [],
      sucursales: [],
      alertas: [],
      pedidosRecientes: []
    };
  }

  private normalizarPedido(pedido: Pedido): Pedido {
    return {
      ...pedido,
      estado: pedido.estado === 'pendiente' ? 'en_revision' : pedido.estado
    };
  }

  private toDate(valor?: any): Date | null {
    if (!valor) {
      return null;
    }

    if (valor instanceof Date) {
      return valor;
    }

    if (typeof valor?.toDate === 'function') {
      return valor.toDate();
    }

    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime()) ? null : fecha;
  }

  private midnight(date: Date): Date {
    const clone = new Date(date);
    clone.setHours(0, 0, 0, 0);
    return clone;
  }

  private toNumber(valor: any): number {
    const numero = Number(valor ?? 0);
    return Number.isFinite(numero) ? numero : 0;
  }
}
