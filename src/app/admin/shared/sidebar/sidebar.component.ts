import { Component, EventEmitter, Input, Output } from '@angular/core';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

@Component({
    selector: 'app-sidebar',
    templateUrl: './sidebar.component.html',
    styleUrls: ['./sidebar.component.css'],
    standalone: false
})
export class SidebarComponent {
  @Input() collapsed = false;
  @Output() collapsedChange = new EventEmitter<boolean>();

  activeOptions = { exact: false }

  navSections: NavSection[] = [
    {
      label: 'Principal',
      items: [
        { label: 'Dashboard', icon: 'pi pi-th-large', route: '/admin/reportes/dashboard' }
      ]
    },
    {
      label: 'Operacion',
      items: [
        { label: 'Produccion', icon: 'pi pi-bell', route: '/admin/produccion/dashboard' }
      ]
    },
    {
      label: 'Gestión',
      items: [
        { label: 'Clientes',   icon: 'pi pi-users',          route: '/admin/clientes' },
        { label: 'Inventario', icon: 'pi pi-box',             route: '/admin/inventario' },
        { label: 'Pedidos',    icon: 'pi pi-file-edit',       route: '/admin/pedidos' },
        { label: 'Entregas',   icon: 'pi pi-truck',           route: '/admin/entregas' },
      ]
    },
    {
      label: 'Reportes',
      items: [
        { label: 'Reportes', icon: 'pi pi-chart-bar', route: '/admin/reportes' }
      ]
    },
    {
      label: 'Sistema',
      items: [
        { label: 'DBA', icon: 'pi pi-database', route: '/admin/dba' },
        { label: 'Usuarios', icon: 'pi pi-user-edit', route: '/admin/usuarios' }
      ]
    }
  ];
}
