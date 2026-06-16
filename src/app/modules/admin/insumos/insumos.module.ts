import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DropdownModule } from 'primeng/dropdown';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { ToolbarModule } from 'primeng/toolbar';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { BlockUIModule } from 'primeng/blockui';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { BadgeModule } from 'primeng/badge';
import { SplitButtonModule } from 'primeng/splitbutton';
import { TimelineModule } from 'primeng/timeline';
import { DividerModule } from 'primeng/divider';
import { CheckboxModule } from 'primeng/checkbox';  

import { InsumosRoutingModule } from './insumos-routing.module';
import { GridInsumosComponent } from './grid-insumos/grid-insumos.component';
import { NuevoEditarInsumoComponent } from './nuevo-editar-insumo/nuevo-editar-insumo.component';
import { DetalleInsumoComponent } from './detalle-insumo/detalle-insumo.component';
import { RadioButtonModule } from 'primeng/radiobutton';

@NgModule({
  declarations: [
    GridInsumosComponent,
    NuevoEditarInsumoComponent,
    DetalleInsumoComponent
  ],
  imports: [
    CommonModule,
    RadioButtonModule,
    FormsModule,
    ReactiveFormsModule,
    InsumosRoutingModule,
    ButtonModule,
    CardModule,
    InputTextModule,
    InputNumberModule,
    DropdownModule,
    TableModule,
    ToastModule,
    ToolbarModule,
    DialogModule,
    ConfirmDialogModule,
    InputTextareaModule,
    ProgressSpinnerModule,
    BlockUIModule,
    TagModule,
    TooltipModule,
    BadgeModule,
    SplitButtonModule,
    TimelineModule,
    DividerModule,
    CheckboxModule 
  ]
})
export class InsumosModule { }