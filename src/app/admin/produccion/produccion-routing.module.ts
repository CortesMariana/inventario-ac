import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardProduccionComponent } from './dashboard-produccion/dashboard-produccion.component';

const routes: Routes = [
  { path: 'dashboard', component: DashboardProduccionComponent },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProduccionRoutingModule { }
