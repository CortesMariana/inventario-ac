import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CampoRoutingModule } from './campo-routing.module';
import { PrimengModule } from 'src/app/primeng/primeng.module';
import { PipesModule } from 'src/app/pipes/pipes.module';
import { ComponentsModule } from "../../components/components.module";
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RecorridosComponent } from './recorridos/recorridos.component';
import { ReportesCampoComponent } from './reportes/reportes.component';

@NgModule({
  imports: [
    CommonModule,
    CampoRoutingModule,
    PrimengModule,
    PipesModule,
    ComponentsModule,
    ReactiveFormsModule,
    FormsModule
  ],
  declarations: [
    RecorridosComponent,
    ReportesCampoComponent
  ], 
  exports: [
    RecorridosComponent,
    ReportesCampoComponent
  ]
})
export class CampoModule { }