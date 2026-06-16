import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, doc, updateDoc, getDoc, getDocs, query, where, orderBy, Timestamp } from '@angular/fire/firestore';
import { v4 as uuidv4 } from 'uuid';
import { environment } from 'src/environments/environment';
import { CartaResponsiva, NuevaCartaResponsiva } from './models/carta-responsiva.model';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { EmpleadoService } from '../../admin/empleados/empleados.service';

@Injectable({
  providedIn: 'root'
})
export class CartaResponsivaService {
  private cartasCollection = collection(this.firestore, environment.collections.cartas_responsiva_vehiculos);

  constructor(private firestore: Firestore, private empleadoService: EmpleadoService ) { }

  async getAllCartas(): Promise<CartaResponsiva[]> {
    try {
      const q = query(this.cartasCollection, orderBy('fechaCreacion', 'desc'));
      const querySnapshot = await getDocs(q);
      const cartas: CartaResponsiva[] = [];
      querySnapshot.forEach((doc) => {
        cartas.push({
          firestoreId: doc.id,
          ...doc.data() as CartaResponsiva
        });
      });
      return cartas;
    } catch (error) {
      console.error('Error al obtener cartas:', error);
      throw error;
    }
  }

  async getCarta(firestoreId: string): Promise<CartaResponsiva | null> {
    try {
      const docRef = doc(this.firestore, `${environment.collections.cartas_responsiva_vehiculos}/${firestoreId}`);
      const docSnapshot = await getDoc(docRef);
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        const carta = {
          firestoreId: docSnapshot.id,
          ...data
        } as CartaResponsiva;
        
        return this.convertTimestampsToDates(carta);
      }
      return null;
    } catch (error) {
      console.error('Error al obtener carta:', error);
      throw error;
    }
  }

  private convertTimestampsToDates(obj: any): any {
    if (!obj) return obj;
    
    const converted = { ...obj };
    
    for (const key in converted) {
      if (converted[key] instanceof Timestamp) {
        converted[key] = converted[key].toDate();
      } else if (typeof converted[key] === 'object' && converted[key] !== null) {
        converted[key] = this.convertTimestampsToDates(converted[key]);
      }
    }
    
    return converted;
  }

  async getCartaPorVehiculo(vehiculoId: string): Promise<CartaResponsiva | null> {
    try {
      const q = query(
        this.cartasCollection, 
        where('vehiculoId', '==', vehiculoId), 
        orderBy('fechaCreacion', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return {
          firestoreId: doc.id,
          ...doc.data() as CartaResponsiva
        };
      }
      return null;
    } catch (error) {
      console.error('Error al obtener carta por vehículo:', error);
      return null;
    }
  }

  async crearCartaAutomatica(
    vehiculoId: string,
    colaboradorData: { empleadoId: string; nombre: string },
    vehiculo: any,
    usuario: { id: string, nombre: string }
  ): Promise<string> {
    try {
      const empleados = await this.empleadoService.getEmpleados().toPromise() || [];
      const colaborador = empleados.find(e => e.empleadoId === colaboradorData.empleadoId);
      
      if (!colaborador) {
        throw new Error('Colaborador no encontrado');
      }

      const nuevaCarta: CartaResponsiva = {
        id: uuidv4(),
        vehiculoId: vehiculoId,
        vehiculoInfo: {
          tipo: vehiculo.tipo || '',
          marca: vehiculo.marca || '',
          modelo: vehiculo.modelo || '',
          placa: vehiculo.placa || '',
          numeroSerie: vehiculo.numeroSerie || '',
          anio: vehiculo.anio || 0,
          color: vehiculo.color || '',
          costo: vehiculo.costo || 0 
        },
        colaborador: {
          id: colaborador.empleadoId,
          nombre: colaborador.empleado,
          puesto: colaborador.puesto?.nombre || '',
          area: colaborador.lugarDeTrabajo?.nombre || '',
          fechaIngreso: colaborador.fechaIngreso || '',
        },
        fechaAsignacion: new Date(),
        fechaFirma: new Date(),
        estado: 'VIGENTE',
        creadoPor: {
          id: usuario.id,
          nombre: usuario.nombre
        },
        fechaCreacion: new Date()
      };

      const docRef = await addDoc(this.cartasCollection, nuevaCarta);
      return docRef.id;
    } catch (error) {
      console.error('Error al crear carta automática:', error);
      throw error;
    }
  }

  async updateCarta(firestoreId: string, data: Partial<CartaResponsiva>): Promise<void> {
    try {
      const docRef = doc(this.firestore, `${environment.collections.cartas_responsiva_vehiculos || '/cartas-responsiva-vehiculos'}/${firestoreId}`);
      await updateDoc(docRef, {
        ...data,
        fechaModificacion: new Date()
      });
    } catch (error) {
      console.error('Error al actualizar carta:', error);
      throw error;
    }
  }

  async generarPDF(carta: CartaResponsiva, elemento: HTMLElement): Promise<void> {
    try {
      const canvas = await html2canvas(elemento, {
        scale: 2,
        useCORS: true,
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter'
      });
      
      const imgWidth = 210; 
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`Carta_Responsiva_${carta.vehiculoInfo.placa}_${carta.colaborador.nombre}.pdf`);
    } catch (error) {
      console.error('Error al generar PDF:', error);
      throw error;
    }
  }
}