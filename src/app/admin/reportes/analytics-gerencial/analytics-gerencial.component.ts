import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ClientesService, Cliente } from '../../clientes/clientes.service';
import { Pedido, PedidosService } from '../../pedidos/pedidos.service';
import Chart from 'chart.js/auto';
import { Subject, combineLatest, takeUntil } from 'rxjs';

type PeriodoAnalytics = 'day' | 'week' | 'month' | 'year';

interface PeriodoOption {
  value: PeriodoAnalytics;
  label: string;
  hint: string;
  icon: string;
}

interface SeriePeriodo {
  labels: string[];
  sales: number[];
  orders: number[];
}

interface EstadoCount {
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
  clienteId: string;
  clienteNombre: string;
  pedidos: number;
  unidades: number;
  importe: number;
  ticketPromedio: number;
}

interface AnalyticsSnapshot {
  ventasNetas: number;
  pedidosTotales: number;
  ticketPromedio: number;
  clientesActivos: number;
  unidadesVendidas: number;
  pedidosEnTransito: number;
  pedidosEntregados: number;
  pedidosCancelados: number;
  estadoCounts: EstadoCount[];
  serie: SeriePeriodo;
  topProductos: TopProducto[];
  topClientes: TopCliente[];
}

@Component({
    selector: 'app-analytics-gerencial',
    templateUrl: './analytics-gerencial.component.html',
    styleUrls: ['./analytics-gerencial.component.css'],
    standalone: false
})
export class AnalyticsGerencialComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('trendCanvas') trendCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('estadoCanvas') estadoCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('productosCanvas') productosCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('clientesCanvas') clientesCanvas?: ElementRef<HTMLCanvasElement>;

  periodos: PeriodoOption[] = [
    { value: 'day',   label: 'Día',   hint: 'Hoy',                icon: 'pi pi-clock' },
    { value: 'week',  label: 'Semana', hint: 'Últimos 7 días',    icon: 'pi pi-calendar' },
    { value: 'month',  label: 'Mes',    hint: 'Mes actual',         icon: 'pi pi-calendar-plus' },
    { value: 'year',   label: 'Año',    hint: 'Año actual',         icon: 'pi pi-chart-line' }
  ];

  periodoSeleccionado: PeriodoAnalytics = 'month';
  loading = true;
  lastUpdated = new Date();

  pedidos: Pedido[] = [];
  clientes: Cliente[] = [];
  snapshot: AnalyticsSnapshot = this.emptySnapshot();

  private destroy$ = new Subject<void>();
  private viewReady = false;
  private charts: {
    trend?: Chart<any, any, any>;
    estado?: Chart<any, any, any>;
    productos?: Chart<any, any, any>;
    clientes?: Chart<any, any, any>;
  } = {};

  constructor(
    private pedidosSrv: PedidosService,
    private clientesSrv: ClientesService
  ) {}

  ngOnInit(): void {
    combineLatest({
      pedidos: this.pedidosSrv.getAll$(),
      clientes: this.clientesSrv.getAll$()
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ pedidos, clientes }) => {
          this.pedidos = pedidos.map(pedido => this.normalizarPedido(pedido));
          this.clientes = clientes;
          this.lastUpdated = new Date();
          this.refreshSnapshot();
          this.loading = false;
        },
        error: () => {
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

  setPeriodo(periodo: PeriodoAnalytics): void {
    if (this.periodoSeleccionado === periodo) {
      return;
    }

    this.periodoSeleccionado = periodo;
    this.refreshSnapshot();
  }

  get periodoLabel(): string {
    return this.periodos.find(periodo => periodo.value === this.periodoSeleccionado)?.hint ?? 'Periodo';
  }

  get totalClientesRegistrados(): number {
    return this.clientes.filter(cliente => cliente.activo !== false).length;
  }

  get etiquetaVenta(): string {
    return this.periodoSeleccionado === 'day'
      ? 'Hoy'
      : this.periodoSeleccionado === 'week'
        ? 'Semana'
        : this.periodoSeleccionado === 'month'
          ? 'Mes'
          : 'Año';
  }

  getEstadoLabel(estado: string): string {
    const map: Record<string, string> = {
      en_revision: 'En revisión',
      autorizado: 'Autorizado',
      en_transito: 'En tránsito',
      entregado: 'Entregado',
      cancelado: 'Cancelado',
      pendiente: 'En revisión'
    };
    return map[estado] ?? estado;
  }

  getEstadoClass(estado: string): string {
    const map: Record<string, string> = {
      en_revision: 'pill-amber',
      autorizado: 'pill-blue',
      en_transito: 'pill-amber',
      entregado: 'pill-green',
      cancelado: 'pill-red',
      pendiente: 'pill-amber'
    };
    return map[estado] ?? 'pill-gray';
  }

  private refreshSnapshot(): void {
    this.snapshot = this.buildSnapshot();
    this.renderCharts();
  }

  private buildSnapshot(): AnalyticsSnapshot {
    const now = new Date();
    const range = this.getRange(now);
    const pedidosEnRango = this.pedidos.filter(pedido => {
      const fecha = this.toDate(pedido.fechaCreacion ?? pedido.fechaActualizacion);
      return !!fecha && fecha >= range.start && fecha <= range.end;
    });

    const pedidosActivos = pedidosEnRango.filter(pedido => pedido.estado !== 'cancelado');
    const pedidosCancelados = pedidosEnRango.filter(pedido => pedido.estado === 'cancelado');

    const ventasNetas = pedidosActivos.reduce((acc, pedido) => acc + this.toNumber(pedido.total), 0);
    const unidadesVendidas = pedidosActivos.reduce((acc, pedido) => acc + this.toNumber(pedido.totalProductos), 0);
    const pedidosTotales = pedidosEnRango.length;
    const ticketPromedio = pedidosActivos.length ? ventasNetas / pedidosActivos.length : 0;
    const pedidosEnTransito = pedidosEnRango.filter(pedido => pedido.estado === 'en_transito').length;
    const pedidosEntregados = pedidosEnRango.filter(pedido => pedido.estado === 'entregado').length;

    const estadoCounts: EstadoCount[] = [
      { estado: 'en_revision', label: 'En revisión', value: pedidosEnRango.filter(p => p.estado === 'en_revision' || p.estado === 'pendiente').length, color: '#f59e0b' },
      { estado: 'autorizado', label: 'Autorizado', value: pedidosEnRango.filter(p => p.estado === 'autorizado').length, color: '#2563eb' },
      { estado: 'en_transito', label: 'En tránsito', value: pedidosEnRango.filter(p => p.estado === 'en_transito').length, color: '#3b82f6' },
      { estado: 'entregado', label: 'Entregado', value: pedidosEnRango.filter(p => p.estado === 'entregado').length, color: '#16a34a' },
      { estado: 'cancelado', label: 'Cancelado', value: pedidosCancelados.length, color: '#dc2626' }
    ];

    const serie = this.buildSerie(pedidosActivos, range);
    const topProductos = this.buildTopProductos(pedidosActivos);
    const topClientes = this.buildTopClientes(pedidosActivos);

    return {
      ventasNetas,
      pedidosTotales,
      ticketPromedio,
      clientesActivos: new Set(pedidosActivos.map(pedido => String(pedido.clienteId || pedido.clienteNombre || pedido.id || ''))).size,
      unidadesVendidas,
      pedidosEnTransito,
      pedidosEntregados,
      pedidosCancelados: pedidosCancelados.length,
      estadoCounts,
      serie,
      topProductos,
      topClientes
    };
  }

  private buildSerie(pedidos: Pedido[], range: { start: Date; end: Date; bucketCount: number }): SeriePeriodo {
    const labels: string[] = [];
    const sales = Array.from({ length: range.bucketCount }, () => 0);
    const orders = Array.from({ length: range.bucketCount }, () => 0);

    for (let i = 0; i < range.bucketCount; i++) {
      const bucketDate = this.addUnit(range.start, i);
      labels.push(this.getBucketLabel(bucketDate));
    }

    pedidos.forEach(pedido => {
      const fecha = this.toDate(pedido.fechaCreacion ?? pedido.fechaActualizacion);
      if (!fecha || fecha < range.start || fecha > range.end) {
        return;
      }

      const bucket = this.getBucketIndex(fecha, range.start);
      if (bucket < 0 || bucket >= range.bucketCount) {
        return;
      }

      sales[bucket] += this.toNumber(pedido.total);
      orders[bucket] += 1;
    });

    return { labels, sales, orders };
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
      .slice(0, 8);
  }

  private buildTopClientes(pedidos: Pedido[]): TopCliente[] {
    const mapa = new Map<string, TopCliente>();

    pedidos.forEach(pedido => {
      const key = String(pedido.clienteId || pedido.clienteNombre || pedido.id);
      const actual = mapa.get(key) ?? {
        clienteId: key,
        clienteNombre: pedido.clienteNombre,
        pedidos: 0,
        unidades: 0,
        importe: 0,
        ticketPromedio: 0
      };

      actual.clienteNombre = pedido.clienteNombre || actual.clienteNombre;
      actual.pedidos += 1;
      actual.unidades += this.toNumber(pedido.totalProductos);
      actual.importe += this.toNumber(pedido.total);
      actual.ticketPromedio = actual.pedidos ? actual.importe / actual.pedidos : 0;
      mapa.set(key, actual);
    });

    return Array.from(mapa.values())
      .sort((a, b) => b.importe - a.importe || b.pedidos - a.pedidos)
      .slice(0, 8);
  }

  private renderCharts(): void {
    if (!this.viewReady || this.loading) {
      return;
    }

    this.destroyCharts();

    const trendCtx = this.trendCanvas?.nativeElement.getContext('2d');
    const estadoCtx = this.estadoCanvas?.nativeElement.getContext('2d');
    const productosCtx = this.productosCanvas?.nativeElement.getContext('2d');
    const clientesCtx = this.clientesCanvas?.nativeElement.getContext('2d');

    if (trendCtx) {
      this.charts.trend = new Chart(trendCtx, {
        type: 'bar',
        data: {
          labels: this.snapshot.serie.labels,
          datasets: [
            {
              label: 'Ventas netas',
              data: this.snapshot.serie.sales,
              backgroundColor: 'rgba(37, 99, 235, 0.25)',
              borderColor: '#2563eb',
              borderWidth: 1,
              borderRadius: 8,
              yAxisID: 'y'
            },
            {
              label: 'Pedidos',
              data: this.snapshot.serie.orders,
              type: 'line',
              borderColor: '#16a34a',
              backgroundColor: '#16a34a',
              tension: 0.35,
              pointRadius: 3,
              pointBackgroundColor: '#16a34a',
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
                label: (context) => {
                  if (context.dataset.label === 'Ventas netas') {
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
                callback: (value) => this.formatMoney(Number(value))
              }
            },
            y1: {
              beginAtZero: true,
              position: 'right',
              grid: { drawOnChartArea: false },
              ticks: { color: '#6b7280', precision: 0 }
            }
          }
        }
      });
    }

    if (estadoCtx) {
      const estados = this.snapshot.estadoCounts.filter(item => item.value > 0);
      this.charts.estado = new Chart(estadoCtx as any, {
        type: 'doughnut',
        data: {
          labels: estados.map(item => item.label),
          datasets: [
            {
              data: estados.map(item => item.value),
              backgroundColor: estados.map(item => item.color),
              borderWidth: 0,
              hoverOffset: 6
            }
          ]
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
        }
      } as any);
    }

    if (productosCtx) {
      this.charts.productos = new Chart(productosCtx, {
        type: 'bar',
        data: {
          labels: this.snapshot.topProductos.map(item => item.nombre),
          datasets: [
            {
              label: 'Unidades vendidas',
              data: this.snapshot.topProductos.map(item => item.unidades),
              backgroundColor: 'rgba(249, 115, 22, 0.26)',
              borderColor: '#f97316',
              borderWidth: 1,
              borderRadius: 8
            }
          ]
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
        }
      });
    }

    if (clientesCtx) {
      this.charts.clientes = new Chart(clientesCtx, {
        type: 'bar',
        data: {
          labels: this.snapshot.topClientes.map(item => item.clienteNombre),
          datasets: [
            {
              label: 'Importe',
              data: this.snapshot.topClientes.map(item => item.importe),
              backgroundColor: 'rgba(124, 58, 237, 0.25)',
              borderColor: '#7c3aed',
              borderWidth: 1,
              borderRadius: 8
            }
          ]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (context) => ` ${this.formatMoney(Number(context.raw ?? 0))}`
              }
            }
          },
          scales: {
            x: {
              beginAtZero: true,
              grid: { color: 'rgba(229, 231, 235, 0.7)' },
              ticks: {
                color: '#6b7280',
                callback: (value) => this.formatMoney(Number(value))
              }
            },
            y: {
              grid: { display: false },
              ticks: { color: '#111827' }
            }
          }
        }
      });
    }
  }

  private destroyCharts(): void {
    this.charts.trend?.destroy();
    this.charts.estado?.destroy();
    this.charts.productos?.destroy();
    this.charts.clientes?.destroy();
    this.charts = {};
  }

  private emptySnapshot(): AnalyticsSnapshot {
    return {
      ventasNetas: 0,
      pedidosTotales: 0,
      ticketPromedio: 0,
      clientesActivos: 0,
      unidadesVendidas: 0,
      pedidosEnTransito: 0,
      pedidosEntregados: 0,
      pedidosCancelados: 0,
      estadoCounts: [],
      serie: { labels: [], sales: [], orders: [] },
      topProductos: [],
      topClientes: []
    };
  }

  private getRange(now: Date): { start: Date; end: Date; bucketCount: number } {
    const end = new Date(now);
    const start = new Date(now);

    if (this.periodoSeleccionado === 'day') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end, bucketCount: 24 };
    }

    if (this.periodoSeleccionado === 'week') {
      const diff = (start.getDay() + 6) % 7;
      start.setDate(start.getDate() - diff);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end, bucketCount: 7 };
    }

    if (this.periodoSeleccionado === 'month') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end, bucketCount: now.getDate() };
    }

    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end, bucketCount: now.getMonth() + 1 };
  }

  private addUnit(date: Date, index: number): Date {
    const clone = new Date(date);

    if (this.periodoSeleccionado === 'day') {
      clone.setHours(clone.getHours() + index);
      return clone;
    }

    if (this.periodoSeleccionado === 'week' || this.periodoSeleccionado === 'month') {
      clone.setDate(clone.getDate() + index);
      return clone;
    }

    clone.setMonth(clone.getMonth() + index);
    return clone;
  }

  private getBucketIndex(date: Date, start: Date): number {
    if (this.periodoSeleccionado === 'day') {
      return date.getHours();
    }

    if (this.periodoSeleccionado === 'week' || this.periodoSeleccionado === 'month') {
      const midnightDate = new Date(date);
      midnightDate.setHours(0, 0, 0, 0);
      const midnightStart = new Date(start);
      midnightStart.setHours(0, 0, 0, 0);
      const diffMs = midnightDate.getTime() - midnightStart.getTime();
      return Math.floor(diffMs / 86400000);
    }

    return date.getMonth() - start.getMonth();
  }

  private getBucketLabel(date: Date): string {
    if (this.periodoSeleccionado === 'day') {
      return `${String(date.getHours()).padStart(2, '0')}h`;
    }

    if (this.periodoSeleccionado === 'week') {
      return new Intl.DateTimeFormat('es-MX', {
        weekday: 'short',
        day: '2-digit'
      }).format(date);
    }

    if (this.periodoSeleccionado === 'month') {
      return new Intl.DateTimeFormat('es-MX', {
        day: '2-digit',
        month: 'short'
      }).format(date);
    }

    return new Intl.DateTimeFormat('es-MX', {
      month: 'short'
    }).format(date);
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

  private toNumber(valor: any): number {
    const numero = Number(valor ?? 0);
    return Number.isFinite(numero) ? numero : 0;
  }

  formatMoney(valor: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 0
    }).format(valor || 0);
  }
}
