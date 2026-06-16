import { Timestamp } from "@angular/fire/firestore";

export interface Ticket {
    id: string;
    titulo: string;
    descripcion: string;
    correo: string;
    telefono: string;
    origen: 'rh' | 'comunidad' | 'tickets';
    tipo: 'mantenimiento' | 'incidente' | 'requerimiento' | 'asignacion activo/dispositivo';
    categoria: 'campo' | 'oficina';
    prioridad: 'baja' | 'Mediana' | 'Alta' | 'Critica';
    estatus: 'Nuevo' | 'Asignado' | 'En proceso' | 'Resuelto' | 'Cerrado' | 'Cancelado' | 'Rechazado';
    fechasEstatus: {
        fechaNuevo?: Date | Timestamp;
        fechaAsignado?: Date | Timestamp;
        fechaEnProceso?: Date | Timestamp;
        fechaResuelto?: Date | Timestamp;
        fechaCerrado?: Date | Timestamp;
        fechaCancelado?: Date | Timestamp;
        fechaRechazado?: Date | Timestamp;
    };
    creadoPor: {
        id: string;
        nombre: string;
    };
    asignadoA?: {
        id: string;
        nombre: string;
        categoria: string;
        tecnicoId?: string;
        numeroConsecutivo?: number;
    };
    
    historialReasignaciones?: Array<{
        id: string;
        tecnicoId: string;
        tecnicoNombre: string;
        tecnicoNumero: number;
        accion: 'aceptado' | 'rechazado' | 'reasignado';
        fecha: Date | Timestamp;
        motivoRechazo?: string;
        asignadoPor?: {
            id: string;
            nombre: string;
        };
    }>;
    
    fechaLimite?: Date | Timestamp;
    sucursal?: string;
    activos?: Array<{
        id: string;
        nombre: string;
    }>;
    evidencias?: Array<{
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
    }>;
    firestoreId?: string;
    fechaCreacion: Date | Timestamp;
    fechaModificacion?: Date | Timestamp;
    
    intentosReasignacion?: number;
    tecnicosRechazados?: string[];
    ultimoTecnicoAsignado?: string;
}

export interface NuevoTicket {
    titulo: string;
    descripcion: string;
    correo: string;
    telefono: string;
    origen: 'rh' | 'comunidad' | 'tickets';
    tipo: 'mantenimiento' | 'incidente' | 'requerimiento' | 'asignacion activo/dispositivo';
    categoria: 'campo' | 'oficina';
    prioridad: 'baja' | 'Mediana' | 'Alta' | 'Critica';
    creadoPor: {
        id: string;
        nombre: string;
    };
    fechaLimite?: Date;
    sucursal?: string;
    activos?: Array<{
        id: string;
        nombre: string;
    }>;
}

export interface EditarTicket {
    titulo?: string;
    descripcion?: string;
    correo?: string;
    telefono?: string;
    origen?: 'rh' | 'comunidad' | 'tickets';
    tipo?: 'mantenimiento' | 'incidente' | 'requerimiento' | 'asignacion activo/dispositivo';
    categoria?: 'campo' | 'oficina';
    prioridad?: 'baja' | 'Mediana' | 'Alta' | 'Critica';
    estatus?: 'Nuevo' | 'Asignado' | 'En proceso' | 'Resuelto' | 'Cerrado' | 'Cancelado';
    fechaLimite?: Date;
    sucursal?: string;
    activos?: Array<{
        id: string;
        nombre: string;
    }>;
}