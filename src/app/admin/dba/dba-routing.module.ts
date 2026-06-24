import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ConsolaDbaComponent } from './consola-dba/consola-dba.component';

const routes: Routes = [
  { path: '', component: ConsolaDbaComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DbaRoutingModule { }

