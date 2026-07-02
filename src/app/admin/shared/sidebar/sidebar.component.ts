import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { isPedidoEnRevision, PedidosService } from '../../pedidos/pedidos.service';
import { ProduccionService } from '../../produccion/produccion.service';
import { MermasService } from '../../mermas/mermas.service';

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
  readonly almacenRoute = '/admin/almacen';
  readonly mermasRoute = '/admin/mermas';

  pendingInboxCount = 0;
  productionAlertCount = 0;
  almacenAlertCount = 0;
  mermasCount = 0;

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
      label: 'Almacén',
      items: [
        { label: 'Almacén', icon: 'pi pi-warehouse', route: '/admin/almacen', exact: true }
      ]
    },
    {
      label: 'Gestión',
      items: [
        { label: 'Clientes',   icon: 'pi pi-users',          route: '/admin/clientes' },
        { label: 'Inventario', icon: 'pi pi-box',             route: '/admin/inventario' },
        { label: 'Mermas',     icon: 'pi pi-exclamation-circle', route: '/admin/mermas', exact: true },
        { label: 'Pedidos',    icon: 'pi pi-file-edit',      route: '/admin/pedidos' },
        { label: 'Inbox pedidos', icon: 'pi pi-inbox',       route: '/admin/inbox-pedidos', exact: true },
        { label: 'Entregas',   icon: 'pi pi-truck',           route: '/admin/entregas' },
      ]
    },
    {
      label: 'Gerencia',
      items: [
        { label: 'Analytics', icon: 'pi pi-chart-line', route: '/admin/reportes/analytics', exact: true }
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
    private mermasSrv: MermasService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.pedidosSrv.getAll$()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (pedidos) => {
          this.pendingInboxCount = pedidos.filter(pedido => isPedidoEnRevision(pedido.estado)).length;
          this.almacenAlertCount = pedidos.filter(pedido => pedido.estado === 'autorizado').length;
        },
        error: () => {
          this.pendingInboxCount = 0;
          this.almacenAlertCount = 0;
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

    this.mermasSrv.getMermas$()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (mermas) => {
          this.mermasCount = mermas.length;
        },
        error: () => {
          this.mermasCount = 0;
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

    if (item.route === this.almacenRoute) {
      return this.almacenAlertCount > 0;
    }

    if (item.route === this.mermasRoute) {
      return this.mermasCount > 0;
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
