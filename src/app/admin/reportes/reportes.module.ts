import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReportesRoutingModule } from './reportes-routing.module';
import { DashboardComponent } from './dashboard/dashboard.component';
import { ReporteVentasComponent } from './reporte-ventas/reporte-ventas.component';
import { ReporteInventarioComponent } from './reporte-inventario/reporte-inventario.component';
import { TooltipModule } from 'primeng/tooltip';

@NgModule({
  declarations: [
    DashboardComponent,
    ReporteVentasComponent,
    ReporteInventarioComponent
  ],
  imports: [
    CommonModule,
    TooltipModule,
    RouterModule,
    ReportesRoutingModule
  ]
})
export class ReportesModule { }