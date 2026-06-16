import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { EstadisticasTecnicoComponent } from './estadisticas-tecnico/estadisticas-tecnico.component';

@NgModule({
    imports: [
        RouterModule.forChild([
            { path: '', redirectTo: 'tickets', pathMatch: 'full' },
            { path: 'estadisticas', data: { breadcrumb: 'Mis Estadísticas' }, component: EstadisticasTecnicoComponent }
        ])
    ],
    exports: [RouterModule]
})
export class EstadisticasRoutingModule {}