import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TecnicosRoutingModule } from './tecnicos-routing.module';
import { GridTecnicosComponent } from './grid-tecnicos/grid-tecnicos.component';

import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { BlockUIModule } from 'primeng/blockui';
import { ToastModule } from 'primeng/toast';
import { MessageModule } from 'primeng/message';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

@NgModule({
  imports: [
    CommonModule,
    TecnicosRoutingModule,
    FormsModule,
    DropdownModule,
    InputTextModule,
    ButtonModule,
    ProgressSpinnerModule,
    BlockUIModule,
    ToastModule,
    MessageModule,
    ConfirmDialogModule
  ],
  declarations: [
    GridTecnicosComponent
  ],
  exports: [
    GridTecnicosComponent
  ]
})
export class TecnicosModule { }