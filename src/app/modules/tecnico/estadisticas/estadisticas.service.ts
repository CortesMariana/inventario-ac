import { Injectable } from '@angular/core';
import { TicketsService } from '../tickets/tickets.service';

@Injectable({
  providedIn: 'root'
})
export class EstadisticasService {

  constructor(private ticketsService: TicketsService) { }

  async getEstadisticasDetalladas(tecnicoId: string): Promise<any> {
    try {
      const [ticketsAsignados] = await Promise.all([
        this.ticketsService.getTicketsAsignados(tecnicoId)
      ]);

      const todosTickets = [...ticketsAsignados];
      const ticketsUnicos = this.eliminarDuplicados(todosTickets);

      return {
        resumen: this.calcularResumen(ticketsUnicos),
        tiemposPromedio: this.calcularTiemposPromedio(ticketsUnicos),
        distribucionEstatus: this.calcularDistribucionEstatus(ticketsUnicos),
        distribucionPrioridad: this.calcularDistribucionPrioridad(ticketsUnicos),
        distribucionTipo: this.calcularDistribucionTipo(ticketsUnicos),
        tendenciaMensual: this.calcularTendenciaMensual(ticketsUnicos),
        ticketsRapidos: this.getTicketsRapidos(ticketsUnicos),
        ticketsLentos: this.getTicketsLentos(ticketsUnicos),
        vencimiento: this.calcularMetricasVencimiento(ticketsUnicos),
        eficiencia: this.calcularEficiencia(ticketsUnicos),
        histogramaTiempos: this.calcularHistogramaTiempos(ticketsUnicos)
      };

    } catch (error) {
      console.error('Error al calcular estadísticas:', error);
      throw error;
    }
  }

  private eliminarDuplicados(tickets: any[]): any[] {
    const ids = new Set();
    return tickets.filter(ticket => {
      if (ids.has(ticket.id)) {
        return false;
      }
      ids.add(ticket.id);
      return true;
    });
  }

  private calcularResumen(tickets: any[]): any {
    const total = tickets.length;
    const completados = tickets.filter(t => 
      ['Resuelto', 'Cerrado'].includes(t.estatus)
    ).length;
    const pendientes = tickets.filter(t => 
      ['Nuevo', 'Asignado', 'En proceso'].includes(t.estatus)
    ).length;
    const vencidos = tickets.filter(t => this.esVencido(t)).length;
    
    return {
      totalTickets: total,
      ticketsCompletados: completados,
      ticketsPendientes: pendientes,
      ticketsVencidos: vencidos,
      tasaResolucion: total > 0 ? (completados / total) * 100 : 0
    };
  }

  private calcularTiemposPromedio(tickets: any[]): any {
    const ticketsCompletados = tickets.filter(t => 
      ['Resuelto', 'Cerrado'].includes(t.estatus)
    );

    let totalTiempoResolucion = 0;
    let totalTiempoAsignacion = 0;
    let totalTiempoProceso = 0;
    let totalTiempoCierre = 0;
    let countCompletados = 0;
    let countConAsignacion = 0;
    let countConCierre = 0;

    ticketsCompletados.forEach(ticket => {
      const tiempoResolucion = this.calcularTiempoResolucion(ticket);
      if (tiempoResolucion > 0) {
        totalTiempoResolucion += tiempoResolucion;
        countCompletados++;
      }

      const tiempoAsignacion = this.calcularTiempoAsignacion(ticket);
      if (tiempoAsignacion > 0) {
        totalTiempoAsignacion += tiempoAsignacion;
        countConAsignacion++;
      }

      const tiempoProceso = this.calcularTiempoProceso(ticket);
      if (tiempoProceso > 0) {
        totalTiempoProceso += tiempoProceso;
      }

      const tiempoCierre = this.calcularTiempoCierre(ticket);
      if (tiempoCierre > 0) {
        totalTiempoCierre += tiempoCierre;
        countConCierre++;
      }
    });

    return {
      tiempoResolucion: countCompletados > 0 ? totalTiempoResolucion / countCompletados : 0,
      tiempoAsignacion: countConAsignacion > 0 ? totalTiempoAsignacion / countConAsignacion : 0,
      tiempoProceso: ticketsCompletados.length > 0 ? totalTiempoProceso / ticketsCompletados.length : 0,
      tiempoCierre: countConCierre > 0 ? totalTiempoCierre / countConCierre : 0
    };
  }

