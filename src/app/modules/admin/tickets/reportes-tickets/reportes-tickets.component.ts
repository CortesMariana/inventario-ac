import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { MessageService } from 'primeng/api';
import { BaseComponent } from 'src/app/shared/base/base.component';
import { TicketService } from '../tickets.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-reportes-tickets',
  templateUrl: './reportes-tickets.component.html',
  styleUrls: ['./reportes-tickets.component.css']
})
export class ReportesTicketsComponent extends BaseComponent implements OnInit {
  estadisticas: any = null;
  cargando: boolean = false;

  diaSeleccionado: number = new Date().getDate();
  dias: { label: string, value: number }[] = [];

  optionsBar: any;
  optionsPie: any;
  optionsLine: any;
  optionsDoughnut: any;

  Math = Math;
  
  distribucionEstatusData: any = null;
  distribucionPrioridadData: any = null;
  tendenciaMensualData: any = null;
  tasaResolucionData: any = null;

  periodo: string = 'mes';
  mostrarDetalles: boolean = false;

  ordenTecnicos: string = 'eficiencia';

  distribucionCategoriaData: any = null;
  distribucionTecnicoData: any = null;

  meses: { label: string, value: number }[] = [
    { label: 'Enero', value: 0 },
    { label: 'Febrero', value: 1 },
    { label: 'Marzo', value: 2 },
    { label: 'Abril', value: 3 },
    { label: 'Mayo', value: 4 },
    { label: 'Junio', value: 5 },
    { label: 'Julio', value: 6 },
    { label: 'Agosto', value: 7 },
    { label: 'Septiembre', value: 8 },
    { label: 'Octubre', value: 9 },
    { label: 'Noviembre', value: 10 },
    { label: 'Diciembre', value: 11 }
  ];

  anios: number[] = [];
  mesSeleccionado: number = new Date().getMonth();
  anioSeleccionado: number = new Date().getFullYear();
  exportando: boolean = false;

  constructor(
    protected override messageService: MessageService,
    private ticketService: TicketService,
    private cdRef: ChangeDetectorRef
  ) {
    super(messageService);
    this.inicializarAnios();
  }

  ngOnInit() {
    this.configurarGraficos();
    this.cargarEstadisticas();

    console.log('Mes inicial:', this.mesSeleccionado);
    console.log('Año inicial:', this.anioSeleccionado);
  }

  inicializarDias() {
    this.dias = [];
    const fecha = new Date(this.anioSeleccionado, this.mesSeleccionado + 1, 0);
    const totalDias = fecha.getDate();
    
    for (let i = 1; i <= totalDias; i++) {
      this.dias.push({ label: i.toString(), value: i });
    }
  }

  inicializarAnios() {
    const anioActual = new Date().getFullYear();
    for (let i = anioActual - 2; i <= anioActual + 1; i++) {
      this.anios.push(i);
    }
  }

  onMesChange(nuevoMes: number) {
    const mesNumero = typeof nuevoMes === 'string' ? parseInt(nuevoMes, 10) : nuevoMes;
    console.log('Mes cambiado a:', mesNumero);
    this.mesSeleccionado = mesNumero;
  }

  onAnioChange(nuevoAnio: number) {
    const anioNumero = typeof nuevoAnio === 'string' ? parseInt(nuevoAnio, 10) : nuevoAnio;
    console.log('Año cambiado a:', anioNumero);
    this.anioSeleccionado = anioNumero;
  }

  /*async exportarAExcel() {
    const mesExportar = Number(this.mesSeleccionado);
    const anioExportar = Number(this.anioSeleccionado);
    
    console.log('=== INICIO EXPORTACIÓN ===');
    console.log('Mes seleccionado (original):', this.mesSeleccionado, typeof this.mesSeleccionado);
    console.log('Mes a exportar:', mesExportar, typeof mesExportar);
    console.log('Año a exportar:', anioExportar, typeof anioExportar);
    
    if (isNaN(mesExportar) || mesExportar < 0 || mesExportar > 11) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Selección inválida',
        detail: 'Por favor selecciona un mes válido',
        life: 3000
      });
      return;
    }
    
    if (isNaN(anioExportar) || anioExportar < 2000) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Selección inválida',
        detail: 'Por favor selecciona un año válido',
        life: 3000
      });
      return;
    }

    this.exportando = true;
    
    try {
      const nombreMes = this.meses.find(m => m.value === mesExportar)?.label || '';
      console.log(`Exportando tickets de: ${nombreMes} ${anioExportar}`);
      
      const tickets = await this.ticketService.getTicketsPorMes(anioExportar, mesExportar);
      
      console.log(`Tickets encontrados: ${tickets?.length || 0}`);
      
      if (!tickets || tickets.length === 0) {
        this.messageService.add({
          severity: 'info',
          summary: 'Sin datos',
          detail: `No hay tickets registrados en ${nombreMes} ${anioExportar}. Prueba con otro mes.`,
          life: 4000
        });
        this.exportando = false;
        return;
      }

      const datosExcel = tickets.map(ticket => this.transformarTicketParaExcel(ticket));
      
      const resumen = this.generarResumenTickets(tickets, nombreMes);
      
      const workbook = XLSX.utils.book_new();
      
      const worksheetDetalle = XLSX.utils.json_to_sheet(datosExcel);
      this.ajustarAnchoColumnas(worksheetDetalle); 
      XLSX.utils.book_append_sheet(workbook, worksheetDetalle, 'Detalle de Tickets');
      
      const worksheetResumen = XLSX.utils.json_to_sheet([resumen]);
      this.ajustarAnchoColumnas(worksheetResumen);
      XLSX.utils.book_append_sheet(workbook, worksheetResumen, 'Resumen');
      
      const estatusStats = this.generarEstadisticasPorEstatus(tickets);
      const worksheetEstatus = XLSX.utils.json_to_sheet(estatusStats);
      this.ajustarAnchoColumnas(worksheetEstatus);
      XLSX.utils.book_append_sheet(workbook, worksheetEstatus, 'Por Estatus');

      const prioridadStats = this.generarEstadisticasPorPrioridad(tickets);
      const worksheetPrioridad = XLSX.utils.json_to_sheet(prioridadStats);
      this.ajustarAnchoColumnas(worksheetPrioridad);
      XLSX.utils.book_append_sheet(workbook, worksheetPrioridad, 'Por Prioridad');

      const tecnicoStats = this.generarEstadisticasPorTecnicoParaExcel(tickets);
      const worksheetTecnico = XLSX.utils.json_to_sheet(tecnicoStats);
      this.ajustarAnchoColumnas(worksheetTecnico);
      XLSX.utils.book_append_sheet(workbook, worksheetTecnico, 'Por Técnico');
      
      const nombreArchivo = `Reporte_Tickets_${nombreMes}_${anioExportar}.xlsx`;
      XLSX.writeFile(workbook, nombreArchivo);
      
      this.messageService.add({
        severity: 'success',
        summary: 'Exportación exitosa',
        detail: `Reporte de ${nombreMes} ${anioExportar} generado correctamente`,
        life: 4000
      });
      
    } catch (error) {
      console.error('Error al exportar:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al generar el reporte. Por favor intenta nuevamente.',
        life: 5000
      });
    } finally {
      this.exportando = false;
    }
  }*/

