export interface PermisoLogistica {
  id: string;
  empleadoId: string;
  nombre: string;
  rol: 'admin' | 'tecnico' | 'usuario';
  activo: boolean;
  fechaAsignacion: Date;
}

export interface PermisosLogisticaCollection {
  idsAutorizadosAdmin: Array<{ id: string; nombre: string }>;
  idsAutorizadosTecnico: Array<{ id: string; nombre: string }>;
}