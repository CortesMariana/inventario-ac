export interface Permiso {
  id?: string;
  idsAutorizadosAdmin?: Array<{
    id: string;
    usuario: string;
  }>;
  idsAutorizadosTec?: Array<{
    id: string;
    usuario: string;
  }>;
}