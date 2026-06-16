import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ClientesRoutingModule } from './clientes-routing.module';
import { GridClientesComponent } from './grid-clientes/grid-clientes.component';
import { DetalleClientesComponent } from './detalle-clientes/detalle-clientes.component';
import { NuevoEditarClientesComponent } from './nuevo-editar-clientes/nuevo-editar-clientes.component';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';

@NgModule({
  declarations: [
    GridClientesComponent,
    DetalleClientesComponent,
    NuevoEditarClientesComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    ClientesRoutingModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    TagModule,
    ConfirmDialogModule,
    ToastModule
  ],
  providers: [
    ConfirmationService,
    MessageService
  ]
})
export class ClientesModule { }