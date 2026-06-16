import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MisTicketsTecnicoComponent } from './mis-tickets/mis-tickets.component';

const routes: Routes = [
  { path: '', redirectTo: 'mis-tickets', pathMatch: 'full' },
  { path: 'mis-tickets', component: MisTicketsTecnicoComponent, data: { breadcrumb: 'Mis Tickets' } }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TicketsTecnicoRoutingModule {}