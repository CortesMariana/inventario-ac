import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { DropdownModule } from 'primeng/dropdown';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ChartModule } from 'primeng/chart';
import { TooltipModule } from 'primeng/tooltip';
import * as XLSX from 'xlsx';

import { BaseComponent } from 'src/app/shared/base/base.component';
import { TicketsLogisticaService } from '../tickets.service';
import { VehiculosService } from '../../vehiculos/vehiculos.service';
import { TicketLogistica } from '../models/ticket-logistica.model';
import { Vehiculo } from '../../vehiculos/models/vehiculo.model';

interface FilaVehiculo {
  placas: string;
  vehiculoId: string;
  limiteMensual: number;
  litrosConsumidos: number;
  porcentaje: number;
  sobreLimite: boolean;
  ticketCount: number;
  marca?: string;
  modelo?: string;
  asignadoANombre?: string;
}

@Component({
  selector: 'app-reportes-gasolina',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DropdownModule,
    ToastModule,
    ProgressSpinnerModule,
    ChartModule,
    TooltipModule,
  ],
  templateUrl: './reportes-gasolina.component.html',
  styleUrl: './reportes-gasolina.component.scss',
  providers: [MessageService],
})
export class ReportesGasolinaComponent extends BaseComponent implements OnInit {
  Math = Math;

  cargando = true;

  mesSeleccionado: number;
  anioSeleccionado: number;

  opcionesMes = [
    { label: 'Enero',      value: 1  },
    { label: 'Febrero',    value: 2  },
    { label: 'Marzo',      value: 3  },
    { label: 'Abril',      value: 4  },
    { label: 'Mayo',       value: 5  },
    { label: 'Junio',      value: 6  },
    { label: 'Julio',      value: 7  },
    { label: 'Agosto',     value: 8  },
    { label: 'Septiembre', value: 9  },
    { label: 'Octubre',    value: 10 },
    { label: 'Noviembre',  value: 11 },
    { label: 'Diciembre',  value: 12 },
  ];

  opcionesAnio: { label: string; value: number }[] = [];

  ticketsGas: TicketLogistica[] = [];
  vehiculos: Vehiculo[] = [];
  filas: FilaVehiculo[] = [];

  totalLitrosAutorizados = 0;
  vehiculosConLimite = 0;
  vehiculosEnLimite = 0;
  vehiculosSobreLimite = 0;

  chartData: any = null;
  chartOptions: any = null;

  constructor(
    protected override messageService: MessageService,
    private ticketsService: TicketsLogisticaService,
    private vehiculosService: VehiculosService,
  ) {
    super(messageService);
    const hoy = new Date();
    this.mesSeleccionado  = hoy.getMonth() + 1;
    this.anioSeleccionado = hoy.getFullYear();

    for (let a = hoy.getFullYear(); a >= hoy.getFullYear() - 3; a--) {
      this.opcionesAnio.push({ label: String(a), value: a });
    }
  }

  async ngOnInit() {
    await this.cargarDatos();
  }

  async cargarDatos() {
    this.cargando = true;
    try {
      const [tickets, vehiculos] = await Promise.all([
        this.ticketsService.getAllTickets(),
        this.vehiculosService.getAllVehiculos(),
      ]);

      this.vehiculos   = vehiculos;
      this.ticketsGas  = tickets.filter(t => t.tipoTicket === 'GASOLINA');
      this.calcular();
    } catch {
      this.handleAlertType('ERROR', 'Error al cargar datos');
    } finally {
      this.cargando = false;
    }
  }

  calcular() {
    const ticketsMes = this.ticketsGas.filter(t => {
      if (t.estado !== 'COMPLETADO') return false;
      const fecha = this.ticketsService.getFecha(t.fechaCreacion);
      if (!fecha) return false;
      return fecha.getMonth() + 1 === this.mesSeleccionado && fecha.getFullYear() === this.anioSeleccionado;
    });

    const mapa = new Map<string, { litros: number; count: number; vehiculoId: string }>();
    for (const t of ticketsMes) {
      const key = t.placas || t.vehiculoId || 'SIN-PLACAS';
      if (!mapa.has(key)) {
        mapa.set(key, { litros: 0, count: 0, vehiculoId: t.vehiculoId || '' });
      }
      const entry = mapa.get(key)!;
      entry.litros += t.litrosAutorizados || 0;
      entry.count++;
    }

    const vehiculosMap = new Map<string, Vehiculo>();
    for (const v of this.vehiculos) {
      vehiculosMap.set(v.firestoreId || v.id?.toString() || '', v);
    }

    const filasMap = new Map<string, FilaVehiculo>();

    for (const v of this.vehiculos) {
      if (!v.limiteLitrosMensual) continue;
      const key = v.placa || v.firestoreId || '';
      const consumo = mapa.get(key);
      filasMap.set(key, {
        placas: v.placa,
        vehiculoId: v.firestoreId || '',
        limiteMensual: v.limiteLitrosMensual,
        litrosConsumidos: consumo?.litros || 0,
        porcentaje: Math.min(((consumo?.litros || 0) / v.limiteLitrosMensual) * 100, 999),
        sobreLimite: (consumo?.litros || 0) > v.limiteLitrosMensual,
        ticketCount: consumo?.count || 0,
        marca: v.marca,
        modelo: v.modelo,
        asignadoANombre: v.asignadoANombre || undefined,
      });
    }

    for (const [placas, data] of mapa) {
      if (filasMap.has(placas)) continue;
      const veh = vehiculosMap.get(data.vehiculoId);
      filasMap.set(placas, {
        placas,
        vehiculoId: data.vehiculoId,
        limiteMensual: 0,
        litrosConsumidos: data.litros,
        porcentaje: 0,
        sobreLimite: false,
        ticketCount: data.count,
        marca: veh?.marca,
        modelo: veh?.modelo,
        asignadoANombre: veh?.asignadoANombre || undefined,
      });
    }

    this.filas = Array.from(filasMap.values()).sort((a, b) => b.litrosConsumidos - a.litrosConsumidos);

    this.totalLitrosAutorizados = this.filas.reduce((s, f) => s + f.litrosConsumidos, 0);
    this.vehiculosConLimite     = this.filas.filter(f => f.limiteMensual > 0).length;
    this.vehiculosSobreLimite   = this.filas.filter(f => f.sobreLimite).length;
    this.vehiculosEnLimite      = this.vehiculosConLimite - this.vehiculosSobreLimite;

    this.buildChart();
  }