  async exportarPorMes() {
    const mesExportar = Number(this.mesSeleccionado);
    const anioExportar = Number(this.anioSeleccionado);
    
    console.log('=== EXPORTACIÓN POR MES ===');
    console.log('Mes seleccionado:', mesExportar);
    console.log('Año seleccionado:', anioExportar);
    
    if (isNaN(mesExportar) || mesExportar < 0 || mesExportar > 11) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Selección inválida',
        detail: 'Por favor selecciona un mes válido',
        life: 3000
      });
      return;
    }
    
    if (isNaN(anioExportar) || anioExportar < 2000) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Selección inválida',
        detail: 'Por favor selecciona un año válido',
        life: 3000
      });
      return;
    }

    this.exportando = true;
    
    try {
      const nombreMes = this.meses.find(m => m.value === mesExportar)?.label || '';
      console.log(`Exportando tickets creados en: ${nombreMes} ${anioExportar}`);
      
      const tickets = await this.ticketService.getTicketsPorMes(anioExportar, mesExportar);
      
      console.log(`Tickets encontrados: ${tickets?.length || 0}`);
      
      if (!tickets || tickets.length === 0) {
        this.messageService.add({
          severity: 'info',
          summary: 'Sin datos',
          detail: `No hay tickets creados en ${nombreMes} ${anioExportar}. Prueba con otro mes.`,
          life: 4000
        });
        this.exportando = false;
        return;
      }

      const datosExcel = tickets.map(ticket => this.transformarTicketParaExcel(ticket));
      
      const resumen = this.generarResumenTickets(tickets, nombreMes);
      
      const workbook = XLSX.utils.book_new();
      
      const worksheetDetalle = XLSX.utils.json_to_sheet(datosExcel);
      this.ajustarAnchoColumnas(worksheetDetalle); 
      XLSX.utils.book_append_sheet(workbook, worksheetDetalle, 'Tickets Creados');
      
      const worksheetResumen = XLSX.utils.json_to_sheet([resumen]);
      this.ajustarAnchoColumnas(worksheetResumen);
      XLSX.utils.book_append_sheet(workbook, worksheetResumen, 'Resumen Creados');
      
      const estatusStats = this.generarEstadisticasPorEstatus(tickets);
      const worksheetEstatus = XLSX.utils.json_to_sheet(estatusStats);
      this.ajustarAnchoColumnas(worksheetEstatus);
      XLSX.utils.book_append_sheet(workbook, worksheetEstatus, 'Por Estatus Creados');

      const prioridadStats = this.generarEstadisticasPorPrioridad(tickets);
      const worksheetPrioridad = XLSX.utils.json_to_sheet(prioridadStats);
      this.ajustarAnchoColumnas(worksheetPrioridad);
      XLSX.utils.book_append_sheet(workbook, worksheetPrioridad, 'Por Prioridad Creados');

      const tecnicoStats = this.generarEstadisticasPorTecnicoParaExcel(tickets);
      const worksheetTecnico = XLSX.utils.json_to_sheet(tecnicoStats);
      this.ajustarAnchoColumnas(worksheetTecnico);
      XLSX.utils.book_append_sheet(workbook, worksheetTecnico, 'Por Técnico Creados');
      
      const nombreArchivo = `Reporte_Tickets_Creados_${nombreMes}_${anioExportar}.xlsx`;
      XLSX.writeFile(workbook, nombreArchivo);
      
      this.messageService.add({
        severity: 'success',
        summary: 'Exportación exitosa',
        detail: `Reporte de tickets creados en ${nombreMes} ${anioExportar} generado correctamente`,
        life: 4000
      });
      
    } catch (error) {
      console.error('Error al exportar:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al generar el reporte. Por favor intenta nuevamente.',
        life: 5000
      });
    } finally {
      this.exportando = false;
    }
  }

  async exportarPorAnio() {
    console.log('=== EXPORTACIÓN POR AÑO (ÚLTIMOS 12 MESES) ===');
    
    this.exportando = true;
    
    try {
      const fechaActual = new Date();
      const anioActual = fechaActual.getFullYear();
      const mesActual = fechaActual.getMonth();

      const fechaInicio = new Date(anioActual, mesActual - 11, 1);
      const anioInicio = fechaInicio.getFullYear();
      const mesInicio = fechaInicio.getMonth();
      
      console.log(`Exportando tickets del período: ${mesInicio + 1}/${anioInicio} hasta ${mesActual + 1}/${anioActual}`);
      
      const ticketsCreados = await this.ticketService.getTicketsPorRangoFechas(
        anioInicio, 
        mesInicio, 
        anioActual, 
        mesActual
      );
      
      const ticketsSolucionados = await this.ticketService.getTicketsSolucionadosPorRangoFechas(
        anioInicio, 
        mesInicio, 
        anioActual, 
        mesActual
      );
      
      console.log(`Tickets creados encontrados: ${ticketsCreados?.length || 0}`);
      console.log(`Tickets solucionados encontrados: ${ticketsSolucionados?.length || 0}`);
      
      if ((!ticketsCreados || ticketsCreados.length === 0) && (!ticketsSolucionados || ticketsSolucionados.length === 0)) {
        this.messageService.add({
          severity: 'info',
          summary: 'Sin datos',
          detail: `No hay tickets creados o solucionados en los últimos 12 meses.`,
          life: 4000
        });
        this.exportando = false;
        return;
      }

      const workbook = XLSX.utils.book_new();
      
      if (ticketsCreados && ticketsCreados.length > 0) {
        const datosExcelCreados = ticketsCreados.map(ticket => this.transformarTicketParaExcel(ticket));
        const worksheetCreados = XLSX.utils.json_to_sheet(datosExcelCreados);
        this.ajustarAnchoColumnas(worksheetCreados);
        XLSX.utils.book_append_sheet(workbook, worksheetCreados, 'Tickets Creados');
        
        const resumenCreados = this.generarResumenAnual(ticketsCreados, 'Creados');
        const worksheetResumenCreados = XLSX.utils.json_to_sheet([resumenCreados]);
        this.ajustarAnchoColumnas(worksheetResumenCreados);
        XLSX.utils.book_append_sheet(workbook, worksheetResumenCreados, 'Resumen Anual Creados');
      }
      
      if (ticketsSolucionados && ticketsSolucionados.length > 0) {
        const datosExcelSolucionados = ticketsSolucionados.map(ticket => this.transformarTicketParaExcel(ticket));
        const worksheetSolucionados = XLSX.utils.json_to_sheet(datosExcelSolucionados);
        this.ajustarAnchoColumnas(worksheetSolucionados);
        XLSX.utils.book_append_sheet(workbook, worksheetSolucionados, 'Tickets Solucionados');
        
        const resumenSolucionados = this.generarResumenAnual(ticketsSolucionados, 'Solucionados');
        const worksheetResumenSolucionados = XLSX.utils.json_to_sheet([resumenSolucionados]);
        this.ajustarAnchoColumnas(worksheetResumenSolucionados);
        XLSX.utils.book_append_sheet(workbook, worksheetResumenSolucionados, 'Resumen Anual Solucionados');
      }
      
      const tendenciaMensual = this.generarTendenciaMensualComparativa(ticketsCreados, ticketsSolucionados);
      const worksheetTendencia = XLSX.utils.json_to_sheet(tendenciaMensual);
      this.ajustarAnchoColumnas(worksheetTendencia);
      XLSX.utils.book_append_sheet(workbook, worksheetTendencia, 'Tendencia Mensual');

      if (ticketsCreados && ticketsCreados.length > 0) {
        const estatusStats = this.generarEstadisticasPorEstatus(ticketsCreados);
        const worksheetEstatus = XLSX.utils.json_to_sheet(estatusStats);
        this.ajustarAnchoColumnas(worksheetEstatus);
        XLSX.utils.book_append_sheet(workbook, worksheetEstatus, 'Por Estatus Creados');

        const prioridadStats = this.generarEstadisticasPorPrioridad(ticketsCreados);
        const worksheetPrioridad = XLSX.utils.json_to_sheet(prioridadStats);
        this.ajustarAnchoColumnas(worksheetPrioridad);
        XLSX.utils.book_append_sheet(workbook, worksheetPrioridad, 'Por Prioridad Creados');
      }
      
      const nombreArchivo = `Reporte_Anual_${fechaInicio.toLocaleDateString()}_al_${fechaActual.toLocaleDateString()}.xlsx`;
      XLSX.writeFile(workbook, nombreArchivo);
      
      this.messageService.add({
        severity: 'success',
        summary: 'Exportación exitosa',
        detail: `Reporte anual (últimos 12 meses) generado correctamente`,
        life: 4000
      });
      
    } catch (error) {
      console.error('Error al exportar:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al generar el reporte anual. Por favor intenta nuevamente.',
        life: 5000
      });
    } finally {
      this.exportando = false;
    }
  }

  private generarResumenAnual(tickets: any[], tipo: string): any {
    const total = tickets.length;
    const resueltos = tickets.filter(t => ['Resuelto', 'Cerrado'].includes(t.estatus)).length;
    const pendientes = tickets.filter(t => ['Nuevo', 'Asignado', 'En proceso'].includes(t.estatus)).length;
    const cancelados = tickets.filter(t => t.estatus === 'Cancelado').length;

    const ticketsPorMes: { [key: string]: number } = {};
    tickets.forEach(ticket => {
      const fecha = ticket.fechaCreacion;
      if (fecha) {
        const mesKey = `${fecha.getMonth() + 1}/${fecha.getFullYear()}`;
        ticketsPorMes[mesKey] = (ticketsPorMes[mesKey] || 0) + 1;
      }
    });
    
    let tiempoTotal = 0;
    let ticketsConTiempo = 0;
    tickets.forEach(ticket => {
      if (ticket.fechasEstatus?.fechaResuelto && ticket.fechaCreacion) {
        try {
          const fechaResuelto = new Date(ticket.fechasEstatus.fechaResuelto);
          const fechaCreacion = new Date(ticket.fechaCreacion);
          if (!isNaN(fechaResuelto.getTime()) && !isNaN(fechaCreacion.getTime())) {
            const diff = fechaResuelto.getTime() - fechaCreacion.getTime();
            tiempoTotal += diff / (1000 * 60 * 60);
            ticketsConTiempo++;
          }
        } catch {
        }
      }
    });
    const tiempoPromedio = ticketsConTiempo > 0 ? (tiempoTotal / ticketsConTiempo).toFixed(1) : 'N/A';
    
    const mesMayor = Object.entries(ticketsPorMes).reduce((a, b) => a[1] > b[1] ? a : b, ['', 0]);
    
    return {
      'Tipo': tipo,
      'Período': 'Últimos 12 meses',
      'Total Tickets': total,
      'Tickets Resueltos/Cerrados': resueltos,
      'Tickets Pendientes': pendientes,
      'Tickets Cancelados': cancelados,
      'Tasa de Resolución': total > 0 ? ((resueltos / total) * 100).toFixed(1) + '%' : '0%',
      'Tiempo Promedio Resolución (hrs)': tiempoPromedio !== 'N/A' ? tiempoPromedio + ' hrs' : 'N/A',
      'Mes con más actividad': mesMayor[0],
      'Tickets en mes pico': mesMayor[1],
      'Fecha Generación': new Date().toLocaleString()
    };
  }

  private generarTendenciaMensualComparativa(ticketsCreados: any[], ticketsSolucionados: any[]): any[] {
    const nombresMeses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const fechaActual = new Date();
    const anioActual = fechaActual.getFullYear();
    const mesActual = fechaActual.getMonth();
    
    const tendencia = [];
    
    for (let i = 11; i >= 0; i--) {
      const fecha = new Date(anioActual, mesActual - i, 1);
      const mes = nombresMeses[fecha.getMonth()];
      const anio = fecha.getFullYear();
      const key = `${mes} ${anio}`;
      
      const creadosEnMes = ticketsCreados.filter(ticket => {
        const fechaCreacion = ticket.fechaCreacion;
        return fechaCreacion && 
              fechaCreacion.getMonth() === fecha.getMonth() && 
              fechaCreacion.getFullYear() === fecha.getFullYear();
      }).length;
      
      const solucionadosEnMes = ticketsSolucionados.filter(ticket => {
        let fechaResolucion = ticket.fechasEstatus?.fechaResuelto || ticket.fechasEstatus?.fechaCerrado;
        return fechaResolucion && 
              fechaResolucion.getMonth() === fecha.getMonth() && 
              fechaResolucion.getFullYear() === fecha.getFullYear();
      }).length;
      
      tendencia.push({
        'Mes': key,
        'Tickets Creados': creadosEnMes,
        'Tickets Solucionados': solucionadosEnMes,
        'Diferencia': creadosEnMes - solucionadosEnMes,
        'Tasa de Resolución': creadosEnMes > 0 ? ((solucionadosEnMes / creadosEnMes) * 100).toFixed(1) + '%' : '0%'
      });
    }
    
    return tendencia;
  }

  async exportarSolucionadosPorMes() {
    const mesExportar = Number(this.mesSeleccionado);
    const anioExportar = Number(this.anioSeleccionado);
    
    console.log('=== EXPORTACIÓN DE SOLUCIONADOS POR MES ===');
    console.log('Mes seleccionado:', mesExportar);
    console.log('Año seleccionado:', anioExportar);
    
    if (isNaN(mesExportar) || mesExportar < 0 || mesExportar > 11) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Selección inválida',
        detail: 'Por favor selecciona un mes válido',
        life: 3000
      });
      return;
    }
    
    if (isNaN(anioExportar) || anioExportar < 2000) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Selección inválida',
        detail: 'Por favor selecciona un año válido',
        life: 3000
      });
      return;
    }

    this.exportando = true;
    
    try {
      const nombreMes = this.meses.find(m => m.value === mesExportar)?.label || '';
      console.log(`Exportando tickets solucionados en: ${nombreMes} ${anioExportar}`);
      
      const tickets = await this.ticketService.getTicketsSolucionadosPorMes(anioExportar, mesExportar);
      
      console.log(`Tickets solucionados encontrados: ${tickets?.length || 0}`);
      
      if (!tickets || tickets.length === 0) {
        this.messageService.add({
          severity: 'info',
          summary: 'Sin datos',
          detail: `No hay tickets solucionados en ${nombreMes} ${anioExportar}. Prueba con otro mes.`,
          life: 4000
        });
        this.exportando = false;
        return;
      }

      const datosExcel = tickets.map(ticket => this.transformarTicketParaExcel(ticket));
      
      const resumen = this.generarResumenTickets(tickets, nombreMes);
      
      const workbook = XLSX.utils.book_new();
      
      const worksheetDetalle = XLSX.utils.json_to_sheet(datosExcel);
      this.ajustarAnchoColumnas(worksheetDetalle); 
      XLSX.utils.book_append_sheet(workbook, worksheetDetalle, 'Tickets Solucionados');
      
      const worksheetResumen = XLSX.utils.json_to_sheet([resumen]);
      this.ajustarAnchoColumnas(worksheetResumen);
      XLSX.utils.book_append_sheet(workbook, worksheetResumen, 'Resumen Solucionados');
      
      const estatusStats = this.generarEstadisticasPorEstatus(tickets);
      const worksheetEstatus = XLSX.utils.json_to_sheet(estatusStats);
      this.ajustarAnchoColumnas(worksheetEstatus);
      XLSX.utils.book_append_sheet(workbook, worksheetEstatus, 'Por Estatus');

      const prioridadStats = this.generarEstadisticasPorPrioridad(tickets);
      const worksheetPrioridad = XLSX.utils.json_to_sheet(prioridadStats);
      this.ajustarAnchoColumnas(worksheetPrioridad);
      XLSX.utils.book_append_sheet(workbook, worksheetPrioridad, 'Por Prioridad');

      const tecnicoStats = this.generarEstadisticasPorTecnicoParaExcel(tickets);
      const worksheetTecnico = XLSX.utils.json_to_sheet(tecnicoStats);
      this.ajustarAnchoColumnas(worksheetTecnico);
      XLSX.utils.book_append_sheet(workbook, worksheetTecnico, 'Por Técnico');
      
      const nombreArchivo = `Reporte_Tickets_Solucionados_${nombreMes}_${anioExportar}.xlsx`;
      XLSX.writeFile(workbook, nombreArchivo);
      
      this.messageService.add({
        severity: 'success',
        summary: 'Exportación exitosa',
        detail: `Reporte de tickets solucionados en ${nombreMes} ${anioExportar} generado correctamente`,
        life: 4000
      });
      
    } catch (error) {
      console.error('Error al exportar:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al generar el reporte. Por favor intenta nuevamente.',
        life: 5000
      });
    } finally {
      this.exportando = false;
    }
  }

  private transformarTicketParaExcel(ticket: any): any {
    const formatFecha = (fecha: Date | null) => {
      if (!fecha) return '';
      try {
        const date = new Date(fecha);
        if (isNaN(date.getTime())) return '';
        return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
      } catch {
        return '';
      }
    };
    
    const formatFechaHora = (fecha: Date | null) => {
      if (!fecha) return '';
      try {
        const date = new Date(fecha);
        if (isNaN(date.getTime())) return '';
        const horas = date.getHours();
        const minutos = date.getMinutes().toString().padStart(2, '0');
        return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${horas}:${minutos}`;
      } catch {
        return '';
      }
    };

    const getSucursalNombre = (sucursal: any): string => {
      if (!sucursal) return '';
      if (typeof sucursal === 'string') return sucursal;
      if (sucursal.nombre && typeof sucursal.nombre === 'string') return sucursal.nombre;
      if (sucursal.nombre !== undefined) return String(sucursal.nombre);
      return '';
    };

    const getCreadoPorNombre = (creadoPor: any): string => {
      if (!creadoPor) return '';
      if (typeof creadoPor === 'string') return creadoPor;
      if (creadoPor.nombre && typeof creadoPor.nombre === 'string') return creadoPor.nombre;
      return '';
    };
    
    const getAsignadoANombre = (asignadoA: any): string => {
      if (!asignadoA) return '';
      if (typeof asignadoA === 'string') return asignadoA;
      if (asignadoA.nombre && typeof asignadoA.nombre === 'string') return asignadoA.nombre;
      return '';
    };
    
    return {
      'Folio': ticket.folio || '',
      'Título': ticket.titulo || '',
      'Descripción': (ticket.descripcion || '').substring(0, 200),
      'Estado': ticket.estatus || '',
      'Prioridad': ticket.prioridad || '',
      'Categoría': ticket.categoria || '',
      'Tipo': ticket.tipo || '',
      'Origen': ticket.origen || '',
      'Correo': ticket.correo || '',
      'Teléfono': ticket.telefono || '',
      'Sucursal': getSucursalNombre(ticket.sucursal), 
      'Creado Por': getCreadoPorNombre(ticket.creadoPor),  
      'Asignado A': getAsignadoANombre(ticket.asignadoA),
      'Fecha Creación': formatFechaHora(ticket.fechaCreacion),
      'Fecha Límite': formatFecha(ticket.fechaLimite),
      'Fecha Asignación': formatFecha(ticket.fechasEstatus?.fechaAsignado),
      'Fecha Resolución': formatFecha(ticket.fechasEstatus?.fechaResuelto),
      'Fecha Cierre': formatFecha(ticket.fechasEstatus?.fechaCerrado),
      'Activos Asociados': ticket.activos?.map((a: any) => a.nombre || a).join(', ') || '',
      'N° Comentarios': ticket.comentarios?.length || 0,
      'N° Evidencias': ticket.evidencias?.length || 0
    };
  }

  private generarResumenTickets(tickets: any[], nombreMes: string): any {
    const total = tickets.length;
    const resueltos = tickets.filter(t => ['Resuelto', 'Cerrado'].includes(t.estatus)).length;
    const pendientes = tickets.filter(t => ['Nuevo', 'Asignado', 'En proceso'].includes(t.estatus)).length;
    const cancelados = tickets.filter(t => t.estatus === 'Cancelado').length;
    
    let tiempoTotal = 0;
    let ticketsConTiempo = 0;
    tickets.forEach(ticket => {
      if (ticket.fechasEstatus?.fechaResuelto && ticket.fechaCreacion) {
        try {
          const fechaResuelto = new Date(ticket.fechasEstatus.fechaResuelto);
          const fechaCreacion = new Date(ticket.fechaCreacion);
          if (!isNaN(fechaResuelto.getTime()) && !isNaN(fechaCreacion.getTime())) {
            const diff = fechaResuelto.getTime() - fechaCreacion.getTime();
            tiempoTotal += diff / (1000 * 60 * 60);
            ticketsConTiempo++;
          }
        } catch {
        }
      }
    });
    const tiempoPromedio = ticketsConTiempo > 0 ? (tiempoTotal / ticketsConTiempo).toFixed(1) : 'N/A';
    
    return {
      'Mes': nombreMes,
      'Año': this.anioSeleccionado,
      'Total Tickets': total,
      'Tickets Resueltos/Cerrados': resueltos,
      'Tickets Pendientes': pendientes,
      'Tickets Cancelados': cancelados,
      'Tasa de Resolución': total > 0 ? ((resueltos / total) * 100).toFixed(1) + '%' : '0%',
      'Tiempo Promedio Resolución (hrs)': tiempoPromedio !== 'N/A' ? tiempoPromedio + ' hrs' : 'N/A',
      'Fecha Generación': new Date().toLocaleString()
    };
  }

  private generarEstadisticasPorEstatus(tickets: any[]): any[] {
    const estatusCount: { [key: string]: number } = {};
    const total = tickets.length;
    
    tickets.forEach(ticket => {
      const estatus = ticket.estatus || 'Sin estatus';
      estatusCount[estatus] = (estatusCount[estatus] || 0) + 1;
    });
    
    return Object.keys(estatusCount).map(estatus => ({
      'Estatus': estatus,
      'Cantidad': estatusCount[estatus],
      'Porcentaje': total > 0 ? ((estatusCount[estatus] / total) * 100).toFixed(1) + '%' : '0%'
    }));
  }

  private generarEstadisticasPorPrioridad(tickets: any[]): any[] {
    const prioridadCount: { [key: string]: number } = {};
    const total = tickets.length;
    
    tickets.forEach(ticket => {
      const prioridad = ticket.prioridad || 'Sin prioridad';
      prioridadCount[prioridad] = (prioridadCount[prioridad] || 0) + 1;
    });
    
    const orden = { 'Critica': 0, 'Alta': 1, 'Mediana': 2, 'Baja': 3 };
    
    return Object.keys(prioridadCount)
      .sort((a, b) => (orden[a as keyof typeof orden] || 999) - (orden[b as keyof typeof orden] || 999))
      .map(prioridad => ({
        'Prioridad': prioridad,
        'Cantidad': prioridadCount[prioridad],
        'Porcentaje': total > 0 ? ((prioridadCount[prioridad] / total) * 100).toFixed(1) + '%' : '0%'
      }));
  }

  private generarEstadisticasPorTecnicoParaExcel(tickets: any[]): any[] {
    const tecnicoStats: { [key: string]: { 
      nombre: string, 
      total: number, 
      resueltos: number,
      pendientes: number 
    } } = {};
    
    tickets.forEach(ticket => {
      if (ticket.asignadoA?.id) {
        const id = ticket.asignadoA.id;
        if (!tecnicoStats[id]) {
          tecnicoStats[id] = {
            nombre: ticket.asignadoA.nombre,
            total: 0,
            resueltos: 0,
            pendientes: 0
          };
        }
        
        tecnicoStats[id].total++;
        
        if (['Resuelto', 'Cerrado'].includes(ticket.estatus)) {
          tecnicoStats[id].resueltos++;
        } else if (['Nuevo', 'Asignado', 'En proceso'].includes(ticket.estatus)) {
          tecnicoStats[id].pendientes++;
        }
      }
    });
    
    return Object.values(tecnicoStats)
      .sort((a, b) => b.total - a.total)
      .map(tecnico => ({
        'Técnico': tecnico.nombre,
        'Total Tickets': tecnico.total,
        'Tickets Resueltos': tecnico.resueltos,
        'Tickets Pendientes': tecnico.pendientes,
        'Tasa de Resolución': tecnico.total > 0 ? ((tecnico.resueltos / tecnico.total) * 100).toFixed(1) + '%' : '0%'
      }));
  }

  private ajustarAnchoColumnas(worksheet: XLSX.WorkSheet) {
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
    const colWidths: number[] = [];
    
    for (let C = range.s.c; C <= range.e.c; ++C) {
      let maxWidth = 10;
      for (let R = range.s.r; R <= range.e.r; ++R) {
        const cell = worksheet[XLSX.utils.encode_cell({ r: R, c: C })];
        if (cell && cell.v) {
          const cellText = cell.v.toString();
          maxWidth = Math.max(maxWidth, Math.min(cellText.length, 50));
        }
      }
      colWidths[C] = maxWidth;
    }
    
    worksheet['!cols'] = colWidths.map(w => ({ wch: w }));
  }

  configurarGraficos() {
    const textoColor = getComputedStyle(document.documentElement).getPropertyValue('--text-color') || '#495057';
    const textoColorSecundario = getComputedStyle(document.documentElement).getPropertyValue('--text-color-secondary') || '#6c757d';
    const colorBorde = getComputedStyle(document.documentElement).getPropertyValue('--surface-border') || '#dee2e2';
    
    const optionsBase = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: textoColor,
            usePointStyle: true,
            padding: 20,
            font: {
              family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
              size: 12
            }
          },
          position: 'top'
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          borderColor: '#667eea',
          borderWidth: 1,
          cornerRadius: 6,
          padding: 12,
          callbacks: {
            label: (context: any) => {
              let label = context.dataset.label || '';
              
              let value = null;
              
              if (context.parsed && context.parsed.y !== undefined) {
                value = context.parsed.y;
              } 
              else if (context.raw !== undefined) {
                value = context.raw;
              }
              
              if (value !== null) {
                if (label) {
                  label += ': ';
                }
                
                if (typeof value === 'number') {
                  if (context.dataset.label?.includes('%')) {
                    return `${label}${value.toFixed(1)}%`;
                  }
                  return `${label}${value}`;
                } 
                else if (typeof value === 'object') {
                  if (context.dataset.label === 'Tickets Creados' && value.creados !== undefined) {
                    return `${label}${value.creados}`;
                  }
                  if (context.dataset.label === 'Tickets Resueltos' && value.resueltos !== undefined) {
                    return `${label}${value.resueltos}`;
                  }
                  if (context.dataset.label === 'Tasa de Resolución (%)' && value.tasaResolucion !== undefined) {
                    return `${label}${value.tasaResolucion.toFixed(1)}%`;
                  }
                  return `${label}${JSON.stringify(value)}`;
                }
                else {
                  return `${label}${value}`;
                }
              }
              
              return label;
            },
            title: (context: any) => {
              return context[0]?.label || '';
            }
          }
        }
      }
    };

    this.optionsBar = {
      ...optionsBase,
      scales: {
        x: {
          ticks: {
            color: textoColorSecundario,
            font: {
              size: 11
            },
            maxRotation: 45,
            minRotation: 45
          },
          grid: {
            color: colorBorde,
            drawBorder: false
          }
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: textoColorSecundario,
            font: {
              size: 11
            },
            stepSize: 1,
            callback: function(value: any) {
              return Number.isInteger(value) ? value : value.toFixed(0);
            }
          },
          grid: {
            color: colorBorde,
            drawBorder: false
          }
        }
      }
    };

    this.optionsPie = {
      ...optionsBase,
      plugins: {
        ...optionsBase.plugins,
        legend: {
          ...optionsBase.plugins.legend,
          position: 'right',
          labels: {
            ...optionsBase.plugins.legend.labels,
            generateLabels: (chart: any) => {
              const data = chart.data;
              if (data.labels.length && data.datasets.length) {
                return data.labels.map((label: string, i: number) => {
                  const value = data.datasets[0].data[i];
                  const percentage = data.datasets[0].percentage?.[i];
                  return {
                    text: percentage ? `${label}: ${value} (${percentage}%)` : `${label}: ${value}`,
                    fillStyle: data.datasets[0].backgroundColor[i],
                    hidden: false,
                    index: i
                  };
                });
              }
              return [];
            }
          }
        }
      }
    };

    this.optionsDoughnut = {
      ...optionsBase,
      cutout: '60%',
      plugins: {
        ...optionsBase.plugins,
        legend: {
          ...optionsBase.plugins.legend,
          position: 'right',
          labels: {
            ...optionsBase.plugins.legend.labels,
            generateLabels: (chart: any) => {
              const data = chart.data;
              if (data.labels.length && data.datasets.length) {
                return data.labels.map((label: string, i: number) => {
                  const value = data.datasets[0].data[i];
                  const percentage = data.datasets[0].percentage?.[i];
                  return {
                    text: percentage ? `${label}: ${value} (${percentage}%)` : `${label}: ${value}`,
                    fillStyle: data.datasets[0].backgroundColor[i],
                    hidden: false,
                    index: i
                  };
                });
              }
              return [];
            }
          }
        }
      }
    };

    this.optionsLine = {
      ...optionsBase,
      scales: {
        x: {
          ticks: {
            color: textoColorSecundario,
            font: {
              size: 11
            },
            maxRotation: 45,
            minRotation: 45
          },
          grid: {
            color: colorBorde,
            drawBorder: false
          }
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: textoColorSecundario,
            font: {
              size: 11
            },
            callback: function(value: any) {
              return value + '%';
            }
          },
          grid: {
            color: colorBorde,
            drawBorder: false
          },
          min: 0,
          max: 100
        }
      },
      elements: {
        line: {
          tension: 0.4
        },
        point: {
          radius: 4,
          hoverRadius: 6
        }
      }
    };
  }

  private actualizarDatosGraficos(): void {
    console.log('Actualizando datos de gráficos...');
    
    if (this.estadisticas?.distribucionPorEstatus?.length) {
      console.log('Datos estatus:', this.estadisticas.distribucionPorEstatus);
      this.distribucionEstatusData = {
        labels: this.estadisticas.distribucionPorEstatus.map((item: any) => item.estatus),
        datasets: [{
          label: 'Tickets por Estatus',
          data: this.estadisticas.distribucionPorEstatus.map((item: any) => Number(item.cantidad) || 0),
          backgroundColor: this.estadisticas.distribucionPorEstatus.map((item: any) => item.color),
          borderColor: '#ffffff',
          borderWidth: 2,
          percentage: this.estadisticas.distribucionPorEstatus.map((item: any) => 
            item.porcentaje ? Number(item.porcentaje).toFixed(1) : '0.0'
          )
        }]
      };
    } else {
      this.distribucionEstatusData = {
        labels: ['Sin datos'],
        datasets: [{
          label: 'Tickets por Estatus',
          data: [1],
          backgroundColor: ['#e9ecef'],
          borderColor: '#ffffff',
          borderWidth: 2
        }]
      };
    }

    if (this.estadisticas?.distribucionPorPrioridad?.length) {
      console.log('Datos prioridad:', this.estadisticas.distribucionPorPrioridad);
      this.distribucionPrioridadData = {
        labels: this.estadisticas.distribucionPorPrioridad.map((item: any) => item.prioridad),
        datasets: [{
          label: 'Tickets por Prioridad',
          data: this.estadisticas.distribucionPorPrioridad.map((item: any) => Number(item.cantidad) || 0),
          backgroundColor: this.estadisticas.distribucionPorPrioridad.map((item: any) => item.color),
          borderColor: '#ffffff',
          borderWidth: 2,
          percentage: this.estadisticas.distribucionPorPrioridad.map((item: any) => 
            item.porcentaje ? Number(item.porcentaje).toFixed(1) : '0.0'
          )
        }]
      };
    } else {
      this.distribucionPrioridadData = {
        labels: ['Sin datos'],
        datasets: [{
          label: 'Tickets por Prioridad',
          data: [1],
          backgroundColor: ['#e9ecef'],
          borderColor: '#ffffff',
          borderWidth: 2
        }]
      };
    }

    if (this.estadisticas?.tendenciaMensual?.length) {
      console.log('Datos tendencia:', this.estadisticas.tendenciaMensual);
      
      const creados = this.estadisticas.tendenciaMensual.map((item: any) => {
        const valor = item.creados;
        return typeof valor === 'number' ? valor : Number(valor) || 0;
      });
      
      const resueltos = this.estadisticas.tendenciaMensual.map((item: any) => {
        const valor = item.resueltos;
        return typeof valor === 'number' ? valor : Number(valor) || 0;
      });
      
      const tasas = this.estadisticas.tendenciaMensual.map((item: any) => {
        const valor = item.tasaResolucion;
        return typeof valor === 'number' ? valor : Number(valor) || 0;
      });

      this.tendenciaMensualData = {
        labels: this.estadisticas.tendenciaMensual.map((item: any) => item.mes),
        datasets: [
          {
            label: 'Tickets Creados',
            data: creados,
            backgroundColor: 'rgba(102, 126, 234, 0.7)',
            borderColor: '#667eea',
            borderWidth: 2
          },
          {
            label: 'Tickets Resueltos',
            data: resueltos,
            backgroundColor: 'rgba(76, 175, 80, 0.7)',
            borderColor: '#4CAF50',
            borderWidth: 2
          }
        ]
      };

      this.tasaResolucionData = {
        labels: this.estadisticas.tendenciaMensual.map((item: any) => item.mes),
        datasets: [{
          label: 'Tasa de Resolución (%)',
          data: tasas,
          fill: true,
          borderColor: '#9C27B0',
          backgroundColor: 'rgba(156, 39, 176, 0.1)',
          tension: 0.4,
          pointBackgroundColor: '#9C27B0',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 4
        }]
      };
    } else {
      const labels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];
      this.tendenciaMensualData = {
        labels: labels,
        datasets: [
          {
            label: 'Tickets Creados',
            data: labels.map(() => 0),
            backgroundColor: 'rgba(102, 126, 234, 0.7)',
            borderColor: '#667eea',
            borderWidth: 2
          },
          {
            label: 'Tickets Resueltos',
            data: labels.map(() => 0),
            backgroundColor: 'rgba(76, 175, 80, 0.7)',
            borderColor: '#4CAF50',
            borderWidth: 2
          }
        ]
      };

      this.tasaResolucionData = {
        labels: labels,
        datasets: [{
          label: 'Tasa de Resolución (%)',
          data: labels.map(() => 0),
          fill: true,
          borderColor: '#9C27B0',
          backgroundColor: 'rgba(156, 39, 176, 0.1)',
          tension: 0.4,
          pointBackgroundColor: '#9C27B0',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2
        }]
      };
    }

    if (this.estadisticas?.distribucionPorCategoria?.length) {
      console.log('Datos categoría:', this.estadisticas.distribucionPorCategoria);
      this.distribucionCategoriaData = {
        labels: this.estadisticas.distribucionPorCategoria.map((item: any) => item.categoria),
        datasets: [{
          label: 'Tickets por Categoría',
          data: this.estadisticas.distribucionPorCategoria.map((item: any) => Number(item.cantidad) || 0),
          backgroundColor: this.estadisticas.distribucionPorCategoria.map((item: any) => item.color),
          borderColor: '#ffffff',
          borderWidth: 2,
          percentage: this.estadisticas.distribucionPorCategoria.map((item: any) => 
            item.porcentaje ? Number(item.porcentaje).toFixed(1) : '0.0'
          )
        }]
      };
    } else {
      this.distribucionCategoriaData = {
        labels: ['Sin datos'],
        datasets: [{
          label: 'Tickets por Categoría',
          data: [1],
          backgroundColor: ['#e9ecef'],
          borderColor: '#ffffff',
          borderWidth: 2
        }]
      };
    }

    if (this.estadisticas?.distribucionPorTecnico?.length) {
      console.log('Datos técnico:', this.estadisticas.distribucionPorTecnico);
      this.distribucionTecnicoData = {
        labels: this.estadisticas.distribucionPorTecnico.map((item: any) => item.nombre),
        datasets: [{
          label: 'Tickets por Técnico',
          data: this.estadisticas.distribucionPorTecnico.map((item: any) => Number(item.cantidad) || 0),
          backgroundColor: this.estadisticas.distribucionPorTecnico.map((item: any) => item.color),
          borderColor: '#ffffff',
          borderWidth: 2,
          percentage: this.estadisticas.distribucionPorTecnico.map((item: any) => 
            item.porcentaje ? Number(item.porcentaje).toFixed(1) : '0.0'
          )
        }]
      };
    } else {
      this.distribucionTecnicoData = {
        labels: ['Sin datos'],
        datasets: [{
          label: 'Tickets por Técnico',
          data: [1],
          backgroundColor: ['#e9ecef'],
          borderColor: '#ffffff',
          borderWidth: 2
        }]
      };
    }
    
    console.log('Datos de gráficos actualizados');
  }

  async cargarEstadisticas() {
    try {
      this.cargando = true;
      console.log('Cargando estadísticas para período:', this.periodo);
      
      this.estadisticas = await this.ticketService.getEstadisticasGlobales(this.periodo);
      console.log('Estadísticas recibidas:', this.estadisticas);
      
      this.actualizarDatosGraficos();
      
      this.cargando = false;
      this.cdRef.detectChanges();
      
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
      this.handleAlertType('ERROR', 'Error al cargar las estadísticas');
      this.cargando = false;
    }
  }

  formatTiempo(tiempoHoras: number): string {
    if (tiempoHoras <= 0) return '0 hrs';
    
    if (tiempoHoras < 1) {
      const minutos = Math.round(tiempoHoras * 60);
      return `${minutos} min`;
    } else if (tiempoHoras < 24) {
      return `${Math.round(tiempoHoras)} hrs`;
    } else {
      const dias = Math.round(tiempoHoras / 24);
      return `${dias} días`;
    }
  }

  getTecnicosOrdenados(): any[] {
    if (!this.estadisticas?.porTecnico?.length) return [];
    
    return [...this.estadisticas.porTecnico].sort((a, b) => {
      switch (this.ordenTecnicos) {
        case 'nombre':
          return a.nombre.localeCompare(b.nombre);
        case 'tickets':
          return b.totalTickets - a.totalTickets;
        case 'resueltos':
          return b.ticketsResueltos - a.ticketsResueltos;
        case 'tiempo':
          return a.tiempoPromedioResolucion - b.tiempoPromedioResolucion;
        case 'eficiencia':
        default:
          return b.eficiencia - a.eficiencia;
      }
    });
  }

  getColorEficiencia(eficiencia: number): string {
    if (eficiencia >= 80) return '#4CAF50';
    if (eficiencia >= 60) return '#FFC107';
    if (eficiencia >= 40) return '#FF9800';
    return '#F44336';
  }

  getNivelEficiencia(eficiencia: number): string {
    if (eficiencia >= 80) return 'Excelente';
    if (eficiencia >= 60) return 'Buena';
    if (eficiencia >= 40) return 'Regular';
    return 'Baja';
  }

  cambiarPeriodo(periodo: string) {
    this.periodo = periodo;
    this.cargarEstadisticas();
  }

  cambiarOrden(orden: string) {
    this.ordenTecnicos = orden;
  }

  toggleDetalles() {
    this.mostrarDetalles = !this.mostrarDetalles;
  }
  
  calcularPorcentajeResueltos(): number {
    if (!this.estadisticas?.general) return 0;
  
    const total = this.estadisticas.general.totalTickets || 0;
    const resueltos = this.estadisticas.general.ticketsTerminados || 0;
  
    return total > 0 ? Math.round((resueltos / total) * 100) : 0;
  }

  calcularTiempoPromedio(): string {
    if (!this.estadisticas?.porTecnico?.length) return '0 hrs';
  
    let tiempoTotal = 0;
    let count = 0;
  
    this.estadisticas.porTecnico.forEach((tecnico: any) => {
      if (tecnico.tiempoPromedioResolucion > 0) {
        tiempoTotal += tecnico.tiempoPromedioResolucion;
        count++;
      }
    });
  
    const promedio = count > 0 ? tiempoTotal / count : 0;
    return this.formatTiempo(promedio);
  }

  getWidthTiempo(tiempoHoras: number): number {
    const maxTiempo = 48;
    const width = Math.min((tiempoHoras / maxTiempo) * 100, 100);
    return Math.round(width);
  }

  getNivelClase(eficiencia: number): string {
    if (eficiencia >= 80) return 'excelente';
    if (eficiencia >= 60) return 'buena';
    if (eficiencia >= 40) return 'regular';
    return 'baja';
  }

  getNivelIcono(eficiencia: number): string {
    if (eficiencia >= 80) return 'pi pi-star-fill';
    if (eficiencia >= 60) return 'pi pi-thumbs-up';
    if (eficiencia >= 40) return 'pi pi-check';
    return 'pi pi-exclamation-triangle';
  }

  getTecnicoMejor(): any {
    if (!this.estadisticas?.porTecnico?.length) return null;
    
    return [...this.estadisticas.porTecnico].reduce((prev, current) => 
      (prev.eficiencia > current.eficiencia) ? prev : current
    );
  }

  getTecnicoPeor(): any {
    if (!this.estadisticas?.porTecnico?.length) return null;
    
    return [...this.estadisticas.porTecnico].reduce((prev, current) => 
      (prev.eficiencia < current.eficiencia) ? prev : current
    );
  }

  getEstatusMasComun(): any {
    if (!this.estadisticas?.distribucionPorEstatus?.length) return null;
    
    return [...this.estadisticas.distribucionPorEstatus].reduce((prev, current) => 
      (prev.cantidad > current.cantidad) ? prev : current
    );
  }

  getColorPorCalificacion(calificacion: number): string {
    if (calificacion >= 9) return '#4CAF50';
    if (calificacion >= 7) return '#8BC34A';
    if (calificacion >= 5) return '#FFC107';
    return '#F44336';
  }

  getSatisfaccionIcon(calificacion: number): string {
    if (calificacion >= 9) return 'pi pi-star-fill';
    if (calificacion >= 7) return 'pi pi-thumbs-up';
    if (calificacion >= 5) return 'pi pi-check';
    return 'pi pi-exclamation-triangle';
  }
}