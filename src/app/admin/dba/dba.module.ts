import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';

import { SharedModule } from '../shared/shared.module';
import { DbaRoutingModule } from './dba-routing.module';
import { ConsolaDbaComponent } from './consola-dba/consola-dba.component';

@NgModule({
  declarations: [
    ConsolaDbaComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ButtonModule,
    DropdownModule,
    InputTextModule,
    TableModule,
    TagModule,
    ToastModule,
    SharedModule,
    DbaRoutingModule
  ]
})
export class DbaModule { }

