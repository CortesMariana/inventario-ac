import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

@NgModule({
  imports: [
    RouterModule.forChild([
      { path: 'tickets', data: { breadcrumb: 'Tickets' }, loadChildren: () => import('./tickets/tickets.module').then((m) => m.TicketModule) },
      { path: 'estadisticas', data: { breadcrumb: 'Estadisticas' }, loadChildren: () => import('./estadisticas/estadisticas.module').then((m) => m.EstadisticasModule) },
    ])
  ],
})
export class TecnicoRoutingModule { }