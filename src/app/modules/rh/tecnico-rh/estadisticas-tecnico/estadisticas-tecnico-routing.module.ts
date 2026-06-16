import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { EstadisticasTecnicoComponent } from './estadisticas-tecnico.component';

@NgModule({
  imports: [
    RouterModule.forChild([
      { path: '', component: EstadisticasTecnicoComponent, data: { breadcrumb: 'Estadísticas' } }
    ])
  ],
  exports: [RouterModule]
})
export class EstadisticasTecnicoRoutingModule { }