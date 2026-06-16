import { ErrorHandler, Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';

@Injectable({
  providedIn: 'root'
})
export class GlobalErrorHandler implements ErrorHandler {
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

    constructor( private messageService: MessageService ) {}

  handleError(error: any): void {
    // Verificar si el error es específico de Firestore
    if (error.message && error.message.includes('Could not reach Cloud Firestore backend')) {
      console.error('Error de conexión con Firestore:', error);
      this.showUserFriendlyMessage('No se pudo conectar con el servidor. Verifica tu conexión a internet.');
    } else {
      // Manejar otros errores generales
      console.error('Error global no manejado:', error);
      this.showUserFriendlyMessage('Ocurrió un error inesperado. Por favor, intenta nuevamente.');
      this.showUserFriendlyMessage(error.message);
    }
  }

  private showUserFriendlyMessage(message: string): void {
    this.alertConfig.summary = 'Error';
    this.alertConfig.detail = message;
    this.messageService.add(this.alertConfig);
  }
}