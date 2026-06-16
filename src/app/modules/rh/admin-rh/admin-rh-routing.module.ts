import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

@NgModule({
  imports: [
    RouterModule.forChild([
      { path: '', redirectTo: 'campos', pathMatch: 'full' },
      { path: 'campos', loadChildren: () => import('./campos-solicitud/campos-solicitud.module').then(m => m.CamposSolicitudModule) },
      { path: 'solicitudes', loadChildren: () => import('./solicitudes/solicitudes-admin.module').then(m => m.SolicitudesAdminModule) },
      { path: 'reportes', loadChildren: () => import('./reportes/reportes.module').then(m => m.ReportesModule) }
    ])
  ],
  exports: [RouterModule]
})
export class AdminRhRoutingModule { }