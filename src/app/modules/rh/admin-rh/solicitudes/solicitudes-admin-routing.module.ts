import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { GridSolicitudesComponent } from './grid-solicitudes/grid-solicitudes.component';
import { DetalleSolicitudAdminComponent } from './detalle-solicitud-admin/detalle-solicitud-admin.component';

@NgModule({
  imports: [
    RouterModule.forChild([
      { path: '', component: GridSolicitudesComponent, data: { breadcrumb: 'Solicitudes' } },
      { path: ':id', component: DetalleSolicitudAdminComponent, data: { breadcrumb: 'Detalle' } }
    ])
  ],
  exports: [RouterModule]
})
export class SolicitudesAdminRoutingModule { }