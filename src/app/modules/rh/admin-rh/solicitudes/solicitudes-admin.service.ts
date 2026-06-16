import { Injectable } from '@angular/core';
import { collection, Firestore, getDocs, query, where, orderBy, doc, getDoc, updateDoc, addDoc, Timestamp } from '@angular/fire/firestore';
import { environment } from 'src/environments/environment';
import { UserService } from 'src/app/shared/service/user.service';
import { v4 as uuidv4 } from 'uuid';

export interface SolicitudAdminView {
  firestoreId: string;
  folio: string;
  titulo: string;
  descripcion: string;
  tipoSolicitud: string;
  tipoSolicitudLabel: string;
  prioridad: string;
  estatus: string;
  
  empleado: {
    id: string;
    nombre: string;
    numeroEmpleado: string;
    puesto: string;
    departamento: string;
  };
  
  creadoPor: {
    id: string;
    nombre: string;
  };
  
  fechas: {
    creacion: Date;
    limite?: Date;
    ultimaActualizacion?: Date;
  };
  
  fechasFormatted: {
    creacion: string;
    limite?: string;
  };
  
  detalles: any;
  colorPrioridad: string;
  iconoTipo: string;
  estatusColor: string;
  estatusIcon: string;
  
  tiempoTranscurrido: number; 
  tiempoRestante?: number;
  vencido: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SolicitudesAdminService {

  constructor(
    private firestore: Firestore,
    private userSrv: UserService
  ) {}

  async getSolicitudes(filtros?: any): Promise<SolicitudAdminView[]> {
    try {
      const collectionRef = collection(this.firestore, environment.collections.solicitudes_rh);
      let q = query(collectionRef, orderBy('fechaCreacion', 'desc'));
      
      if (filtros) {
        if (filtros.estatus && filtros.estatus !== 'todos') {
          q = query(q, where('estatus', '==', filtros.estatus));
        }
        if (filtros.tipoSolicitud && filtros.tipoSolicitud !== 'todos') {
          q = query(q, where('tipoSolicitud', '==', filtros.tipoSolicitud));
        }
        if (filtros.prioridad && filtros.prioridad !== 'todos') {
          q = query(q, where('prioridad', '==', filtros.prioridad));
        }
      }
      
      const querySnapshot = await getDocs(q);
      const solicitudes: SolicitudAdminView[] = [];
      
      querySnapshot.forEach(doc => {
        const data = doc.data();
        solicitudes.push(this.processSolicitudForAdmin({
          firestoreId: doc.id,
          ...data
        }));
      });
      
      return solicitudes;
    } catch (error) {
      console.error('Error al cargar solicitudes:', error);
      throw error;
    }
  }

  async getSolicitudDetail(firestoreId: string): Promise<any> {
    try {
      const docRef = doc(this.firestore, environment.collections.solicitudes_rh, firestoreId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          firestoreId: docSnap.id,
          ...docSnap.data()
        };
      }
      throw new Error('Solicitud no encontrada');
    } catch (error) {
      console.error('Error al cargar detalle:', error);
      throw error;
    }
  }

  async cambiarEstatus(firestoreId: string, nuevoEstatus: string, comentario?: string): Promise<void> {
    try {
      const docRef = doc(this.firestore, environment.collections.solicitudes_rh, firestoreId);
      const usuario = await this.userSrv.consultarEmpleado().toPromise();
      
      const historialEntry = {
        id: uuidv4(),
        estatusAnterior: (await this.getSolicitudDetail(firestoreId)).estatus,
        estatusNuevo: nuevoEstatus,
        fecha: new Date(),
        usuario: usuario ? {
          id: usuario.id,
          nombre: usuario.nombreCompleto || usuario.nombre
        } : null,
        comentario: comentario
      };
      
      const updateData: any = {
        estatus: nuevoEstatus,
        fechaModificacion: new Date()
      };
      
      const fechaKey = `fechasEstatus.fecha${nuevoEstatus.replace(/\s+/g, '')}`;
      updateData[fechaKey] = new Date();
      
      if (nuevoEstatus === 'Aprobada') {
        updateData.aprobadoPor = {
          id: usuario?.id,
          nombre: usuario?.nombreCompleto || usuario?.nombre,
          fecha: new Date(),
          comentario: comentario
        };
      } else if (nuevoEstatus === 'Rechazada') {
        updateData.rechazadoPor = {
          id: usuario?.id,
          nombre: usuario?.nombreCompleto || usuario?.nombre,
          fecha: new Date(),
          motivo: comentario
        };
      }
      
      updateData.historial = updateData.historial || [];
      updateData.historial.push(historialEntry);
      
      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('Error al cambiar estatus:', error);
      throw error;
    }
  }

