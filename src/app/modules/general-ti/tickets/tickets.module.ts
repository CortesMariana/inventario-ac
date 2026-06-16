import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TicketRoutingModule } from './tickets-routing.module';
import { PrimengModule } from 'src/app/primeng/primeng.module';
import { PipesModule } from 'src/app/pipes/pipes.module';
import { NuevoEditarTicketComponent } from './nuevo-editar-ticket/nuevo-editar-ticket.component';
import { ComponentsModule } from "../../components/components.module";
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { DropdownModule } from 'primeng/dropdown';
import { DialogModule } from 'primeng/dialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { TicketsRoutingModule } from '../../tecnico/tickets/tickets-routing.module';
import { SeguimientoTicketsComponent } from './seguimiento-tickets/seguimiento-tickets.component';

@NgModule({
  imports: [
    CommonModule,
    TicketRoutingModule,
    PrimengModule,
    PipesModule,
    ComponentsModule,
    ReactiveFormsModule,
    FormsModule,
    DropdownModule,
    DialogModule,
    ProgressSpinnerModule,
    ToastModule,
    InputTextModule,
    ButtonModule,
    TicketsRoutingModule
  ],
  declarations: [
    NuevoEditarTicketComponent,
    SeguimientoTicketsComponent
  ], 
  exports: [
    NuevoEditarTicketComponent,
    SeguimientoTicketsComponent,
  ]
})
export class TicketModule { }