import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

@NgModule({
  imports: [
    RouterModule.forChild([
      { path: 'tickets', data: { breadcrumb: 'Tickets' }, loadChildren: () => import('./tickets/tickets.module').then((m) => m.TicketModule) },
      { path: 'campo', data: { breadcrumb: 'Trabajo en campo' }, loadChildren: () => import('./campo/campo.module').then((m) => m.CampoModule) },
      { path: 'tecnicos', data: { breadcrumb: 'Tecnicos' }, loadChildren: () => import('./tecnicos/tecnicos.module').then((m) => m.TecnicosModule) },
      { path: 'activos', data: { breadcrumb: 'Activos' }, loadChildren: () => import('./activos/activos.module').then((m) => m.ActivosModule) },
      { path: 'insumos', data: { breadcrumb: 'Insumos' }, loadChildren: () => import('./insumos/insumos.module').then((m) => m.InsumosModule) }
    ])
  ],
  exports: [RouterModule]
})
export class AdminRoutingModule { }