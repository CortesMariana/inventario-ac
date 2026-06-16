export interface UserSolicitudView {
    firestoreId: string;
    folio: string;
    titulo: string;
    descripcion: string;
    tipoSolicitud: string;
    tipoSolicitudLabel: string;
    prioridad: string;
    estatus: string;
    creadoPor: {
        id: string;
        nombre: string;
    };
    fechaCreacion: any;
    fechaCreacionFormatted: string;
    colorPrioridad: string;
    iconoTipo: string;
    estatusColor: string;
    estatusIcon: string;
    
    tieneFechas: boolean;
    fechaInicio?: string;
    fechaFin?: string;
    diasSolicitados?: number;
    montoSolicitado?: number;
    
    diasTranscurridos: number;
    enTiempo: boolean;
}

export interface UserSolicitudDetail extends UserSolicitudView {
    empleado: {
        id: string;
        nombre: string;
        numeroEmpleado: string;
        puesto: string;
        departamento: string;
        sucursal: string;
        fechaIngreso?: string;
    };
    detalles: any;
    fechasEstatus: any;
    documentos: Array<any>;
    comentarios: Array<any>;
    aprobadoPor?: any;
    rechazadoPor?: any;
    fechaModificacion?: any;
}

export interface HistorialItem {
  key: string;
  value: any;
}