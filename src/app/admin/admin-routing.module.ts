import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LayoutComponent } from './shared/layout/layout.component';

const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      {
        path: 'clientes',
        loadChildren: () => import('./clientes/clientes.module').then(m => m.ClientesModule)
      },
      {
        path: 'inventario',
        loadChildren: () => import('./inventario/inventario.module').then(m => m.InventarioModule)
      },
      {
        path: 'pedidos',
        loadChildren: () => import('./pedidos/pedidos.module').then(m => m.PedidosModule)
      },
      {
        path: 'inbox-pedidos',
        loadChildren: () => import('./inbox-pedidos/inbox-pedidos.module').then(m => m.InboxPedidosModule)
      },
      {
        path: 'entregas',
        loadChildren: () => import('./entregas/entregas.module').then(m => m.EntregasModule)
      },
      {
        path: 'reportes',
        loadChildren: () => import('./reportes/reportes.module').then(m => m.ReportesModule)
      },
      {
        path: 'produccion',
        loadChildren: () => import('./produccion/produccion.module').then(m => m.ProduccionModule)
      },
      {
        path: 'almacen',
        loadChildren: () => import('./almacen/almacen.module').then(m => m.AlmacenModule)
      },
      {
        path: 'dba',
        loadChildren: () => import('./dba/dba.module').then(m => m.DbaModule)
      },
      {
        path: 'usuarios',
        loadChildren: () => import('./usuarios/usuarios.module').then(m => m.UsuariosModule)
      },
      {
        path: '',
        redirectTo: 'reportes',
        pathMatch: 'full'
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
