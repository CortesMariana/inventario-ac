import { Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';
import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { catchError, Observable, retry, throwError, timeout } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ErrorsService implements HttpInterceptor {
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

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        if (!navigator.onLine) {
          this.alertConfig.summary = 'No hay conexión';
          this.alertConfig.detail = 'Por favor, revisa tu conexión a internet';
          console.log('Error de conexión', error);
        } else if (error.status === 0) {
          this.alertConfig.summary = 'Error de Conexión';
          this.alertConfig.detail = 'No se puede conectar con el servidor. Por favor, inténtalo más tarde.';

        } else if (error.error instanceof ErrorEvent) {
          if (error.error.message == "invalid_grant") {
            this.alertConfig.summary = 'Error de autenticación';
            this.alertConfig.detail = 'El servidor no responde, por favor, recarga la página';
          } else {
            this.alertConfig.detail = `Error: ${error.statusText}`;
          }
        } else if (error.status === 401) {
          this.alertConfig.summary = 'No autorizado';
          this.alertConfig.detail = 'No tienes permisos para acceder a este recurso';
        } else if (error instanceof HttpErrorResponse) {
          this.alertConfig.summary = `Código error: ${error.status}`;
          this.alertConfig.detail = `Mensaje: ${error.statusText}`;
        } else {
          this.alertConfig.summary = 'Conexión fallida';
          this.alertConfig.detail = 'Revisa tu conexión a internet e intenta nuevamente';
        }
        this.messageService.add(this.alertConfig);
        return throwError(() => new Error(this.alertConfig.detail));
      })
    );
  }
}
