import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { GridMermasComponent } from './grid-mermas/grid-mermas.component';

const routes: Routes = [
  {
    path: '',
    component: GridMermasComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MermasRoutingModule { }
