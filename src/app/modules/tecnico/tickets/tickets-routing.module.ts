import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { GridTicketsTecnicoComponent } from './grid-tickets-tecnico/grid-tickets-tecnico.component';
import { CrearTicketTecnicoComponent } from './crear-ticket-tecnico/crear-ticket-tecnico.component';
import { DetalleTicketTecnicoComponent } from './detalle-ticket-tecnico/detalle-ticket-tecnico.component';

@NgModule({
    imports: [
        RouterModule.forChild([
            { path: '', redirectTo: 'tickets', pathMatch: 'full' },
            { path: 'tickets', data: { breadcrumb: 'Mis Tickets' }, component: GridTicketsTecnicoComponent },
            { path: 'crear-ticket', data: { breadcrumb: 'Crear Ticket' }, component: CrearTicketTecnicoComponent },
            { path: 'tickets/:firestoreId', data: { breadcrumb: 'Detalle Ticket' }, component: DetalleTicketTecnicoComponent }
        ])
    ],
    exports: [RouterModule]
})
export class TicketsRoutingModule {}