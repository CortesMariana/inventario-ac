import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DialogModule } from 'primeng/dialog';

import { TicketsTecnicoRoutingModule } from './tickets-tecnico-routing.module';
import { MisTicketsTecnicoComponent } from './mis-tickets/mis-tickets.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    DropdownModule,
    InputTextModule,
    ButtonModule,
    ToastModule,
    ProgressSpinnerModule,
    DialogModule,
    TicketsTecnicoRoutingModule
  ],
  declarations: [MisTicketsTecnicoComponent],
  exports: [MisTicketsTecnicoComponent]
})
export class TicketsTecnicoModule {}