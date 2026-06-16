import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { GridInsumosComponent } from './grid-insumos/grid-insumos.component';
import { NuevoEditarInsumoComponent } from './nuevo-editar-insumo/nuevo-editar-insumo.component';
import { DetalleInsumoComponent } from './detalle-insumo/detalle-insumo.component';

@NgModule({
  imports: [
    RouterModule.forChild([
      { path: '', redirectTo: 'insumos', pathMatch: 'full' },
      { path: 'insumos', data: { breadcrumb: 'Insumos' }, component: GridInsumosComponent },
      { path: 'crear', data: { breadcrumb: 'Nuevo Insumo' }, component: NuevoEditarInsumoComponent },
      { path: 'editar/:firestoreId', data: { breadcrumb: 'Editar Insumo' }, component: NuevoEditarInsumoComponent },
      { path: 'detalle/:firestoreId', data: { breadcrumb: 'Detalle Insumo' }, component: DetalleInsumoComponent }
    ])
  ],
  exports: [RouterModule]
})
export class InsumosRoutingModule { }