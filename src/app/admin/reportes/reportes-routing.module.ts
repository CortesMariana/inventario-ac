import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { ReporteVentasComponent } from './reporte-ventas/reporte-ventas.component';
import { ReporteInventarioComponent } from './reporte-inventario/reporte-inventario.component';

const routes: Routes = [
  { path: 'dashboard',  component: DashboardComponent },
  { path: 'ventas',     component: ReporteVentasComponent },
  { path: 'inventario', component: ReporteInventarioComponent },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ReportesRoutingModule { }