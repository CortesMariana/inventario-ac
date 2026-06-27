import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InboxPedidosComponent } from '../pedidos/inbox-pedidos/inbox-pedidos.component';

const routes: Routes = [
  { path: '', component: InboxPedidosComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class InboxPedidosRoutingModule { }
