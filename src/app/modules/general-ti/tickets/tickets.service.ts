import { Injectable } from '@angular/core';
import { collection, Firestore, addDoc, doc, updateDoc, getDoc, getDocs } from '@angular/fire/firestore';
import { v4 as uuidv4 } from 'uuid';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import { environment } from 'src/environments/environment';
import { FolioService } from '../../admin/empleados/folio.service';

@Injectable({
  providedIn: 'root'
})
export class TicketService {

  constructor(
    private firestore: Firestore,
    private storage: Storage,
    private folioService: FolioService
  ) { }

  getTickets(): Promise<any[]> {
    const collectionRef = collection(this.firestore, `${environment.collections.tickets}`);
    return new Promise((resolve, reject) => {
      getDocs(collectionRef)
        .then((querySnapshot) => {
          const data: any[] = [];
          querySnapshot.forEach((doc) => {
            data.push({ 
              firestoreId: doc.id, 
              ...doc.data() 
            });
          });
          resolve(data);
        })
        .catch((error) => reject(error));
    });
  }

  getTicket(firestoreId: string): Promise<any> {
    const docRef = doc(this.firestore, `${environment.collections.tickets}`, firestoreId);
    
    return new Promise((resolve, reject) => {
      getDoc(docRef)
        .then((docSnapshot) => {
          if (docSnapshot.exists()) {
            const data = { 
              firestoreId: docSnapshot.id, 
              ...docSnapshot.data() 
            };
            resolve(data);
          } else {
            reject(new Error('Ticket no encontrado'));
          }
        })
        .catch((error) => reject(error));
    });
  }

  async addTicket(ticket: any): Promise<string> {
    try {
      const folio = await this.folioService.getNextFolio();
      
      const ticketConFolio = {
        ...ticket,
        folio: folio
      };
      
      const collectionRef = collection(this.firestore, `${environment.collections.tickets}`);
      const docRef = await addDoc(collectionRef, ticketConFolio);
      
      return docRef.id;
    } catch (error) {
      console.error('Error al crear ticket:', error);
      throw error;
    }
  }

  updateTicket(firestoreId: string, data: any): Promise<void> {
    const docRef = doc(this.firestore, `${environment.collections.tickets}`, firestoreId);
    return updateDoc(docRef, data);
  }

  async uploadEvidenceFile(file: File, ticketId: string): Promise<string> {
    const path = `tickets/${ticketId}/evidencias/${Date.now()}_${file.name}`;
    const storageRef = ref(this.storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    return getDownloadURL(snapshot.ref);
  }

  async addEvidenceToTicket(ticketId: string, evidenceData: any): Promise<void> {
    const docRef = doc(this.firestore, `${environment.collections.tickets}`, ticketId);
    const ticketDoc = await getDoc(docRef);
    
    if (ticketDoc.exists()) {
      const ticketData = ticketDoc.data();
      const evidencias = ticketData['evidencias'] || [];
      
      evidencias.push({
        id: uuidv4(),
        ...evidenceData,
        fecha: new Date()
      });
      
      return updateDoc(docRef, { evidencias });
    } else {
      throw new Error('Ticket no encontrado');
    }
  }

  async addCommentToTicket(ticketId: string, commentData: any): Promise<void> {
    const docRef = doc(this.firestore, `${environment.collections.tickets}`, ticketId);
    const ticketDoc = await getDoc(docRef);
    
    if (ticketDoc.exists()) {
      const ticketData = ticketDoc.data();
      const comentarios = ticketData['comentarios'] || [];
      
      comentarios.push({
        id: uuidv4(),
        ...commentData,
        fecha: new Date()
      });
      
      return updateDoc(docRef, { 
        comentarios,
        fechaModificacion: new Date()
      });
    } else {
      throw new Error('Ticket no encontrado');
    }
  }

  private convertTimestampsToDates(obj: any): void {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        
        if (value && typeof value === 'object' && 'seconds' in value && 'nanoseconds' in value) {
          obj[key] = new Date(value.seconds * 1000 + value.nanoseconds / 1000000);
        } else if (value && typeof value === 'object' && !Array.isArray(value)) {
          this.convertTimestampsToDates(value);
        } else if (Array.isArray(value)) {
          value.forEach((item, index) => {
            if (item && typeof item === 'object') {
              this.convertTimestampsToDates(item);
            }
          });
        }
      }
    }
  }
}