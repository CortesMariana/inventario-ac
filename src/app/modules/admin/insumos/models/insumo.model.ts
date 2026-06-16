import { Timestamp } from "@angular/fire/firestore";

export type TipoEmpaque = 'Unitario' | 'Bolsa' | 'Caja' | 'Kit' | 'Paquete' | 'Rollo' | 'Set';
export type EstadoInsumo = 'Nuevo' | 'Usado';

export interface Insumo {
  firestoreId?: string;
  id: string;
  nombre: string;
  tipoEmpaque: TipoEmpaque;
  cantidad: number;
  tipoContenido?: 'PIEZAS' | 'METROS'; 
  unidadesPorEmpaque?: number; 
  cantidadUnidades?: number; 
  marca: string;
  estado: EstadoInsumo;
  precioUnitario: number;
  precioTotal: number;
  subalmacenId: string;
  subalmacenNombre: string;
  lugarTrabajoId?: string;
  lugarTrabajoNombre?: string;
  notas?: string;
  stockMinimo?: number;
  fechaCreacion: Date | Timestamp;
  fechaModificacion?: Date | Timestamp;
  fechaCreacionFormatted?: string;
  fechaModificacionFormatted?: string;
  historialMovimientos?: MovimientoInsumo[];
  activo: boolean;
}

export interface MovimientoInsumo {
  id: string;
  tipoMovimiento: 'INCREMENTO' | 'DECREMENTO' | 'ELIMINACION' | 'CREACION' | 'EDICION' | 'REACTIVACION';
  cantidadAnterior: number;
  cantidadNueva: number;
  cantidadCambio: number;
  empaquesAfectados?: number; 
  unidadesRestantesEnEmpaque?: number; 
  observaciones: string;
  fechaMovimiento: Date | Timestamp;
  fechaMovimientoFormatted?: string;
  usuarioMovimientoId: string;
  usuarioMovimientoNombre: string;
  motivo?: string;
  ticketRelacionadoId?: string;
}