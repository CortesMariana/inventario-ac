import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { SeleccionDepartamentoComponent } from './seleccion-departamento.component';

@NgModule({
  declarations: [
    SeleccionDepartamentoComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild([
      { path: '', component: SeleccionDepartamentoComponent }
    ]),
    ButtonModule,
    RippleModule
  ]
})
export class SeleccionDepartamentoModule { }