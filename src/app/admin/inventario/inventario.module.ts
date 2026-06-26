import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { InventarioRoutingModule } from './inventario-routing.module';
import { GridInventarioComponent } from './grid-inventario/grid-inventario.component';
import { DetalleInventarioComponent } from './detalle-inventario/detalle-inventario.component';
import { NuevoEditarInventarioComponent } from './nuevo-editar-inventario/nuevo-editar-inventario.component';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { BadgeModule } from 'primeng/badge';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { ConfirmationService, MessageService } from 'primeng/api';
import { BarcodeLabelsService } from './barcode-labels.service';

@NgModule({
  declarations: [
    GridInventarioComponent,
    DetalleInventarioComponent,
    NuevoEditarInventarioComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    InventarioRoutingModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    TagModule,
    BadgeModule,
    ConfirmDialogModule,
    ToastModule,
    DropdownModule,
    InputNumberModule
  ],
  providers: [
    BarcodeLabelsService,
    ConfirmationService,
    MessageService
  ]
})
export class InventarioModule { }
