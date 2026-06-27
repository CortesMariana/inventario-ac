import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { InboxPedidosRoutingModule } from './inbox-pedidos-routing.module';
import { InboxPedidosComponent } from '../pedidos/inbox-pedidos/inbox-pedidos.component';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { SharedModule } from '../shared/shared.module';

@NgModule({
  declarations: [
    InboxPedidosComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    InboxPedidosRoutingModule,
    ButtonModule,
    InputTextModule,
    TagModule,
    ToastModule,
    SharedModule
  ],
  providers: [
    MessageService
  ]
})
export class InboxPedidosModule { }
