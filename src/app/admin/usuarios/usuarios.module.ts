import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { UsuariosRoutingModule } from './usuarios-routing.module';
import { GridUsuariosComponent } from './grid-usuarios/grid-usuarios.component';
import { NuevoEditarUsuariosComponent } from './nuevo-editar-usuarios/nuevo-editar-usuarios.component';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { DropdownModule } from 'primeng/dropdown';
import { ToastModule } from 'primeng/toast';
import { PasswordModule } from 'primeng/password';
import { ConfirmationService, MessageService } from 'primeng/api';
import { TooltipModule } from 'primeng/tooltip';
import { SharedModule } from '../shared/shared.module';

@NgModule({
  declarations: [
    GridUsuariosComponent,
    NuevoEditarUsuariosComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    UsuariosRoutingModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    TagModule,
    DropdownModule,
    ToastModule,
    TooltipModule,
    PasswordModule,
    FormsModule,
    SharedModule
  ],
  providers: [
    ConfirmationService
  ]
})
export class UsuariosModule { }