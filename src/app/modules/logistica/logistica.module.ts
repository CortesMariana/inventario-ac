import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LogisticaRoutingModule } from './logistica-routing.module';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

@NgModule({
  providers: [MessageService],
  imports: [
    CommonModule,
    LogisticaRoutingModule,
    ToastModule,
    ConfirmDialogModule
  ],
  declarations: []
})
export class LogisticaModule {}