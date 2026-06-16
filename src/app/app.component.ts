import { Component, OnInit } from '@angular/core';
import { BaseComponent } from '@fullcalendar/core/internal';
import { MessageService, PrimeNGConfig } from 'primeng/api';
import { LoginService } from './demo/components/auth/login/login.service';
import { OAuthService } from 'angular-oauth2-oidc';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html'
})
export class AppComponent implements OnInit {
    constructor(
        private primengConfig: PrimeNGConfig,
        private oAuthSrv: OAuthService
    ) {
        
    }

    ngOnInit(): void {
        this.primengConfig.ripple = true;
    }
}
