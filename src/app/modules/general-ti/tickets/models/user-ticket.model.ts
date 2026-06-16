export interface UserTicketView {
    firestoreId: string;
    folio: string;
    titulo: string;
    descripcion: string;
    tipo: 'mantenimiento' | 'incidente' | 'requerimiento' | 'asignacion activo/dispositivo';
    categoria: 'campo' | 'oficina';
    prioridad: 'baja' | 'Mediana' | 'Alta' | 'Critica';
    estatus: 'Nuevo' | 'Asignado' | 'En proceso' | 'Resuelto' | 'Cerrado' | 'Cancelado';
    creadoPor: {
        id: string;
        nombre: string;
    };
    asignadoA?: {
        id: string;
        nombre: string;
    };
    fechaCreacion: any; 
    fechaLimite?: any; 
    fechaCreacionFormatted: string;
    fechaLimiteFormatted: string;
    vencido: boolean;
    diasRestantes: number | null;
    colorPrioridad: string;
    iconoTipo: string;
    
    evaluacion?: {
        calificacion: number;
        comentario?: string;
        fechaEvaluacion: any;
        evaluadoPor: {
            id: string;
            nombre: string;
        };
    };
    evaluado?: boolean;
}

export interface UserTicketDetail extends UserTicketView {
    origen: 'rh' | 'comunidad' | 'tickets';
    correo: string;
    telefono: string;
    sucursal?: string;
    activos?: Array<{
        id: string;
        nombre: string;
    }>;
    evidencias?: Array<{
        url: string;
        nombre: string;
        tipo: string;
        fecha: any;
    }>;
    comentarios?: Array<{
        id: string;
        texto: string;
        usuarioId: string;
        usuarioNombre: string;
        fecha: any;
        tipo?: 'admin' | 'tecnico' | 'usuario';
    }>;
    fechasEstatus?: {
        fechaNuevo?: any;
        fechaAsignado?: any;
        fechaEnProceso?: any;
        fechaResuelto?: any;
        fechaCerrado?: any;
        fechaCancelado?: any;
    };
    fechaModificacion?: any;
}