  async agregarComentario(firestoreId: string, texto: string, tipo: 'admin' | 'sistema' = 'admin'): Promise<void> {
    try {
      const docRef = doc(this.firestore, environment.collections.solicitudes_rh, firestoreId);
      const usuario = await this.userSrv.consultarEmpleado().toPromise();
      
      const comentario = {
        id: uuidv4(),
        texto,
        usuarioId: usuario?.id,
        usuarioNombre: usuario?.nombreCompleto || usuario?.nombre || 'Administrador',
        fecha: new Date(),
        tipo
      };
      
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const comentarios = data['comentarios'] || [];
        comentarios.push(comentario);
        
        await updateDoc(docRef, {
          comentarios,
          fechaModificacion: new Date()
        });
      }
    } catch (error) {
      console.error('Error al agregar comentario:', error);
      throw error;
    }
  }

  async asignarSolicitud(firestoreId: string, asignadoA: any): Promise<void> {
    try {
      const docRef = doc(this.firestore, environment.collections.solicitudes_rh, firestoreId);
      await updateDoc(docRef, {
        asignadoA: {
          ...asignadoA,
          fechaAsignacion: new Date()
        },
        estatus: 'En revision',
        fechaModificacion: new Date()
      });
    } catch (error) {
      console.error('Error al asignar solicitud:', error);
      throw error;
    }
  }

  async getEstadisticas(): Promise<any> {
    try {
      const solicitudes = await this.getSolicitudes();
      
      const stats = {
        total: solicitudes.length,
        porEstatus: {
          nuevas: solicitudes.filter(s => s.estatus === 'Nueva').length,
          revision: solicitudes.filter(s => s.estatus === 'En revision').length,
          aprobadas: solicitudes.filter(s => s.estatus === 'Aprobada').length,
          rechazadas: solicitudes.filter(s => s.estatus === 'Rechazada').length,
          completadas: solicitudes.filter(s => s.estatus === 'Completada').length,
          canceladas: solicitudes.filter(s => s.estatus === 'Cancelada').length
        },
        porTipo: {
          vacaciones: solicitudes.filter(s => s.tipoSolicitud === 'vacaciones').length,
          permisos: solicitudes.filter(s => s.tipoSolicitud === 'permiso').length,
          prestamos: solicitudes.filter(s => s.tipoSolicitud === 'prestamo').length,
          otros: solicitudes.filter(s => !['vacaciones', 'permiso', 'prestamo'].includes(s.tipoSolicitud)).length
        },
        porPrioridad: {
          urgente: solicitudes.filter(s => s.prioridad === 'urgente').length,
          alta: solicitudes.filter(s => s.prioridad === 'alta').length,
          media: solicitudes.filter(s => s.prioridad === 'media').length,
          baja: solicitudes.filter(s => s.prioridad === 'baja').length
        },
        vencidas: solicitudes.filter(s => s.vencido).length,
        tiempoPromedioResolucion: this.calcularTiempoPromedio(solicitudes),
        solicitudesEsteMes: this.filtrarPorMes(solicitudes, new Date()),
        tendencia: await this.getTendenciaMensual()
      };
      
      return stats;
    } catch (error) {
      console.error('Error al calcular estadísticas:', error);
      throw error;
    }
  }

  async exportarSolicitudes(filtros?: any): Promise<any[]> {
    const solicitudes = await this.getSolicitudes(filtros);
    
    return solicitudes.map(s => ({
      Folio: s.folio,
      Título: s.titulo,
      Tipo: s.tipoSolicitudLabel,
      Estatus: s.estatus,
      Prioridad: s.prioridad,
      Empleado: s.empleado.nombre,
      'No. Empleado': s.empleado.numeroEmpleado,
      Departamento: s.empleado.departamento,
      'Fecha Creación': s.fechasFormatted.creacion,
      'Días Transcurridos': s.tiempoTranscurrido
    }));
  }

  private processSolicitudForAdmin(solicitud: any): SolicitudAdminView {
    const fechaCreacion = this.convertToDate(solicitud.fechaCreacion);
    const hoy = new Date();
    
    const diffTime = hoy.getTime() - fechaCreacion.getTime();
    const tiempoTranscurrido = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const estatusPendientes = ['Nueva', 'En revision'];
    const vencido = estatusPendientes.includes(solicitud.estatus) && tiempoTranscurrido > 30;
    
    const tiposLabel: Record<string, string> = {
      'vacaciones': 'Vacaciones',
      'permiso': 'Permiso',
      'incapacidad': 'Incapacidad',
      'prestamo': 'Préstamo',
      'constancia': 'Constancia',
      'cambio-datos': 'Cambio de datos',
      'otro': 'Otro'
    };
    
    return {
      firestoreId: solicitud.firestoreId,
      folio: solicitud.folio || `SOL-${solicitud.firestoreId.substring(0, 8)}`,
      titulo: solicitud.titulo || 'Sin título',
      descripcion: solicitud.descripcion || '',
      tipoSolicitud: solicitud.tipoSolicitud,
      tipoSolicitudLabel: tiposLabel[solicitud.tipoSolicitud] || solicitud.tipoSolicitud,
      prioridad: solicitud.prioridad || 'media',
      estatus: solicitud.estatus || 'Nueva',
      
      empleado: {
        id: solicitud.empleado?.id || '',
        nombre: solicitud.empleado?.nombre || 'No especificado',
        numeroEmpleado: solicitud.empleado?.numeroEmpleado || '',
        puesto: solicitud.empleado?.puesto || 'No especificado',
        departamento: solicitud.empleado?.departamento || 'No especificado'
      },
      
      creadoPor: {
        id: solicitud.creadoPor?.id || '',
        nombre: solicitud.creadoPor?.nombre || 'Usuario'
      },
      
      fechas: {
        creacion: fechaCreacion,
        ultimaActualizacion: solicitud.fechaModificacion ? this.convertToDate(solicitud.fechaModificacion) : undefined
      },
      
      fechasFormatted: {
        creacion: this.formatFecha(fechaCreacion),
        limite: solicitud.fechaLimite ? this.formatFecha(this.convertToDate(solicitud.fechaLimite)) : undefined
      },
      
      detalles: solicitud.detalles || {},
      
      colorPrioridad: this.getColorPrioridad(solicitud.prioridad),
      iconoTipo: this.getIconoTipo(solicitud.tipoSolicitud),
      estatusColor: this.getEstatusColor(solicitud.estatus),
      estatusIcon: this.getEstatusIcon(solicitud.estatus),
      
      tiempoTranscurrido,
      vencido
    };
  }

  private async getTendenciaMensual(): Promise<any[]> {
    const solicitudes = await this.getSolicitudes();
    const ultimos6Meses: any[] = [];
    
    for (let i = 5; i >= 0; i--) {
      const fecha = new Date();
      fecha.setMonth(fecha.getMonth() - i);
      const mes = fecha.toLocaleString('es-MX', { month: 'short' });
      const año = fecha.getFullYear();
      
      const solicitudesMes = solicitudes.filter(s => {
        const fechaS = s.fechas.creacion;
        return fechaS.getMonth() === fecha.getMonth() && 
               fechaS.getFullYear() === fecha.getFullYear();
      });
      
      ultimos6Meses.push({
        mes: `${mes} ${año}`,
        total: solicitudesMes.length,
        aprobadas: solicitudesMes.filter(s => s.estatus === 'Aprobada').length,
        rechazadas: solicitudesMes.filter(s => s.estatus === 'Rechazada').length
      });
    }
    
    return ultimos6Meses;
  }

  private calcularTiempoPromedio(solicitudes: any[]): number {
    const completadas = solicitudes.filter(s => 
      s.estatus === 'Aprobada' || s.estatus === 'Completada'
    );
    
    if (completadas.length === 0) return 0;
    
    const totalDias = completadas.reduce((sum, s) => sum + s.tiempoTranscurrido, 0);
    return Math.round(totalDias / completadas.length);
  }

  private filtrarPorMes(solicitudes: any[], fecha: Date): number {
    return solicitudes.filter(s => {
      const fechaS = s.fechas.creacion;
      return fechaS.getMonth() === fecha.getMonth() && 
             fechaS.getFullYear() === fecha.getFullYear();
    }).length;
  }

  private convertToDate(fecha: any): Date {
    if (!fecha) return new Date();
    try {
      if (fecha && typeof fecha === 'object' && 'seconds' in fecha) {
        return new Date(fecha.seconds * 1000);
      } else if (fecha && typeof fecha.toDate === 'function') {
        return fecha.toDate();
      } else if (fecha instanceof Date) {
        return fecha;
      } else if (typeof fecha === 'string' || typeof fecha === 'number') {
        return new Date(fecha);
      }
    } catch (error) {
      console.warn('Error convirtiendo fecha:', error);
    }
    return new Date();
  }

  private formatFecha(fecha: Date): string {
    return fecha.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  private getColorPrioridad(prioridad: string): string {
    switch (prioridad) {
      case 'urgente': return '#dc3545';
      case 'alta': return '#fd7e14';
      case 'media': return '#ffc107';
      case 'baja': return '#28a745';
      default: return '#6c757d';
    }
  }

  private getIconoTipo(tipo: string): string {
    switch (tipo) {
      case 'vacaciones': return 'pi pi-sun';
      case 'permiso': return 'pi pi-calendar-plus';
      case 'incapacidad': return 'pi pi-heart';
      case 'prestamo': return 'pi pi-credit-card';
      case 'constancia': return 'pi pi-file-pdf';
      case 'cambio-datos': return 'pi pi-pencil';
      default: return 'pi pi-file';
    }
  }

  private getEstatusColor(estatus: string): string {
    switch (estatus) {
      case 'Nueva': return '#17a2b8';
      case 'En revision': return '#ffc107';
      case 'Aprobada': return '#28a745';
      case 'Rechazada': return '#dc3545';
      case 'Completada': return '#6c757d';
      case 'Cancelada': return '#6c757d';
      default: return '#6c757d';
    }
  }

  private getEstatusIcon(estatus: string): string {
    switch (estatus) {
      case 'Nueva': return 'pi pi-plus-circle';
      case 'En revision': return 'pi pi-hourglass';
      case 'Aprobada': return 'pi pi-check-circle';
      case 'Rechazada': return 'pi pi-times-circle';
      case 'Completada': return 'pi pi-check';
      case 'Cancelada': return 'pi pi-ban';
      default: return 'pi pi-question-circle';
    }
  }
}