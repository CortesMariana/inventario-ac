import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PedidosRoutingModule } from './pedidos-routing.module';
import { GridPedidosComponent } from './grid-pedidos/grid-pedidos.component';
import { DetallePedidosComponent } from './detalle-pedidos/detalle-pedidos.component';
import { NuevoEditarPedidosComponent } from './nuevo-editar-pedidos/nuevo-editar-pedidos.component';
import { InboxPedidosComponent } from './inbox-pedidos/inbox-pedidos.component';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { DropdownModule } from 'primeng/dropdown';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { InputNumberModule } from 'primeng/inputnumber';
import { MessageService } from 'primeng/api';
import { SharedModule } from '../shared/shared.module';

@NgModule({
  declarations: [
    GridPedidosComponent,
    DetallePedidosComponent,
    NuevoEditarPedidosComponent,
    InboxPedidosComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    PedidosRoutingModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    TagModule,
    DropdownModule,
    ToastModule,
    TooltipModule,
    InputNumberModule,
    SharedModule
  ],
  providers: [
    MessageService
  ]
})
export class PedidosModule { }
