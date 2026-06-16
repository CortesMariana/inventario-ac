import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

@NgModule({
  imports: [
    RouterModule.forChild([
      { path: '', redirectTo: 'solicitudes', pathMatch: 'full' },
      { path: 'solicitudes', loadChildren: () => import('./solicitudes-asignadas/solicitudes-asignadas.module').then(m => m.SolicitudesAsignadasModule) },
      { path: 'estadisticas', loadChildren: () => import('./estadisticas-tecnico/estadisticas-tecnico.module').then(m => m.EstadisticasTecnicoModule) }
    ])
  ],
  exports: [RouterModule]
})
export class TecnicoRhRoutingModule { }