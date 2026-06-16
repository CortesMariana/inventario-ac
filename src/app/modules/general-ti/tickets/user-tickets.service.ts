import { Injectable } from '@angular/core';
import { collection, Firestore, query, where, getDocs, doc, getDoc, updateDoc } from '@angular/fire/firestore';
import { from, Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { UserTicketView, UserTicketDetail } from './models/user-ticket.model';

@Injectable({
  providedIn: 'root'
})
export class UserTicketsService {

  constructor(private firestore: Firestore) { }

  getUserTickets(userId: string): Observable<UserTicketView[]> {
    
    return from(
      getDocs(
        query(
          collection(this.firestore, environment.collections.tickets),
          where('creadoPor.id', '==', userId)
        )
      )
    ).pipe(
      map(querySnapshot => {
        
        const tickets: UserTicketView[] = [];
        
        querySnapshot.forEach(doc => {
          const ticketData = doc.data();
          const ticket = this.processTicketForView({
            firestoreId: doc.id,
            ...ticketData
          });
          tickets.push(ticket);
        });
        
        return tickets.sort((a, b) => {
          const dateA = this.convertToDate(a.fechaCreacion);
          const dateB = this.convertToDate(b.fechaCreacion);
          return dateB.getTime() - dateA.getTime();
        });
      }),
      catchError(error => {
        console.error('Error en getUserTickets:', error);
        throw error;
      })
    );
  }

  getUserTicketDetail(ticketId: string, userId: string): Observable<UserTicketDetail | null> {
    return from(
      getDocs(
        query(
          collection(this.firestore, environment.collections.tickets),
          where('__name__', '==', ticketId),
          where('creadoPor.id', '==', userId)
        )
      )
    ).pipe(
      map(querySnapshot => {
        if (querySnapshot.empty) {
          return null;
        }
        
        const doc = querySnapshot.docs[0];
        const ticketData = doc.data();
        
        return this.processTicketForDetail({
          firestoreId: doc.id,
          ...ticketData
        });
      })
    );
  }

  private processTicketForView(ticket: any): UserTicketView {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const fechaCreacion = this.convertToDate(ticket.fechaCreacion);
    const fechaLimite = ticket.fechaLimite ? this.convertToDate(ticket.fechaLimite) : null;
    
    let vencido = false;
    let diasRestantes: number | null = null;
    
    if (fechaLimite) {
      const fechaLimiteDate = new Date(fechaLimite);
      fechaLimiteDate.setHours(0, 0, 0, 0);
      
      vencido = fechaLimiteDate < hoy && 
        !['Resuelto', 'Cerrado', 'Cancelado'].includes(ticket.estatus);
      
      if (!vencido) {
        const diffTime = fechaLimiteDate.getTime() - hoy.getTime();
        diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        diasRestantes = diasRestantes >= 0 ? diasRestantes : 0;
      }
    }
    
    let evaluacion;
    if (ticket.evaluacion) {
      evaluacion = {
        calificacion: ticket.evaluacion.calificacion || 0,
        comentario: ticket.evaluacion.comentario || '',
        fechaEvaluacion: ticket.evaluacion.fechaEvaluacion,
        evaluadoPor: ticket.evaluacion.evaluadoPor || {
          id: ticket.creadoPor?.id || '',
          nombre: ticket.creadoPor?.nombre || 'Usuario'
        }
      };
    }
    
    return {
      firestoreId: ticket.firestoreId,
      folio: ticket.folio || `TICKET-${ticket.firestoreId.substring(0, 8).toUpperCase()}`,
      titulo: ticket.titulo || 'Sin título',
      descripcion: ticket.descripcion || '',
      tipo: ticket.tipo || 'incidente',
      categoria: ticket.categoria || 'oficina',
      prioridad: ticket.prioridad || 'Mediana',
      estatus: ticket.estatus || 'Nuevo',
      creadoPor: ticket.creadoPor || { id: '', nombre: 'Usuario' },
      asignadoA: ticket.asignadoA,
      fechaCreacion: ticket.fechaCreacion,
      fechaLimite: ticket.fechaLimite,
      fechaCreacionFormatted: this.formatFecha(fechaCreacion),
      fechaLimiteFormatted: fechaLimite ? this.formatFecha(fechaLimite) : 'Sin fecha límite',
      vencido,
      diasRestantes,
      colorPrioridad: this.getColorPrioridad(ticket.prioridad),
      iconoTipo: this.getIconoTipo(ticket.tipo),
      evaluacion, 
      evaluado: ticket.evaluado || !!ticket.evaluacion 
    };
  }

  private processTicketForDetail(ticket: any): UserTicketDetail {
    const basicInfo = this.processTicketForView(ticket);
    
    return {
      ...basicInfo,
      origen: ticket.origen || 'tickets',
      correo: ticket.correo || '',
      telefono: ticket.telefono || '',
      sucursal: ticket.sucursal,
      activos: ticket.activos || [],
      evidencias: ticket.evidencias || [],
      comentarios: ticket.comentarios || [],
      fechasEstatus: ticket.fechasEstatus || {},
      fechaModificacion: ticket.fechaModificacion
    };
  }

  private convertToDate(fecha: any): Date {
    if (!fecha) return new Date();
    
    try {
      if (fecha.toDate && typeof fecha.toDate === 'function') {
        return fecha.toDate();
      } else if (fecha.seconds) {
        return new Date(fecha.seconds * 1000);
      } else if (fecha instanceof Date) {
        return fecha;
      } else if (typeof fecha === 'string') {
        return new Date(fecha);
      } else if (typeof fecha === 'number') {
        return new Date(fecha);
      }
    } catch (error) {
      console.warn('Error convirtiendo fecha:', error);
    }
    
    return new Date();
  }

  private formatFecha(fecha: Date): string {
    if (!fecha) return 'Sin fecha';
    return fecha.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  private getColorPrioridad(prioridad: string): string {
    switch (prioridad) {
      case 'Critica':
        return '#F44336';
      case 'Alta':
        return '#FF9800';
      case 'Mediana':
        return '#FFC107';
      case 'baja':
        return '#4CAF50';
      default:
        return '#607D8B';
    }
  }

  private getIconoTipo(tipo: string): string {
    switch (tipo) {
      case 'mantenimiento':
        return 'pi pi-wrench';
      case 'incidente':
        return 'pi pi-exclamation-triangle';
      case 'requerimiento':
        return 'pi pi-pencil';
      case 'asignacion activo/dispositivo':
        return 'pi pi-desktop';
      default:
        return 'pi pi-ticket';
    }
  }

  getUserStats(tickets: UserTicketView[]): any {
    const hoy = new Date();
    
    return {
      totalTickets: tickets.length,
      ticketsNuevos: tickets.filter(t => t.estatus === 'Nuevo').length,
      ticketsAsignados: tickets.filter(t => t.estatus === 'Asignado').length,
      ticketsEnProceso: tickets.filter(t => t.estatus === 'En proceso').length,
      ticketsResueltos: tickets.filter(t => t.estatus === 'Resuelto').length,
      ticketsCerrados: tickets.filter(t => t.estatus === 'Cerrado').length,
      ticketsCancelados: tickets.filter(t => t.estatus === 'Cancelado').length,
      ticketsPendientes: tickets.filter(t => 
        ['Nuevo', 'Asignado', 'En proceso'].includes(t.estatus)
      ).length,
      ticketsVencidos: tickets.filter(t => t.vencido).length,
      ticketsPorPrioridad: {
        Critica: tickets.filter(t => t.prioridad === 'Critica').length,
        Alta: tickets.filter(t => t.prioridad === 'Alta').length,
        Mediana: tickets.filter(t => t.prioridad === 'Mediana').length,
        Baja: tickets.filter(t => t.prioridad === 'baja').length
      },
      ticketsEvaluados: tickets.filter(t => t.evaluado).length,
      ticketsSinEvaluar: tickets.filter(t => 
        (t.estatus === 'Resuelto' || t.estatus === 'Cerrado') && !t.evaluado
      ).length,
      promedioCalificacion: this.calcularPromedioCalificacion(tickets)
    };
  }

  private calcularPromedioCalificacion(tickets: UserTicketView[]): number {
    const ticketsEvaluados = tickets.filter(t => t.evaluacion?.calificacion);
    if (ticketsEvaluados.length === 0) return 0;
    
    const suma = ticketsEvaluados.reduce((total, ticket) => {
      return total + (ticket.evaluacion?.calificacion || 0);
    }, 0);
    
    return Math.round((suma / ticketsEvaluados.length) * 10) / 10; 
  }

  async evaluarTicket(ticketId: string, userId: string, evaluacionData: any): Promise<boolean> {
    try {
      const docRef = doc(this.firestore, `${environment.collections.tickets}`, ticketId);
      const ticketDoc = await getDoc(docRef);
      
      if (!ticketDoc.exists()) {
        throw new Error('Ticket no encontrado');
      }
      
      const ticketData = ticketDoc.data();
      
      if (ticketData['creadoPor']?.id !== userId) {
        throw new Error('No tienes permiso para evaluar este ticket');
      }
      
      if (!['Resuelto', 'Cerrado'].includes(ticketData['estatus'])) {
        throw new Error('Solo se pueden evaluar tickets resueltos o cerrados');
      }

      if (ticketData['evaluado']) {
        throw new Error('Este ticket ya ha sido evaluado');
      }

      const evaluacionCompleta = {
        ...evaluacionData,
        fechaEvaluacion: new Date(),
        evaluadoPor: {
          id: userId,
          nombre: ticketData['creadoPor']?.nombre || 'Usuario'
        }
      };

      await updateDoc(docRef, {
        evaluacion: evaluacionCompleta,
        evaluado: true
      });
      
      return true;
    } catch (error) {
      console.error('Error al evaluar ticket:', error);
      throw error;
    }
  }
}