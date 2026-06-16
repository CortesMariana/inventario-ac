import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

@NgModule({
  imports: [
    RouterModule.forChild([
      { path: '', data: { breadcrumb: 'Tickets' }, loadChildren: () => import('./tickets/tickets.module').then((m) => m.TicketModule) },
      { path: '**', redirectTo: '../notfound' }
    ])
  ],
})
export class GeneralRoutingModule { }