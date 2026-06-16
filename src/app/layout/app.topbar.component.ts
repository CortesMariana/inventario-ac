import { Component, ElementRef, ViewChild } from '@angular/core';
import { LayoutService } from 'src/app/layout/service/app.layout.service';
import { AppSidebarComponent } from './app.sidebar.component';
import { LoginService } from '../demo/components/auth/login/login.service';
import { UserService } from '../shared/service/user.service';

@Component({
    selector: 'app-topbar',
    templateUrl: './app.topbar.component.html'
})
export class AppTopbarComponent {
    @ViewChild('menubutton') menuButton!: ElementRef;
    @ViewChild(AppSidebarComponent) appSidebar!: AppSidebarComponent;
    activeItem!: number;
    usuario: any;

    constructor(public layoutService: LayoutService, public el: ElementRef, private user: UserService, private loginSrv: LoginService) {
        this.getUsuario().subscribe((data) => {
            this.usuario = data;
        });
    }

    logout() {
        this.loginSrv.logout();
    }

    getUsuario() {
        return this.user.consultarEmpleado();
    }

    onMenuButtonClick() {
        this.layoutService.onMenuToggle();
    }

    onSidebarButtonClick() {
        this.layoutService.showSidebar();
    }

    onConfigButtonClick() {
        this.layoutService.showConfigSidebar();
    }
}
