export interface CartaResponsiva {
  id: string;
  vehiculoId: string;
  vehiculoInfo: {
    tipo: string;
    marca: string;
    modelo: string;
    placa: string;
    numeroSerie: string;
    anio: number;
    color?: string;
    costo: number;
  };
  colaborador: {
    id: string;
    nombre: string;
    puesto: string;
    area: string;
    fechaIngreso: string;
    rfc?: string;
    curp?: string;
  };
  fechaAsignacion: Date;
  fechaFirma: Date;
  estado: 'VIGENTE' | 'VENCIDA' | 'CANCELADA';
  observaciones?: string;
  urlDocumento?: string;
  creadoPor: {
    id: string;
    nombre: string;
  };
  fechaCreacion: Date;
  fechaModificacion?: Date;
  firestoreId?: string;
}

export interface NuevaCartaResponsiva {
  vehiculoId: string;
  colaboradorId: string;
  fechaAsignacion: Date;
  observaciones?: string;
}