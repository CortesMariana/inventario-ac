import { Injectable } from '@angular/core';
import { collection, Firestore, addDoc, doc, updateDoc, getDoc, getDocs } from '@angular/fire/firestore';
import { v4 as uuidv4 } from 'uuid';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import { environment } from 'src/environments/environment';
import { EmpleadoService } from '../empleados/empleados.service';
import { Empleado } from '../empleados/models/empleado.model';
import { FolioService } from '../../admin/empleados/folio.service';

@Injectable({
  providedIn: 'root'
})
export class TicketService {

  constructor(
    private firestore: Firestore,
    private storage: Storage,
    private empleadoService: EmpleadoService,
    private folioService: FolioService
  ) { }

  getTicket(firestoreId: string): Promise<any> {
    const docRef = doc(this.firestore, `${environment.collections.tickets}`, firestoreId);
    
    return new Promise((resolve, reject) => {
      getDoc(docRef)
        .then((docSnapshot) => {
          if (docSnapshot.exists()) {
            const data = { 
              firestoreId: docSnapshot.id, 
              ...docSnapshot.data() 
            };
            resolve(data);
          } else {
            reject(new Error('Ticket no encontrado'));
          }
        })
        .catch((error) => reject(error));
    });
  }
  
  async addTicket(ticket: any): Promise<string> {
    try {
      const folio = await this.folioService.getNextFolio();
      
      const ticketConFolio = {
        ...ticket,
        folio: folio
      };
      
      const collectionRef = collection(this.firestore, `${environment.collections.tickets}`);
      const docRef = await addDoc(collectionRef, ticketConFolio);
      
      return docRef.id;
    } catch (error) {
      console.error('Error al crear ticket:', error);
      throw error;
    }
  }

  updateTicket(firestoreId: string, data: any): Promise<void> {
    const docRef = doc(this.firestore, `${environment.collections.tickets}`, firestoreId);
    return updateDoc(docRef, data);
  }

