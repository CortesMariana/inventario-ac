import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TicketsRoutingModule } from './tickets-routing.module';
import { PrimengModule } from 'src/app/primeng/primeng.module';
import { ComponentsModule } from '../../components/components.module';
import { PipesModule } from 'src/app/pipes/pipes.module';
import { ReactiveFormsModule } from '@angular/forms';
import { CrearTicketTecnicoComponent } from './crear-ticket-tecnico/crear-ticket-tecnico.component';
import { GridTicketsTecnicoComponent } from './grid-tickets-tecnico/grid-tickets-tecnico.component';
import { DetalleTicketTecnicoComponent } from './detalle-ticket-tecnico/detalle-ticket-tecnico.component';

@NgModule({
  imports: [
    CommonModule,
    TicketsRoutingModule,
    PrimengModule,
    PipesModule,
    ComponentsModule,
    ReactiveFormsModule
  ],
  declarations: [
    CrearTicketTecnicoComponent,
    GridTicketsTecnicoComponent,
    DetalleTicketTecnicoComponent
  ]
})
export class TicketModule { }