  private calcularDistribucionEstatus(tickets: any[]): any[] {
    const estatusCount: { [key: string]: number } = {};
    const total = tickets.length;
    
    tickets.forEach(ticket => {
      const estatus = ticket.estatus;
      estatusCount[estatus] = (estatusCount[estatus] || 0) + 1;
    });

    const colores: { [key: string]: string } = {
      'Nuevo': '#2196F3',
      'Asignado': '#FF9800',
      'En proceso': '#9C27B0',
      'Resuelto': '#4CAF50',
      'Cerrado': '#607D8B',
      'Cancelado': '#F44336'
    };

    return Object.keys(estatusCount).map(estatus => ({
      estatus,
      cantidad: estatusCount[estatus],
      porcentaje: total > 0 ? (estatusCount[estatus] / total) * 100 : 0,
      color: colores[estatus] || '#757575'
    }));
  }

  private calcularDistribucionPrioridad(tickets: any[]): any[] {
    const prioridadCount: { [key: string]: number } = {};
    const total = tickets.length;
    
    tickets.forEach(ticket => {
      const prioridad = ticket.prioridad;
      prioridadCount[prioridad] = (prioridadCount[prioridad] || 0) + 1;
    });

    const colores: { [key: string]: string } = {
      'Critica': '#F44336',
      'Alta': '#FF9800',
      'Mediana': '#FFC107',
      'baja': '#4CAF50'
    };

    return Object.keys(prioridadCount).map(prioridad => ({
      prioridad: prioridad.charAt(0).toUpperCase() + prioridad.slice(1),
      cantidad: prioridadCount[prioridad],
      porcentaje: total > 0 ? (prioridadCount[prioridad] / total) * 100 : 0,
      color: colores[prioridad] || '#757575'
    }));
  }

  private calcularDistribucionTipo(tickets: any[]): any[] {
    const tipoCount: { [key: string]: number } = {};
    const total = tickets.length;
    
    tickets.forEach(ticket => {
      const tipo = ticket.tipo;
      tipoCount[tipo] = (tipoCount[tipo] || 0) + 1;
    });

    const colores: { [key: string]: string } = {
      'mantenimiento': '#2196F3',
      'incidente': '#FF9800',
      'requerimiento': '#4CAF50',
      'asignacion activo/dispositivo': '#9C27B0'
    };

    return Object.keys(tipoCount).map(tipo => ({
      tipo: this.formatearTipo(tipo),
      cantidad: tipoCount[tipo],
      porcentaje: total > 0 ? (tipoCount[tipo] / total) * 100 : 0,
      color: colores[tipo] || '#757575'
    }));
  }

  private calcularTendenciaMensual(tickets: any[]): any[] {
    const meses: { [key: string]: { creados: number, resueltos: number } } = {};
    const nombresMeses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    
    const hoy = new Date();
    
    const ultimosMeses: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      const mesKey = `${nombresMeses[fecha.getMonth()]} ${fecha.getFullYear()}`;
      ultimosMeses.push(mesKey);
      meses[mesKey] = { creados: 0, resueltos: 0 };
    }
    
    tickets.forEach(ticket => {
      const fechaCreacion = this.getFecha(ticket.fechaCreacion);
      if (fechaCreacion) {
        const mes = fechaCreacion.getMonth();
        const anio = fechaCreacion.getFullYear();
        const key = `${nombresMeses[mes]} ${anio}`;
        
        if (meses[key]) {
          meses[key].creados++;
          
          if (['Resuelto', 'Cerrado'].includes(ticket.estatus)) {
            const fechaResuelto = ticket.fechasEstatus?.fechaResuelto ? 
              this.getFecha(ticket.fechasEstatus.fechaResuelto) : fechaCreacion;
            
            if (fechaResuelto) {
              const mesResuelto = fechaResuelto.getMonth();
              const anioResuelto = fechaResuelto.getFullYear();
              const keyResuelto = `${nombresMeses[mesResuelto]} ${anioResuelto}`;
              
              if (keyResuelto === key) {
                meses[key].resueltos++;
              }
            }
          }
        }
      }
    });

