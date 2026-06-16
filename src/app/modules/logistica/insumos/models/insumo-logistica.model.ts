import {Timestamp} from "@angular/fire/firestore";

export interface InsumoLogisticaModel{
    firestoreId?: string;
    id:number,
    idERP?: string;
    nombre:string,
    descripcion?:string,
    familia?:string,
    marca?:string,
    SKU?:string,
    precioUnitario: number;
    notas?: string;
    fechaCreacion: Date | Timestamp;
    fechaModificacion?: Date | Timestamp;
    historialMovimientos?: MovimientoInsumoLogisticaModel[];
    activo: boolean;
}

export interface CatalogoItemLogistica {
    firestoreId?: string;
    id: string;
    nombre: string;
}

export interface MovimientoInsumoLogisticaModel {
    id: string;
    tipoMovimiento: 'ELIMINACION' | 'CREACION' | 'EDICION' | 'REACTIVACION' | 'USO';
    cantidadUsada?: number;
    fechaMovimiento: Date | Timestamp;
    usuarioMovimientoId: string;
    usuarioMovimientoNombre: string;
    ticketRelacionadoId?: string;
    observaciones: string;
}
