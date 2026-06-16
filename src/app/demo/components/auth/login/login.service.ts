import { Injectable } from '@angular/core';
import { JwksValidationHandler, OAuthService } from 'angular-oauth2-oidc';
import { CookieService } from 'ngx-cookie-service';
import { BehaviorSubject, Observable } from 'rxjs';
import { authConfig } from './sso.config';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { ApiService } from 'src/app/shared/service/api.service';

@Injectable({
  providedIn: 'root'
})
export class LoginService {

  private tokenAcquired = new BehaviorSubject<boolean>(false);

  constructor(
    private oauthService: OAuthService,
    private cookieService: CookieService,
    private apiSrv: ApiService
  ) {
    this.initLogin();
  }

  configureSingleSignOn() {
    this.oauthService.configure(authConfig);
    console.log(authConfig)
    this.oauthService.tokenValidationHandler = new JwksValidationHandler();
    //this.oauthService.setupAutomaticSilentRefresh();
    this.oauthService.loadDiscoveryDocumentAndLogin();
    // Obtener token
    this.oauthService.events.subscribe(e => {
      console.log(e);
      if (e.type === 'token_received') {
        var accessToken = this.oauthService.getAccessToken();
        this.cookieService.set('acces_token', accessToken);
        console.log(accessToken);
      }
    });
  }

  initLogin() {

    this.oauthService.configure(authConfig);
    this.oauthService.setupAutomaticSilentRefresh();
    //this.oauthService.tokenValidationHandler = new JwksValidationHandler();
    this.oauthService.loadDiscoveryDocumentAndLogin().then(() => {
      // Verifica si hay un accessToken válido
      if (this.oauthService.hasValidAccessToken()) {
        this.tokenAcquired.next(true);
      } else {
        // Aquí puedes decidir qué hacer si no hay un accessToken válido:
        // Por ejemplo, redirigir al usuario a una página específica o mostrar un mensaje.
        console.log('No hay un accessToken válido.');
        // Redirige al usuario a una página específica si es necesario
        // this.router.navigate(['/pagina-especifica']);
      }
    }).catch(error => {
      console.error('Error al iniciar sesión:', error);
      // Maneja el error según sea necesario
    });
  }

  ensureTokenAcquired(): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.tokenAcquired.value) {
        resolve(true);
      } else {
        const sub = this.tokenAcquired.subscribe(acquired => {
          if (acquired) {
            resolve(true);
            sub.unsubscribe();
          }
        });
      }
    });
  }

  login() {
    this.oauthService.initCodeFlow();
  }

  logout() {
    this.oauthService.revokeTokenAndLogout();
  }

  refreshToken() {
    this.oauthService.refreshToken();
  }

  get token() {
    let claims: any = this.oauthService.getIdentityClaims();
    return claims ? claims : null;
  }

  get empleadoId() {
    let claims: any = this.oauthService.getIdentityClaims();
    return claims ? claims['EmpleadoId'] : null;
  }

  isAuthenticated(): boolean {
    return this.oauthService.hasValidAccessToken();
  }

  consultarEmpleado(id: string): Observable<any>{
    const url = `${environment.api}Empleados/Me?id=${id}`;
    return this.apiSrv.get(url);
  }

}
