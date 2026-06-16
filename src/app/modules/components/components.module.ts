import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PrimengModule } from 'src/app/primeng/primeng.module';
import { PipesModule } from 'src/app/pipes/pipes.module';
import { HeaderPageComponent } from './header-page/header-page.component';

@NgModule({
  declarations: [
    HeaderPageComponent
    
  ],
  imports: [
    CommonModule,
    PrimengModule,
    PipesModule
  ],
  exports: [
    HeaderPageComponent
  ]
})
export class ComponentsModule { }
