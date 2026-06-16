import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NuevoEditarTicketComponent } from './nuevo-editar-ticket/nuevo-editar-ticket.component';
import { AsignarTicketsComponent } from './asignar-tickets/asignar-tickets.component';
import { GridTicketsAdminComponent } from './grid-tickets/grid-tickets.component';
import { ReportesTicketsComponent } from './reportes-tickets/reportes-tickets.component';
import { DetalleTicketAdminComponent } from './detalle-ticket/detalle-ticket.component';

@NgModule({
    imports: [
        RouterModule.forChild([
            { path: '', redirectTo: 'tickets', pathMatch: 'full' },
            { path: 'crear', data: { breadcrumb: 'Crear Ticket' }, component: NuevoEditarTicketComponent },
            { path: 'edit/:firestoreId', data: { breadcrumb: 'Editar Ticket' }, component: NuevoEditarTicketComponent },
            { path: 'asignar', data: { breadcrumb: 'Asignar Ticket' }, component: AsignarTicketsComponent },
            { path: 'tickets', data: { breadcrumb: 'Tickets' }, component: GridTicketsAdminComponent},
            { path: 'reportes', data: { breadcrumb: 'Reportes' }, component: ReportesTicketsComponent},
            { path: 'tickets/:firestoreId', data: { breadcrumb: 'Detalle Ticket' }, component: DetalleTicketAdminComponent },
        ])
    ],
    exports: [RouterModule]
})
export class TicketRoutingModule {}