import { Timestamp } from "@angular/fire/firestore";

export interface Solicitud {
    id: string;
    folio: string;
    titulo: string;
    descripcion: string;
    
    empleado: {
        id: string;
        nombre: string;
        numeroEmpleado: string;
        puesto: string;
        departamento: string;
        sucursal: string;
        fechaIngreso?: Date | Timestamp;
    };
    
    tipoSolicitud: string; 
    
    camposPersonalizados: Record<string, any>;
    
    detalles: {
        fechaInicio?: Date | Timestamp;
        fechaFin?: Date | Timestamp;
        diasSolicitados?: number;
        montoSolicitado?: number;
        motivoPrestamo?: string;
        numeroPagos?: number;
        tipoConstancia?: string;
        datoAModificar?: string;
        valorActual?: string;
        valorNuevo?: string;
    };
    
    prioridad: 'baja' | 'media' | 'alta' | 'urgente';
    estatus: 'Nueva' | 'En revision' | 'Aprobada' | 'Rechazada' | 'Completada' | 'Cancelada';
    
    fechasEstatus: {
        fechaNueva?: Date | Timestamp;
        fechaEnRevision?: Date | Timestamp;
        fechaAprobada?: Date | Timestamp;
        fechaRechazada?: Date | Timestamp;
        fechaCompletada?: Date | Timestamp;
        fechaCancelada?: Date | Timestamp;
    };
    
    creadoPor: {
        id: string;
        nombre: string;
        numeroEmpleado: string;
    };
    
    aprobadoPor?: {
        id: string;
        nombre: string;
        fecha: Date | Timestamp;
        comentario?: string;
    };
    
    rechazadoPor?: {
        id: string;
        nombre: string;
        fecha: Date | Timestamp;
        motivo: string;
    };
    
    documentos?: Array<{
        url: string;
        nombre: string;
        tipo: string;
        fecha: Date | Timestamp;
    }>;
    
    comentarios?: Array<{
        id: string;
        texto: string;
        usuarioId: string;
        usuarioNombre: string;
        fecha: Date | Timestamp;
        tipo: 'solicitante' | 'admin';
    }>;
    
    fechaCreacion: Date | Timestamp;
    fechaModificacion?: Date | Timestamp;
    firestoreId?: string;
}

export interface NuevaSolicitud {
    titulo: string;
    descripcion: string;
    empleado: {
        id: string;
        nombre: string;
        numeroEmpleado: string;
        puesto: string;
        departamento: string;
        sucursal: string;
        fechaIngreso?: Date;
    };
    tipoSolicitud: string;
    camposPersonalizados: Record<string, any>;
    detalles: {
        fechaInicio?: Date;
        fechaFin?: Date;
        diasSolicitados?: number;
        montoSolicitado?: number;
        motivoPrestamo?: string;
        numeroPagos?: number;
        tipoConstancia?: string;
        datoAModificar?: string;
        valorActual?: string;
        valorNuevo?: string;
    };
    prioridad: 'baja' | 'media' | 'alta' | 'urgente';
    creadoPor: {
        id: string;
        nombre: string;
        numeroEmpleado: string;
    };
}

export interface EditarSolicitud {
    titulo?: string;
    descripcion?: string;
    tipoSolicitud?: string;
    estatus?: string;
    detalles?: any;
}