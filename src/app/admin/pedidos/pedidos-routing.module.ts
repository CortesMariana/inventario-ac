import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { GridPedidosComponent } from './grid-pedidos/grid-pedidos.component';
import { DetallePedidosComponent } from './detalle-pedidos/detalle-pedidos.component';
import { NuevoEditarPedidosComponent } from './nuevo-editar-pedidos/nuevo-editar-pedidos.component';

const routes: Routes = [
  { path: '',       component: GridPedidosComponent },
  { path: 'nuevo',  component: NuevoEditarPedidosComponent },
  { path: ':id',    component: DetallePedidosComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PedidosRoutingModule { }