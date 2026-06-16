import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type Departamento = 'TI' | 'RH' | 'LOGISTICA' | null;

@Injectable({
  providedIn: 'root'
})
export class DepartamentoService {
  private departamentoSubject = new BehaviorSubject<Departamento>(this.getStoredDepartamento());
  public departamento$ = this.departamentoSubject.asObservable();

  constructor() { }

  private getStoredDepartamento(): Departamento {
    return localStorage.getItem('departamento') as Departamento || null;
  }

  setDepartamento(dept: Departamento) {
    console.log('Departamento seleccionado:', dept);
    if (dept) {
      localStorage.setItem('departamento', dept);
    } else {
      localStorage.removeItem('departamento');
    }
    this.departamentoSubject.next(dept);
  }

  getDepartamento(): Departamento {
    return this.departamentoSubject.value;
  }

  clearDepartamento() {
    localStorage.removeItem('departamento');
    this.departamentoSubject.next(null);
  }
}