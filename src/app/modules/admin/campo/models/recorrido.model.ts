export interface Recorrido {
  id: string;
  usuarioId: string;
  usuarioNombre: string;
  estado: string;
  distancia: number;
  duracionSegundos: number;
  fechaInicio: Date;
  fechaFin: Date;
  puntos: Array<{
    latitud: number;
    longitud: number;
    timestamp: Date;
    precision?: number;
    velocidad?: number;
  }>;
  contratiempos?: Array<{
    tipo: string;
    descripcion: string;
    timestamp: Date;
    duracion?: number;
  }>;
}