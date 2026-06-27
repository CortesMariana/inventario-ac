import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';
import { ProduccionRoutingModule } from './produccion-routing.module';
import { DashboardProduccionComponent } from './dashboard-produccion/dashboard-produccion.component';

@NgModule({
  declarations: [
    DashboardProduccionComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    ButtonModule,
    CheckboxModule,
    InputNumberModule,
    InputTextModule,
    ToastModule,
    TagModule,
    ProduccionRoutingModule
  ],
  providers: [
    MessageService
  ]
})
export class ProduccionModule { }
