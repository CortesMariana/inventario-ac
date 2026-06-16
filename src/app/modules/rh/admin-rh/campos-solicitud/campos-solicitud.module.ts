import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { InputNumberModule } from 'primeng/inputnumber';
import { DropdownModule } from 'primeng/dropdown';
import { SelectButtonModule } from 'primeng/selectbutton';
import { InputSwitchModule } from 'primeng/inputswitch';
import { CheckboxModule } from 'primeng/checkbox';
import { RadioButtonModule } from 'primeng/radiobutton';
import { CalendarModule } from 'primeng/calendar';
import { DialogModule } from 'primeng/dialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TooltipModule } from 'primeng/tooltip';

import { GridCamposComponent } from './grid-campos/grid-campos.component';
import { EditarCampoComponent } from './editar-campo/editar-campo.component';
import { TiposSolicitudComponent } from './tipos-solicitud/tipos-solicitud.component'; 
import { CamposSolicitudRoutingModule } from './campos-solicitud-routing.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CamposSolicitudRoutingModule,
    
    TableModule,
    ButtonModule,
    InputTextModule,
    InputTextareaModule,
    InputNumberModule,
    DropdownModule,
    SelectButtonModule,
    InputSwitchModule,
    CheckboxModule,
    RadioButtonModule,
    CalendarModule,
    DialogModule,
    ProgressSpinnerModule,
    TooltipModule
  ],
  declarations: [
    GridCamposComponent,
    EditarCampoComponent,
    TiposSolicitudComponent 
  ]
})
export class CamposSolicitudModule { }