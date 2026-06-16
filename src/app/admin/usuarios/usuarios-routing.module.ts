import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { GridUsuariosComponent } from './grid-usuarios/grid-usuarios.component';
import { NuevoEditarUsuariosComponent } from './nuevo-editar-usuarios/nuevo-editar-usuarios.component';

const routes: Routes = [
  { path: '',           component: GridUsuariosComponent },
  { path: 'nuevo',      component: NuevoEditarUsuariosComponent },
  { path: ':id/editar', component: NuevoEditarUsuariosComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class UsuariosRoutingModule { }