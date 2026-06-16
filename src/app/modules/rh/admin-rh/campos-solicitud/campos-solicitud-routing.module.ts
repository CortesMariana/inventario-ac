import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { GridCamposComponent } from './grid-campos/grid-campos.component';
import { EditarCampoComponent } from './editar-campo/editar-campo.component';
import { TiposSolicitudComponent } from './tipos-solicitud/tipos-solicitud.component';

@NgModule({
  imports: [
    RouterModule.forChild([
      { path: '', component: GridCamposComponent, data: { breadcrumb: 'Campos' } },
      { path: 'nuevo', component: EditarCampoComponent, data: { breadcrumb: 'Nuevo Campo' } },
      { path: 'editar/:id', component: EditarCampoComponent, data: { breadcrumb: 'Editar Campo' } },
      { path: 'tipos', component: TiposSolicitudComponent, data: { breadcrumb: 'Tipos de Solicitud' } }
    ])
  ],
  exports: [RouterModule]
})
export class CamposSolicitudRoutingModule { }