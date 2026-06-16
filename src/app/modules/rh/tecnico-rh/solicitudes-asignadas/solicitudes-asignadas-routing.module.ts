import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { GridSolicitudesAsignadasComponent } from './grid-solicitudes-asignadas/grid-solicitudes-asignadas.component';
import { DetalleSolicitudTecnicoComponent } from './detalle-solicitud-tecnico/detalle-solicitud-tecnico.component';

@NgModule({
  imports: [
    RouterModule.forChild([
      { path: '', component: GridSolicitudesAsignadasComponent, data: { breadcrumb: 'Mis Solicitudes' } },
      { path: ':id', component: DetalleSolicitudTecnicoComponent, data: { breadcrumb: 'Detalle' } }
    ])
  ],
  exports: [RouterModule]
})
export class SolicitudesAsignadasRoutingModule { }