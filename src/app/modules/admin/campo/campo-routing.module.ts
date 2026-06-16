import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { RecorridosComponent } from './recorridos/recorridos.component';
import { ReportesCampoComponent } from './reportes/reportes.component';

@NgModule({
    imports: [
        RouterModule.forChild([
            { path: '', redirectTo: 'recorridos', pathMatch: 'full' },
            { path: 'recorridos', data: { breadcrumb: 'Recorridos' }, component: RecorridosComponent },
            { path: 'reportes', data: { breadcrumb: 'Reportes' }, component: ReportesCampoComponent }
        ])
    ],
    exports: [RouterModule]
})
export class CampoRoutingModule {}