import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { DialogModule } from 'primeng/dialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TooltipModule } from 'primeng/tooltip';

import { GridSolicitudesComponent } from './grid-solicitudes/grid-solicitudes.component';
import { DetalleSolicitudAdminComponent } from './detalle-solicitud-admin/detalle-solicitud-admin.component';
import { SolicitudesAdminRoutingModule } from './solicitudes-admin-routing.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SolicitudesAdminRoutingModule,
    
    TableModule,
    ButtonModule,
    InputTextModule,
    InputTextareaModule,
    DropdownModule,
    CalendarModule,
    DialogModule,
    ProgressSpinnerModule,
    TooltipModule
  ],
  declarations: [
    GridSolicitudesComponent,
    DetalleSolicitudAdminComponent
  ]
})
export class SolicitudesAdminModule { }