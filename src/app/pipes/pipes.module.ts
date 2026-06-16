import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FirestoreDatePipe } from './firestore-date.pipe';
import { MaxVehiculosPipe } from './max-vehiculos.pipe';

@NgModule({
  imports: [
    CommonModule,
  ],
  declarations: [
    FirestoreDatePipe,
    MaxVehiculosPipe
  ],
  exports: [
    FirestoreDatePipe,
    MaxVehiculosPipe
  ]
})
export class PipesModule { }
