import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { getDownloadURL, ref, Storage, uploadBytes, uploadBytesResumable } from '@angular/fire/storage';
import { OAuthService } from 'angular-oauth2-oidc';
import { Message, MessageService } from 'primeng/api';
import { catchError, Observable, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ApiService {

  token!: string;

  constructor(
    private http: HttpClient,
    private messageService: MessageService,
    private storage: Storage,
    private authService: OAuthService,
  ) {
    this.token = this.authService.getAccessToken(); 
  }

  // Message Methods
  getClientMessage(error: Error): string {
    return error.message ? error.message : error.toString();
  }

  getServerMessage(error: HttpErrorResponse): string {
    return error.message;
  }

  getWithFilter<T>(url: string, filtros?: any): Observable<T> {
    const headers = new HttpHeaders({ 'Authorization': 'Bearer ' + this.token });
    if (filtros) {
      let flag = true;
      for (const filtroKey of Object.keys(filtros)) {
        if (filtros[filtroKey] || filtros[filtroKey] === 0) {
          if (flag === true) {
            url += `?${filtroKey}=${filtros[filtroKey]}`;
            flag = false;
          } else {
            url += `&${filtroKey}=${filtros[filtroKey]}`;
          }
        }
      }
    }
    return this.http.get<T>(url, { headers });
  }

  get<T>(url: string): Observable<T> {
    const headers = new HttpHeaders({ 'Authorization': 'Bearer ' + this.token });
    return this.http.get<T>(url, { headers: headers });
  }

  post(url: string, data: any): Observable<any> {
    const headers = new HttpHeaders({ 'Authorization': 'Bearer ' + this.token });
    return this.http.post(url, data, { headers }).pipe();
  }

  delete(url: string): Observable<any> {
    const headers = new HttpHeaders({ 'Authorization': 'Bearer ' + this.token });
    return this.http.delete(url, { headers }).pipe();
  }

  put(url: string, data: any): Observable<any> {
    const headers = new HttpHeaders({ 'Authorization': 'Bearer ' + this.token });
    return this.http.put(url, data, { headers }).pipe();
  }

  patch(url: string, data: any): Observable<any> {
    const headers = new HttpHeaders({ 'Authorization': 'Bearer ' + this.token });
    return this.http.patch(url, data, { headers });
  }

  // uploadFile(file: File, path: string): Promise<any> {
  //   return new Promise((resolve, reject) => {
  //     const storageRef = ref(this.storage, path);
  //     const uploadTask = uploadBytesResumable(storageRef, file);

  //     uploadTask.on(
  //       'state_changed',
  //       (snapshot) => {
  //         const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
  //         console.log(`Upload is ${progress}% done`);
  //       },
  //       (error) => {
  //         reject(error);
  //       },
  //       async () => {
  //         try {
  //           const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
  //           resolve(downloadURL); // Devuelve la URL de descarga
  //         } catch (error) {
  //           reject(error);
  //         }
  //       }
  //     );
  //   });
  // }

  async uploadFile(file: File, path: string): Promise<string> {
    // const filePath = `categorias/${file.name}-${Date.now()}`; 
    const storageRef = ref(this.storage, path);

    try {
      // Subir el archivo a Firebase Storage
      await uploadBytes(storageRef, file);

      // Obtener el URL público de la imagen
      const downloadURL = await getDownloadURL(storageRef);

      return downloadURL;
    } catch (error) {
      console.error('Error al subir la imagen:', error);
      throw error;
    }
  }

  downloadFile(url: string): Observable<Blob> {

    return this.http.get(url, {
      responseType: 'blob'
    }).pipe(
      catchError(error => {
        return throwError(error);
      })
    );
  }

  public handleError(error: Error | HttpErrorResponse) {
    let message;
    if (error instanceof HttpErrorResponse) {
      message = this.getServerMessage(error);
      this.presentAlert({ detail: message });
    } else {
      message = this.getClientMessage(error);
      this.presentAlert({ detail: message });
    }
  }

  presentAlert(message: Message) {
    this.messageService.add({
      summary: message.summary ? message.summary : 'Ha ocurrido un error',
      detail: message.detail ? message.detail : 'Por favor, intente de nuevo',
      life: message.life ? message.life : 5000,
      severity: message.severity ? message.severity : 'warn',
      icon: message.icon ? message.icon : 'pi pi-check',
      key: message.key ? message.key : ''
    });
  }
}
