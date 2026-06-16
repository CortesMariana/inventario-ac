import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { VehiculosRoutingModule } from './vehiculos-routing.module';

import { PrimengModule } from 'src/app/primeng/primeng.module';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { DropdownModule } from 'primeng/dropdown';
import { TooltipModule } from 'primeng/tooltip';
import { TableModule } from 'primeng/table';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectButtonModule } from 'primeng/selectbutton';
import { DialogModule } from 'primeng/dialog';
import { BlockUIModule } from 'primeng/blockui';
import { CalendarModule } from 'primeng/calendar';
import { CardModule } from 'primeng/card';
import { ProgressBarModule } from 'primeng/progressbar';

import { GridVehiculosComponent } from './grid-vehiculos/grid-vehiculos.component';
import { CrearVehiculoComponent } from './crear-vehiculo/crear-vehiculo.component';
import { DetalleVehiculoComponent } from './detalle-vehiculo/detalle-vehiculo.component';
import { GridColaboradoresComponent } from './grid-colaboradores/grid-colaboradores.component';
import { DetalleColaboradorComponent } from './detalle-colaborador/detalle-colaborador.component';
import { ReportesComponent } from './reportes/reportes.component';
import { CartaResponsivaVehiculoComponent } from './carta-responsiva/carta-responsiva.component';

import { PipesModule } from 'src/app/pipes/pipes.module';
import { ButtonModule } from 'primeng/button';

@NgModule({
  declarations: [
    GridVehiculosComponent,
    CrearVehiculoComponent,
    DetalleVehiculoComponent,
    GridColaboradoresComponent,
    DetalleColaboradorComponent,
    ReportesComponent,
    CartaResponsivaVehiculoComponent
  ],
  imports: [
    CommonModule,
    VehiculosRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    PrimengModule,
    ToastModule,
    ButtonModule,
    ConfirmDialogModule,
    ProgressSpinnerModule,
    InputTextModule,
    InputTextareaModule,
    DropdownModule,
    TooltipModule,
    TableModule,
    InputNumberModule,
    SelectButtonModule,
    DialogModule,
    BlockUIModule,
    CalendarModule,
    CardModule,
    ProgressBarModule,
    PipesModule,
  ]
})
export class VehiculosModule {}