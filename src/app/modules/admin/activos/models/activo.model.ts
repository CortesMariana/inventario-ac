import { Timestamp } from "@angular/fire/firestore";

export type EstadoTecnico = 'DISPONIBLE' | 'ASIGNADO' | 'EN_REPARACION' | 'FUERA_DE_SERVICIO' | 'BAJA_TECNICA';
export type TipoEventoHistorial = 'CREACION' | 'ASIGNACION' | 'CAMBIO_ESTADO' | 'CAMBIO_UBICACION';

export interface ActivoHistorial {
  id?: string; 
  activoId: string;
  tipoEvento: TipoEventoHistorial;
  observaciones: string;
  fechaMovimiento: Date | Timestamp;
  fechaMovimientoFormatted?: string; 
  usuarioMovimientoId: string;
  usuarioMovimientoNombre?: string;
  estadoTecnico: string;
  usuarioAsignadoId?: string | null; 
  usuarioAsignadoNombre?: string | null; 
  ubicacionId?: string | null; 
  ubicacionNombre?: string | null; 
  ticketRelacionadoId?: string | null; 
  evidenciaIds?: string[];
}

export interface LugarTrabajo {
  id: string;
  nombre: string;
  direccion?: string;
}

export interface CategoriaActivo {
  id: string; 
  nombre: string;
  descripcion?: string;
  fechaCreacion: Date | Timestamp;
  activo?: boolean;
}

export interface Subalmacen {
  id: string; 
  nombre: string;
  descripcion?: string;
  lugarDeTrabajoId: string; 
  lugarDeTrabajoNombre?: string; 
  activo: boolean;
  fechaCreacion: Date | Timestamp;
}

export interface ActivoTI {
  id: string;
  folio: string; 
  firestoreId?: string;
  nombre: string;
  descripcion?: string;
  tipoActivo?: string;
  categoriaId?: string;
  categoriaNombre?: string;
  numeroSerie?: string;
  marca?: string;
  modelo?: string;
  erpId?: string;
  
  cartaResguardadaPor?: string;

  ubicacionId: string;
  ubicacionNombre?: string;
  lugarTrabajoId?: string;
  lugarTrabajoNombre?: string;
  ubicacionAsignadaId?: string | null; 
  ubicacionAsignadaNombre?: string | null;
  usuarioAsignadoId?: string;
  usuarioAsignadoNombre?: string;
  
  estadoTecnico: EstadoTecnico;
  
  fechaCreacion: Date | Timestamp;
  fechaAsignacion?: Date | Timestamp;
  fechaModificacion?: Date | Timestamp;
  creadoPorId?: string;
  creadoPorNombre?: string;
  
  ticketReparacionId?: string;
  
  precioEntrega?: number;
  nip?: string;
  activoFijo?: string;

  procesador?: string;
  memoriaRam?: number;
  ip?: string;
  imei?: string;
  cargadorIncluido?: boolean;
  condicionEquipo?: string;
  condicionDetalle?: string;
  
  esAltaRapida?: boolean;
  
  fechaCreacionFormatted?: string;
  fechaAsignacionFormatted?: string;

  evidencias?: Evidencia[];
}

export interface Evidencia {
  id: string;
  nombre: string;
  url: string;
  tipo: string;
  fechaSubida: Date;
  usuarioSubidaId?: string;
  usuarioSubidaNombre?: string;
  tamaño?: number;
  descripcion?: string;
  storagePath?: string;
}

export interface MovimientoActivo {
  id: string;
  activoId: string;
  activoNombre?: string;
  tipoMovimiento: 'ALTA' | 'TRANSFERENCIA' | 'BAJA' | 'ASIGNACION' | 'CAMBIO_ESTADO';
  fecha: Date | Timestamp;
  usuarioMovimientoId: string;
  usuarioMovimientoNombre: string;
  
  datosAlta?: {
    categoriaId: string;
    categoriaNombre: string;
    ubicacionId: string;
    ubicacionNombre: string;
    observaciones?: string;
  };
  
  datosTransferencia?: {
    ubicacionOrigenId: string;
    ubicacionOrigenNombre: string;
    ubicacionDestinoId: string;
    ubicacionDestinoNombre: string;
    responsableEntrega?: string;
    responsableRecibe?: string;
    observaciones?: string;
  };
  
  datosBaja?: {
    motivo: string;
    categoriaId: string;
    categoriaNombre: string;
    observaciones?: string;
    autorizadoPor?: string;
  };
  
  estadoTecnico: string;
  
  formatoGenerado?: {
    url: string;
    fechaGeneracion: Date | Timestamp;
  };
}