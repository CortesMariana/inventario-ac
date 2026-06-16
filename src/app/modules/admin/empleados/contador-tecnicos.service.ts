import { Injectable } from '@angular/core';
import { doc, Firestore, getDoc, runTransaction } from '@angular/fire/firestore';


@Injectable({
  providedIn: 'root'
})
export class ContadorTecnicosService {
  private contadoresRef = doc(this.firestore, 'contadores', 'tecnicos');

  constructor(private firestore: Firestore) { }

  async getNextTecnicoId(): Promise<string> {
    try {
      return await runTransaction(this.firestore, async (transaction) => {
        const contadorDoc = await transaction.get(this.contadoresRef);
        
        let currentNumber = 1;
        
        if (contadorDoc.exists()) {
          const data = contadorDoc.data();
          currentNumber = (data?.['ultimoNumero'] || 0) + 1;
        }
        
        const tecnicoId = `TEC-${currentNumber.toString().padStart(6, '0')}`;
        
        transaction.set(this.contadoresRef, {
          ultimoNumero: currentNumber,
          ultimaActualizacion: new Date()
        });
        
        return tecnicoId;
      });
    } catch (error) {
      console.error('Error al generar ID de técnico:', error);
      const fallbackId = `TEC-FBK-${Date.now().toString().slice(-8)}`;
      return fallbackId;
    }
  }

  async getCurrentTecnicoNumber(): Promise<number> {
    try {
      const contadorDoc = await getDoc(this.contadoresRef);
      if (contadorDoc.exists()) {
        return contadorDoc.data()?.['ultimoNumero'] || 0;
      }
      return 0;
    } catch (error) {
      console.error('Error al obtener número actual:', error);
      return 0;
    }
  }
}