    return ultimosMeses.map(mes => ({
      mes,
      creados: meses[mes].creados,
      resueltos: meses[mes].resueltos,
      tasaResolucion: meses[mes].creados > 0 ? 
        Math.round((meses[mes].resueltos / meses[mes].creados) * 100) : 0
    }));
  }

  private getTicketsRapidos(tickets: any[]): any[] {
    const ticketsCompletados = tickets.filter(t => 
      ['Resuelto', 'Cerrado'].includes(t.estatus)
    );

    return ticketsCompletados
      .map(ticket => ({
        id: ticket.id,
        titulo: ticket.titulo,
        tiempoResolucion: this.calcularTiempoResolucion(ticket),
        prioridad: ticket.prioridad
      }))
      .filter(t => t.tiempoResolucion > 0)
      .sort((a, b) => a.tiempoResolucion - b.tiempoResolucion)
      .slice(0, 5);
  }

  private getTicketsLentos(tickets: any[]): any[] {
    const ticketsPendientes = tickets.filter(t => 
      ['Nuevo', 'Asignado', 'En proceso'].includes(t.estatus)
    );

    return ticketsPendientes
      .map(ticket => {
        const fechaCreacion = this.getFecha(ticket.fechaCreacion);
        const hoy = new Date();
        const diasPendiente = fechaCreacion ? 
          Math.floor((hoy.getTime() - fechaCreacion.getTime()) / (1000 * 60 * 60 * 24)) : 0;
        
        return {
          id: ticket.id,
          titulo: ticket.titulo,
          diasPendiente,
          prioridad: ticket.prioridad,
          vencido: this.esVencido(ticket)
        };
      })
      .sort((a, b) => b.diasPendiente - a.diasPendiente)
      .slice(0, 5);
  }

  private calcularMetricasVencimiento(tickets: any[]): any {
    const ticketsConFecha = tickets.filter(t => t.fechaLimite);
    
    let vencidos = 0;
    let cerraronAntes = 0;
    let cerraronDespues = 0;
    let totalDiasVencimiento = 0;
    let countVencidos = 0;

    ticketsConFecha.forEach(ticket => {
      if (this.esVencido(ticket)) {
        vencidos++;
        
        if (['Resuelto', 'Cerrado'].includes(ticket.estatus)) {
          const fechaLimite = this.getFecha(ticket.fechaLimite);
          const fechaResuelto = ticket.fechasEstatus?.fechaResuelto ? 
            this.getFecha(ticket.fechasEstatus.fechaResuelto) : null;
          
          if (fechaResuelto && fechaLimite) {
            const diasVencimiento = Math.floor((fechaResuelto.getTime() - fechaLimite.getTime()) / (1000 * 60 * 60 * 24));
            totalDiasVencimiento += diasVencimiento;
            countVencidos++;
            
            if (diasVencimiento > 0) {
              cerraronDespues++;
            } else {
              cerraronAntes++;
            }
          }
        }
      }
    });

    return {
      ticketsVencidos: vencidos,
      ticketsCerraronAntes: cerraronAntes,
      ticketsCerraronDespues: cerraronDespues,
      promedioDiasVencimiento: countVencidos > 0 ? totalDiasVencimiento / countVencidos : 0
    };
  }

  private calcularEficiencia(tickets: any[]): any {
    const totalTickets = tickets.length;
    const ticketsCompletados = tickets.filter(t => 
      ['Resuelto', 'Cerrado'].includes(t.estatus)
    ).length;
    
    const diasTrabajados = 30;
    
    let totalTiempo = 0;
    let countTiempo = 0;
    
    tickets.forEach(ticket => {
      const tiempo = this.calcularTiempoResolucion(ticket);
      if (tiempo > 0) {
        totalTiempo += tiempo;
        countTiempo++;
      }
    });
    
    const tiempoPromedio = countTiempo > 0 ? totalTiempo / countTiempo : 0;
    
    const productividad = totalTickets > 0 ? 
      Math.min(100, (ticketsCompletados / totalTickets) * 100 * (tiempoPromedio > 0 ? 24 / tiempoPromedio : 1)) : 0;
    
    const mejoras: string[] = [];
    
    if (productividad < 50) {
      mejoras.push('Considera establecer tiempos límite más realistas');
      mejoras.push('Prioriza tickets por criticidad');
    }
    
    if (tiempoPromedio > 48) {
      mejoras.push('Los tiempos de resolución son altos, revisa procesos');
    }
    
    const vencidos = tickets.filter(t => this.esVencido(t)).length;
    if (vencidos > tickets.length * 0.1) {
      mejoras.push('Tienes muchos tickets vencidos, revisa fechas límite');
    }
    
    if (mejoras.length === 0) {
      mejoras.push('¡Excelente trabajo! Mantén el ritmo actual');
    }

    return {
      ticketsPorDia: diasTrabajados > 0 ? totalTickets / diasTrabajados : 0,
      tiempoPromedioPorTicket: tiempoPromedio,
      productividad: Math.round(productividad),
      mejoras
    };
  }

  private calcularHistogramaTiempos(tickets: any[]): any[] {
    const ticketsCompletados = tickets.filter(t => 
      ['Resuelto', 'Cerrado'].includes(t.estatus)
    );
    
    const rangos = [
      { min: 0, max: 1, label: '< 1 hora' },
      { min: 1, max: 4, label: '1-4 horas' },
      { min: 4, max: 8, label: '4-8 horas' },
      { min: 8, max: 24, label: '8-24 horas' },
      { min: 24, max: 48, label: '1-2 días' },
      { min: 48, max: 168, label: '2-7 días' },
      { min: 168, max: Infinity, label: '> 7 días' }
    ];
    
    const conteo = new Array(rangos.length).fill(0);
    
    ticketsCompletados.forEach(ticket => {
      const tiempo = this.calcularTiempoResolucion(ticket);
      if (tiempo > 0) {
        for (let i = 0; i < rangos.length; i++) {
          if (tiempo >= rangos[i].min && tiempo < rangos[i].max) {
            conteo[i]++;
            break;
          }
        }
      }
    });
    
    const total = conteo.reduce((a, b) => a + b, 0);
    
    return rangos.map((rango, i) => ({
      rango: rango.label,
      cantidad: conteo[i],
      porcentaje: total > 0 ? (conteo[i] / total) * 100 : 0
    }));
  }

  private esVencido(ticket: any): boolean {
    if (!ticket.fechaLimite) return false;
    
    const fechaLimite = this.getFecha(ticket.fechaLimite);
    const hoy = new Date();
    
    return fechaLimite! < hoy && !['Resuelto', 'Cerrado', 'Cancelado'].includes(ticket.estatus);
  }

  private calcularTiempoResolucion(ticket: any): number {
    if (!ticket.fechaCreacion || !ticket.fechasEstatus?.fechaResuelto) return 0;
    
    const fechaCreacion = this.getFecha(ticket.fechaCreacion);
    const fechaResuelto = this.getFecha(ticket.fechasEstatus.fechaResuelto);
    
    if (!fechaCreacion || !fechaResuelto) return 0;
    
    return (fechaResuelto.getTime() - fechaCreacion.getTime()) / (1000 * 60 * 60);
  }

  private calcularTiempoAsignacion(ticket: any): number {
    if (!ticket.fechasEstatus?.fechaNuevo || !ticket.fechasEstatus?.fechaAsignado) return 0;
    
    const fechaNuevo = this.getFecha(ticket.fechasEstatus.fechaNuevo);
    const fechaAsignado = this.getFecha(ticket.fechasEstatus.fechaAsignado);
    
    if (!fechaNuevo || !fechaAsignado) return 0;
    
    return (fechaAsignado.getTime() - fechaNuevo.getTime()) / (1000 * 60 * 60);
  }

  private calcularTiempoProceso(ticket: any): number {
    if (!ticket.fechasEstatus?.fechaAsignado || !ticket.fechasEstatus?.fechaResuelto) return 0;
    
    const fechaAsignado = this.getFecha(ticket.fechasEstatus.fechaAsignado);
    const fechaResuelto = this.getFecha(ticket.fechasEstatus.fechaResuelto);
    
    if (!fechaAsignado || !fechaResuelto) return 0;
    
    return (fechaResuelto.getTime() - fechaAsignado.getTime()) / (1000 * 60 * 60);
  }

  private calcularTiempoCierre(ticket: any): number {
    if (!ticket.fechasEstatus?.fechaResuelto || !ticket.fechasEstatus?.fechaCerrado) return 0;
    
    const fechaResuelto = this.getFecha(ticket.fechasEstatus.fechaResuelto);
    const fechaCerrado = this.getFecha(ticket.fechasEstatus.fechaCerrado);
    
    if (!fechaResuelto || !fechaCerrado) return 0;
    
    return (fechaCerrado.getTime() - fechaResuelto.getTime()) / (1000 * 60 * 60);
  }

  private getFecha(fecha: any): Date | null {
    if (!fecha) return null;
    
    if (fecha.toDate) {
      return fecha.toDate();
    } else if (fecha instanceof Date) {
      return fecha;
    } else if (typeof fecha === 'string') {
      return new Date(fecha);
    } else if (fecha && typeof fecha === 'object' && fecha.seconds) {
      return new Date(fecha.seconds * 1000);
    }
    
    return null;
  }

  private formatearTipo(tipo: string): string {
    const formatos: { [key: string]: string } = {
      'mantenimiento': 'Mantenimiento',
      'incidente': 'Incidente',
      'requerimiento': 'Requerimiento',
      'asignacion activo/dispositivo': 'Asignación Activo'
    };
    
    return formatos[tipo] || tipo;
  }
}