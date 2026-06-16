import { Injectable } from '@angular/core';
import { collection, Firestore, doc, updateDoc, getDoc, getDocs, query, where } from '@angular/fire/firestore';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import { environment } from 'src/environments/environment';
import { v4 as uuidv4 } from 'uuid';
import { FolioService } from '../../admin/empleados/folio.service';
import { TecnicoService } from '../../admin/tecnicos/tecnicos.service';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TicketsService {

  constructor(
    private firestore: Firestore,
    private storage: Storage,
    private folioService: FolioService,
    private tecnicoService: TecnicoService
  ) { }

  // Método para obtener tickets asignados al técnico actual
  async getTicketsAsignados(tecnicoId: string): Promise<any[]> {
    if (!tecnicoId || tecnicoId.trim() === '') {
      console.error('Técnico ID no válido:', tecnicoId);
      return [];
    }

    try {
      const collectionRef = collection(this.firestore, `${environment.collections.tickets}`);
      const q = query(collectionRef, where("asignadoA.id", "==", tecnicoId));
      const querySnapshot = await getDocs(q);
      
      const tickets: any[] = [];
      querySnapshot.forEach((doc) => {
        tickets.push({ 
          firestoreId: doc.id, 
          ...doc.data(),
          fechaCreacion: this.convertirTimestampADate(doc.data()['fechaCreacion']),
          fechaLimite: this.convertirTimestampADate(doc.data()['fechaLimite']),
          fechaModificacion: this.convertirTimestampADate(doc.data()['fechaModificacion']),
          fechasEstatus: {
            fechaNuevo: this.convertirTimestampADate(doc.data()['fechasEstatus']?.fechaNuevo),
            fechaAsignado: this.convertirTimestampADate(doc.data()['fechasEstatus']?.fechaAsignado),
            fechaEnProceso: this.convertirTimestampADate(doc.data()['fechasEstatus']?.fechaEnProceso),
            fechaResuelto: this.convertirTimestampADate(doc.data()['fechasEstatus']?.fechaResuelto),
            fechaCerrado: this.convertirTimestampADate(doc.data()['fechasEstatus']?.fechaCerrado),
            fechaCancelado: this.convertirTimestampADate(doc.data()['fechasEstatus']?.fechaCancelado)
          }
        });
      });
      
      console.log(`Encontrados ${tickets.length} tickets asignados a ${tecnicoId}`);
      return tickets;
    } catch (error) {
      console.error('Error en getTicketsAsignados:', error);
      throw error;
    }
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

  // El resto de métodos se mantienen igual...
  async getEstadisticasTecnico(tecnicoId: string): Promise<any> {
    try {
      const tickets = await this.getTicketsAsignados(tecnicoId);
      const hoy = new Date();
      
      const estadisticas = {
        general: {
          totalTickets: tickets.length,
          ticketsNuevos: tickets.filter(t => t.estatus === 'Nuevo').length,
          ticketsAsignados: tickets.filter(t => t.estatus === 'Asignado').length,
          ticketsEnProceso: tickets.filter(t => t.estatus === 'En proceso').length,
          ticketsResueltos: tickets.filter(t => t.estatus === 'Resuelto').length,
          ticketsCerrados: tickets.filter(t => t.estatus === 'Cerrado').length,
          ticketsCancelados: tickets.filter(t => t.estatus === 'Cancelado').length,
          ticketsPendientes: tickets.filter(t => ['Nuevo', 'Asignado', 'En proceso'].includes(t.estatus)).length,
          ticketsTerminados: tickets.filter(t => ['Resuelto', 'Cerrado'].includes(t.estatus)).length,
          ticketsVencidos: tickets.filter(t => {
            if (!t.fechaLimite) return false;
            return t.fechaLimite < hoy && !['Resuelto', 'Cerrado', 'Cancelado'].includes(t.estatus);
          }).length
        },
        distribucionPorEstatus: this.calcularDistribucionPorEstatus(tickets),
        distribucionPorPrioridad: this.calcularDistribucionPorPrioridad(tickets),
        distribucionPorTipo: this.calcularDistribucionPorTipo(tickets),
        ticketsRapidos: this.getTicketsRapidos(tickets),
        ticketsLentos: this.getTicketsLentos(tickets)
      };
      
      return estadisticas;
    } catch (error) {
      console.error('Error en getEstadisticasTecnico:', error);
      return this.crearEstructuraEstadisticasVacia();
    }
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

    return Object.keys(estatusCount).map(estatus => ({
      estatus,
      cantidad: estatusCount[estatus],
      porcentaje: total > 0 ? (estatusCount[estatus] / total) * 100 : 0,
      color: colores[estatus] || '#757575'
    }));
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

    return Object.keys(prioridadCount).map(prioridad => ({
      prioridad: prioridad.charAt(0).toUpperCase() + prioridad.slice(1),
      cantidad: prioridadCount[prioridad],
      porcentaje: total > 0 ? (prioridadCount[prioridad] / total) * 100 : 0,
      color: colores[prioridad] || '#757575'
    }));
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

    return Object.keys(tipoCount).map(tipo => ({
      tipo: this.formatearTipo(tipo),
      cantidad: tipoCount[tipo],
      porcentaje: total > 0 ? (tipoCount[tipo] / total) * 100 : 0,
      color: colores[tipo] || '#757575'
    }));
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
        ticketsVencidos: 0
      },
      distribucionPorEstatus: [],
      distribucionPorPrioridad: [],
      distribucionPorTipo: [],
      ticketsRapidos: [],
      ticketsLentos: []
    };
  }

  // Método para obtener un ticket específico
  async getTicket(ticketId: string): Promise<any> {
    if (!ticketId || ticketId.trim() === '') {
      throw new Error('Ticket ID no válido');
    }

    try {
      const docRef = doc(this.firestore, `${environment.collections.tickets}`, ticketId);
      const docSnapshot = await getDoc(docRef);
      
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        return { 
          firestoreId: docSnapshot.id, 
          ...data,
          fechaCreacion: this.convertirTimestampADate(data['fechaCreacion']),
          fechaLimite: this.convertirTimestampADate(data['fechaLimite']),
          fechaModificacion: this.convertirTimestampADate(data['fechaModificacion']),
          fechasEstatus: {
            fechaNuevo: this.convertirTimestampADate(data['fechasEstatus']?.fechaNuevo),
            fechaAsignado: this.convertirTimestampADate(data['fechasEstatus']?.fechaAsignado),
            fechaEnProceso: this.convertirTimestampADate(data['fechasEstatus']?.fechaEnProceso),
            fechaResuelto: this.convertirTimestampADate(data['fechasEstatus']?.fechaResuelto),
            fechaCerrado: this.convertirTimestampADate(data['fechasEstatus']?.fechaCerrado),
            fechaCancelado: this.convertirTimestampADate(data['fechasEstatus']?.fechaCancelado)
          }
        };
      } else {
        throw new Error('Ticket no encontrado');
      }
    } catch (error) {
      console.error('Error en getTicket:', error);
      throw error;
    }
  }

  async actualizarTicket(ticketId: string, data: any): Promise<boolean> {  
    try {
      const docRef = doc(this.firestore, environment.collections.tickets, ticketId);
      await updateDoc(docRef, data);
      return true;
    } catch (error: any) {      
      throw error;
    }
  }

  async addCommentToTicket(ticketId: string, tecnicoId: string, comentario: string, nombre: string): Promise<boolean> {
    try {
      const docRef = doc(this.firestore, `${environment.collections.tickets}`, ticketId);
      const ticketDoc = await getDoc(docRef);
      
      if (ticketDoc.exists()) {
        const ticketData = ticketDoc.data();
        const comentarios = ticketData['comentarios'] || [];
        
        comentarios.push({
          id: uuidv4(),
          texto: comentario,
          usuarioId: tecnicoId,
          usuarioNombre: nombre,
          tipo: 'tecnico',
          fecha: new Date()
        });
        
        await updateDoc(docRef, { 
          comentarios,
          fechaModificacion: new Date()
        });
        return true;
      }
      return false;
    } catch (error) {
      throw error;
    }
  }

  async uploadEvidenceFile(file: File, ticketId: string): Promise<string> {
    const path = `tickets/${ticketId}/evidencias/${Date.now()}_${file.name}`;
    const storageRef = ref(this.storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    return getDownloadURL(snapshot.ref);
  }

  async addEvidenceToTicket(ticketId: string, tecnicoId: string, evidenceData: any): Promise<boolean> {
    try {
      const docRef = doc(this.firestore, `${environment.collections.tickets}`, ticketId);
      const ticketDoc = await getDoc(docRef);
      
      if (ticketDoc.exists()) {
        const ticketData = ticketDoc.data();
        const evidencias = ticketData['evidencias'] || [];
        
        evidencias.push({
          id: uuidv4(),
          url: evidenceData.url,
          nombre: evidenceData.nombre || 'Evidencia',
          tipo: evidenceData.tipo || 'application/octet-stream',
          tamaño: evidenceData.tamaño || 0,
          subidoPor: tecnicoId,
          fecha: new Date()
        });
        
        await updateDoc(docRef, { 
          evidencias,
          fechaModificacion: new Date()
        });
        return true;
      }
      return false;
    } catch (error) {
      throw error;
    }
  }

  async aceptarTicket(ticketId: string, tecnicoId: string, tecnicoNombre: string): Promise<boolean> {
    try {
      const docRef = doc(this.firestore, `${environment.collections.tickets}`, ticketId);
      const hoy = new Date();
      
      await updateDoc(docRef, {
        estatus: 'Asignado',
        'fechasEstatus.fechaAsignado': hoy,
        fechaModificacion: hoy
      });
      
      console.log(`Ticket ${ticketId} aceptado por técnico ${tecnicoNombre}`);
      return true;
    } catch (error) {
      console.error('Error al aceptar ticket:', error);
      throw error;
    }
  }

  async rechazarTicket(ticketId: string, tecnicoActualId: string, tecnicoActualNombre: string, 
                      motivoRechazo: string = 'Sin motivo especificado'): Promise<boolean> {
    try {
      const docRef = doc(this.firestore, `${environment.collections.tickets}`, ticketId);
      const ticketDoc = await getDoc(docRef);
      
      if (!ticketDoc.exists()) {
        throw new Error('Ticket no encontrado');
      }
      
      const ticketData = ticketDoc.data();
      const hoy = new Date();
      const categoriaTicket = ticketData['categoria'];
      const tecnicosRechazados = ticketData['tecnicosRechazados'] || [];
      const nuevosTecnicosRechazados = [...tecnicosRechazados, tecnicoActualId];
      const siguienteTecnico = await this.obtenerSiguienteTecnico(categoriaTicket, nuevosTecnicosRechazados);
      
      if (!siguienteTecnico) {
        throw new Error('No hay más técnicos disponibles para reasignar este ticket');
      }
      
      const historial = ticketData['historialReasignaciones'] || [];
      
      historial.push({
        id: uuidv4(),
        tecnicoId: tecnicoActualId,
        tecnicoNombre: tecnicoActualNombre,
        tecnicoNumero: ticketData['asignadoA']?.numeroConsecutivo || 0,
        accion: 'rechazado',
        fecha: hoy,
        motivoRechazo: motivoRechazo,
        asignadoPor: {
          id: tecnicoActualId,
          nombre: tecnicoActualNombre
        }
      });
      
      const intentosReasignacion = (ticketData['intentosReasignacion'] || 0) + 1;
      
      const datosActualizacion: any = {
        'asignadoA.id': siguienteTecnico.empleadoId,
        'asignadoA.nombre': siguienteTecnico.nombre,
        'asignadoA.categoria': siguienteTecnico.tipo,
        'asignadoA.tecnicoId': siguienteTecnico.tecnicoId,
        'asignadoA.numeroConsecutivo': siguienteTecnico.numeroConsecutivo,
        estatus: 'Asignado',
        'fechasEstatus.fechaAsignado': hoy,
        'fechasEstatus.fechaRechazado': hoy,
        tecnicosRechazados: nuevosTecnicosRechazados,
        intentosReasignacion: intentosReasignacion,
        ultimoTecnicoAsignado: tecnicoActualId,
        historialReasignaciones: historial,
        fechaModificacion: hoy
      };
      
      const comentarios = ticketData['comentarios'] || [];
      comentarios.push({
        id: uuidv4(),
        texto: `Ticket rechazado por ${tecnicoActualNombre}. Reasignado a ${siguienteTecnico.nombre}. Motivo: ${motivoRechazo}`,
        usuarioId: tecnicoActualId,
        usuarioNombre: tecnicoActualNombre,
        fecha: hoy
      });
      
      datosActualizacion.comentarios = comentarios;
      
      await updateDoc(docRef, datosActualizacion);
      
      console.log(`Ticket ${ticketId} rechazado por ${tecnicoActualNombre}, reasignado a ${siguienteTecnico.nombre}`);
      return true;
    } catch (error) {
      console.error('Error al rechazar ticket:', error);
      throw error;
    }
  }

  async obtenerSiguienteTecnico(categoria: string, tecnicosRechazados: string[] = []): Promise<any> {
    try {
      const tecnicos = await firstValueFrom(this.tecnicoService.getTecnicos());
      
      if (!tecnicos || tecnicos.length === 0) {
        console.warn('No hay técnicos disponibles en el sistema');
        return null;
      }
      
      const tecnicosFiltrados = tecnicos.filter(t => {
        if (!t || !t.tipo || t.activo === false) {
          return false;
        }
        
        const coincideCategoria = t.tipo === categoria;
        const empleadoId = t.empleadoId || '';
        const tecnicoId = t.tecnicoId || '';
        const yaRechazo = tecnicosRechazados.includes(empleadoId) || 
                        tecnicosRechazados.includes(tecnicoId);
        
        return coincideCategoria && !yaRechazo;
      });
      
      if (tecnicosFiltrados.length === 0) {
        console.warn(`No hay técnicos de ${categoria} disponibles`);
        return null;
      }
      
      const tecnicosOrdenados = tecnicosFiltrados.sort((a, b) => {
        const numA = a.numeroConsecutivo || 999999;
        const numB = b.numeroConsecutivo || 999999;
        return numA - numB;
      });
      
      return tecnicosOrdenados[0];
    } catch (error) {
      console.error('Error al obtener siguiente técnico:', error);
      return null;
    }
  }

  async getTicketsNuevosAsignados(tecnicoId: string): Promise<any[]> {
    const tickets = await this.getTicketsAsignados(tecnicoId);
    return tickets.filter(ticket => ticket.estatus === 'Nuevo');
  }

  // Método para obtener estadísticas globales del técnico (igual que admin pero solo sus tickets)
  async getEstadisticasGlobalesTecnico(tecnicoId: string, periodo: string = 'mes'): Promise<any> {
    try {
      const tickets = await this.getTicketsAsignados(tecnicoId);
      
      if (!tickets || tickets.length === 0) {
        return this.crearEstructuraEstadisticasVacia();
      }
      
      const hoy = new Date();
      
      // Tickets procesados con fechas convertidas
      const ticketsProcesados = tickets.map(ticket => ({
        ...ticket,
        fechaCreacion: ticket.fechaCreacion,
        fechaLimite: ticket.fechaLimite,
        fechaModificacion: ticket.fechaModificacion,
        fechasEstatus: ticket.fechasEstatus
      }));
      
      const ticketsFiltrados = this.filtrarTicketsPorPeriodo(ticketsProcesados, periodo);
      
      const estadisticas = {
        general: {
          totalTickets: ticketsFiltrados.length,
          ticketsNuevos: ticketsFiltrados.filter(t => t.estatus === 'Nuevo').length,
          ticketsAsignados: ticketsFiltrados.filter(t => t.estatus === 'Asignado').length,
          ticketsEnProceso: ticketsFiltrados.filter(t => t.estatus === 'En proceso').length,
          ticketsResueltos: ticketsFiltrados.filter(t => t.estatus === 'Resuelto').length,
          ticketsCerrados: ticketsFiltrados.filter(t => t.estatus === 'Cerrado').length,
          ticketsCancelados: ticketsFiltrados.filter(t => t.estatus === 'Cancelado').length,
          ticketsPendientes: ticketsFiltrados.filter(t => 
            ['Nuevo', 'Asignado', 'En proceso'].includes(t.estatus)
          ).length,
          ticketsTerminados: ticketsFiltrados.filter(t => 
            ['Resuelto', 'Cerrado'].includes(t.estatus)
          ).length,
          ticketsVencidos: ticketsFiltrados.filter(t => {
            if (!t.fechaLimite) return false;
            return t.fechaLimite < hoy && !['Resuelto', 'Cerrado', 'Cancelado'].includes(t.estatus);
          }).length
        },
        distribucionPorEstatus: this.calcularDistribucionPorEstatus(ticketsFiltrados),
        distribucionPorPrioridad: this.calcularDistribucionPorPrioridad(ticketsFiltrados),
        distribucionPorTipo: this.calcularDistribucionPorTipo(ticketsFiltrados),
        tendenciaMensual: this.calcularTendenciaMensual(ticketsFiltrados, periodo),
        ticketsRapidos: this.getTicketsRapidos(ticketsFiltrados),
        ticketsLentos: this.getTicketsLentos(ticketsFiltrados)
      };
      
      return estadisticas;
    } catch (error) {
      console.error('Error en getEstadisticasGlobalesTecnico:', error);
      return this.crearEstructuraEstadisticasVacia();
    }
  }

  private filtrarTicketsPorPeriodo(tickets: any[], periodo: string): any[] {
    const hoy = new Date();
    const fechaInicio = this.obtenerFechaInicioPeriodo(hoy, periodo);
    
    return tickets.filter(ticket => {
      const fechaCreacion = ticket.fechaCreacion;
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
    }
    
    return fechaInicio;
  }

  private calcularTendenciaMensual(tickets: any[], periodo: string = 'mes'): any[] {
    const nombresMeses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const hoy = new Date();
    
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
    
    const meses: { [key: string]: { asignados: number, resueltos: number } } = {};
    
    // Inicializar meses
    for (let i = cantidadMeses - 1; i >= 0; i--) {
      const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      const mes = nombresMeses[fecha.getMonth()];
      const anio = fecha.getFullYear();
      const key = `${mes} ${anio}`;
      meses[key] = { asignados: 0, resueltos: 0 };
    }
    
    tickets.forEach(ticket => {
      const fechaAsignacion = ticket.fechasEstatus?.fechaAsignado || ticket.fechaCreacion;
      if (fechaAsignacion) {
        const mes = nombresMeses[fechaAsignacion.getMonth()];
        const anio = fechaAsignacion.getFullYear();
        const key = `${mes} ${anio}`;
        
        if (meses[key]) {
          meses[key].asignados++;
          
          if (['Resuelto', 'Cerrado'].includes(ticket.estatus) && ticket.fechasEstatus?.fechaResuelto) {
            meses[key].resueltos++;
          }
        }
      }
    });
    
    return Object.keys(meses).map(key => ({
      mes: key,
      asignados: meses[key].asignados,
      resueltos: meses[key].resueltos,
      tasaResolucion: meses[key].asignados > 0 ? (meses[key].resueltos / meses[key].asignados) * 100 : 0
    }));
  }
}