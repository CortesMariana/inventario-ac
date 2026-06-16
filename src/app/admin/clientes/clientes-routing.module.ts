import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { GridClientesComponent } from './grid-clientes/grid-clientes.component';
import { DetalleClientesComponent } from './detalle-clientes/detalle-clientes.component';
import { NuevoEditarClientesComponent } from './nuevo-editar-clientes/nuevo-editar-clientes.component';

const routes: Routes = [
  { path: '',        component: GridClientesComponent },
  { path: 'nuevo',   component: NuevoEditarClientesComponent },
  { path: ':id',     component: DetalleClientesComponent },
  { path: ':id/editar', component: NuevoEditarClientesComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ClientesRoutingModule { }