import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CalendarModule } from 'primeng/calendar';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { ReportesComponent } from './reportes.component';
import { ReportesRoutingModule } from './reportes-routing.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReportesRoutingModule,
    
    TableModule,
    ButtonModule,
    CalendarModule,
    ProgressSpinnerModule
  ],
  declarations: [
    ReportesComponent
  ]
})
export class ReportesModule { }