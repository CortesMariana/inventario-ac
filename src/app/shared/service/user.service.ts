import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { ApiService } from './api.service';
import { catchError, Observable, switchMap } from 'rxjs';
import { OAuthService } from 'angular-oauth2-oidc';
import { authConfig } from 'src/app/demo/components/auth/login/sso.config';
import { collection, Firestore, getDocs, query, where } from '@angular/fire/firestore';
import { Departamento } from './departamento.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  constructor(
    private api: ApiService,
    private oauthService: OAuthService,
    private firestore: Firestore
  ) { }

  consultarEmpleado(): Observable<any> {
    return this.getUserInfo().pipe(
      switchMap((data) => {
        const usuario = data;
        const url = `${environment.api}Empleados/Me?id=${usuario.EmpleadoId}`;
        return this.api.get(url);
      })
    );
  }

  getUserInfo(): Observable<any> {
    if(authConfig.userinfoEndpoint) {
      return this.api.get(authConfig.userinfoEndpoint);
    }
    return new Observable<any>();
  }

  private validaPermisosPorDepartamento<T>(departamento: Departamento): Promise<T> {
    if (!departamento) {
      return Promise.reject('No hay departamento seleccionado');
    }

    let collectionPath: string;
    if (departamento === 'TI') {
      collectionPath = environment.collections.permisos;
    } else if (departamento === 'RH') {
      collectionPath = environment.collections.permisos_rh;
    } else if (departamento === 'LOGISTICA') {
      collectionPath = environment.collections.permisos_logistica;
    } else {
      return Promise.reject('Departamento no válido');
    }

    const ref = collection(this.firestore, collectionPath);
    return new Promise((resolve, reject) => {
      getDocs(ref).then((querySnapshot) => {
        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          resolve(doc.data() as T);
        } else {
          reject(`No se encontraron permisos para el departamento ${departamento}`);
        }
      }).catch(error => {
        reject(error);
      });
    });
  }

  esAdminEnDepartamento(usuarioId: string, departamento: Departamento): Promise<boolean> {
    return this.validaPermisosPorDepartamento<any>(departamento).then((permisos) => {
      if (!permisos.idsAutorizadosAdmin) {
        return false;
      }
      return permisos.idsAutorizadosAdmin.some((p: any) => p.id === usuarioId);
    }).catch(error => {
      console.error(`Error verificando admin en ${departamento}:`, error);
      return false;
    });
  }

  esTecnicoEnTI(usuarioId: string, departamento: Departamento): Promise<boolean> {
    if (departamento !== 'TI') return Promise.resolve(false);

    return this.validaPermisosPorDepartamento<any>(departamento).then((permisos) => {
      if (!permisos.idsAutorizadosTec) {
        return false;
      }
      return permisos.idsAutorizadosTec.some((p: any) => p.id === usuarioId);
    }).catch(error => {
      console.error('Error verificando técnico en TI:', error);
      return false;
    });
  }

  esUsuarioRH(usuarioId: string, departamento: Departamento): Promise<boolean> {
    if (departamento !== 'RH') return Promise.resolve(false);

    return this.validaPermisosPorDepartamento<any>(departamento).then((permisos) => {
      if (!permisos.idsAutorizadosRh) {
        return false;
      }
      return permisos.idsAutorizadosRh.some((p: any) => p.id === usuarioId);
    }).catch(error => {
      console.error('Error verificando usuario RH:', error);
      return false;
    });
  }

  esAdminRH(usuarioId: string, departamento: Departamento): Promise<boolean> {
    if (departamento !== 'RH') return Promise.resolve(false);
    return this.esAdminEnDepartamento(usuarioId, departamento);
  }

  esAdminActivosEnTI(usuarioId: string, departamento: Departamento): Promise<boolean> {
    if (departamento !== 'TI') return Promise.resolve(false);

    return this.validaPermisosPorDepartamento<any>(departamento).then((permisos) => {
      const esSuperAdmin = permisos.idsAutorizadosAdmin?.some((p: any) => p.id === usuarioId) || false;
      const esAdminActivos = permisos.idsAutorizadosAdminActivos?.some((p: any) => p.id === usuarioId) || false;
      return esSuperAdmin || esAdminActivos;
    }).catch(error => {
      console.error('Error verificando admin de activos:', error);
      return false;
    });
  }

  esAdminInsumosEnTI(usuarioId: string, departamento: Departamento): Promise<boolean> {
    if (departamento !== 'TI') return Promise.resolve(false);

    return this.validaPermisosPorDepartamento<any>(departamento).then((permisos) => {
      const esSuperAdmin = permisos.idsAutorizadosAdmin?.some((p: any) => p.id === usuarioId) || false;
      const esAdminInsumos = permisos.idsAutorizadosAdminInsumos?.some((p: any) => p.id === usuarioId) || false;
      return esSuperAdmin || esAdminInsumos;
    }).catch(error => {
      console.error('Error verificando admin de insumos:', error);
      return false;
    });
  }

  esAdminVehiculosEnLogistica(usuarioId: string, departamento: Departamento): Promise<boolean> {
    if (departamento !== 'LOGISTICA') return Promise.resolve(false);

    return this.validaPermisosPorDepartamento<any>(departamento).then((permisos) => {
      const esSuperAdmin = permisos.idsAutorizadosAdmin?.some((p: any) => p.id === usuarioId) || false;
      const esAdminVehiculos = permisos.idsAutorizadosAdminVehiculos?.some((p: any) => p.id === usuarioId) || false;
      return esSuperAdmin || esAdminVehiculos;
    }).catch(error => {
      console.error('Error verificando admin de vehículos:', error);
      return false;
    });
  }

  esOperadorLogistica(usuarioId: string, departamento: Departamento): Promise<boolean> {
    if (departamento !== 'LOGISTICA') return Promise.resolve(false);

    return this.validaPermisosPorDepartamento<any>(departamento).then((permisos) => {
      if (!permisos.idsAutorizadosTecnico) {
        return false;
      }
      return permisos.idsAutorizadosTecnico.some((p: any) => p.id === usuarioId);
    }).catch(error => {
      console.error('Error verificando operador de logística:', error);
      return false;
    });
  }

  /** Puede autorizar o rechazar tickets de insumos (PENDIENTE → AUTORIZADO/RECHAZADO).
   *  Requiere estar explícitamente en idsAutorizadoresTickets.
   *  idsAutorizadosAdmin NO hereda este rol — los roles de tickets son independientes. */
  esAutorizadorTicketsLogistica(usuarioId: string): Promise<boolean> {
    return this.validaPermisosPorDepartamento<any>('LOGISTICA').then((permisos) => {
      return permisos.idsAutorizadoresTickets?.some((p: any) => p.id === usuarioId) ?? false;
    }).catch(() => false);
  }

  /** Puede marcar insumos como entregados (AUTORIZADO → COMPLETADO).
   *  Requiere estar explícitamente en idsResponsablesCompletarInsumos. */
  esResponsableCompletarInsumosLogistica(usuarioId: string): Promise<boolean> {
    return this.validaPermisosPorDepartamento<any>('LOGISTICA').then((permisos) => {
      return permisos.idsResponsablesCompletarInsumos?.some((p: any) => p.id === usuarioId) ?? false;
    }).catch(() => false);
  }

  getIdsResponsablesCompletarInsumos(): Promise<string[]> {
    return this.validaPermisosPorDepartamento<any>('LOGISTICA').then((permisos) => {
      return (permisos.idsResponsablesCompletarInsumos ?? []).map((p: any) => p.id as string);
    }).catch(() => []);
  }

  getIdsResponsablesCompletarReparacion(): Promise<string[]> {
    return this.validaPermisosPorDepartamento<any>('LOGISTICA').then((permisos) => {
      return (permisos.idsResponsablesCompletarReparacion ?? []).map((p: any) => p.id as string);
    }).catch(() => []);
  }

  /** Puede autorizar o rechazar tickets de GASOLINA (PENDIENTE → COMPLETADO/RECHAZADO).
   *  Requiere estar explícitamente en idsAutorizadoresGasolina. */
  esAutorizadorGasolina(usuarioId: string): Promise<boolean> {
    return this.validaPermisosPorDepartamento<any>('LOGISTICA').then((permisos) => {
      return permisos.idsAutorizadoresGasolina?.some((p: any) => p.id === usuarioId) ?? false;
    }).catch(() => false);
  }

  getIdsAutorizadoresGasolina(): Promise<string[]> {
    return this.validaPermisosPorDepartamento<any>('LOGISTICA').then((permisos) => {
      return (permisos.idsAutorizadoresGasolina ?? []).map((p: any) => p.id as string);
    }).catch(() => []);
  }

  /** Puede gestionar el flujo de reparaciones (cotización, monto, completar/rechazar).
   *  Requiere estar explícitamente en idsResponsablesCompletarReparacion. */
  esResponsableCompletarReparacionLogistica(usuarioId: string): Promise<boolean> {
    return this.validaPermisosPorDepartamento<any>('LOGISTICA').then((permisos) => {
      return permisos.idsResponsablesCompletarReparacion?.some((p: any) => p.id === usuarioId) ?? false;
    }).catch(() => false);
  }
}
