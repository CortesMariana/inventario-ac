import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { DropdownModule } from 'primeng/dropdown';
import { DialogModule } from 'primeng/dialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TooltipModule } from 'primeng/tooltip';

import { GridSolicitudesAsignadasComponent } from './grid-solicitudes-asignadas/grid-solicitudes-asignadas.component';
import { DetalleSolicitudTecnicoComponent } from './detalle-solicitud-tecnico/detalle-solicitud-tecnico.component';
import { SolicitudesAsignadasRoutingModule } from './solicitudes-asignadas-routing.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SolicitudesAsignadasRoutingModule,
    
    TableModule,
    ButtonModule,
    InputTextModule,
    InputTextareaModule,
    DropdownModule,
    DialogModule,
    ProgressSpinnerModule,
    TooltipModule
  ],
  declarations: [
    GridSolicitudesAsignadasComponent,
    DetalleSolicitudTecnicoComponent
  ]
})
export class SolicitudesAsignadasModule { }