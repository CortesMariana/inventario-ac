import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { GridVehiculosComponent } from './grid-vehiculos/grid-vehiculos.component';
import { CrearVehiculoComponent } from './crear-vehiculo/crear-vehiculo.component';
import { DetalleVehiculoComponent } from './detalle-vehiculo/detalle-vehiculo.component';
import { GridColaboradoresComponent } from './grid-colaboradores/grid-colaboradores.component';
import { DetalleColaboradorComponent } from './detalle-colaborador/detalle-colaborador.component';
import { ReportesComponent } from './reportes/reportes.component';
import { CartaResponsivaVehiculoComponent } from './carta-responsiva/carta-responsiva.component';

const routes: Routes = [
  { path: '', redirectTo: 'grid', pathMatch: 'full' },
  { path: 'grid', component: GridVehiculosComponent, data: { breadcrumb: 'Vehículos' } },
  { path: 'crear', component: CrearVehiculoComponent, data: { breadcrumb: 'Crear Vehículo' } },
  { path: 'editar/:firestoreId', component: CrearVehiculoComponent, data: { breadcrumb: 'Editar Vehículo' } },
  { path: 'detalle/:firestoreId', component: DetalleVehiculoComponent, data: { breadcrumb: 'Detalle Vehículo' } },
  { path: 'colaboradores', component: GridColaboradoresComponent, data: { breadcrumb: 'Colaboradores con Vehículos' } },
  { path: 'detalle-colaborador/:empleadoId', component: DetalleColaboradorComponent, data: { breadcrumb: 'Detalle Colaborador' } },
  { path: 'reportes', component: ReportesComponent, data: { breadcrumb: 'Reportes de Vehículos' } },
  { path: 'carta-responsiva/:vehiculoId', component: CartaResponsivaVehiculoComponent, data: { breadcrumb: 'Carta Responsiva' } }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class VehiculosRoutingModule {}