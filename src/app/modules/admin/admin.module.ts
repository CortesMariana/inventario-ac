import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminRoutingModule } from './admin-routing.module';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

@NgModule({
   providers: [MessageService],
  imports: [
    CommonModule,
    AdminRoutingModule,
    ToastModule
  ],
  declarations: []
})
export class AdminModule { }
