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
    estatus: 'Nuevo' | 'Asignado' | 'En proceso' | 'Resuelto' | 'Cerrado' | 'Cancelado';
    fechasEstatus: {
        fechaNuevo?: Date | Timestamp;
        fechaAsignado?: Date | Timestamp;
        fechaEnProceso?: Date | Timestamp;
        fechaResuelto?: Date | Timestamp;
        fechaCerrado?: Date | Timestamp;
        fechaCancelado?: Date | Timestamp;
    };
    creadoPor: {
        id: string;
        nombre: string;
    };
    asignadoA?: {
        id: string;
        nombre: string;
    };
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
    asignadoA?: {
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