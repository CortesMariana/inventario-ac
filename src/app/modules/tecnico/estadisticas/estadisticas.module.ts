import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EstadisticasRoutingModule } from './estadisticas-routing.module';
import { PrimengModule } from 'src/app/primeng/primeng.module';
import { ComponentsModule } from '../../components/components.module';
import { PipesModule } from 'src/app/pipes/pipes.module';
import { ReactiveFormsModule } from '@angular/forms';
import { EstadisticasTecnicoComponent } from './estadisticas-tecnico/estadisticas-tecnico.component';

@NgModule({
  imports: [
    CommonModule,
    EstadisticasRoutingModule,
    PrimengModule,
    PipesModule,
    ComponentsModule,
    ReactiveFormsModule
  ],
  declarations: [
    EstadisticasTecnicoComponent
  ]
})
export class EstadisticasModule { }