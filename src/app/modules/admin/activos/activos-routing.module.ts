import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { GridActivosComponent } from './grid-activos/grid-activos.component';
import { NuevoEditarActivoComponent } from './nuevo-editar-activo/nuevo-editar-activo.component';
import { DetalleActivoComponent } from './detalle-activo/detalle-activo.component';
import { CartaResponsivaActivoComponent } from './carta-responsiva-activo/carta-responsiva-activo.component';
import { ImportarActivosComponent } from './importar-activos/importar-activos.component';
import { GestionCategoriasComponent } from './gestion-categorias/gestion-categorias.component';
import { GestionSubalmacenesComponent } from './gestion-subalmacenes/gestion-subalmacenes.component';
import { ReportesActivosComponent } from './reportes-activos/reportes-activos.component';
import { AltaRapidaActivosComponent } from './alta-rapida-activos/alta-rapida-activos.component';
import { FormatoAltaComponent } from './formatos/formato-alta.component';
import { FormatoTransferenciaComponent } from './formatos/formato-transferencia.component';
import { FormatoBajaComponent } from './formatos/formato-baja.component';
import { GridColaboradoresComponent } from './grid-colaboradores/grid-colaboradores.component';
import { DetalleColaboradorComponent } from './detalle-colaborador/detalle-colaborador.component';

@NgModule({
  imports: [
    RouterModule.forChild([
      { path: '', redirectTo: 'activos', pathMatch: 'full' },
      { path: 'activos', component: GridActivosComponent, data: { breadcrumb: 'Activos' } },
      { path: 'crear', component: NuevoEditarActivoComponent, data: { breadcrumb: 'Crear Activo' } },
      { path: 'alta-rapida', component: AltaRapidaActivosComponent, data: { breadcrumb: 'Alta Rápida' } },
      { path: 'editar/:firestoreId', component: NuevoEditarActivoComponent, data: { breadcrumb: 'Editar Activo' } },
      { path: 'detalle/:firestoreId', component: DetalleActivoComponent, data: { breadcrumb: 'Detalle Activo' } },
      { path: 'carta/:firestoreId', component: CartaResponsivaActivoComponent, data: { breadcrumb: 'Carta Responsiva' } },
      { path: 'importar', component: ImportarActivosComponent, data: { breadcrumb: 'Importar Activos' } },
      { path: 'categorias', component: GestionCategoriasComponent, data: { breadcrumb: 'Categorías' } },
      { path: 'subalmacenes', component: GestionSubalmacenesComponent, data: { breadcrumb: 'Subalmacenes' } },
      { path: 'reportes', component: ReportesActivosComponent, data: { breadcrumb: 'Reportes' } },
      { path: 'formato-alta/:activoId', component: FormatoAltaComponent, data: { breadcrumb: 'Formato de Alta' } },
      { path: 'formato-transferencia/:movimientoId', component: FormatoTransferenciaComponent, data: { breadcrumb: 'Formato de Transferencia' } },
      { path: 'formato-baja/:activoId', component: FormatoBajaComponent, data: { breadcrumb: 'Formato de Baja' } },
      { path: 'colaboradores', component: GridColaboradoresComponent, data: { breadcrumb: 'Colaboradores con Activos' } },
      { path: 'colaborador/:empleadoId', component: DetalleColaboradorComponent, data: { breadcrumb: 'Detalle del Colaborador' } }
    ])
  ],
  exports: [RouterModule]
})
export class ActivosRoutingModule {}