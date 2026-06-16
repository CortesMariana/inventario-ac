export interface ActivoExcelLayout {

  nombre: string;
  tipoActivo: string;
  marca: string;
  modelo: string;
  
  descripcion?: string;
  numeroSerie?: string;
  activoFijo?: string;
  erpId?: string;
  
  estadoTecnico: string;
  ubicacionNombre?: string;
  
  procesador?: string;
  memoriaRam?: number;
  ip?: string;
  imei?: string;
  cargadorIncluido?: boolean;
  
  condicionEquipo?: string; 
  condicionDetalle?: string; 
  
  precioEntrega?: number;
  nip?: string;

  usuarioAsignadoNombre?: string;
  
  [key: string]: any;
}

export const EXCEL_LAYOUT_COLUMNS = {
  NOMBRE: 'nombre',
  TIPO_ACTIVO: 'tipoActivo',
  MARCA: 'marca',
  MODELO: 'modelo',
  ESTADO: 'estadoTecnico',
  
  DESCRIPCION: 'descripcion',
  NUMERO_SERIE: 'numeroSerie',
  ACTIVO_FIJO: 'activoFijo',
  ERP_ID: 'erpId',
  UBICACION: 'ubicacionNombre',
  PROCESADOR: 'procesador',
  MEMORIA_RAM: 'memoriaRam',
  IP: 'ip',
  IMEI: 'imei',
  CARGADOR: 'cargadorIncluido',
  CONDICION: 'condicionEquipo',
  DETALLE_CONDICION: 'condicionDetalle',
  PRECIO: 'precioEntrega',
  NIP: 'nip',
  USUARIO_ASIGNADO: 'usuarioAsignadoNombre'
};
