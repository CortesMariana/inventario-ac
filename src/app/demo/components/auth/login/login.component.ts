import { Component } from '@angular/core';
import { LayoutService } from 'src/app/layout/service/app.layout.service';
import { LoginService } from './login.service';

@Component({
    templateUrl: './login.component.html',
})
export class LoginComponent {
    rememberMe: boolean = false;
    
    constructor(private layoutService: LayoutService, private loginSvc : LoginService) {
        this.loginSvc.login();
    }

    get dark(): boolean {
        return this.layoutService.config().colorScheme !== 'light';
    }
}
