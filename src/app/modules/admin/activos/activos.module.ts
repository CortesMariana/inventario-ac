import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { ActivosRoutingModule } from './activos-routing.module';

import { PrimengModule } from 'src/app/primeng/primeng.module';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { TooltipModule } from 'primeng/tooltip';
import { TableModule } from 'primeng/table';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputMaskModule } from 'primeng/inputmask';
import { KeyFilterModule } from 'primeng/keyfilter';
import { SelectButtonModule } from 'primeng/selectbutton';
import { DialogModule } from 'primeng/dialog';
import { BlockUIModule } from 'primeng/blockui';

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

import { PipesModule } from 'src/app/pipes/pipes.module';
import { TruncatePipe } from 'src/app/pipes/truncate.pipe';
import { FileSizePipe } from 'src/app/pipes/filesize.pipe';

import { ComponentsModule } from '../../components/components.module';
import { GridColaboradoresComponent } from './grid-colaboradores/grid-colaboradores.component';
import { DetalleColaboradorComponent } from './detalle-colaborador/detalle-colaborador.component';
import { CurrencyFormatPipe } from 'src/app/pipes/currency-format.pipe';

@NgModule({
  declarations: [
    GridActivosComponent,
    NuevoEditarActivoComponent,
    DetalleActivoComponent,
    GridColaboradoresComponent,
    DetalleColaboradorComponent,
    TruncatePipe,
    CurrencyFormatPipe,
    FileSizePipe,
    CartaResponsivaActivoComponent,
    ImportarActivosComponent,
    GestionCategoriasComponent,
    GestionSubalmacenesComponent,
    ReportesActivosComponent,
    AltaRapidaActivosComponent,
    FormatoAltaComponent,
    FormatoTransferenciaComponent,
    FormatoBajaComponent
  ],
  imports: [
    CommonModule,
    ActivosRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    PrimengModule,
    ToastModule,
    ConfirmDialogModule,
    ProgressSpinnerModule,
    InputTextModule,
    DropdownModule,
    TooltipModule,
    TableModule,
    InputNumberModule,
    InputMaskModule,
    KeyFilterModule,
    SelectButtonModule,
    DialogModule,
    BlockUIModule,
    PipesModule,
    ComponentsModule
  ]
})
export class ActivosModule { }