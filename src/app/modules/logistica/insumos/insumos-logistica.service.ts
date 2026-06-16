import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, doc, updateDoc, getDoc, getDocs, query, where, orderBy, writeBatch, Timestamp, deleteDoc, increment } from '@angular/fire/firestore';
import { v4 as uuidv4 } from 'uuid';
import { environment } from 'src/environments/environment';
import {InsumoLogisticaModel, MovimientoInsumoLogisticaModel} from "./models/insumo-logistica.model";

@Injectable({
    providedIn: 'root'
})
export class InsumosLogisticaService {
    private insumosCollection = collection(this.firestore, environment.collections.insumos_logistica);

    constructor(private firestore: Firestore) { }

    async getAllInsumos(): Promise<InsumoLogisticaModel[]> {
        try {
            const q = query(this.insumosCollection, orderBy('nombre', 'asc'));
            const querySnapshot = await getDocs(q);
            const insumos: InsumoLogisticaModel[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data() as InsumoLogisticaModel;
                insumos.push({
                    ...data,
                    firestoreId: doc.id
                });
            });
            return insumos;
        } catch (error) {
            console.error('Error al obtener insumos:', error);
            throw error;
        }
    }

    async getInsumo(firestoreId: string): Promise<InsumoLogisticaModel | null> {
        try {
            const docRef = doc(this.firestore, `${environment.collections.insumos_logistica}/${firestoreId}`);
            const docSnapshot = await getDoc(docRef);
            if (docSnapshot.exists()) {
                return {
                    firestoreId: docSnapshot.id,
                    ...docSnapshot.data() as InsumoLogisticaModel
                };
            }
            return null;
        } catch (error) {
            console.error('Error al obtener insumo:', error);
            throw error;
        }
    }

    async createInsumo(insumoData: Omit<InsumoLogisticaModel, 'firestoreId'| 'id' | 'fechaCreacion' | 'historialMovimientos'>, usuarioMovimiento: { id: string, nombre: string }): Promise<string> {
        try {
            const ahora = new Date();

            const nuevoInsumo: any= {
                SKU: insumoData.SKU,
                activo: true,
                descripcion: insumoData.descripcion,
                familia: insumoData.familia,
                fechaCreacion: ahora,
                fechaModificacion: ahora,
                historialMovimientos: [],
                id: uuidv4(),
                idERP:insumoData.idERP,
                marca: insumoData.marca,
                nombre: insumoData.nombre,
                notas: insumoData.notas,
                precioUnitario: insumoData.precioUnitario
            };

            Object.keys(nuevoInsumo).forEach(key => {
                if (nuevoInsumo[key] === undefined) {
                    nuevoInsumo[key] = null;
                }
            });

            const docRef = await addDoc(this.insumosCollection, nuevoInsumo);

            const movimientoCreacion: MovimientoInsumoLogisticaModel = {
                cantidadUsada: 0,
                fechaMovimiento: ahora,
                id: uuidv4(),
                observaciones: `Creación de insumo ${insumoData.nombre}`,
                ticketRelacionadoId: "",
                tipoMovimiento: 'CREACION',
                usuarioMovimientoId: usuarioMovimiento.id,
                usuarioMovimientoNombre: usuarioMovimiento.nombre
            };

            const historialActualizado = [movimientoCreacion];
            await updateDoc(docRef, { historialMovimientos: historialActualizado });

            return docRef.id;
        } catch (error) {
            console.error('Error al crear insumo:', error);
            throw error;
        }
    }

    async updateInsumo(firestoreId: string, data: Partial<InsumoLogisticaModel>, usuarioMovimiento: { id: string, nombre: string }): Promise<void> {
        try {
            const docRef = doc(this.firestore, `${environment.collections.insumos_logistica}/${firestoreId}`);
            const insumoActual = await this.getInsumo(firestoreId);

            if (!insumoActual) {
                throw new Error('Insumo no encontrado');
            }

            const ahora = new Date();
            const cambios: string[] = [];

            if (data.nombre && data.nombre !== insumoActual.nombre) {
                cambios.push(`nombre: "${insumoActual.nombre}" → "${data.nombre}"`);
            }
            if (data.descripcion && data.descripcion !== insumoActual.descripcion) {
                cambios.push(`descripcion: ${insumoActual.descripcion} → ${data.descripcion}`);
            }
            if (data.marca && data.marca !== insumoActual.marca) {
                cambios.push(`marca: ${insumoActual.marca} → ${data.marca}`);
            }

            if (data.familia && data.familia !== insumoActual.familia) {
                cambios.push(`familia: ${insumoActual.familia} → ${data.familia}`);
            }

            if (data.SKU && data.SKU !== insumoActual.SKU) {
                cambios.push(`SKU: ${insumoActual.SKU} → ${data.SKU}`);
            }
            if (data.precioUnitario !== undefined && data.precioUnitario !== insumoActual.precioUnitario) {
                cambios.push(`precio unitario: $${insumoActual.precioUnitario} → $${data.precioUnitario}`);
            }
            if (data.notas && data.notas !== insumoActual.notas) {
                cambios.push(`notas: ${insumoActual.notas} → ${data.notas}`);
            }

            const movimientoEdicion: MovimientoInsumoLogisticaModel = {
                cantidadUsada: 0,
                fechaMovimiento: ahora,
                id: uuidv4(),
                observaciones: cambios.length > 0 ? `Campos modificados: ${cambios.join(', ')}` : 'Edición general',
                tipoMovimiento: 'EDICION',
                usuarioMovimientoId: usuarioMovimiento.id,
                usuarioMovimientoNombre: usuarioMovimiento.nombre
            };

            const nuevoHistorial = [...(insumoActual.historialMovimientos || []), movimientoEdicion];

            const updateData: any = {};

            Object.keys(data).forEach(key => {
                if (data[key as keyof InsumoLogisticaModel] !== undefined) {
                    updateData[key] = data[key as keyof InsumoLogisticaModel];
                }
            });

            updateData.fechaModificacion = ahora;
            updateData.historialMovimientos = nuevoHistorial;

            await updateDoc(docRef, updateData);
        } catch (error) {
            console.error('Error al actualizar insumo:', error);
            throw error;
        }
    }

    async deleteInsumo(firestoreId: string, usuarioMovimiento: { id: string, nombre: string }, motivo?: string): Promise<void> {
        try {
            const docRef = doc(this.firestore, `${environment.collections.insumos_logistica}/${firestoreId}`);
            const insumoActual = await this.getInsumo(firestoreId);

            if (!insumoActual) {
                throw new Error('Insumo no encontrado');
            }

            const ahora = new Date();

            const movimientoEliminacion: MovimientoInsumoLogisticaModel = {
                cantidadUsada: 0,
                fechaMovimiento: ahora,
                id: uuidv4(),
                observaciones: motivo || 'Insumo eliminado/desactivado del sistema',
                tipoMovimiento: 'ELIMINACION',
                usuarioMovimientoId: usuarioMovimiento.id,
                usuarioMovimientoNombre: usuarioMovimiento.nombre
            };

            const nuevoHistorial = [...(insumoActual.historialMovimientos || []), movimientoEliminacion];

            await updateDoc(docRef, {
                activo: false,
                fechaModificacion: ahora,
                historialMovimientos: nuevoHistorial
            });
        } catch (error) {
            console.error('Error al eliminar insumo:', error);
            throw error;
        }
    }

    async reactivarInsumo(firestoreId: string, usuarioMovimiento: { id: string, nombre: string }): Promise<void> {
        try {
            const docRef = doc(this.firestore, `${environment.collections.insumos_logistica}/${firestoreId}`);
            const insumoActual = await this.getInsumo(firestoreId);

            if (!insumoActual) {
                throw new Error('Insumo no encontrado');
            }

            const ahora = new Date();

            const movimientoReactivacion: MovimientoInsumoLogisticaModel = {
                cantidadUsada: 0,
                fechaMovimiento: ahora,
                id: uuidv4(),
                observaciones: 'Insumo reactivado - vuelve a estar disponible en el inventario',
                tipoMovimiento: 'REACTIVACION',
                usuarioMovimientoId: usuarioMovimiento.id,
                usuarioMovimientoNombre: usuarioMovimiento.nombre

            };

            const nuevoHistorial = [...(insumoActual.historialMovimientos || []), movimientoReactivacion];

            await updateDoc(docRef, {
                activo: true,
                fechaModificacion: ahora,
                historialMovimientos: nuevoHistorial
            });
        } catch (error) {
            console.error('Error al reactivar insumo:', error);
            throw error;
        }
    }

    async getHistorialMovimientos(firestoreId: string): Promise<MovimientoInsumoLogisticaModel[]> {
        try {
            const insumo = await this.getInsumo(firestoreId);
            if (!insumo) {
                return [];
            }

            const historial = insumo.historialMovimientos || [];
            return historial.sort((a, b) => {
                const fechaA = a.fechaMovimiento instanceof Date ? a.fechaMovimiento : (a.fechaMovimiento as any).toDate();
                const fechaB = b.fechaMovimiento instanceof Date ? b.fechaMovimiento : (b.fechaMovimiento as any).toDate();
                return fechaB.getTime() - fechaA.getTime();
            });
        } catch (error) {
            console.error('Error al obtener historial:', error);
            throw error;
        }
    }

    private sanitizeDocument(data: any): any {
        const result: any = {};
        Object.keys(data).forEach(key => {
            const value = data[key];
            if (value !== undefined) {
                result[key] = value === null ? null : value;
            }
        });
        return result;
    }
}
