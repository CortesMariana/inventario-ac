import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ProduccionRoutingModule } from './produccion-routing.module';
import { DashboardProduccionComponent } from './dashboard-produccion/dashboard-produccion.component';

@NgModule({
  declarations: [
    DashboardProduccionComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    ButtonModule,
    TagModule,
    ProduccionRoutingModule
  ]
})
export class ProduccionModule { }
