import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SidebarModule } from 'primeng/sidebar';

import { SidebarComponent } from './sidebar/sidebar.component';
import { NavbarComponent } from './navbar/navbar.component';
import { LayoutComponent } from './layout/layout.component';
import { ConfirmDialogComponent } from './confirm-dialog/confirm-dialog.component';

@NgModule({
  declarations: [
    SidebarComponent,
    NavbarComponent,
    LayoutComponent,
    ConfirmDialogComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    SidebarModule
  ],
  exports: [
    SidebarComponent,
    NavbarComponent,
    LayoutComponent,
    ConfirmDialogComponent
  ]
})
export class SharedModule { }