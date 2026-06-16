import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { NuevoTicketComponent } from './nuevo-ticket/nuevo-ticket.component';
import { MisTicketsComponent } from './mis-tickets/mis-tickets.component';
import { DetalleTicketComponent } from './detalle-ticket/detalle-ticket.component';
import { AdminTicketsComponent } from './admin-tickets/admin-tickets.component';
import { ReportesTicketsComponent } from './reportes/reportes-tickets.component';
import { ReportesGasolinaComponent } from './reportes-gasolina/reportes-gasolina.component';

const routes: Routes = [
  { path: 'nuevo',               component: NuevoTicketComponent,    data: { breadcrumb: 'Nueva Solicitud' } },
  { path: 'detalle/:firestoreId', component: DetalleTicketComponent,  data: { breadcrumb: 'Detalle' } },
  { path: 'mis-solicitudes',     component: MisTicketsComponent,      data: { breadcrumb: 'Mis Solicitudes' } },
  { path: 'admin',               component: AdminTicketsComponent,     data: { breadcrumb: 'Administración' } },
  { path: 'reportes',            component: ReportesTicketsComponent,  data: { breadcrumb: 'Reportes' } },
  { path: 'reportes-gasolina',  component: ReportesGasolinaComponent, data: { breadcrumb: 'Reporte Gasolina' } },
  { path: '', redirectTo: 'mis-solicitudes', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TicketsLogisticaRoutingModule { }