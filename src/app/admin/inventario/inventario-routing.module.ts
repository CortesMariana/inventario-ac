import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { GridInventarioComponent } from './grid-inventario/grid-inventario.component';
import { DetalleInventarioComponent } from './detalle-inventario/detalle-inventario.component';
import { NuevoEditarInventarioComponent } from './nuevo-editar-inventario/nuevo-editar-inventario.component';

const routes: Routes = [
  { path: '',             component: GridInventarioComponent },
  { path: 'nuevo',        component: NuevoEditarInventarioComponent },
  { path: ':id',          component: DetalleInventarioComponent },
  { path: ':id/editar',   component: NuevoEditarInventarioComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class InventarioRoutingModule { }