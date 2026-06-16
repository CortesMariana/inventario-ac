import { NgModule } from '@angular/core';
import { ExtraOptions, RouterModule, Routes } from '@angular/router';
import { AppLayoutComponent } from './layout/app.layout.component';
import { AuthGuard } from './guard/login.guard';

const routerOptions: ExtraOptions = {
    anchorScrolling: 'enabled'
};

const routes: Routes = [
    {
        path: '',
        component: AppLayoutComponent,
        children: [
            { path: '', loadChildren: () => import('./modules/general-ti/general-ti.module').then((m) => m.GeneralModule), canActivate: [AuthGuard] },
            { path: 'tecnico', loadChildren: () => import('./modules/tecnico/tecnico.module').then((m) => m.TecnicoModule), canActivate: [AuthGuard] },
            { path: 'admin', loadChildren: () => import('./modules/admin/admin.module').then((m) => m.AdminModule), canActivate: [AuthGuard] },
            { path: 'rh', loadChildren: () => import('./modules/rh/rh.module').then((m) => m.RhModule), canActivate: [AuthGuard] },
            { path: 'logistica', loadChildren: () => import('./modules/logistica/logistica.module').then((m) => m.LogisticaModule), canActivate: [AuthGuard] },
        ]
    },
    { path: 'seleccionar-departamento', loadChildren: () => import('./modules/seleccion-departamento/seleccion-departamento.module').then(m => m.SeleccionDepartamentoModule), canActivate: [AuthGuard] },
    { path: 'auth', loadChildren: () => import('./demo/components/auth/auth.module').then((m) => m.AuthModule) },
    { path: 'landing', loadChildren: () => import('./demo/components/landing/landing.module').then((m) => m.LandingModule) },
    { path: 'notfound', loadChildren: () => import('./demo/components/notfound/notfound.module').then((m) => m.NotfoundModule) },
    { path: '**', redirectTo: '/notfound' }
];

@NgModule({
    imports: [RouterModule.forRoot(routes, routerOptions)],
    exports: [RouterModule]
})
export class AppRoutingModule { }