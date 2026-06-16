import { Injectable } from '@angular/core';
import { doc, Firestore, getDoc, setDoc, updateDoc, runTransaction } from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class FolioService {
  private contadoresRef = doc(this.firestore, 'contadores', 'tickets');

  constructor(private firestore: Firestore) { }

  async getNextFolio(): Promise<string> {
    try {
      return await runTransaction(this.firestore, async (transaction) => {
        const contadorDoc = await transaction.get(this.contadoresRef);
        
        let currentNumber = 1;
        
        if (contadorDoc.exists()) {
          const data = contadorDoc.data();
          currentNumber = (data?.['ultimoFolio'] || 0) + 1;
        }
        
        const folio = `TKT-${currentNumber.toString().padStart(6, '0')}`;
        
        transaction.set(this.contadoresRef, {
          ultimoFolio: currentNumber,
          ultimaActualizacion: new Date()
        });
        
        return folio;
      });
    } catch (error) {
      console.error('Error al generar folio:', error);
      return `TKT-${Date.now().toString().slice(-8)}`;
    }
  }

  async getCurrentFolioNumber(): Promise<number> {
    try {
      const contadorDoc = await getDoc(this.contadoresRef);
      if (contadorDoc.exists()) {
        return contadorDoc.data()?.['ultimoFolio'] || 0;
      }
      return 0;
    } catch (error) {
      console.error('Error al obtener folio actual:', error);
      return 0;
    }
  }
}