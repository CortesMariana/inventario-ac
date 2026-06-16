import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { EstadisticasTecnicoComponent } from './estadisticas-tecnico.component';
import { EstadisticasTecnicoRoutingModule } from './estadisticas-tecnico-routing.module';

@NgModule({
  imports: [
    CommonModule,
    EstadisticasTecnicoRoutingModule,
    
    ButtonModule,
    ProgressSpinnerModule
  ],
  declarations: [
    EstadisticasTecnicoComponent
  ]
})
export class EstadisticasTecnicoModule { }