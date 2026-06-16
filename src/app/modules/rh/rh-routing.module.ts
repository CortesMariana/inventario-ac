import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';

@NgModule({
  imports: [
    RouterModule.forChild([
      { path: '', loadChildren: () => import('./solicitudes/solicitudes.module').then(m => m.SolicitudesModule) },
      { path: 'admin', loadChildren: () => import('./admin-rh/admin-rh.module').then(m => m.AdminRhModule) },
      { path: 'tecnico', loadChildren: () => import('./tecnico-rh/tecnico-rh.module').then(m => m.TecnicoRhModule) },
      { path: '**', redirectTo: '/notfound' }
    ])
  ],
  exports: [RouterModule]
})
export class RhRoutingModule { }