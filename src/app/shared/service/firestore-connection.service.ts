import { Injectable } from '@angular/core';
import { collection, Firestore, onSnapshot } from '@angular/fire/firestore';
import { MessageService } from 'primeng/api';

@Injectable({
  providedIn: 'root'
})
export class FirestoreConnectionService {

  alertConfig = {
    severity: 'warn',
    summary: 'Ups!',
    detail: 'Algo salió mal al consultar el servicio',
    life: 3000,
    sticky: false,
    closable: true,
    icon: 'pi pi-exclamation-triangle',
    closeIcon: 'pi pi-times',
  };

  constructor(private firestore: Firestore, private messageService: MessageService) {
    this.monitorFirestoreConnection();
  }

  private monitorFirestoreConnection(): void {
    const connectionStatus = collection(this.firestore, '__healthcheck__'); // Colección ficticia para verificar la conexión
    onSnapshot(connectionStatus, {
      error: (error) => {
        console.error('Error de conexión con Firestore:', error);
        this.showUserFriendlyMessage('No se pudo conectar con el servidor. Verifica tu conexión a internet.');
      },
    });
  }

  private showUserFriendlyMessage(message: string): void {
    this.alertConfig.summary = 'Error';
    this.alertConfig.detail = message;
    this.messageService.add(this.alertConfig);
  }

}
