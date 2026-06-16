import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { GridTecnicosComponent } from './grid-tecnicos/grid-tecnicos.component';

@NgModule({
    imports: [
        RouterModule.forChild([
            { path: '', redirectTo: 'tecnicos', pathMatch: 'full' },
            { path: 'tecnicos', data: { breadcrumb: 'Técnicos' }, component: GridTecnicosComponent },
        ])
    ],
    exports: [RouterModule]
})
export class TecnicosRoutingModule {}