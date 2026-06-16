import { Timestamp } from '@angular/fire/firestore';

export type TipoTicketLogistica = 'PRODUCTO' | 'REPARACION' | 'GASOLINA';

// Productos:    PENDIENTE → AUTORIZADO | RECHAZADO → COMPLETADO
// Reparaciones: PENDIENTE → EN_COTIZACION → COTIZACION_LISTA → COMPLETADO | RECHAZADO
export type EstadoTicketLogistica =
  | 'PENDIENTE'
  | 'AUTORIZADO'
  | 'EN_COTIZACION'
  | 'COTIZACION_LISTA'
  | 'COMPLETADO'
  | 'RECHAZADO';

export type TipoMovimientoTicket =
  | 'CREACION'
  | 'AUTORIZACION'
  | 'RECHAZO'
  | 'INICIO_COTIZACION'
  | 'COTIZACION_LISTA'
  | 'COMPLETADO'
  | 'COMENTARIO';

export interface LineaInsumoTicket {
  insumoId: string;
  insumoNombre: string;
  insumoSKU?: string;
  insumoFamilia?: string;
  insumoMarca?: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface DocumentoReparacion {
  id: string;
  nombre: string;
  url: string;
  tipo: string;   // mime type
  fechaSubida: Date | Timestamp;
}

export interface DocumentoCotizacion {
  id: string;
  nombre: string;
  url: string;
  tipo: string;   // mime type
  fechaSubida: Date | Timestamp;
  subidoPor: string; // nombre del usuario
}

export interface MovimientoTicketLogistica {
  id: string;
  tipoMovimiento: TipoMovimientoTicket;
  fechaMovimiento: Date | Timestamp;
  usuarioId: string;
  usuarioNombre: string;
  observaciones?: string;
}

export interface TicketLogistica {
  firestoreId?: string;
  folio?: string;

  tipoTicket: TipoTicketLogistica;
  estado: EstadoTicketLogistica;

  solicitante: {
    id: string;
    nombre: string;
  };

  historial: MovimientoTicketLogistica[];

  justificacion: string;
  motivoRechazo?: string;

  vehiculoId?: string;
  placas?: string;

  observacionesCompletado?: string;
  documentosCompletar?: DocumentoCotizacion[];

  litrosSolicitados?: number;
  litrosAutorizados?: number;
  montoDepositado?: number;
  estacion?: string;
  fechaCargaEstimada?: Date | Timestamp;

  lineas?: LineaInsumoTicket[];
  totalEstimado?: number;

  autorizador?: {
    id: string;
    nombre: string;
  };
  operador?: { // quien marca entregado
    id: string;
    nombre: string;
  };

  tipoReparacion?: string;
  documentos?: DocumentoReparacion[];
  montoReparacion?: number;

  nombreTaller?: string;
  ubicacionTaller?: string;
  fechaEntradaTaller?: Date | Timestamp;
  fechaSalidaEstimada?: Date | Timestamp;
  documentosCotizacion?: DocumentoCotizacion[];

  responsableReparacion?: {
    id: string;
    nombre: string;
  };

  fechaCreacion: Date | Timestamp;
  fechaAutorizacion?: Date | Timestamp;
  fechaRechazo?: Date | Timestamp;
  fechaInicioCotizacion?: Date | Timestamp;
  fechaCotizacionLista?: Date | Timestamp;
  fechaCompletado?: Date | Timestamp;
  fechaModificacion?: Date | Timestamp;
}
