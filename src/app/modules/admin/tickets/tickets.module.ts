import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TicketRoutingModule } from './tickets-routing.module';
import { PrimengModule } from 'src/app/primeng/primeng.module';
import { PipesModule } from 'src/app/pipes/pipes.module';
import { NuevoEditarTicketComponent } from '../tickets/nuevo-editar-ticket/nuevo-editar-ticket.component';
import { ComponentsModule } from "../../components/components.module";
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { GridTicketsAdminComponent } from './grid-tickets/grid-tickets.component';
import { AsignarTicketsComponent } from './asignar-tickets/asignar-tickets.component';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { ReportesTicketsComponent } from './reportes-tickets/reportes-tickets.component';
import { DetalleTicketAdminComponent } from './detalle-ticket/detalle-ticket.component';
import { ChartModule } from 'primeng/chart'; 
import { TooltipModule } from 'primeng/tooltip';

@NgModule({
  imports: [
    CommonModule,
    TicketRoutingModule,
    PrimengModule,
    PipesModule,
    ComponentsModule,
    ReactiveFormsModule,
    FormsModule,
    ToastModule,
    ConfirmDialogModule,
    ProgressSpinnerModule,
    InputTextModule,
    DropdownModule,
    ChartModule,
    TooltipModule
  ],
  declarations: [
    NuevoEditarTicketComponent,
    GridTicketsAdminComponent,
    AsignarTicketsComponent,
    ReportesTicketsComponent,
    DetalleTicketAdminComponent
  ], 
  exports: [
    NuevoEditarTicketComponent,
    GridTicketsAdminComponent,
    AsignarTicketsComponent,
    ReportesTicketsComponent,
    DetalleTicketAdminComponent
  ]
})
export class TicketModule { }