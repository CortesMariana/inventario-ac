export interface TipoSolicitud {
    firestoreId?: string;
    id?: string;
    valor: string;          
    etiqueta: string;       
    descripcion?: string;   
    icono: string;           
    color?: string;         
    orden: number;          
    activo: boolean;        
    requiereAprobacion: boolean; 
    diasMaximos?: number;    
    montoMaximo?: number;    
    
    fechaCreacion: Date;
    fechaModificacion?: Date;
}

export interface TipoSolicitudView {
    label: string;
    value: string;
    icon: string;
    color?: string;
    descripcion?: string;
}