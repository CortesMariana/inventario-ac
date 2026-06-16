import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { GridEntregasComponent } from './grid-entregas/grid-entregas.component';
import { DetalleEntregasComponent } from './detalle-entregas/detalle-entregas.component';

const routes: Routes = [
  { path: '',    component: GridEntregasComponent },
  { path: ':id', component: DetalleEntregasComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class EntregasRoutingModule { }