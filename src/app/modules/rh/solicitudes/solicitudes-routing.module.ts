import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NuevaSolicitudComponent } from './nueva-solicitud/nueva-solicitud.component';
import { MisSolicitudesComponent } from './mis-solicitudes/mis-solicitudes.component';

@NgModule({
  imports: [
    RouterModule.forChild([
      { path: '', redirectTo: 'nueva-solicitud', pathMatch: 'full' },
      { path: 'nueva-solicitud', component: NuevaSolicitudComponent, data: { breadcrumb: 'Nueva Solicitud' } },
      { path: 'mis-solicitudes', component: MisSolicitudesComponent, data: { breadcrumb: 'Mis Solicitudes' } }
    ])
  ],
  exports: [RouterModule]
})
export class SolicitudesRoutingModule { }