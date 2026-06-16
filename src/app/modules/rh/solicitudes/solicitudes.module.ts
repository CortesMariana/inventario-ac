import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { InputNumberModule } from 'primeng/inputnumber';  
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { DialogModule } from 'primeng/dialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { BlockUIModule } from 'primeng/blockui';
import { RadioButtonModule } from 'primeng/radiobutton';  
import { CheckboxModule } from 'primeng/checkbox';        
import { TooltipModule } from 'primeng/tooltip';          


import { NuevaSolicitudComponent } from './nueva-solicitud/nueva-solicitud.component';
import { MisSolicitudesComponent } from './mis-solicitudes/mis-solicitudes.component';
import { SolicitudesRoutingModule } from './solicitudes-routing.module';
import { PipesModule } from 'src/app/pipes/pipes.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    SolicitudesRoutingModule,
    PipesModule,
    
    
    ButtonModule,
    InputTextModule,
    InputTextareaModule,
    InputNumberModule,    
    DropdownModule,
    CalendarModule,
    DialogModule,
    ProgressSpinnerModule,
    ToastModule,
    BlockUIModule,
    RadioButtonModule,    
    CheckboxModule,      
    TooltipModule        
  ],
  declarations: [
    NuevaSolicitudComponent,
    MisSolicitudesComponent
  ],
  exports: [
    NuevaSolicitudComponent,
    MisSolicitudesComponent
  ]
})
export class SolicitudesModule { }