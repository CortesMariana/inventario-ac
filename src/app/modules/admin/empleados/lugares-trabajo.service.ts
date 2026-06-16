import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LugaresTrabajoService {

  private apiUrl = `${environment.api}Checador/LugaresDeTrabajo`;

  constructor(private http: HttpClient) { }

  getLugaresTrabajo(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  getLugaresTrabajoPorId(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }
}