import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'vehiculos',
    loadChildren: () => import('./vehiculos/vehiculos.module').then(m => m.VehiculosModule)
  },
  {
    path: 'tickets',
    loadChildren: () => import('./tickets/tickets-routing.module').then(m => m.TicketsLogisticaRoutingModule)
  },
  {
    path: 'tecnico/tickets',
    loadChildren: () => import('./tickets-tecnico/tickets-tecnico.module').then(m => m.TicketsTecnicoModule)
  },
  {
    path: 'insumos',
    loadChildren: () => import('./insumos/insumos.module').then(m => m.InsumosModule)
  },
  { path: '', redirectTo: 'tickets', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LogisticaRoutingModule {}
