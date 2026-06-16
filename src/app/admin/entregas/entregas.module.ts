import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { EntregasRoutingModule } from './entregas-routing.module';
import { GridEntregasComponent } from './grid-entregas/grid-entregas.component';
import { DetalleEntregasComponent } from './detalle-entregas/detalle-entregas.component';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { TimelineModule } from 'primeng/timeline';
import { DialogModule } from 'primeng/dialog';
import { ConfirmationService, MessageService } from 'primeng/api';

@NgModule({
  declarations: [
    GridEntregasComponent,
    DetalleEntregasComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    EntregasRoutingModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    TagModule,
    ConfirmDialogModule,
    ToastModule,
    TimelineModule,
    DialogModule,
    FormsModule,
  ],
  providers: [
    ConfirmationService,
    MessageService
  ]
})
export class EntregasModule { }