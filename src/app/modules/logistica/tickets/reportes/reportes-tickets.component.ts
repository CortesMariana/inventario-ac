import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ChartModule } from 'primeng/chart';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import * as XLSX from 'xlsx';

import { BaseComponent } from 'src/app/shared/base/base.component';
import { TicketsLogisticaService } from '../tickets.service';
import { TicketLogistica } from '../models/ticket-logistica.model';

@Component({
  selector: 'app-reportes-tickets',
  standalone: true,
  imports: [CommonModule, FormsModule, ChartModule, ProgressSpinnerModule, ToastModule],
  templateUrl: './reportes-tickets.component.html',
  styleUrl: './reportes-tickets.component.scss',
  providers: [MessageService],
})
export class ReportesTicketsComponent extends BaseComponent implements OnInit {

  cargando = true;
  todos: TicketLogistica[] = [];
  filtrados: TicketLogistica[] = [];

  periodo = 'trimestre';

  kpiTotalTickets   = 0;
  kpiCostoTotal     = 0;
  kpiVehiculoTop    = '—';
  kpiCostoTop       = 0;
  kpiRepsTop        = 0;
  kpiEnProceso      = 0;

  costoPorVehiculoData:      any = null;
  tendenciaMensualData:      any = null;
  frecuenciaPorVehiculoData: any = null;
  distribucionEstadoData:    any = null;

  optionsBarH:    any;
  optionsBar:     any;
  optionsBarFreq: any;
  optionsDoughnut: any;

  vehiculosAnomalia: string[] = [];
  promedioVehiculo  = 0;

  constructor(
    protected override messageService: MessageService,
    private ticketsService: TicketsLogisticaService,
  ) {
    super(messageService);
  }

  async ngOnInit() {
    this.configurarOpciones();
    await this.cargarDatos();
  }

