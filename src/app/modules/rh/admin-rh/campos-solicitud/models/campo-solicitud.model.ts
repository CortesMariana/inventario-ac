export interface CampoConfiguracion {
    id?: string;
    firestoreId?: string;

    nombre: string;              
    etiqueta: string;             
    descripcion?: string;         
    
    tipo: 'texto' | 'textarea' | 'numero' | 'fecha' | 'select' | 'radio' | 'checkbox' | 'archivo';
    categoria: 'basico' | 'contacto' | 'fechas' | 'economico' | 'documentos' | 'otro';
    tipoSolicitud: string | 'todos'; 
  
    requerido: boolean;
    validaciones?: {
        min?: number;
        max?: number;
        minLength?: number;
        maxLength?: number;
        pattern?: string;
        mensaje?: string;
    };

    opciones?: Array<{
        valor: string;
        etiqueta: string;
        orden?: number;
    }>;
    
    orden: number;
    columna: 6 | 12;             
    ayuda?: string;               
    placeholder?: string;
    
    activo: boolean;
    visibleCreacion: boolean;      
    visibleEdicion: boolean;      
    visibleDetalle: boolean;      
    
    fechaCreacion: Date;
    fechaModificacion?: Date;
    creadoPor?: {
        id: string;
        nombre: string;
    };
}

export interface GrupoCampos {
    categoria: string;
    titulo: string;
    campos: CampoConfiguracion[];
    orden: number;
    icono: string;
}