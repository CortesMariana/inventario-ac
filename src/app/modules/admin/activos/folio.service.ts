import { Injectable } from '@angular/core';
import { Firestore, doc, runTransaction } from '@angular/fire/firestore';
import { environment } from 'src/environments/environment';

export interface ContadorFolio {
  ultimoNumero: number;
  prefijo: string; 
  año?: number;    
}

@Injectable({
  providedIn: 'root'
})
export class FolioService {

  private readonly contadoresCollection = environment.collections.contadores_folios;
  
  private readonly PREFIJO_ACTIVO = 'ACT'; 
  private readonly USAR_AÑO = false; 

  constructor(private firestore: Firestore) { }

  async generarSiguienteFolio(): Promise<string> {
    const añoActual = new Date().getFullYear();
    const nombreContador = this.USAR_AÑO 
      ? `${this.PREFIJO_ACTIVO}_${añoActual}` 
      : this.PREFIJO_ACTIVO;

    const contadorRef = doc(this.firestore, `${this.contadoresCollection}/${nombreContador}`);

    try {
      const nuevoNumero = await runTransaction(this.firestore, async (transaction) => {
        const contadorDoc = await transaction.get(contadorRef);
        let ultimoNumero = 1;

        if (contadorDoc.exists()) {
          const data = contadorDoc.data() as ContadorFolio;
          ultimoNumero = data.ultimoNumero + 1;
        }

        transaction.set(contadorRef, {
          ultimoNumero: ultimoNumero, 
          prefijo: this.PREFIJO_ACTIVO,
          año: this.USAR_AÑO ? añoActual : null,
          ultimaActualizacion: new Date()
        } as ContadorFolio);

        return ultimoNumero; 
      });

      const numeroFormateado = nuevoNumero.toString().padStart(3, '0');
      
      if (this.USAR_AÑO) {
        return `${this.PREFIJO_ACTIVO}-${añoActual}-${numeroFormateado}`;
      } else {
        return `${this.PREFIJO_ACTIVO}-${numeroFormateado}`;
      }

    } catch (error) {
      console.error('Error al generar folio:', error);
      throw new Error('No se pudo generar el folio para el activo');
    }
  }
}