  configurarOpciones() {
    const tc  = '#495057';
    const tcs = '#6c757d';
    const gc  = '#e9ecef';

    this.optionsBarH = {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx: any) =>
              ' ' + (ctx.raw as number).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 }),
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: { color: gc },
          ticks: {
            color: tcs,
            callback: (v: any) => '$' + Number(v).toLocaleString('es-MX', { minimumFractionDigits: 0 }),
          },
        },
        y: {
          ticks: { color: tc, font: { weight: '600' } },
          grid: { display: false },
        },
      },
    };

    this.optionsBar = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: tcs }, grid: { color: gc } },
        y: {
          beginAtZero: true,
          grid: { color: gc },
          ticks: {
            color: tcs,
            callback: (v: any) =>
              v === 0 ? '$0' : '$' + Number(v).toLocaleString('es-MX', { minimumFractionDigits: 0 }),
          },
        },
      },
    };

    this.optionsBarFreq = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: tcs }, grid: { color: gc } },
        y: {
          beginAtZero: true,
          grid: { color: gc },
          ticks: { color: tcs, stepSize: 1 },
        },
      },
    };

    this.optionsDoughnut = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: tc, padding: 14, font: { size: 12 } },
        },
      },
    };
  }

  async cargarDatos() {
    this.cargando = true;
    try {
      this.todos = await this.ticketsService.getAllTickets();
      this.aplicarPeriodo();
    } catch {
      this.handleAlertType('ERROR', 'Error al cargar los datos');
    } finally {
      this.cargando = false;
    }
  }

  aplicarPeriodo() {
    const ahora = new Date();
    let desde: Date | null = null;

    if (this.periodo === 'mes') {
      desde = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    } else if (this.periodo === 'trimestre') {
      desde = new Date(ahora);
      desde.setMonth(desde.getMonth() - 3);
    } else if (this.periodo === 'semestre') {
      desde = new Date(ahora);
      desde.setMonth(desde.getMonth() - 6);
    } else if (this.periodo === 'anio') {
      desde = new Date(ahora.getFullYear(), 0, 1);
    }
    // 'todos' → sin filtro de fecha

    this.filtrados = desde
      ? this.todos.filter(t => {
          const f = this.ticketsService.getFecha(t.fechaCreacion);
          return f && f >= desde!;
        })
      : [...this.todos];

    this.calcularKPIs();
    this.generarGraficoCostoPorVehiculo();
    this.generarGraficoTendenciaMensual();
    this.generarGraficoFrecuenciaPorVehiculo();
    this.generarGraficoEstados();
  }

  calcularKPIs() {
    this.kpiTotalTickets = this.filtrados.length;
    this.kpiEnProceso = this.filtrados.filter(t =>
      ['PENDIENTE', 'AUTORIZADO', 'EN_COTIZACION', 'COTIZACION_LISTA'].includes(t.estado)
    ).length;

    const reps = this.filtrados.filter(t => t.tipoTicket === 'REPARACION' && t.montoReparacion);
    this.kpiCostoTotal = reps.reduce((acc, t) => acc + (t.montoReparacion || 0), 0);

    const agrupado = this.agruparCostoPorVehiculo(reps);
    if (agrupado.length > 0) {
      const top = agrupado[0];
      this.kpiVehiculoTop = top.placas;
      this.kpiCostoTop    = top.costo;
      this.kpiRepsTop     = top.count;
    } else {
      this.kpiVehiculoTop = '—';
      this.kpiCostoTop    = 0;
      this.kpiRepsTop     = 0;
    }
  }

  generarGraficoCostoPorVehiculo() {
    const reps = this.filtrados.filter(t => t.tipoTicket === 'REPARACION' && t.montoReparacion);
    const agrupado = this.agruparCostoPorVehiculo(reps);

    if (agrupado.length === 0) {
      this.costoPorVehiculoData = null;
      this.vehiculosAnomalia = [];
      this.promedioVehiculo  = 0;
      return;
    }

    const costos  = agrupado.map(v => v.costo);
    const promedio = costos.reduce((a, b) => a + b, 0) / costos.length;
    this.promedioVehiculo  = promedio;
    this.vehiculosAnomalia = agrupado.filter(v => v.costo > promedio * 1.5).map(v => v.placas);

    const colores = costos.map(c => {
      if (c > promedio * 1.5) return '#ef4444';
      if (c > promedio * 1.2) return '#f59e0b';
      return '#3b82f6';
    });

    this.costoPorVehiculoData = {
      labels: agrupado.map(v => v.placas),
      datasets: [{
        label: 'Costo total',
        data: costos,
        backgroundColor: colores,
        borderRadius: 4,
        barThickness: 24,
      }],
    };
  }

  generarGraficoTendenciaMensual() {
    const ahora = new Date();
    const meses: { key: string; label: string; costo: number }[] = [];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      meses.push({
        key,
        label: d.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' }),
        costo: 0,
      });
    }

    for (const t of this.todos) {
      if (t.tipoTicket !== 'REPARACION' || !t.montoReparacion) continue;
      const f = this.ticketsService.getFecha(t.fechaCreacion);
      if (!f) continue;
      const key = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}`;
      const mes = meses.find(m => m.key === key);
      if (mes) mes.costo += t.montoReparacion || 0;
    }

    this.tendenciaMensualData = {
      labels: meses.map(m => m.label),
      datasets: [{
        label: 'Costo en reparaciones',
        data: meses.map(m => m.costo),
        backgroundColor: meses.map(m => {
          // Highlight months within the selected period
          const d = new Date(m.key + '-01');
          const ahora2 = new Date();
          const desde = new Date(ahora2);
          if (this.periodo === 'mes')      desde.setMonth(desde.getMonth());
          if (this.periodo === 'trimestre') desde.setMonth(desde.getMonth() - 3);
          if (this.periodo === 'semestre')  desde.setMonth(desde.getMonth() - 6);
          if (this.periodo === 'anio')      desde.setFullYear(desde.getFullYear(), 0, 1);
          return (this.periodo === 'todos' || d >= desde)
            ? 'rgba(59, 130, 246, 0.85)'
            : 'rgba(59, 130, 246, 0.25)';
        }),
        borderRadius: 4,
      }],
    };
  }

  generarGraficoFrecuenciaPorVehiculo() {
    const reps = this.filtrados.filter(t => t.tipoTicket === 'REPARACION');
    const map = new Map<string, number>();
    for (const t of reps) {
      const p = t.placas || 'Sin placas';
      map.set(p, (map.get(p) || 0) + 1);
    }

    if (map.size === 0) { this.frecuenciaPorVehiculoData = null; return; }

    const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);

    this.frecuenciaPorVehiculoData = {
      labels: sorted.map(e => e[0]),
      datasets: [{
        label: 'Reparaciones',
        data: sorted.map(e => e[1]),
        backgroundColor: '#8b5cf6',
        borderRadius: 4,
        barThickness: 22,
      }],
    };
  }

  generarGraficoEstados() {
    const estados = ['PENDIENTE', 'AUTORIZADO', 'EN_COTIZACION', 'COTIZACION_LISTA', 'COMPLETADO', 'RECHAZADO'];
    const labels  = ['Pendiente', 'Autorizado', 'En cotización', 'Cotización lista', 'Completado', 'Rechazado'];
    const colores = ['#fbbf24', '#60a5fa', '#a78bfa', '#fb923c', '#34d399', '#f87171'];

    const counts = estados.map(e => this.filtrados.filter(t => t.estado === e).length);
    const idx    = counts.map((_, i) => i).filter(i => counts[i] > 0);

    this.distribucionEstadoData = idx.length === 0 ? null : {
      labels: idx.map(i => labels[i]),
      datasets: [{
        data: idx.map(i => counts[i]),
        backgroundColor: idx.map(i => colores[i]),
        borderWidth: 2,
        borderColor: '#ffffff',
      }],
    };
  }


  private agruparCostoPorVehiculo(reps: TicketLogistica[]): { placas: string; costo: number; count: number }[] {
    const map = new Map<string, { costo: number; count: number }>();
    for (const t of reps) {
      const p    = t.placas || 'Sin placas';
      const curr = map.get(p) || { costo: 0, count: 0 };
      map.set(p, { costo: curr.costo + (t.montoReparacion || 0), count: curr.count + 1 });
    }
    return [...map.entries()]
      .map(([placas, d]) => ({ placas, ...d }))
      .sort((a, b) => b.costo - a.costo);
  }

  getCount(estado: string): number {
    return this.filtrados.filter(t => t.estado === estado).length;
  }

  getPct(estado: string): number {
    if (!this.filtrados.length) return 0;
    return Math.round((this.getCount(estado) / this.filtrados.length) * 100);
  }

  formatPrecio(v: number): string {
    return v.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 0 });
  }

  get chartHeightVehiculo(): string {
    const n = this.costoPorVehiculoData?.labels?.length || 0;
    return Math.max(260, n * 40 + 48) + 'px';
  }


  exportarExcel() {
    const wb   = XLSX.utils.book_new();
    const periodoLabel: Record<string, string> = {
      mes: 'Este mes', trimestre: 'Últimos 3 meses',
      semestre: 'Últimos 6 meses', anio: 'Este año', todos: 'Todo el historial',
    };
    const fmt  = (d: any) => {
      const date = this.ticketsService.getFecha(d);
      return date ? date.toLocaleDateString('es-MX') : '—';
    };
    const peso = (v: number) =>
      v > 0 ? v.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 }) : '—';

    // ── Hoja 1: Resumen ───────────────────────────────────────────────────
    const repsConMonto = this.filtrados.filter(t => t.tipoTicket === 'REPARACION' && t.montoReparacion);
    const agrupado     = this.agruparCostoPorVehiculo(repsConMonto);
    const promedio     = agrupado.length
      ? agrupado.reduce((s, v) => s + v.costo, 0) / agrupado.length : 0;

    const resumenData = [
      ['REPORTE DE SOLICITUDES LOGÍSTICA', ''],
      ['Período', periodoLabel[this.periodo] || this.periodo],
      ['Generado el', new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })],
      [''],
      ['INDICADORES CLAVE', ''],
      ['Total de solicitudes', this.filtrados.length],
      ['Costo total en reparaciones', this.kpiCostoTotal],
      ['Promedio de costo por vehículo', promedio],
      ['Vehículo más costoso', this.kpiVehiculoTop],
      ['Costo del vehículo más costoso', this.kpiCostoTop],
      ['Solicitudes activas (en proceso)', this.kpiEnProceso],
      [''],
      ['DISTRIBUCIÓN POR ESTADO', ''],
      ['Pendiente de autorización', this.getCount('PENDIENTE')],
      ['Autorizadas', this.getCount('AUTORIZADO')],
      ['En cotización', this.getCount('EN_COTIZACION')],
      ['Cotización lista', this.getCount('COTIZACION_LISTA')],
      ['Completadas', this.getCount('COMPLETADO')],
      ['Rechazadas', this.getCount('RECHAZADO')],
      [''],
      ['VEHÍCULOS CON GASTO ELEVADO (>50% sobre promedio)', ''],
      ...( this.vehiculosAnomalia.length
        ? this.vehiculosAnomalia.map(p => [p, '⚠ Revisar'])
        : [['Sin anomalías detectadas', '']]),
    ];

    const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
    wsResumen['!cols'] = [{ wch: 38 }, { wch: 26 }];
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

    // ── Hoja 2: Reparaciones ──────────────────────────────────────────────
    const reps = this.filtrados.filter(t => t.tipoTicket === 'REPARACION');
    const repsRows = [
      ['Folio', 'Placas', 'Tipo de Reparación', 'Justificación', 'Estado', 'Monto ($)',
       'Taller', 'Ubicación Taller', 'Solicitante', 'Fecha Solicitud', 'Alerta'],
      ...reps.map(t => {
        const costoN = t.montoReparacion || 0;
        const prom   = promedio;
        const alerta = costoN > prom * 1.5 ? '⚠ Anomalía' : costoN > prom * 1.2 ? '↑ Elevado' : '';
        return [
          t.folio || '—',
          t.placas || '—',
          t.tipoReparacion || '—',
          t.justificacion || '—',
          this.estadoLabel(t.estado),
          costoN || '',
          t.nombreTaller || '—',
          t.ubicacionTaller || '—',
          t.solicitante?.nombre || '—',
          fmt(t.fechaCreacion),
          alerta,
        ];
      }),
    ];

    const wsReps = XLSX.utils.aoa_to_sheet(repsRows);
    wsReps['!cols'] = [
      { wch: 18 }, { wch: 12 }, { wch: 22 }, { wch: 40 },
      { wch: 20 }, { wch: 14 }, { wch: 24 }, { wch: 24 },
      { wch: 26 }, { wch: 16 }, { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(wb, wsReps, 'Reparaciones');

    // ── Hoja 3: Gasto por Vehículo ────────────────────────────────────────
    const totalCosto = agrupado.reduce((s, v) => s + v.costo, 0);
    const gastoRows  = [
      ['Placas', '# Reparaciones', 'Costo Total ($)', 'Costo Promedio ($)', '% del Total', 'Alerta'],
      ...agrupado.map(v => {
        const alerta = v.costo > promedio * 1.5 ? '⚠ Anomalía'
          : v.costo > promedio * 1.2 ? '↑ Elevado' : 'Normal';
        const pct    = totalCosto > 0 ? +(v.costo / totalCosto * 100).toFixed(1) : 0;
        return [v.placas, v.count, v.costo, v.count > 0 ? +(v.costo / v.count).toFixed(2) : 0, pct, alerta];
      }),
      [''],
      ['Promedio general por vehículo', '', +promedio.toFixed(2)],
    ];

    const wsGasto = XLSX.utils.aoa_to_sheet(gastoRows);
    wsGasto['!cols'] = [{ wch: 14 }, { wch: 16 }, { wch: 18 }, { wch: 20 }, { wch: 14 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, wsGasto, 'Gasto por Vehículo');

    // ── Hoja 4: Solicitudes de Insumos ────────────────────────────────────
    const insumos = this.filtrados.filter(t => t.tipoTicket === 'PRODUCTO');
    const insumosRows = [
      ['Folio', 'Solicitante', 'Estado', '# Insumos', 'Costo Estimado ($)', 'Fecha Solicitud'],
      ...insumos.map(t => {
        const lineas = (t as any).lineas ?? [];
        const costoEst = lineas.reduce((s: number, l: any) => s + (l.subtotal || 0), 0);
        return [
          t.folio || '—',
          t.solicitante?.nombre || '—',
          this.estadoLabel(t.estado),
          lineas.length,
          costoEst || '',
          fmt(t.fechaCreacion),
        ];
      }),
    ];

    const wsInsumos = XLSX.utils.aoa_to_sheet(insumosRows);
    wsInsumos['!cols'] = [{ wch: 18 }, { wch: 26 }, { wch: 22 }, { wch: 12 }, { wch: 20 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, wsInsumos, 'Insumos');

    const fecha = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `reporte-solicitudes-${fecha}.xlsx`);
  }

  private estadoLabel(estado: string): string {
    const map: Record<string, string> = {
      PENDIENTE: 'Pendiente de autorización',
      AUTORIZADO: 'Autorizado',
      EN_COTIZACION: 'En cotización',
      COTIZACION_LISTA: 'Cotización lista',
      COMPLETADO: 'Completado',
      RECHAZADO: 'Rechazado',
    };
    return map[estado] || estado;
  }
}
