import { Injectable } from '@angular/core';
import { collection, Firestore, getDocs, query, where, orderBy, doc, getDoc, updateDoc, addDoc } from '@angular/fire/firestore';
import { environment } from 'src/environments/environment';
import { UserService } from 'src/app/shared/service/user.service';
import { v4 as uuidv4 } from 'uuid';

export interface SolicitudTecnicoView {
  firestoreId: string;
  folio: string;
  titulo: string;
  tipoSolicitud: string;
  tipoSolicitudLabel: string;
  prioridad: string;
  estatus: string;
  
  empleado: {
    id: string;
    nombre: string;
    numeroEmpleado: string;
    puesto: string;
  };
  
  fechas: {
    creacion: Date;
    asignacion?: Date;
    limite?: Date;
  };
  
  fechasFormatted: {
    creacion: string;
    asignacion?: string;
  };
  
  colorPrioridad: string;
  iconoTipo: string;
  estatusColor: string;
  estatusIcon: string;
  
  diasTranscurridos: number;
  requiereAccion: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SolicitudesAsignadasService {

  constructor(
    private firestore: Firestore,
    private userSrv: UserService
  ) {}

  async getSolicitudesAsignadas(tecnicoId: string): Promise<SolicitudTecnicoView[]> {
    try {
      const collectionRef = collection(this.firestore, environment.collections.solicitudes_rh);
      
      const q = query(
        collectionRef, 
        where('asignadoA.id', '==', tecnicoId),
        orderBy('fechaCreacion', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const solicitudes: SolicitudTecnicoView[] = [];
      
      querySnapshot.forEach(doc => {
        const data = doc.data();
        solicitudes.push(this.processSolicitudForTecnico({
          firestoreId: doc.id,
          ...data
        }));
      });
      
      return solicitudes;
    } catch (error) {
      console.error('Error al cargar solicitudes asignadas:', error);
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

  async actualizarEstatus(firestoreId: string, nuevoEstatus: string, comentario?: string): Promise<void> {
    try {
      const docRef = doc(this.firestore, environment.collections.solicitudes_rh, firestoreId);
      const usuario = await this.userSrv.consultarEmpleado().toPromise();
      
      const updateData: any = {
        estatus: nuevoEstatus,
        fechaModificacion: new Date()
      };
      
      const historialEntry = {
        id: uuidv4(),
        accion: 'cambio_estatus',
        estatusAnterior: (await this.getSolicitudDetail(firestoreId)).estatus,
        estatusNuevo: nuevoEstatus,
        fecha: new Date(),
        usuario: usuario ? {
          id: usuario.id,
          nombre: usuario.nombreCompleto || usuario.nombre
        } : null,
        comentario
      };
      
      updateData.historial = updateData.historial || [];
      updateData.historial.push(historialEntry);
      
      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('Error al actualizar estatus:', error);
      throw error;
    }
  }

  async agregarComentario(firestoreId: string, texto: string): Promise<void> {
    try {
      const docRef = doc(this.firestore, environment.collections.solicitudes_rh, firestoreId);
      const usuario = await this.userSrv.consultarEmpleado().toPromise();
      
      const comentario = {
        id: uuidv4(),
        texto,
        usuarioId: usuario?.id,
        usuarioNombre: usuario?.nombreCompleto || usuario?.nombre || 'Técnico',
        fecha: new Date(),
        tipo: 'tecnico'
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

  async completarSolicitud(firestoreId: string, comentario?: string): Promise<void> {
    await this.actualizarEstatus(firestoreId, 'Completada', comentario);
  }

  private processSolicitudForTecnico(solicitud: any): SolicitudTecnicoView {
    const fechaCreacion = this.convertToDate(solicitud.fechaCreacion);
    const hoy = new Date();
    
    const diffTime = hoy.getTime() - fechaCreacion.getTime();
    const diasTranscurridos = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const tiposLabel: Record<string, string> = {
      'vacaciones': 'Vacaciones',
      'permiso': 'Permiso',
      'incapacidad': 'Incapacidad',
      'prestamo': 'Préstamo',
      'constancia': 'Constancia',
      'cambio-datos': 'Cambio de datos',
      'otro': 'Otro'
    };
    
    const requiereAccion = ['Nueva', 'En revision'].includes(solicitud.estatus);
    
    return {
      firestoreId: solicitud.firestoreId,
      folio: solicitud.folio || `SOL-${solicitud.firestoreId.substring(0, 8)}`,
      titulo: solicitud.titulo || 'Sin título',
      tipoSolicitud: solicitud.tipoSolicitud,
      tipoSolicitudLabel: tiposLabel[solicitud.tipoSolicitud] || solicitud.tipoSolicitud,
      prioridad: solicitud.prioridad || 'media',
      estatus: solicitud.estatus || 'Nueva',
      
      empleado: {
        id: solicitud.empleado?.id || '',
        nombre: solicitud.empleado?.nombre || 'No especificado',
        numeroEmpleado: solicitud.empleado?.numeroEmpleado || '',
        puesto: solicitud.empleado?.puesto || 'No especificado'
      },
      
      fechas: {
        creacion: fechaCreacion,
        asignacion: solicitud.fechaAsignacion ? this.convertToDate(solicitud.fechaAsignacion) : undefined
      },
      
      fechasFormatted: {
        creacion: this.formatFecha(fechaCreacion),
        asignacion: solicitud.fechaAsignacion ? this.formatFecha(this.convertToDate(solicitud.fechaAsignacion)) : undefined
      },
      
      colorPrioridad: this.getColorPrioridad(solicitud.prioridad),
      iconoTipo: this.getIconoTipo(solicitud.tipoSolicitud),
      estatusColor: this.getEstatusColor(solicitud.estatus),
      estatusIcon: this.getEstatusIcon(solicitud.estatus),
      
      diasTranscurridos,
      requiereAccion
    };
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