  async uploadEvidenceFile(file: File, ticketId: string): Promise<string> {
    const path = `tickets/${ticketId}/evidencias/${Date.now()}_${file.name}`;
    const storageRef = ref(this.storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    return getDownloadURL(snapshot.ref);
  }

  async addEvidenceToTicket(ticketId: string, evidenceData: any): Promise<void> {
    const docRef = doc(this.firestore, `${environment.collections.tickets}`, ticketId);
    const ticketDoc = await getDoc(docRef);
    
    if (ticketDoc.exists()) {
      const ticketData = ticketDoc.data();
      const evidencias = ticketData['evidencias'] || [];
      
      evidencias.push({
        id: uuidv4(),
        ...evidenceData,
        fecha: new Date()
      });
      
      return updateDoc(docRef, { evidencias });
    } else {
      throw new Error('Ticket no encontrado');
    }
  }

  async addCommentToTicket(ticketId: string, commentData: any): Promise<void> {
    const docRef = doc(this.firestore, `${environment.collections.tickets}`, ticketId);
    const ticketDoc = await getDoc(docRef);
    
    if (ticketDoc.exists()) {
      const ticketData = ticketDoc.data();
      const comentarios = ticketData['comentarios'] || [];
      
      comentarios.push({
        id: uuidv4(),
        ...commentData,
        fecha: new Date()
      });
      
      return updateDoc(docRef, { 
        comentarios,
        fechaModificacion: new Date()
      });
    } else {
      throw new Error('Ticket no encontrado');
    }
  }

  private convertTimestampsToDates(obj: any): void {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        
        if (value && typeof value === 'object' && 'seconds' in value && 'nanoseconds' in value) {
          obj[key] = new Date(value.seconds * 1000 + value.nanoseconds / 1000000);
        } else if (value && typeof value === 'object' && !Array.isArray(value)) {
          this.convertTimestampsToDates(value);
        } else if (Array.isArray(value)) {
          value.forEach((item, index) => {
            if (item && typeof item === 'object') {
              this.convertTimestampsToDates(item);
            }
          });
        }
      }
    }
  }
  
  async getAllTickets(): Promise<any[]> {
    try {
      const collectionRef = collection(this.firestore, `${environment.collections.tickets}`);
      const querySnapshot = await getDocs(collectionRef);
      
      const data: any[] = [];
      querySnapshot.forEach((doc) => {
        data.push({ 
          firestoreId: doc.id, 
          ...doc.data() 
        });
      });
      return data;
    } catch (error) {
      console.error('Error en getAllTickets:', error);
      throw error;
    }
  }

  async getTicketsNuevos(): Promise<any[]> {
    try {
      const tickets = await this.getAllTickets();
      return tickets.filter(ticket => ticket.estatus === 'Nuevo');
    } catch (error) {
      console.error('Error en getTicketsNuevos:', error);
      throw error;
    }
  }

  async asignarTicket(firestoreId: string, tecnico: any): Promise<boolean> {
    try {
      const docRef = doc(this.firestore, `${environment.collections.tickets}`, firestoreId);
      const ticketDoc = await getDoc(docRef);
      
      if (!ticketDoc.exists()) {
        throw new Error('Ticket no encontrado');
      }
      
      const ticketData = ticketDoc.data();
      const hoy = new Date();
      
      const asignadoA = {
        id: tecnico.empleadoId,
        nombre: tecnico.nombre,
        categoria: tecnico.tipo || ticketData['categoria'],
        ...(tecnico.tecnicoId && { tecnicoId: tecnico.tecnicoId }),
        ...(tecnico.numeroConsecutivo && { numeroConsecutivo: tecnico.numeroConsecutivo })
      };
      
      const fechasEstatusActualizadas = ticketData['fechasEstatus'] || {};
      fechasEstatusActualizadas['fechaAsignado'] = hoy;
      
      const datosActualizacion = {
        asignadoA: asignadoA,
        estatus: 'Asignado',
        fechasEstatus: fechasEstatusActualizadas,
        fechaModificacion: hoy
      };
      
      await updateDoc(docRef, datosActualizacion);
      
      return true;
    } catch (error) {
      console.error('Error al asignar ticket:', error);
      throw error;
    }
  }
  
  async getEstadisticasGlobales(periodo: string = 'mes'): Promise<any> {
    try {
      const tickets = await this.getAllTickets();
      const empleados = await this.empleadoService.getEmpleados().toPromise();
      
      const ticketsFiltrados = this.filtrarTicketsPorPeriodo(tickets, periodo);
      
      if (!ticketsFiltrados || ticketsFiltrados.length === 0) {
        return this.crearEstructuraEstadisticasVacia();
      }

      const hoy = new Date();
      
      const ticketsProcesados = ticketsFiltrados.map(ticket => ({
        ...ticket,
        fechaCreacion: this.convertirTimestampADate(ticket.fechaCreacion),
        fechaLimite: this.convertirTimestampADate(ticket.fechaLimite),
        fechaModificacion: this.convertirTimestampADate(ticket.fechaModificacion),
        fechasEstatus: {
          fechaAsignado: this.convertirTimestampADate(ticket.fechasEstatus?.fechaAsignado),
          fechaEnProceso: this.convertirTimestampADate(ticket.fechasEstatus?.fechaEnProceso),
          fechaResuelto: this.convertirTimestampADate(ticket.fechasEstatus?.fechaResuelto),
          fechaCerrado: this.convertirTimestampADate(ticket.fechasEstatus?.fechaCerrado),
          fechaCancelado: this.convertirTimestampADate(ticket.fechasEstatus?.fechaCancelado)
        }
      }));

      const estadisticasEvaluacion = this.calcularEstadisticasEvaluacion(ticketsProcesados);

      const estadisticas = {
        general: {
          totalTickets: ticketsProcesados.length,
          ticketsNuevos: ticketsProcesados.filter(t => t.estatus === 'Nuevo').length,
          ticketsAsignados: ticketsProcesados.filter(t => t.estatus === 'Asignado').length,
          ticketsEnProceso: ticketsProcesados.filter(t => t.estatus === 'En proceso').length,
          ticketsResueltos: ticketsProcesados.filter(t => t.estatus === 'Resuelto').length,
          ticketsCerrados: ticketsProcesados.filter(t => t.estatus === 'Cerrado').length,
          ticketsCancelados: ticketsProcesados.filter(t => t.estatus === 'Cancelado').length,
          ticketsPendientes: ticketsProcesados.filter(t => 
            ['Nuevo', 'Asignado', 'En proceso'].includes(t.estatus)
          ).length,
          ticketsTerminados: ticketsProcesados.filter(t => 
            ['Resuelto', 'Cerrado'].includes(t.estatus)
          ).length,
          ticketsVencidos: ticketsProcesados.filter(t => {
            if (!t.fechaLimite) return false;
            return t.fechaLimite < hoy && !['Resuelto', 'Cerrado', 'Cancelado'].includes(t.estatus);
          }).length,
          ticketsEvaluados: estadisticasEvaluacion.totalEvaluados,
          promedioCalificacion: estadisticasEvaluacion.promedioGeneral,
          distribucionCalificaciones: estadisticasEvaluacion.distribucion
        },
        
        distribucionPorEstatus: this.calcularDistribucionPorEstatus(ticketsProcesados),
        distribucionPorPrioridad: this.calcularDistribucionPorPrioridad(ticketsProcesados),
        distribucionPorTipo: this.calcularDistribucionPorTipo(ticketsProcesados),
        porTecnico: await this.calcularEstadisticasPorTecnico(ticketsProcesados, empleados || []),
        tendenciaMensual: this.calcularTendenciaMensual(ticketsProcesados, periodo),
        ticketsRapidos: this.getTicketsRapidos(ticketsProcesados),
        ticketsLentos: this.getTicketsLentos(ticketsProcesados),
        distribucionPorCategoria: this.calcularDistribucionPorCategoria(ticketsProcesados),
        distribucionPorTecnico: this.calcularDistribucionPorTecnicoAsignado(ticketsProcesados),
        vencimiento: this.calcularEstadisticasVencimiento(ticketsProcesados),
        evaluaciones: estadisticasEvaluacion
      };
      
      return estadisticas;
    } catch (error) {
      console.error('Error en getEstadisticasGlobales:', error);
      return this.crearEstructuraEstadisticasVacia();
    }
  }

  private filtrarTicketsPorPeriodo(tickets: any[], periodo: string): any[] {
    const hoy = new Date();
    const fechaInicio = this.obtenerFechaInicioPeriodo(hoy, periodo);
    
    return tickets.filter(ticket => {
      const fechaCreacion = this.convertirTimestampADate(ticket.fechaCreacion);
      if (!fechaCreacion) return false;
      
      return fechaCreacion >= fechaInicio;
    });
  }

  private obtenerFechaInicioPeriodo(fechaActual: Date, periodo: string): Date {
    const fechaInicio = new Date(fechaActual);
    
    switch (periodo) {
      case 'mes':
        fechaInicio.setDate(1);
        fechaInicio.setHours(0, 0, 0, 0);
        break;
        
      case 'trimestre':
        const mesActual = fechaActual.getMonth();
        const trimestreInicio = Math.floor(mesActual / 3) * 3;
        fechaInicio.setMonth(trimestreInicio, 1);
        fechaInicio.setHours(0, 0, 0, 0);
        break;
        
      case 'anio':
        fechaInicio.setMonth(0, 1);
        fechaInicio.setHours(0, 0, 0, 0);
        break;
        
      default:
        fechaInicio.setDate(1);
        fechaInicio.setHours(0, 0, 0, 0);
        break;
    }
    
    return fechaInicio;
  }

  private calcularEstadisticasEvaluacion(tickets: any[]): any {
    const ticketsConEvaluacion = tickets.filter(ticket => 
      ticket.evaluacion && 
      ticket.evaluacion.calificacion !== undefined && 
      ticket.evaluacion.calificacion !== null
    );
    
    const totalEvaluados = ticketsConEvaluacion.length;
    
    if (totalEvaluados === 0) {
      return {
        totalEvaluados: 0,
        promedioGeneral: 0,
        promedioRedondeado: 0,
        distribucion: this.generarDistribucionCalificacionesVacia(),
        ticketsSinEvaluacion: tickets.length,
        porcentajeEvaluados: 0
      };
    }
    
    let sumaCalificaciones = 0;
    const distribucion: { [key: number]: number } = {
      1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0
    };
    
    ticketsConEvaluacion.forEach(ticket => {
      const calificacion = ticket.evaluacion.calificacion;
      sumaCalificaciones += calificacion;
      
      const califRedondeada = Math.round(calificacion);
      if (distribucion[califRedondeada] !== undefined) {
        distribucion[califRedondeada]++;
      }
    });
    
    const promedioGeneral = sumaCalificaciones / totalEvaluados;
    const promedioRedondeado = Math.round(promedioGeneral * 10) / 10;
    
    const distribucionArray = Object.keys(distribucion).map(calif => ({
      calificacion: parseInt(calif),
      cantidad: distribucion[parseInt(calif)],
      porcentaje: totalEvaluados > 0 ? (distribucion[parseInt(calif)] / totalEvaluados) * 100 : 0,
      color: this.getColorPorCalificacion(parseInt(calif))
    }));
    
    const ticketsSinEvaluacion = tickets.filter(ticket => 
      !ticket.evaluacion || 
      ticket.evaluacion.calificacion === undefined || 
      ticket.evaluacion.calificacion === null
    ).length;
    
    const satisfaccion = {
      excelente: 0,
      buena: 0,
      regular: 0,
      mala: 0
    };
    
    if (totalEvaluados > 0) {
      satisfaccion.excelente = ticketsConEvaluacion.filter(t => t.evaluacion.calificacion >= 9).length;
      satisfaccion.buena = ticketsConEvaluacion.filter(t => t.evaluacion.calificacion >= 7 && t.evaluacion.calificacion < 9).length;
      satisfaccion.regular = ticketsConEvaluacion.filter(t => t.evaluacion.calificacion >= 5 && t.evaluacion.calificacion < 7).length;
      satisfaccion.mala = ticketsConEvaluacion.filter(t => t.evaluacion.calificacion < 5).length;
    }
    
    return {
      totalEvaluados,
      promedioGeneral,
      promedioRedondeado,
      sumaCalificaciones,
      distribucion: distribucionArray,
      ticketsSinEvaluacion,
      porcentajeEvaluados: tickets.length > 0 ? (totalEvaluados / tickets.length) * 100 : 0,
      satisfaccion,
      ultimasEvaluaciones: ticketsConEvaluacion
        .filter(t => t.evaluacion && t.fechaModificacion)
        .sort((a, b) => {
          const fechaA = a.fechaModificacion?.getTime() || 0;
          const fechaB = b.fechaModificacion?.getTime() || 0;
          return fechaB - fechaA;
        })
        .slice(0, 10)
        .map(t => ({
          ticketId: t.id,
          folio: t.folio,
          titulo: t.titulo,
          calificacion: t.evaluacion.calificacion,
          comentario: t.evaluacion.comentario || '',
          fecha: t.fechaModificacion,
          evaluadoPor: t.creadoPor?.nombre || 'Anónimo'
        }))
    };
  }

  private generarDistribucionCalificacionesVacia(): any[] {
    const distribucion = [];
    for (let i = 1; i <= 10; i++) {
      distribucion.push({
        calificacion: i,
        cantidad: 0,
        porcentaje: 0,
        color: this.getColorPorCalificacion(i)
      });
    }
    return distribucion;
  }

  private getColorPorCalificacion(calificacion: number): string {
    if (calificacion >= 9) return '#4CAF50'; 
    if (calificacion >= 7) return '#8BC34A'; 
    if (calificacion >= 5) return '#FFC107'; 
    return '#F44336'; 
  }

  private async calcularEstadisticasPorTecnico(tickets: any[], empleados: Empleado[]): Promise<any[]> {
    const ticketsPorTecnico: { [key: string]: any[] } = {};
    
    tickets.forEach(ticket => {
      if (ticket.asignadoA?.id) {
        const tecnicoId = ticket.asignadoA.id;
        if (!ticketsPorTecnico[tecnicoId]) {
          ticketsPorTecnico[tecnicoId] = [];
        }
        ticketsPorTecnico[tecnicoId].push(ticket);
      }
    });
    
    const hoy = new Date();
    const estadisticasPorTecnico = [];
    
    if (Object.keys(ticketsPorTecnico).length > 0) {
      for (const [tecnicoId, ticketsTecnico] of Object.entries(ticketsPorTecnico)) {
        const empleado = empleados.find(e => e.empleadoId === tecnicoId);
        
        if (empleado) {
          const totalTickets = ticketsTecnico.length;
          const ticketsResueltos = ticketsTecnico.filter(t => 
            ['Resuelto', 'Cerrado'].includes(t.estatus)
          ).length;
          
          const ticketsConEvaluacion = ticketsTecnico.filter(t => 
            t.evaluacion && 
            t.evaluacion.calificacion !== undefined && 
            t.evaluacion.calificacion !== null
          );
          
          let promedioEvaluaciones = 0;
          if (ticketsConEvaluacion.length > 0) {
            const suma = ticketsConEvaluacion.reduce((acc, t) => acc + t.evaluacion.calificacion, 0);
            promedioEvaluaciones = suma / ticketsConEvaluacion.length;
          }
          
          let tiempoTotal = 0;
          let countResueltos = 0;
          
          ticketsTecnico.forEach(ticket => {
            if (['Resuelto', 'Cerrado'].includes(ticket.estatus) && ticket.fechasEstatus?.fechaResuelto) {
              const fechaCreacion = ticket.fechaCreacion;
              const fechaResuelto = ticket.fechasEstatus.fechaResuelto;
              
              if (fechaCreacion && fechaResuelto) {
                const diferenciaMs = fechaResuelto.getTime() - fechaCreacion.getTime();
                const diferenciaHoras = diferenciaMs / (1000 * 60 * 60);
                tiempoTotal += diferenciaHoras;
                countResueltos++;
              }
            }
          });
          
          const tiempoPromedio = countResueltos > 0 ? tiempoTotal / countResueltos : 0;
          const tasaResolucion = totalTickets > 0 ? (ticketsResueltos / totalTickets) * 100 : 0;
          
          estadisticasPorTecnico.push({
            tecnicoId,
            nombre: this.getNombreCompleto(empleado),
            puesto: empleado.puesto?.nombre || 'Técnico',
            totalTickets,
            ticketsResueltos,
            ticketsPendientes: ticketsTecnico.filter(t => 
              ['Nuevo', 'Asignado', 'En proceso'].includes(t.estatus)
            ).length,
            ticketsVencidos: ticketsTecnico.filter(t => {
              if (!t.fechaLimite) return false;
              return t.fechaLimite < hoy && !['Resuelto', 'Cerrado', 'Cancelado'].includes(t.estatus);
            }).length,
            tiempoPromedioResolucion: tiempoPromedio,
            tasaResolucion: tasaResolucion,
            eficiencia: Math.min(100, Math.round(tasaResolucion * (tiempoPromedio > 0 ? 24 / tiempoPromedio : 1))),
            promedioEvaluaciones: Math.round(promedioEvaluaciones * 10) / 10,
            totalEvaluacionesRecibidas: ticketsConEvaluacion.length
          });
        }
      }
    }
    
    return estadisticasPorTecnico.sort((a, b) => b.eficiencia - a.eficiencia);
  }

  private crearEstructuraEstadisticasVacia() {
    return {
      general: {
        totalTickets: 0,
        ticketsNuevos: 0,
        ticketsAsignados: 0,
        ticketsEnProceso: 0,
        ticketsResueltos: 0,
        ticketsCerrados: 0,
        ticketsCancelados: 0,
        ticketsPendientes: 0,
        ticketsTerminados: 0,
        ticketsVencidos: 0,
        ticketsEvaluados: 0,
        promedioCalificacion: 0,
        distribucionCalificaciones: this.generarDistribucionCalificacionesVacia()
      },
      distribucionPorEstatus: [],
      distribucionPorPrioridad: [],
      distribucionPorCategoria: [],
      distribucionPorTecnico: [],
      distribucionPorTipo: [],
      porTecnico: [],
      tendenciaMensual: this.generarTendenciaMensualVacia(),
      ticketsRapidos: [],
      ticketsLentos: [],
      vencimiento: {
        ticketsVencidos: 0,
        ticketsCerraronAntes: 0,
        ticketsCerraronDespues: 0,
        promedioDiasVencimiento: 0
      },
      evaluaciones: {
        totalEvaluados: 0,
        promedioGeneral: 0,
        promedioRedondeado: 0,
        distribucion: this.generarDistribucionCalificacionesVacia(),
        ticketsSinEvaluacion: 0,
        porcentajeEvaluados: 0,
        satisfaccion: {
          excelente: 0,
          buena: 0,
          regular: 0,
          mala: 0
        },
        ultimasEvaluaciones: []
      }
    };
  }


  private convertirTimestampADate(timestamp: any): Date | null {
    if (!timestamp) return null;
    
    try {
      if (timestamp.toDate && typeof timestamp.toDate === 'function') {
        return timestamp.toDate();
      } else if (timestamp.seconds) {
        return new Date(timestamp.seconds * 1000);
      } else if (timestamp instanceof Date) {
        return timestamp;
      } else if (typeof timestamp === 'string') {
        return new Date(timestamp);
      } else if (typeof timestamp === 'number') {
        return new Date(timestamp);
      }
    } catch (error) {
      console.warn('Error convirtiendo timestamp:', timestamp, error);
    }
    
    return null;
  }

  private calcularDistribucionPorEstatus(tickets: any[]): any[] {
    const estatusCount: { [key: string]: number } = {};
    const total = tickets.length;
    
    tickets.forEach(ticket => {
      const estatus = ticket.estatus || 'Sin estatus';
      estatusCount[estatus] = (estatusCount[estatus] || 0) + 1;
    });

    const colores: { [key: string]: string } = {
      'Nuevo': '#2196F3',
      'Asignado': '#FF9800',
      'En proceso': '#9C27B0',
      'Resuelto': '#4CAF50',
      'Cerrado': '#607D8B',
      'Cancelado': '#F44336',
      'Sin estatus': '#757575'
    };

    const resultado = Object.keys(estatusCount).map(estatus => ({
      estatus,
      cantidad: estatusCount[estatus],
      porcentaje: total > 0 ? (estatusCount[estatus] / total) * 100 : 0,
      color: colores[estatus] || '#757575'
    }));

    return resultado.length > 0 ? resultado : [
      { estatus: 'Sin datos', cantidad: 0, porcentaje: 0, color: '#757575' }
    ];
  }

  private calcularDistribucionPorPrioridad(tickets: any[]): any[] {
    const prioridadCount: { [key: string]: number } = {};
    const total = tickets.length;
    
    tickets.forEach(ticket => {
      const prioridad = ticket.prioridad || 'Sin prioridad';
      prioridadCount[prioridad] = (prioridadCount[prioridad] || 0) + 1;
    });

    const colores: { [key: string]: string } = {
      'Critica': '#F44336',
      'Alta': '#FF9800',
      'Mediana': '#FFC107',
      'Baja': '#4CAF50',
      'Sin prioridad': '#757575'
    };

    const resultado = Object.keys(prioridadCount).map(prioridad => ({
      prioridad: prioridad.charAt(0).toUpperCase() + prioridad.slice(1),
      cantidad: prioridadCount[prioridad],
      porcentaje: total > 0 ? (prioridadCount[prioridad] / total) * 100 : 0,
      color: colores[prioridad] || colores[prioridad.charAt(0).toUpperCase() + prioridad.slice(1)] || '#757575'
    }));

    return resultado.length > 0 ? resultado : [
      { prioridad: 'Sin datos', cantidad: 0, porcentaje: 0, color: '#757575' }
    ];
  }

  private calcularDistribucionPorTipo(tickets: any[]): any[] {
    const tipoCount: { [key: string]: number } = {};
    const total = tickets.length;
    
    tickets.forEach(ticket => {
      const tipo = ticket.tipo || 'Sin tipo';
      tipoCount[tipo] = (tipoCount[tipo] || 0) + 1;
    });

    const colores: { [key: string]: string } = {
      'mantenimiento': '#2196F3',
      'incidente': '#FF9800',
      'requerimiento': '#4CAF50',
      'asignacion activo/dispositivo': '#9C27B0',
      'Sin tipo': '#757575'
    };

    const resultado = Object.keys(tipoCount).map(tipo => ({
      tipo: this.formatearTipo(tipo),
      cantidad: tipoCount[tipo],
      porcentaje: total > 0 ? (tipoCount[tipo] / total) * 100 : 0,
      color: colores[tipo] || '#757575'
    }));

    return resultado.length > 0 ? resultado : [
      { tipo: 'Sin datos', cantidad: 0, porcentaje: 0, color: '#757575' }
    ];
  }

  private calcularTendenciaMensual(tickets: any[], periodo: string = 'mes'): any[] {
    const nombresMeses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const hoy = new Date();
    
    let mesesAMostrar: string[] = [];
    let cantidadMeses = 6;
    
    switch (periodo) {
      case 'mes':
        cantidadMeses = 1;
        break;
      case 'trimestre':
        cantidadMeses = 3;
        break;
      case 'anio':
        cantidadMeses = 12;
        break;
    }
    
    if (cantidadMeses === 1) {
      const mes = nombresMeses[hoy.getMonth()];
      const anio = hoy.getFullYear();
      mesesAMostrar = [`${mes} ${anio}`];
    } else {
      for (let i = cantidadMeses - 1; i >= 0; i--) {
        const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
        const mes = nombresMeses[fecha.getMonth()];
        const anio = fecha.getFullYear();
        mesesAMostrar.push(`${mes} ${anio}`);
      }
    }
    
    const meses: { [key: string]: { creados: number, resueltos: number } } = {};
    mesesAMostrar.forEach(mes => {
      meses[mes] = { creados: 0, resueltos: 0 };
    });
    
    tickets.forEach(ticket => {
      const fechaCreacion = ticket.fechaCreacion;
      if (fechaCreacion) {
        const mes = nombresMeses[fechaCreacion.getMonth()];
        const anio = fechaCreacion.getFullYear();
        const key = `${mes} ${anio}`;
        
        if (meses[key]) {
          meses[key].creados++;
          
          if (['Resuelto', 'Cerrado'].includes(ticket.estatus) && ticket.fechasEstatus?.fechaResuelto) {
            const fechaResuelto = ticket.fechasEstatus.fechaResuelto;
            if (fechaResuelto && 
                fechaResuelto.getMonth() === fechaCreacion.getMonth() && 
                fechaResuelto.getFullYear() === fechaCreacion.getFullYear()) {
              meses[key].resueltos++;
            }
          }
        }
      }
    });
    
    return mesesAMostrar.map(mes => ({
      mes,
      creados: meses[mes].creados,
      resueltos: meses[mes].resueltos,
      tasaResolucion: meses[mes].creados > 0 ? (meses[mes].resueltos / meses[mes].creados) * 100 : 0
    }));
  }

  private generarTendenciaMensualVacia(): any[] {
    const nombresMeses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const hoy = new Date();
    const resultado = [];
    
    for (let i = 5; i >= 0; i--) {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      const mes = nombresMeses[fecha.getMonth()];
      const anio = fecha.getFullYear();
      
      resultado.push({
        mes: `${mes} ${anio}`,
        creados: 0,
        resueltos: 0,
        tasaResolucion: 0
      });
    }
    
    return resultado;
  }

  private getTicketsRapidos(tickets: any[]): any[] {
    const ticketsResueltos = tickets.filter(t => ['Resuelto', 'Cerrado'].includes(t.estatus));
    
    return ticketsResueltos
      .map(ticket => {
        if (ticket.fechaCreacion && ticket.fechasEstatus?.fechaResuelto) {
          const diferenciaMs = ticket.fechasEstatus.fechaResuelto.getTime() - ticket.fechaCreacion.getTime();
          return {
            ...ticket,
            tiempoResolucion: diferenciaMs / (1000 * 60 * 60) 
          };
        }
        return { ...ticket, tiempoResolucion: 0 };
      })
      .sort((a, b) => a.tiempoResolucion - b.tiempoResolucion)
      .slice(0, 3); 
  }

  private getTicketsLentos(tickets: any[]): any[] {
    const hoy = new Date();
    const ticketsPendientes = tickets.filter(t => 
      ['Nuevo', 'Asignado', 'En proceso'].includes(t.estatus) && t.fechaCreacion
    );
    
    return ticketsPendientes
      .map(ticket => {
        const diferenciaMs = hoy.getTime() - ticket.fechaCreacion.getTime();
        return {
          ...ticket,
          diasPendiente: Math.floor(diferenciaMs / (1000 * 60 * 60 * 24))
        };
      })
      .sort((a, b) => b.diasPendiente - a.diasPendiente)
      .slice(0, 3);
  }

  private calcularEstadisticasVencimiento(tickets: any[]): any {
    const hoy = new Date();
    const ticketsVencidos = tickets.filter(t => {
      if (!t.fechaLimite) return false;
      return t.fechaLimite < hoy && !['Resuelto', 'Cerrado', 'Cancelado'].includes(t.estatus);
    });
    
    const ticketsCerraronAntes = tickets.filter(t => {
      if (!t.fechaLimite || !t.fechasEstatus?.fechaResuelto) return false;
      return t.fechasEstatus.fechaResuelto < t.fechaLimite && ['Resuelto', 'Cerrado'].includes(t.estatus);
    });
    
    const ticketsCerraronDespues = tickets.filter(t => {
      if (!t.fechaLimite || !t.fechasEstatus?.fechaResuelto) return false;
      return t.fechasEstatus.fechaResuelto > t.fechaLimite && ['Resuelto', 'Cerrado'].includes(t.estatus);
    });
    
    let totalDiasVencimiento = 0;
    let countVencidosConDias = 0;
    
    ticketsVencidos.forEach(ticket => {
      if (ticket.fechaLimite) {
        const diferenciaMs = hoy.getTime() - ticket.fechaLimite.getTime();
        totalDiasVencimiento += Math.floor(diferenciaMs / (1000 * 60 * 60 * 24));
        countVencidosConDias++;
      }
    });
    
    return {
      ticketsVencidos: ticketsVencidos.length,
      ticketsCerraronAntes: ticketsCerraronAntes.length,
      ticketsCerraronDespues: ticketsCerraronDespues.length,
      promedioDiasVencimiento: countVencidosConDias > 0 ? totalDiasVencimiento / countVencidosConDias : 0
    };
  }

  private formatearTipo(tipo: string): string {
    const formatos: { [key: string]: string } = {
      'mantenimiento': 'Mantenimiento',
      'incidente': 'Incidente',
      'requerimiento': 'Requerimiento',
      'asignacion activo/dispositivo': 'Asignación Activo',
      'Sin tipo': 'Sin tipo'
    };
    
    return formatos[tipo] || tipo.charAt(0).toUpperCase() + tipo.slice(1);
  }

  private getNombreCompleto(empleado: Empleado): string {
    return `${empleado.nombre || ''} ${empleado.apellidoPaterno || ''} ${empleado.apellidoMaterno || ''}`.trim();
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

  async getTicketsParaAsignar(): Promise<any[]> {
    try {
      const collectionRef = collection(this.firestore, `${environment.collections.tickets}`);
      const querySnapshot = await getDocs(collectionRef);
      
      const data: any[] = [];
      querySnapshot.forEach((doc) => {
        const ticketData = doc.data();
        
        if (ticketData['estatus'] === 'Nuevo' || 
            !ticketData['asignadoA'] || 
            !ticketData['asignadoA'].id) {
          data.push({ 
            firestoreId: doc.id, 
            ...ticketData 
          });
        }
      });
      
      return data;
    } catch (error) {
      console.error('Error en getTicketsParaAsignar:', error);
      throw error;
    }
  }

  private calcularDistribucionPorCategoria(tickets: any[]): any[] {
    const categoriaCount: { [key: string]: number } = {};
    const total = tickets.length;
    
    tickets.forEach(ticket => {
      let categoria = ticket.categoria || ticket.asignadoA?.categoria || 'Sin categoría';
      
      if (categoria && typeof categoria === 'string') {
        categoria = categoria.charAt(0).toUpperCase() + categoria.slice(1).toLowerCase();
      } else {
        categoria = 'Sin categoría';
      }
      
      categoriaCount[categoria] = (categoriaCount[categoria] || 0) + 1;
    });

    const colores: { [key: string]: string } = {
      'Soporte técnico': '#2196F3',
      'Mantenimiento': '#4CAF50',
      'Redes': '#FF9800',
      'Software': '#9C27B0',
      'Hardware': '#F44336',
      'Sin categoría': '#757575'
    };

    const resultado = Object.keys(categoriaCount).map(categoria => ({
      categoria,
      cantidad: categoriaCount[categoria],
      porcentaje: total > 0 ? (categoriaCount[categoria] / total) * 100 : 0,
      color: colores[categoria] || this.getColorPorCategoria(categoria)
    }));

    return resultado.length > 0 ? resultado : [
      { categoria: 'Sin datos', cantidad: 0, porcentaje: 0, color: '#757575' }
    ];
  }

  private getColorPorCategoria(categoria: string): string {
    let hash = 0;
    for (let i = 0; i < categoria.length; i++) {
      hash = categoria.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const colores = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
    ];
    
    const index = Math.abs(hash) % colores.length;
    return colores[index];
  }

  private calcularDistribucionPorTecnicoAsignado(tickets: any[]): any[] {
    const tecnicoCount: { [key: string]: { cantidad: number, nombre: string } } = {};
    const total = tickets.length;
    
    tickets.forEach(ticket => {
      if (ticket.asignadoA && ticket.asignadoA.id) {
        const tecnicoId = ticket.asignadoA.id;
        const tecnicoNombre = ticket.asignadoA.nombre || 'Técnico';
        
        if (!tecnicoCount[tecnicoId]) {
          tecnicoCount[tecnicoId] = { cantidad: 0, nombre: tecnicoNombre };
        }
        tecnicoCount[tecnicoId].cantidad++;
      }
    });

    const colores = [
      '#667eea', '#4CAF50', '#FF9800', '#F44336', '#9C27B0',
      '#2196F3', '#00BCD4', '#FF5722', '#795548', '#607D8B'
    ];

    const resultado = Object.keys(tecnicoCount).map((tecnicoId, index) => ({
      nombre: tecnicoCount[tecnicoId].nombre,
      cantidad: tecnicoCount[tecnicoId].cantidad,
      porcentaje: total > 0 ? (tecnicoCount[tecnicoId].cantidad / total) * 100 : 0,
      color: colores[index % colores.length]
    }));

    return resultado.sort((a, b) => b.cantidad - a.cantidad);
  }

  async getTicketsPorMes(anio: number, mes: number): Promise<any[]> {
    try {
      console.log(`Buscando tickets - Año: ${anio}, Mes: ${mes} (${typeof mes})`);
      
      const tickets = await this.getAllTickets();
      
      const mesNumero = typeof mes === 'string' ? parseInt(mes, 10) : mes;
      
      console.log(`Total tickets en sistema: ${tickets.length}`);
      
      const ticketsFiltrados = tickets.filter(ticket => {
        const fechaCreacion = this.convertirTimestampADate(ticket.fechaCreacion);
        if (!fechaCreacion) {
          console.log('Ticket sin fecha de creación:', ticket.folio);
          return false;
        }
        
        const añoTicket = fechaCreacion.getFullYear();
        const mesTicket = fechaCreacion.getMonth();
        
        const coincide = añoTicket === anio && mesTicket === mesNumero;
        
        if (coincide) {
          console.log(`Ticket encontrado: ${ticket.folio} - Fecha: ${fechaCreacion.toLocaleDateString()}`);
        }
        
        return coincide;
      });
      
      console.log(`Tickets encontrados para mes ${mesNumero}/${anio}: ${ticketsFiltrados.length}`);
      
      const mesesDisponibles = new Set();
      tickets.forEach(ticket => {
        const fecha = this.convertirTimestampADate(ticket.fechaCreacion);
        if (fecha) {
          mesesDisponibles.add(`${fecha.getMonth()}/${fecha.getFullYear()}`);
        }
      });
      console.log('Meses con tickets:', Array.from(mesesDisponibles));
      
      return ticketsFiltrados.map(ticket => ({
        ...ticket,
        fechaCreacion: this.convertirTimestampADate(ticket.fechaCreacion),
        fechaLimite: this.convertirTimestampADate(ticket.fechaLimite),
        fechaModificacion: this.convertirTimestampADate(ticket.fechaModificacion),
        fechasEstatus: {
          fechaNuevo: this.convertirTimestampADate(ticket.fechasEstatus?.fechaNuevo),
          fechaAsignado: this.convertirTimestampADate(ticket.fechasEstatus?.fechaAsignado),
          fechaEnProceso: this.convertirTimestampADate(ticket.fechasEstatus?.fechaEnProceso),
          fechaResuelto: this.convertirTimestampADate(ticket.fechasEstatus?.fechaResuelto),
          fechaCerrado: this.convertirTimestampADate(ticket.fechasEstatus?.fechaCerrado),
          fechaCancelado: this.convertirTimestampADate(ticket.fechasEstatus?.fechaCancelado)
        }
      }));
    } catch (error) {
      console.error('Error en getTicketsPorMes:', error);
      throw error;
    }
  }

  async getTicketsPorDia(anio: number, mes: number, dia: number): Promise<any[]> {
    try {
      console.log(`Buscando tickets creados - Año: ${anio}, Mes: ${mes}, Día: ${dia}`);
      
      const tickets = await this.getAllTickets();
      
      const mesNumero = typeof mes === 'string' ? parseInt(mes, 10) : mes;
      const diaNumero = typeof dia === 'string' ? parseInt(dia, 10) : dia;
      
      console.log(`Total tickets en sistema: ${tickets.length}`);
      
      const ticketsFiltrados = tickets.filter(ticket => {
        const fechaCreacion = this.convertirTimestampADate(ticket.fechaCreacion);
        if (!fechaCreacion) {
          return false;
        }
        
        const añoTicket = fechaCreacion.getFullYear();
        const mesTicket = fechaCreacion.getMonth();
        const diaTicket = fechaCreacion.getDate();
        
        const coincide = añoTicket === anio && mesTicket === mesNumero && diaTicket === diaNumero;
        
        if (coincide) {
          console.log(`Ticket creado encontrado: ${ticket.folio} - Fecha: ${fechaCreacion.toLocaleDateString()}`);
        }
        
        return coincide;
      });
      
      console.log(`Tickets creados encontrados para ${diaNumero}/${mesNumero + 1}/${anio}: ${ticketsFiltrados.length}`);
      
      return ticketsFiltrados.map(ticket => ({
        ...ticket,
        fechaCreacion: this.convertirTimestampADate(ticket.fechaCreacion),
        fechaLimite: this.convertirTimestampADate(ticket.fechaLimite),
        fechaModificacion: this.convertirTimestampADate(ticket.fechaModificacion),
        fechasEstatus: {
          fechaNuevo: this.convertirTimestampADate(ticket.fechasEstatus?.fechaNuevo),
          fechaAsignado: this.convertirTimestampADate(ticket.fechasEstatus?.fechaAsignado),
          fechaEnProceso: this.convertirTimestampADate(ticket.fechasEstatus?.fechaEnProceso),
          fechaResuelto: this.convertirTimestampADate(ticket.fechasEstatus?.fechaResuelto),
          fechaCerrado: this.convertirTimestampADate(ticket.fechasEstatus?.fechaCerrado),
          fechaCancelado: this.convertirTimestampADate(ticket.fechasEstatus?.fechaCancelado)
        }
      }));
    } catch (error) {
      console.error('Error en getTicketsPorDia:', error);
      throw error;
    }
  }

  async getTicketsSolucionadosPorMes(anio: number, mes: number): Promise<any[]> {
    try {
      console.log(`Buscando tickets solucionados - Año: ${anio}, Mes: ${mes}`);
      
      const tickets = await this.getAllTickets();
      
      const mesNumero = typeof mes === 'string' ? parseInt(mes, 10) : mes;
      
      console.log(`Total tickets en sistema: ${tickets.length}`);
      
      const ticketsFiltrados = tickets.filter(ticket => {
        const estaResueltoOCerrado = ['Resuelto', 'Cerrado'].includes(ticket.estatus);
        
        if (!estaResueltoOCerrado) {
          return false;
        }
        
        let fechaResolucion = null;
        
        if (ticket.fechasEstatus?.fechaResuelto) {
          fechaResolucion = this.convertirTimestampADate(ticket.fechasEstatus.fechaResuelto);
        } else if (ticket.fechasEstatus?.fechaCerrado) {
          fechaResolucion = this.convertirTimestampADate(ticket.fechasEstatus.fechaCerrado);
        }
        
        if (!fechaResolucion) {
          return false;
        }
        
        const añoResolucion = fechaResolucion.getFullYear();
        const mesResolucion = fechaResolucion.getMonth();
        
        const coincide = añoResolucion === anio && mesResolucion === mesNumero;
        
        if (coincide) {
          console.log(`Ticket solucionado encontrado: ${ticket.folio} - Fecha resolución: ${fechaResolucion.toLocaleDateString()}`);
        }
        
        return coincide;
      });
      
      console.log(`Tickets solucionados encontrados para mes ${mesNumero + 1}/${anio}: ${ticketsFiltrados.length}`);
      
      return ticketsFiltrados.map(ticket => ({
        ...ticket,
        fechaCreacion: this.convertirTimestampADate(ticket.fechaCreacion),
        fechaLimite: this.convertirTimestampADate(ticket.fechaLimite),
        fechaModificacion: this.convertirTimestampADate(ticket.fechaModificacion),
        fechasEstatus: {
          fechaNuevo: this.convertirTimestampADate(ticket.fechasEstatus?.fechaNuevo),
          fechaAsignado: this.convertirTimestampADate(ticket.fechasEstatus?.fechaAsignado),
          fechaEnProceso: this.convertirTimestampADate(ticket.fechasEstatus?.fechaEnProceso),
          fechaResuelto: this.convertirTimestampADate(ticket.fechasEstatus?.fechaResuelto),
          fechaCerrado: this.convertirTimestampADate(ticket.fechasEstatus?.fechaCerrado),
          fechaCancelado: this.convertirTimestampADate(ticket.fechasEstatus?.fechaCancelado)
        }
      }));
    } catch (error) {
      console.error('Error en getTicketsSolucionadosPorMes:', error);
      throw error;
    }
  }

  async getTicketsSolucionadosPorDia(anio: number, mes: number, dia: number): Promise<any[]> {
    try {
      console.log(`Buscando tickets solucionados - Año: ${anio}, Mes: ${mes}, Día: ${dia}`);
      
      const tickets = await this.getAllTickets();
      
      const mesNumero = typeof mes === 'string' ? parseInt(mes, 10) : mes;
      const diaNumero = typeof dia === 'string' ? parseInt(dia, 10) : dia;
      
      console.log(`Total tickets en sistema: ${tickets.length}`);
      
      const ticketsFiltrados = tickets.filter(ticket => {
        const estaResueltoOCerrado = ['Resuelto', 'Cerrado'].includes(ticket.estatus);
        
        if (!estaResueltoOCerrado) {
          return false;
        }
        
        let fechaResolucion = null;
        
        if (ticket.fechasEstatus?.fechaResuelto) {
          fechaResolucion = this.convertirTimestampADate(ticket.fechasEstatus.fechaResuelto);
        } else if (ticket.fechasEstatus?.fechaCerrado) {
          fechaResolucion = this.convertirTimestampADate(ticket.fechasEstatus.fechaCerrado);
        }
        
        if (!fechaResolucion) {
          return false;
        }
        
        const añoResolucion = fechaResolucion.getFullYear();
        const mesResolucion = fechaResolucion.getMonth();
        const diaResolucion = fechaResolucion.getDate();
        
        const coincide = añoResolucion === anio && mesResolucion === mesNumero && diaResolucion === diaNumero;
        
        if (coincide) {
          console.log(`Ticket solucionado encontrado: ${ticket.folio} - Fecha resolución: ${fechaResolucion.toLocaleDateString()}`);
        }
        
        return coincide;
      });
      
      console.log(`Tickets solucionados encontrados para ${diaNumero}/${mesNumero + 1}/${anio}: ${ticketsFiltrados.length}`);
      
      return ticketsFiltrados.map(ticket => ({
        ...ticket,
        fechaCreacion: this.convertirTimestampADate(ticket.fechaCreacion),
        fechaLimite: this.convertirTimestampADate(ticket.fechaLimite),
        fechaModificacion: this.convertirTimestampADate(ticket.fechaModificacion),
        fechasEstatus: {
          fechaNuevo: this.convertirTimestampADate(ticket.fechasEstatus?.fechaNuevo),
          fechaAsignado: this.convertirTimestampADate(ticket.fechasEstatus?.fechaAsignado),
          fechaEnProceso: this.convertirTimestampADate(ticket.fechasEstatus?.fechaEnProceso),
          fechaResuelto: this.convertirTimestampADate(ticket.fechasEstatus?.fechaResuelto),
          fechaCerrado: this.convertirTimestampADate(ticket.fechasEstatus?.fechaCerrado),
          fechaCancelado: this.convertirTimestampADate(ticket.fechasEstatus?.fechaCancelado)
        }
      }));
    } catch (error) {
      console.error('Error en getTicketsSolucionadosPorDia:', error);
      throw error;
    }
  }
  
  async getTicketsPorRangoFechas(anioInicio: number, mesInicio: number, anioFin: number, mesFin: number): Promise<any[]> {
    try {
      console.log(`Buscando tickets creados - Desde: ${mesInicio + 1}/${anioInicio} Hasta: ${mesFin + 1}/${anioFin}`);
      
      const tickets = await this.getAllTickets();
      
      const fechaInicio = new Date(anioInicio, mesInicio, 1);
      const fechaFin = new Date(anioFin, mesFin + 1, 0); // Último día del mes
      
      console.log(`Total tickets en sistema: ${tickets.length}`);
      console.log(`Rango de fechas: ${fechaInicio.toLocaleDateString()} - ${fechaFin.toLocaleDateString()}`);
      
      const ticketsFiltrados = tickets.filter(ticket => {
        const fechaCreacion = this.convertirTimestampADate(ticket.fechaCreacion);
        if (!fechaCreacion) {
          return false;
        }
        
        const dentroDelRango = fechaCreacion >= fechaInicio && fechaCreacion <= fechaFin;
        
        if (dentroDelRango) {
          console.log(`Ticket creado encontrado: ${ticket.folio} - Fecha: ${fechaCreacion.toLocaleDateString()}`);
        }
        
        return dentroDelRango;
      });
      
      console.log(`Tickets creados encontrados en el rango: ${ticketsFiltrados.length}`);
      
      return ticketsFiltrados.map(ticket => ({
        ...ticket,
        fechaCreacion: this.convertirTimestampADate(ticket.fechaCreacion),
        fechaLimite: this.convertirTimestampADate(ticket.fechaLimite),
        fechaModificacion: this.convertirTimestampADate(ticket.fechaModificacion),
        fechasEstatus: {
          fechaNuevo: this.convertirTimestampADate(ticket.fechasEstatus?.fechaNuevo),
          fechaAsignado: this.convertirTimestampADate(ticket.fechasEstatus?.fechaAsignado),
          fechaEnProceso: this.convertirTimestampADate(ticket.fechasEstatus?.fechaEnProceso),
          fechaResuelto: this.convertirTimestampADate(ticket.fechasEstatus?.fechaResuelto),
          fechaCerrado: this.convertirTimestampADate(ticket.fechasEstatus?.fechaCerrado),
          fechaCancelado: this.convertirTimestampADate(ticket.fechasEstatus?.fechaCancelado)
        }
      }));
    } catch (error) {
      console.error('Error en getTicketsPorRangoFechas:', error);
      throw error;
    }
  }

  async getTicketsSolucionadosPorRangoFechas(anioInicio: number, mesInicio: number, anioFin: number, mesFin: number): Promise<any[]> {
    try {
      console.log(`Buscando tickets solucionados - Desde: ${mesInicio + 1}/${anioInicio} Hasta: ${mesFin + 1}/${anioFin}`);
      
      const tickets = await this.getAllTickets();
      
      const fechaInicio = new Date(anioInicio, mesInicio, 1);
      const fechaFin = new Date(anioFin, mesFin + 1, 0);
      
      console.log(`Total tickets en sistema: ${tickets.length}`);
      console.log(`Rango de fechas: ${fechaInicio.toLocaleDateString()} - ${fechaFin.toLocaleDateString()}`);
      
      const ticketsFiltrados = tickets.filter(ticket => {
        // Verificar si el ticket está resuelto o cerrado
        const estaResueltoOCerrado = ['Resuelto', 'Cerrado'].includes(ticket.estatus);
        
        if (!estaResueltoOCerrado) {
          return false;
        }
        
        // Obtener la fecha de resolución
        let fechaResolucion = null;
        
        if (ticket.fechasEstatus?.fechaResuelto) {
          fechaResolucion = this.convertirTimestampADate(ticket.fechasEstatus.fechaResuelto);
        } else if (ticket.fechasEstatus?.fechaCerrado) {
          fechaResolucion = this.convertirTimestampADate(ticket.fechasEstatus.fechaCerrado);
        }
        
        if (!fechaResolucion) {
          return false;
        }
        
        const dentroDelRango = fechaResolucion >= fechaInicio && fechaResolucion <= fechaFin;
        
        if (dentroDelRango) {
          console.log(`Ticket solucionado encontrado: ${ticket.folio} - Fecha resolución: ${fechaResolucion.toLocaleDateString()}`);
        }
        
        return dentroDelRango;
      });
      
      console.log(`Tickets solucionados encontrados en el rango: ${ticketsFiltrados.length}`);
      
      return ticketsFiltrados.map(ticket => ({
        ...ticket,
        fechaCreacion: this.convertirTimestampADate(ticket.fechaCreacion),
        fechaLimite: this.convertirTimestampADate(ticket.fechaLimite),
        fechaModificacion: this.convertirTimestampADate(ticket.fechaModificacion),
        fechasEstatus: {
          fechaNuevo: this.convertirTimestampADate(ticket.fechasEstatus?.fechaNuevo),
          fechaAsignado: this.convertirTimestampADate(ticket.fechasEstatus?.fechaAsignado),
          fechaEnProceso: this.convertirTimestampADate(ticket.fechasEstatus?.fechaEnProceso),
          fechaResuelto: this.convertirTimestampADate(ticket.fechasEstatus?.fechaResuelto),
          fechaCerrado: this.convertirTimestampADate(ticket.fechasEstatus?.fechaCerrado),
          fechaCancelado: this.convertirTimestampADate(ticket.fechasEstatus?.fechaCancelado)
        }
      }));
    } catch (error) {
      console.error('Error en getTicketsSolucionadosPorRangoFechas:', error);
      throw error;
    }
  }
}