  buildChart() {
    const filasConDatos = this.filas.filter(f => f.litrosConsumidos > 0 || f.limiteMensual > 0).slice(0, 12);

    this.chartData = {
      labels: filasConDatos.map(f => f.placas),
      datasets: [
        {
          label: 'Consumido (L)',
          data: filasConDatos.map(f => f.litrosConsumidos),
          backgroundColor: filasConDatos.map(f =>
            f.sobreLimite ? 'rgba(239,68,68,0.7)' : 'rgba(22,163,74,0.7)'
          ),
          borderColor: filasConDatos.map(f =>
            f.sobreLimite ? '#dc2626' : '#15803d'
          ),
          borderWidth: 1,
        },
        {
          label: 'Límite mensual (L)',
          data: filasConDatos.map(f => f.limiteMensual || null),
          type: 'line',
          borderColor: '#f59e0b',
          borderWidth: 2,
          borderDash: [6, 3],
          pointBackgroundColor: '#f59e0b',
          pointRadius: 4,
          fill: false,
        },
      ],
    };

    this.chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' },
        tooltip: {
          callbacks: {
            label: (ctx: any) => `${ctx.dataset.label}: ${ctx.raw ?? '—'} L`,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: (v: any) => `${v} L` },
        },
      },
    };
  }

  aplicarFiltros() {
    this.calcular();
  }

  exportarExcel() {
    const wb = XLSX.utils.book_new();

    // Hoja 1 — KPIs
    const resumen = [
      ['Reporte de Gasolina'],
      [`Período: ${this.opcionesMes.find(m => m.value === this.mesSeleccionado)?.label} ${this.anioSeleccionado}`],
      [],
      ['KPI', 'Valor'],
      ['Total litros autorizados', this.totalLitrosAutorizados],
      ['Vehículos con límite configurado', this.vehiculosConLimite],
      ['Vehículos dentro del límite', this.vehiculosEnLimite],
      ['Vehículos sobre el límite', this.vehiculosSobreLimite],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumen), 'Resumen');

    // Hoja 2 — Por vehículo
    const porVehiculo = [
      ['Placas', 'Límite mensual (L)', 'Consumido (L)', '% Usado', 'Tickets', 'Estado'],
      ...this.filas.map(f => [
        f.placas,
        f.limiteMensual || '—',
        f.litrosConsumidos,
        f.limiteMensual ? `${Math.round(f.porcentaje)}%` : '—',
        f.ticketCount,
        f.sobreLimite ? 'SOBRE LÍMITE' : f.limiteMensual ? 'EN LÍMITE' : 'SIN LÍMITE',
      ]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(porVehiculo), 'Por Vehículo');

    // Hoja 3 — Tickets detalle
    const ticketsMes = this.ticketsGas.filter(t => {
      if (t.estado !== 'COMPLETADO') return false;
      const f = this.ticketsService.getFecha(t.fechaCreacion);
      return f && f.getMonth() + 1 === this.mesSeleccionado && f.getFullYear() === this.anioSeleccionado;
    });

    const detalle = [
      ['Folio', 'Placas', 'Solicitante', 'Litros Solicitados', 'Litros Autorizados', 'Monto Depositado', 'Gasolinera', 'Fecha'],
      ...ticketsMes.map(t => [
        t.folio || '',
        t.placas || '',
        t.solicitante?.nombre || '',
        t.litrosSolicitados ?? '',
        t.litrosAutorizados ?? '',
        t.montoDepositado ?? '',
        t.estacion || '',
        this.ticketsService.getFecha(t.fechaCreacion)?.toLocaleDateString('es-MX') || '',
      ]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(detalle), 'Detalle Tickets');

    const mes = this.opcionesMes.find(m => m.value === this.mesSeleccionado)?.label || '';
    XLSX.writeFile(wb, `Gasolina_${mes}_${this.anioSeleccionado}.xlsx`);
  }

  getLabelMes(): string {
    return this.opcionesMes.find(m => m.value === this.mesSeleccionado)?.label || '';
  }

  getTooltipVehiculo(fila: FilaVehiculo): string {
    const partes: string[] = [];
    if (fila.marca || fila.modelo) {
      partes.push(`${fila.marca || ''} ${fila.modelo || ''}`.trim());
    }
    partes.push(fila.asignadoANombre
      ? `Asignado a: ${fila.asignadoANombre}`
      : 'Sin asignación');
    return partes.join('\n');
  }
}
