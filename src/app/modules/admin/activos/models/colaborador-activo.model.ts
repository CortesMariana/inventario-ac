export interface ColaboradorActivo {
  empleadoId: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  nombreCompleto: string;
  puesto: string;
  empresa: string;
  lugarTrabajo: string;
  fotografiaMiniatura: string | null;
  activosAsignados: ActivoAsignado[];
  totalActivos: number;
  ultimaAsignacion: Date | null;
}

export interface ActivoAsignado {
  activoId: string;
  firestoreId: string;
  nombre: string;
  tipoActivo: string;
  marca: string;
  modelo: string;
  numeroSerie: string;
  activoFijo: string;
  categoriaNombre: string;
  fechaAsignacion: Date;
  estadoTecnico: string;
  ubicacionNombre: string;
}