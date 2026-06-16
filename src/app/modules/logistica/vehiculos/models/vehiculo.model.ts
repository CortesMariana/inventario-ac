export interface Vehiculo {
  fechaAsignacionFormatted: string;
  fechaVencimientoSeguroFormatted: string;
  fechaCreacionFormatted: string;
  firestoreId?: string;
  /** Número económico / identificador interno del vehículo (ej. "ECO-042"). */
  numeroEconomico?: string;
  /** Límite de litros de gasolina asignados por mes. Se reinicia cada mes. */
  limiteLitrosMensual?: number;
  id: string;
  folio: string;
  tipo: string;
  marca: string;
  modelo: string;
  placa: string;
  numeroSerie: string;
  color?: string;
  anio: number;
  cargaMaxKg: number;
  estadoVehiculo: EstadoVehiculo;
  otroEstadoTexto?: string;
  asignadoAId?: string;
  asignadoANombre?: string;
  asignadoAFecha?: Date;
  observacionesAsignacion?: string;
  fechaVencimientoSeguro?: Date;
  seguroVencidoNotificado?: boolean;
  observaciones?: string;
  fechaCreacion: Date;
  fechaModificacion?: Date;
  historial?: VehiculoHistorial[];
  costo: number;
}

export type EstadoVehiculo = 'DISPONIBLE' | 'SEGURO_VENCIDO' | 'ASIGNADO' | 'OTRO';

export interface VehiculoHistorial {
  id?: string;
  vehiculoId: string;
  tipoEvento: 'CREACION' | 'CAMBIO_ESTADO' | 'ASIGNACION' | 'CAMBIO_SEGURO' | 'CAMBIO_LIMITE_GASOLINA';
  observaciones: string;
  fechaMovimiento: Date;
  fechaMovimientoFormatted?: string;
  usuarioMovimientoId: string;
  usuarioMovimientoNombre: string;
  estadoAnterior?: EstadoVehiculo;
  estadoNuevo?: EstadoVehiculo;
  otroEstadoTexto?: string;
  asignadoAId?: string;
  asignadoANombre?: string;
  limiteLitrosAnterior?: number;
  limiteLitrosNuevo?: number;
}

/** Registro de cambio del límite de litros mensual de un vehículo. */
export interface HistorialCupoGasolina {
  id?: string;
  litros: number;
  fecha: Date;
  modificadoPorId: string;
  modificadoPorNombre: string;
  motivo?: string;
}

export interface TipoVehiculo {
  id: string;
  nombre: string;
  activo: boolean;
}

export interface MarcaVehiculo {
  id: string;
  nombre: string;
  activo: boolean;
}