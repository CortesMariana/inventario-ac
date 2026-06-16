export interface Tecnico {
  firestoreId?: string;
  tecnicoId?: string; 
  empleadoId: string;
  nombre: string;
  tipo: 'oficina' | 'campo';
  fechaCreacion?: Date;
  activo?: boolean;
  numeroConsecutivo?: number;
}

export interface NuevoTecnicoForm {
  empleadoId: string | null;
  empleadoNombre: string | null;
  tipo: 'oficina' | 'campo' | null;
}