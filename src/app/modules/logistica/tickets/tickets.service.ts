import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  doc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
} from '@angular/fire/firestore';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import { v4 as uuidv4 } from 'uuid';
import { environment } from 'src/environments/environment';
import {
  TicketLogistica,
  TipoTicketLogistica,
  LineaInsumoTicket,
  MovimientoTicketLogistica,
  DocumentoReparacion,
  DocumentoCotizacion,
} from './models/ticket-logistica.model';
import {HttpClient, HttpHeaders} from "@angular/common/http";
import {OAuthService} from "angular-oauth2-oidc";
import {NotificacionResponsableIsnumoModel} from "./models/notificacion-responsable-isnumo.model";

const COLLECTION = environment.collections.tickets_logistica;

@Injectable({
  providedIn: 'root',
})
export class TicketsLogisticaService {
  private readonly col = collection(this.firestore, COLLECTION);

    token : string = '';

  constructor(
    private firestore: Firestore,
    private storage: Storage,
    private http : HttpClient,
    private oauthService: OAuthService,
  ) {
      this.token = this.oauthService.getAccessToken();
  }


  async getAllTickets(): Promise<TicketLogistica[]> {
    const q = query(this.col, orderBy('fechaCreacion', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ firestoreId: d.id, ...(d.data() as TicketLogistica) }));
  }

  async getTicketsByUsuario(usuarioId: string): Promise<TicketLogistica[]> {
    const q = query(
      this.col,
      where('solicitante.id', '==', usuarioId),
    );
    const snap = await getDocs(q);
    const tickets = snap.docs.map(d => ({ firestoreId: d.id, ...(d.data() as TicketLogistica) }));
    return tickets.sort((a, b) => {
      const fa = this.getFecha(a.fechaCreacion)?.getTime() ?? 0;
      const fb = this.getFecha(b.fechaCreacion)?.getTime() ?? 0;
      return fb - fa;
    });
  }

  async getTicketsByTipo(tipo: TipoTicketLogistica): Promise<TicketLogistica[]> {
    const q = query(
      this.col,
      where('tipoTicket', '==', tipo),
      orderBy('fechaCreacion', 'desc'),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ firestoreId: d.id, ...(d.data() as TicketLogistica) }));
  }

  async getTicket(firestoreId: string): Promise<TicketLogistica | null> {
    const docRef = doc(this.firestore, COLLECTION, firestoreId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { firestoreId: snap.id, ...(snap.data() as TicketLogistica) };
  }


  async createTicketProducto(
    lineas: LineaInsumoTicket[],
    justificacion: string,
    solicitante: { id: string; nombre: string },
    vehiculo: { vehiculoId: string; placas: string },
  ): Promise<string> {
    if (!solicitante?.id?.trim() || !solicitante?.nombre?.trim()) {
      throw new Error('No se pudo identificar al solicitante. Recarga la página e intenta de nuevo.');
    }
    const ahora = new Date();
    const folio = await this.generateFolio('INS');

    const movimiento: MovimientoTicketLogistica = {
      id: uuidv4(),
      tipoMovimiento: 'CREACION',
      fechaMovimiento: ahora,
      usuarioId: solicitante.id,
      usuarioNombre: solicitante.nombre,
      observaciones: 'Solicitud de insumos creada',
    };

    const ticket: Omit<TicketLogistica, 'firestoreId'> = {
      folio,
      tipoTicket: 'PRODUCTO',
      estado: 'PENDIENTE',
      solicitante,
      justificacion,
      vehiculoId: vehiculo.vehiculoId,
      placas: vehiculo.placas,
      lineas,
      totalEstimado: lineas.reduce((acc, l) => acc + l.subtotal, 0),
      historial: [movimiento],
      fechaCreacion: ahora,
      fechaModificacion: ahora,
    };

    const docRef = await addDoc(this.col, ticket);
    return docRef.id;
  }


  async createTicketReparacion(data: {
    vehiculoId: string;
    placas: string;
    tipoReparacion: string;
    justificacion: string;
    solicitante: { id: string; nombre: string };
  }): Promise<string> {
    if (!data.solicitante?.id?.trim() || !data.solicitante?.nombre?.trim()) {
      throw new Error('No se pudo identificar al solicitante. Recarga la página e intenta de nuevo.');
    }
    const ahora = new Date();
    const folio = await this.generateFolio('REP');

    const movimiento: MovimientoTicketLogistica = {
      id: uuidv4(),
      tipoMovimiento: 'CREACION',
      fechaMovimiento: ahora,
      usuarioId: data.solicitante.id,
      usuarioNombre: data.solicitante.nombre,
      observaciones: 'Solicitud de reparación creada',
    };

    const ticket: Omit<TicketLogistica, 'firestoreId'> = {
      folio,
      tipoTicket: 'REPARACION',
      estado: 'PENDIENTE',
      solicitante: data.solicitante,
      justificacion: data.justificacion,
      vehiculoId: data.vehiculoId,
      placas: data.placas,
      tipoReparacion: data.tipoReparacion,
      documentos: [],
      historial: [movimiento],
      fechaCreacion: ahora,
      fechaModificacion: ahora,
    };

    const docRef = await addDoc(this.col, ticket);
    return docRef.id;
  }

  // ── Flujo PRODUCTO: Autorizar / Rechazar / Completar ─────────────────────

  async autorizarProducto(
    firestoreId: string,
    autorizador: { id: string; nombre: string },
    observaciones?: string,
  ): Promise<void> {
    const ticket = await this._getOrThrow(firestoreId);
    if (ticket.estado !== 'PENDIENTE') throw new Error('El ticket no está PENDIENTE');

    const ahora = new Date();
    const mov = this._movimiento('AUTORIZACION', autorizador, observaciones || 'Solicitud autorizada');
    const docRef = doc(this.firestore, COLLECTION, firestoreId);
    await updateDoc(docRef, {
      estado: 'AUTORIZADO',
      autorizador,
      fechaAutorizacion: ahora,
      fechaModificacion: ahora,
      historial: [...(ticket.historial || []), mov],
    });
  }

    mandarNotificacionResponsableCompletarInsumo(body : NotificacionResponsableIsnumoModel){
        const headers = new HttpHeaders().set('Authorization', `Bearer ${this.token}`);
        let url = `${environment.api}Tickets/EnviarNotificacionAutorizacionInsumo`;
        return this.http.post(url,body, { headers: headers });
    }

    mandarNotificacionResponsableCompletarReparacion(body: NotificacionResponsableIsnumoModel) {
        const headers = new HttpHeaders().set('Authorization', `Bearer ${this.token}`);
        const url = `${environment.api}Tickets/EnviarNotificacionAutorizacionReparacion`;
        return this.http.post(url, body, { headers: headers });
    }

    mandarNotificacionAutorizadorGasolina(body: NotificacionResponsableIsnumoModel) {
        const headers = new HttpHeaders().set('Authorization', `Bearer ${this.token}`);
        const url = `${environment.api}Tickets/EnviarNotificacionAutorizacionGasolina`;
        return this.http.post(url, body, { headers: headers });
    }

  async rechazarProducto(
    firestoreId: string,
    autorizador: { id: string; nombre: string },
    motivoRechazo: string,
  ): Promise<void> {
    const ticket = await this._getOrThrow(firestoreId);
    if (ticket.estado !== 'PENDIENTE') throw new Error('El ticket no está PENDIENTE');

    const ahora = new Date();
    const mov = this._movimiento('RECHAZO', autorizador, motivoRechazo);
    const docRef = doc(this.firestore, COLLECTION, firestoreId);
    await updateDoc(docRef, {
      estado: 'RECHAZADO',
      autorizador,
      motivoRechazo,
      fechaRechazo: ahora,
      fechaModificacion: ahora,
      historial: [...(ticket.historial || []), mov],
    });
  }

  async completarProducto(
    firestoreId: string,
    operador: { id: string; nombre: string },
    observaciones?: string,
    archivos?: File[],
  ): Promise<void> {
    const ticket = await this._getOrThrow(firestoreId);
    if (ticket.estado !== 'AUTORIZADO') throw new Error('El ticket debe estar AUTORIZADO');

    const documentosCompletar = await this._subirDocumentosCompletar(firestoreId, archivos, operador.nombre);

    const ahora = new Date();
    const mov = this._movimiento('COMPLETADO', operador, observaciones || 'Insumos entregados');
    const docRef = doc(this.firestore, COLLECTION, firestoreId);
    await updateDoc(docRef, {
      estado: 'COMPLETADO',
      operador,
      observacionesCompletado: observaciones || '',
      ...(documentosCompletar.length > 0 && { documentosCompletar }),
      fechaCompletado: ahora,
      fechaModificacion: ahora,
      historial: [...(ticket.historial || []), mov],
    });
  }

  // ── Flujo REPARACION: Cotización / Completar / Rechazar ──────────────────

  async iniciarCotizacion(
    firestoreId: string,
    responsable: { id: string; nombre: string },
    observaciones?: string,
  ): Promise<void> {
    const ticket = await this._getOrThrow(firestoreId);
    if (ticket.estado !== 'PENDIENTE') throw new Error('El ticket no está PENDIENTE');

    const ahora = new Date();
    const mov = this._movimiento('INICIO_COTIZACION', responsable, observaciones || 'Se inició la cotización de la reparación');
    const docRef = doc(this.firestore, COLLECTION, firestoreId);
    await updateDoc(docRef, {
      estado: 'EN_COTIZACION',
      responsableReparacion: responsable,
      fechaInicioCotizacion: ahora,
      fechaModificacion: ahora,
      historial: [...(ticket.historial || []), mov],
    });
  }

  async registrarCotizacion(
    firestoreId: string,
    responsable: { id: string; nombre: string },
    monto: number,
    datos: {
      observaciones?: string;
      nombreTaller?: string;
      ubicacionTaller?: string;
      fechaEntradaTaller?: Date;
      fechaSalidaEstimada?: Date;
    },
    archivos?: File[],
  ): Promise<void> {
    const ticket = await this._getOrThrow(firestoreId);
    if (ticket.estado !== 'EN_COTIZACION') throw new Error('El ticket no está EN_COTIZACION');

    const ahora = new Date();

    const documentosCotizacion: DocumentoCotizacion[] = [];
    if (archivos && archivos.length > 0) {
      for (const archivo of archivos) {
        const path = `tickets-logistica/${firestoreId}/cotizacion/${Date.now()}_${archivo.name}`;
        const storageRef = ref(this.storage, path);
        const snapshot = await uploadBytes(storageRef, archivo);
        const url = await getDownloadURL(snapshot.ref);
        documentosCotizacion.push({
          id: uuidv4(),
          nombre: archivo.name,
          url,
          tipo: archivo.type,
          fechaSubida: ahora,
          subidoPor: responsable.nombre,
        });
      }
    }

    const obs = datos.observaciones || `Cotización registrada: $${monto.toLocaleString('es-MX')}`;
    const mov = this._movimiento('COTIZACION_LISTA', responsable, obs);

    const updateData: any = {
      estado: 'COTIZACION_LISTA',
      montoReparacion: monto,
      fechaCotizacionLista: ahora,
      fechaModificacion: ahora,
      historial: [...(ticket.historial || []), mov],
    };

    if (datos.nombreTaller)        updateData['nombreTaller']        = datos.nombreTaller;
    if (datos.ubicacionTaller)     updateData['ubicacionTaller']     = datos.ubicacionTaller;
    if (datos.fechaEntradaTaller)  updateData['fechaEntradaTaller']  = datos.fechaEntradaTaller;
    if (datos.fechaSalidaEstimada) updateData['fechaSalidaEstimada'] = datos.fechaSalidaEstimada;
    if (documentosCotizacion.length > 0) {
      updateData['documentosCotizacion'] = [
        ...(ticket.documentosCotizacion || []),
        ...documentosCotizacion,
      ];
    }

    const docRef = doc(this.firestore, COLLECTION, firestoreId);
    await updateDoc(docRef, updateData);
  }

  async completarReparacion(
    firestoreId: string,
    responsable: { id: string; nombre: string },
    observaciones?: string,
    archivos?: File[],
  ): Promise<void> {
    const ticket = await this._getOrThrow(firestoreId);
    if (!['COTIZACION_LISTA', 'EN_COTIZACION', 'PENDIENTE'].includes(ticket.estado)) {
      throw new Error('Estado inválido para completar');
    }

    const documentosCompletar = await this._subirDocumentosCompletar(firestoreId, archivos, responsable.nombre);

    const ahora = new Date();
    const mov = this._movimiento('COMPLETADO', responsable, observaciones || 'Reparación completada');
    const docRef = doc(this.firestore, COLLECTION, firestoreId);
    await updateDoc(docRef, {
      estado: 'COMPLETADO',
      responsableReparacion: ticket.responsableReparacion || responsable,
      observacionesCompletado: observaciones || '',
      ...(documentosCompletar.length > 0 && { documentosCompletar }),
      fechaCompletado: ahora,
      fechaModificacion: ahora,
      historial: [...(ticket.historial || []), mov],
    });
  }

  async rechazarReparacion(
    firestoreId: string,
    responsable: { id: string; nombre: string },
    motivoRechazo: string,
  ): Promise<void> {
    const ticket = await this._getOrThrow(firestoreId);

    const ahora = new Date();
    const mov = this._movimiento('RECHAZO', responsable, motivoRechazo);
    const docRef = doc(this.firestore, COLLECTION, firestoreId);
    await updateDoc(docRef, {
      estado: 'RECHAZADO',
      motivoRechazo,
      fechaRechazo: ahora,
      fechaModificacion: ahora,
      historial: [...(ticket.historial || []), mov],
    });
  }


  async subirDocumento(
    firestoreId: string,
    archivo: File,
    usuario: { id: string; nombre: string },
  ): Promise<DocumentoReparacion> {
    const ticket = await this._getOrThrow(firestoreId);
    const ahora = new Date();
    const path = `tickets-logistica/${firestoreId}/documentos/${Date.now()}_${archivo.name}`;
    const storageRef = ref(this.storage, path);
    const snapshot = await uploadBytes(storageRef, archivo);
    const url = await getDownloadURL(snapshot.ref);

    const nuevoDoc: DocumentoReparacion = {
      id: uuidv4(),
      nombre: archivo.name,
      url,
      tipo: archivo.type,
      fechaSubida: ahora,
    };

    const documentosActuales = ticket.documentos || [];
    const docRef = doc(this.firestore, COLLECTION, firestoreId);
    await updateDoc(docRef, {
      documentos: [...documentosActuales, nuevoDoc],
      fechaModificacion: ahora,
    });

    return nuevoDoc;
  }


  private async _subirDocumentosCompletar(
    firestoreId: string,
    archivos: File[] | undefined,
    subidoPor: string,
  ): Promise<DocumentoCotizacion[]> {
    if (!archivos || archivos.length === 0) return [];
    const results: DocumentoCotizacion[] = [];
    for (const archivo of archivos) {
      const path = `tickets-logistica/${firestoreId}/completar/${Date.now()}_${archivo.name}`;
      const storageRef = ref(this.storage, path);
      const snap = await uploadBytes(storageRef, archivo);
      const url  = await getDownloadURL(snap.ref);
      results.push({
        id:          uuidv4(),
        nombre:      archivo.name,
        url,
        tipo:        archivo.type,
        fechaSubida: new Date(),
        subidoPor,
      });
    }
    return results;
  }

  private async _getOrThrow(firestoreId: string): Promise<TicketLogistica> {
    const ticket = await this.getTicket(firestoreId);
    if (!ticket) throw new Error('Ticket no encontrado');
    return ticket;
  }

  private _movimiento(
    tipo: MovimientoTicketLogistica['tipoMovimiento'],
    usuario: { id: string; nombre: string },
    observaciones: string,
  ): MovimientoTicketLogistica {
    return {
      id: uuidv4(),
      tipoMovimiento: tipo,
      fechaMovimiento: new Date(),
      usuarioId: usuario.id,
      usuarioNombre: usuario.nombre,
      observaciones,
    };
  }

  // ── Flujo GASOLINA: Crear / Autorizar / Rechazar ─────────────────────────

  async createTicketGasolina(data: {
    vehiculoId: string;
    placas: string;
    litrosSolicitados: number;
    justificacion: string;
    solicitante: { id: string; nombre: string };
    estacion?: string;
    fechaCargaEstimada?: Date;
    archivos?: File[];
  }): Promise<string> {
    if (!data.solicitante?.id?.trim() || !data.solicitante?.nombre?.trim()) {
      throw new Error('No se pudo identificar al solicitante. Recarga la página e intenta de nuevo.');
    }
    const ahora = new Date();
    const folio = await this.generateFolio('GAS');

    const movimiento: MovimientoTicketLogistica = {
      id: uuidv4(),
      tipoMovimiento: 'CREACION',
      fechaMovimiento: ahora,
      usuarioId: data.solicitante.id,
      usuarioNombre: data.solicitante.nombre,
      observaciones: `Solicitud de ${data.litrosSolicitados} litros de gasolina`,
    };

    const ticket: Omit<TicketLogistica, 'firestoreId'> = {
      folio,
      tipoTicket: 'GASOLINA',
      estado: 'PENDIENTE',
      solicitante: data.solicitante,
      justificacion: data.justificacion,
      vehiculoId: data.vehiculoId,
      placas: data.placas,
      litrosSolicitados: data.litrosSolicitados,
      ...(data.estacion && { estacion: data.estacion }),
      ...(data.fechaCargaEstimada && { fechaCargaEstimada: data.fechaCargaEstimada }),
      historial: [movimiento],
      fechaCreacion: ahora,
      fechaModificacion: ahora,
    };

    const docRef = await addDoc(this.col, ticket);

    if (data.archivos && data.archivos.length > 0) {
      const documentos = await this._subirDocumentosCompletar(docRef.id, data.archivos, data.solicitante.nombre);
      await updateDoc(docRef, { documentos });
    }

    return docRef.id;
  }

  async autorizarGasolina(
    firestoreId: string,
    autorizador: { id: string; nombre: string },
    litrosAutorizados: number,
    datos: {
      montoDepositado?: number;
      observaciones?: string;
    },
    archivos?: File[],
  ): Promise<void> {
    const ticket = await this._getOrThrow(firestoreId);
    if (ticket.estado !== 'PENDIENTE') throw new Error('El ticket no está PENDIENTE');

    const documentosCompletar = await this._subirDocumentosCompletar(firestoreId, archivos, autorizador.nombre);

    const obs = datos.observaciones
      || `Autorizado: ${litrosAutorizados} L${datos.montoDepositado ? ` — $${datos.montoDepositado.toLocaleString('es-MX')} depositados` : ''}`;

    const ahora = new Date();
    const mov = this._movimiento('COMPLETADO', autorizador, obs);
    const docRef = doc(this.firestore, COLLECTION, firestoreId);

    await updateDoc(docRef, {
      estado: 'COMPLETADO',
      autorizador,
      litrosAutorizados,
      ...(datos.montoDepositado != null && { montoDepositado: datos.montoDepositado }),
      observacionesCompletado: datos.observaciones || '',
      ...(documentosCompletar.length > 0 && { documentosCompletar }),
      fechaAutorizacion: ahora,
      fechaCompletado: ahora,
      fechaModificacion: ahora,
      historial: [...(ticket.historial || []), mov],
    });
  }

  async rechazarGasolina(
    firestoreId: string,
    autorizador: { id: string; nombre: string },
    motivoRechazo: string,
  ): Promise<void> {
    const ticket = await this._getOrThrow(firestoreId);
    if (ticket.estado !== 'PENDIENTE') throw new Error('El ticket no está PENDIENTE');

    const ahora = new Date();
    const mov = this._movimiento('RECHAZO', autorizador, motivoRechazo);
    const docRef = doc(this.firestore, COLLECTION, firestoreId);
    await updateDoc(docRef, {
      estado: 'RECHAZADO',
      autorizador,
      motivoRechazo,
      fechaRechazo: ahora,
      fechaModificacion: ahora,
      historial: [...(ticket.historial || []), mov],
    });
  }

  private async generateFolio(prefix: 'INS' | 'REP' | 'GAS'): Promise<string> {
    const now = new Date();
    const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const folioPrefix = `${prefix}-${ym}`;

    const q = query(this.col, where('folio', '>=', folioPrefix));
    const snap = await getDocs(q);

    let max = 0;
    snap.forEach(d => {
      const folio: string = d.data()['folio'] || '';
      if (folio.startsWith(folioPrefix)) {
        const num = parseInt(folio.split('-')[2] || '0', 10);
        if (num > max) max = num;
      }
    });

    return `${folioPrefix}-${String(max + 1).padStart(4, '0')}`;
  }


  getTicketsAsignadosATecnico(tecnicoId: string): Observable<any[]> {
    const q = query(this.col, where('asignadoA.id', '==', tecnicoId));
    return from(getDocs(q)).pipe(
      map(snap =>
        snap.docs.map(d => ({ firestoreId: d.id, ...d.data() }))
          .sort((a: any, b: any) => {
            const da = this.getFecha(a.fechaCreacion)?.getTime() ?? 0;
            const db = this.getFecha(b.fechaCreacion)?.getTime() ?? 0;
            return db - da;
          })
      )
    );
  }

  updateTicket(firestoreId: string, data: any): Promise<void> {
    return updateDoc(doc(this.firestore, COLLECTION, firestoreId), data);
  }

  getFecha(fecha: any): Date | null {
    if (!fecha) return null;
    try {
      if (typeof fecha.toDate === 'function') return fecha.toDate();
      if (fecha instanceof Date) return fecha;
      if (fecha.seconds) return new Date(fecha.seconds * 1000);
      if (typeof fecha === 'string') return new Date(fecha);
    } catch {}
    return null;
  }
}
