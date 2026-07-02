import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MermasRoutingModule } from './mermas-routing.module';
import { GridMermasComponent } from './grid-mermas/grid-mermas.component';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@NgModule({
  declarations: [
    GridMermasComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MermasRoutingModule,
    ButtonModule,
    InputTextModule,
    TagModule,
    ToastModule
  ],
  providers: [
    MessageService
  ]
})
export class MermasModule { }
