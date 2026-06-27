import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { isPedidoEnRevision, PedidosService } from '../../pedidos/pedidos.service';
import { ProduccionService } from '../../produccion/produccion.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  exact?: boolean;
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
export class SidebarComponent implements OnInit, OnDestroy {
  @Input() collapsed = false;
  @Output() collapsedChange = new EventEmitter<boolean>();

  readonly exactOptions = { exact: true };
  readonly defaultOptions = { exact: false };

  readonly inboxRoute = '/admin/inbox-pedidos';
  readonly productionRoute = '/admin/produccion/dashboard';

  pendingInboxCount = 0;
  productionAlertCount = 0;

  private destroy$ = new Subject<void>();

  navSections: NavSection[] = [
    {
      label: 'Principal',
      items: [
        { label: 'Dashboard', icon: 'pi pi-th-large', route: '/admin/reportes/dashboard' }
      ]
    },
    {
      label: 'Operación',
      items: [
        { label: 'Producción', icon: 'pi pi-bell', route: '/admin/produccion/dashboard' }
      ]
    },
    {
      label: 'Gestión',
      items: [
        { label: 'Clientes',   icon: 'pi pi-users',          route: '/admin/clientes' },
        { label: 'Inventario', icon: 'pi pi-box',             route: '/admin/inventario' },
        { label: 'Pedidos',    icon: 'pi pi-file-edit',      route: '/admin/pedidos' },
        { label: 'Inbox pedidos', icon: 'pi pi-inbox',       route: '/admin/inbox-pedidos', exact: true },
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

  constructor(
    private pedidosSrv: PedidosService,
    private produccionSrv: ProduccionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.pedidosSrv.getAll$()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (pedidos) => {
          this.pendingInboxCount = pedidos.filter(pedido => isPedidoEnRevision(pedido.estado)).length;
        },
        error: () => {
          this.pendingInboxCount = 0;
        }
      });

    this.produccionSrv.getDashboard$()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (dashboard) => {
          this.productionAlertCount = dashboard.alertasActivas;
        },
        error: () => {
          this.productionAlertCount = 0;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getRouterLinkActiveOptions(item: NavItem): { exact: boolean } {
    return item.exact ? this.exactOptions : this.defaultOptions;
  }

  isInboxActive(): boolean {
    return this.currentPath() === this.inboxRoute;
  }

  abrirInbox(event: MouseEvent): void {
    event.preventDefault();
    this.router.navigateByUrl(this.inboxRoute);
  }

  hasNavStatus(item: NavItem): boolean {
    if (item.route === this.inboxRoute) {
      return this.pendingInboxCount > 0;
    }

    if (item.route === this.productionRoute) {
      return this.productionAlertCount > 0;
    }

    return false;
  }

  private currentPath(): string {
    return this.stripUrl(this.router.url);
  }

  private stripUrl(url: string): string {
    return url.split('?')[0].split('#')[0];
  }
}
