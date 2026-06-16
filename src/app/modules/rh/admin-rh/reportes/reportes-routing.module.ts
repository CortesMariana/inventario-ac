import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ReportesComponent } from './reportes.component';

@NgModule({
  imports: [
    RouterModule.forChild([
      { path: '', component: ReportesComponent, data: { breadcrumb: 'Reportes' } }
    ])
  ],
  exports: [RouterModule]
})
export class ReportesRoutingModule { }