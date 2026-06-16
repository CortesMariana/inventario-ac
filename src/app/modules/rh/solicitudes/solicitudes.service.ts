import { Injectable } from '@angular/core';
import { collection, Firestore, addDoc, doc, updateDoc, getDoc, getDocs, query, where } from '@angular/fire/firestore';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import { from, Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';
import { environment } from 'src/environments/environment';
import { UserSolicitudView, UserSolicitudDetail } from './models/user-solicitud.model';

@Injectable({
  providedIn: 'root'
})
export class SolicitudesService {

  constructor(
    private firestore: Firestore,
    private storage: Storage
  ) { }

  getUserSolicitudes(userId: string): Observable<UserSolicitudView[]> {
    return from(
      getDocs(
        query(
          collection(this.firestore, environment.collections.solicitudes_rh),
          where('creadoPor.id', '==', userId)
        )
      )
    ).pipe(
      map(querySnapshot => {
        const solicitudes: UserSolicitudView[] = [];
        
        querySnapshot.forEach(doc => {
          const data = doc.data();
          solicitudes.push(this.processSolicitudForView({
            firestoreId: doc.id,
            ...data
          }));
        });
        
        return solicitudes.sort((a, b) => {
          const dateA = this.convertToDate(a.fechaCreacion);
          const dateB = this.convertToDate(b.fechaCreacion);
          return dateB.getTime() - dateA.getTime();
        });
      }),
      catchError(error => {
        console.error('Error al cargar solicitudes:', error);
        throw error;
      })
    );
  }

  getUserSolicitudDetail(solicitudId: string, userId: string): Observable<UserSolicitudDetail | null> {
    return from(
      getDocs(
        query(
          collection(this.firestore, environment.collections.solicitudes_rh),
          where('__name__', '==', solicitudId),
          where('creadoPor.id', '==', userId)
        )
      )
    ).pipe(
      map(querySnapshot => {
        if (querySnapshot.empty) return null;
        
        const doc = querySnapshot.docs[0];
        const data = doc.data();
        
        return this.processSolicitudForDetail({
          firestoreId: doc.id,
          ...data
        });
      })
    );
  }

  getAllSolicitudes(): Promise<any[]> {
    const collectionRef = collection(this.firestore, environment.collections.solicitudes_rh);
    return new Promise((resolve, reject) => {
      getDocs(collectionRef)
        .then(querySnapshot => {
          const data: any[] = [];
          querySnapshot.forEach(doc => {
            data.push({ firestoreId: doc.id, ...doc.data() });
          });
          resolve(data);
        })
        .catch(error => reject(error));
    });
  }

  getSolicitud(firestoreId: string): Promise<any> {
    const docRef = doc(this.firestore, environment.collections.solicitudes_rh, firestoreId);
    return getDoc(docRef).then(docSnapshot => {
      if (docSnapshot.exists()) {
        return { firestoreId: docSnapshot.id, ...docSnapshot.data() };
      }
      throw new Error('Solicitud no encontrada');
    });
  }

  async addSolicitud(solicitud: any): Promise<string> {
    try {
      const fecha = new Date();
      const año = fecha.getFullYear().toString().slice(-2);
      const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
      const folio = `RH-${año}${mes}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      
      const solicitudConFolio = {
        ...solicitud,
        folio,
        fechaCreacion: new Date()
      };
      
      const collectionRef = collection(this.firestore, environment.collections.solicitudes_rh);
      const docRef = await addDoc(collectionRef, solicitudConFolio);
      
      return docRef.id;
    } catch (error) {
      console.error('Error al crear solicitud:', error);
      throw error;
    }
  }

  updateSolicitud(firestoreId: string, data: any): Promise<void> {
    const docRef = doc(this.firestore, environment.collections.solicitudes_rh, firestoreId);
    return updateDoc(docRef, { ...data, fechaModificacion: new Date() });
  }

  async uploadDocument(file: File, solicitudId: string): Promise<string> {
    const path = `rh/solicitudes/${solicitudId}/documentos/${Date.now()}_${file.name}`;
    const storageRef = ref(this.storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    return getDownloadURL(snapshot.ref);
  }

  async addDocumentToSolicitud(solicitudId: string, documentData: any): Promise<void> {
    const docRef = doc(this.firestore, environment.collections.solicitudes_rh, solicitudId);
    const solicitudDoc = await getDoc(docRef);
    
    if (solicitudDoc.exists()) {
      const data = solicitudDoc.data();
      const documentos = data['documentos'] || [];
      
      documentos.push({
        id: uuidv4(),
        ...documentData,
        fecha: new Date()
      });
      
      return updateDoc(docRef, { documentos });
    }
    throw new Error('Solicitud no encontrada');
  }

  private processSolicitudForView(solicitud: any): UserSolicitudView {
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
    
    const tieneFechas = solicitud.detalles?.fechaInicio || solicitud.detalles?.fechaFin;
    let fechaInicio, fechaFin;
    
    if (tieneFechas) {
      fechaInicio = solicitud.detalles.fechaInicio ? 
        this.formatFecha(this.convertToDate(solicitud.detalles.fechaInicio)) : undefined;
      fechaFin = solicitud.detalles.fechaFin ? 
        this.formatFecha(this.convertToDate(solicitud.detalles.fechaFin)) : undefined;
    }
    
    return {
      firestoreId: solicitud.firestoreId,
      folio: solicitud.folio || `SOL-${solicitud.firestoreId.substring(0, 8).toUpperCase()}`,
      titulo: solicitud.titulo || 'Sin título',
      descripcion: solicitud.descripcion || '',
      tipoSolicitud: solicitud.tipoSolicitud,
      tipoSolicitudLabel: tiposLabel[solicitud.tipoSolicitud] || solicitud.tipoSolicitud,
      prioridad: solicitud.prioridad,
      estatus: solicitud.estatus || 'Nueva',
      creadoPor: solicitud.creadoPor || { id: '', nombre: '' },
      fechaCreacion: solicitud.fechaCreacion,
      fechaCreacionFormatted: this.formatFecha(fechaCreacion),
      colorPrioridad: this.getColorPrioridad(solicitud.prioridad),
      iconoTipo: this.getIconoTipo(solicitud.tipoSolicitud),
      estatusColor: this.getEstatusColor(solicitud.estatus),
      estatusIcon: this.getEstatusIcon(solicitud.estatus),
      tieneFechas,
      fechaInicio,
      fechaFin,
      diasSolicitados: solicitud.detalles?.diasSolicitados,
      montoSolicitado: solicitud.detalles?.montoSolicitado,
      diasTranscurridos,
      enTiempo: diasTranscurridos < 30 
    };
  }

  private processSolicitudForDetail(solicitud: any): UserSolicitudDetail {
    const basicInfo = this.processSolicitudForView(solicitud);
    
    let fechaIngreso;
    if (solicitud.empleado?.fechaIngreso) {
      fechaIngreso = this.formatFecha(this.convertToDate(solicitud.empleado.fechaIngreso));
    }
    
    return {
      ...basicInfo,
      empleado: {
        ...solicitud.empleado,
        fechaIngreso
      },
      detalles: solicitud.detalles || {},
      fechasEstatus: solicitud.fechasEstatus || {},
      documentos: solicitud.documentos || [],
      comentarios: solicitud.comentarios || [],
      aprobadoPor: solicitud.aprobadoPor,
      rechazadoPor: solicitud.rechazadoPor,
      fechaModificacion: solicitud.fechaModificacion
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

  getUserStats(solicitudes: UserSolicitudView[]): any {
    return {
      total: solicitudes.length,
      nuevas: solicitudes.filter(s => s.estatus === 'Nueva').length,
      enRevision: solicitudes.filter(s => s.estatus === 'En revision').length,
      aprobadas: solicitudes.filter(s => s.estatus === 'Aprobada').length,
      rechazadas: solicitudes.filter(s => s.estatus === 'Rechazada').length,
      completadas: solicitudes.filter(s => s.estatus === 'Completada').length,
      canceladas: solicitudes.filter(s => s.estatus === 'Cancelada').length,
      pendientes: solicitudes.filter(s => ['Nueva', 'En revision'].includes(s.estatus)).length,
      porTipo: {
        vacaciones: solicitudes.filter(s => s.tipoSolicitud === 'vacaciones').length,
        permiso: solicitudes.filter(s => s.tipoSolicitud === 'permiso').length,
        prestamo: solicitudes.filter(s => s.tipoSolicitud === 'prestamo').length
      }
    };
  }
}