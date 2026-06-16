import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NuevoEditarTicketComponent } from './nuevo-editar-ticket/nuevo-editar-ticket.component';
import { SeguimientoTicketsComponent } from './seguimiento-tickets/seguimiento-tickets.component';

@NgModule({
    imports: [
        RouterModule.forChild([
            { path: '', data: { breadcrumb: 'Nuevo Ticket' }, component: NuevoEditarTicketComponent },
            { path: 'mis-tickets', data: { breadcrumb: 'Mis Tickets' }, component: SeguimientoTicketsComponent}
        ])
    ],
    exports: [RouterModule]
})
export class TicketRoutingModule {}