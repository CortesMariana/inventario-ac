import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subject, filter, takeUntil } from 'rxjs';

interface Theme {
  accent: string;
  accentLight: string;
  accentLightText: string;
}

interface SidebarTheme {
  name: string;
  bg: string;
}

interface BreadcrumbItem {
  label: string;
  icon: string;
  route?: string;
}

interface BreadcrumbRule {
  match: RegExp;
  crumbs: BreadcrumbItem[];
}

function hexToRgb(hex: string): string {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3
    ? normalized.split('').map(char => char + char).join('')
    : normalized;

  const int = Number.parseInt(value, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;

  return `${r}, ${g}, ${b}`;
}

const NAV_BREADCRUMBS: BreadcrumbRule[] = [
  {
    match: /^\/admin\/reportes(?:\/dashboard)?$/,
    crumbs: [
      { label: 'Principal', icon: 'pi pi-home', route: '/admin/reportes/dashboard' },
      { label: 'Dashboard', icon: 'pi pi-th-large' }
    ]
  },
  {
    match: /^\/admin\/reportes\/ventas$/,
    crumbs: [
      { label: 'Reportes', icon: 'pi pi-chart-bar', route: '/admin/reportes/dashboard' },
      { label: 'Ventas', icon: 'pi pi-chart-line' }
    ]
  },
  {
    match: /^\/admin\/reportes\/analytics$/,
    crumbs: [
      { label: 'Reportes', icon: 'pi pi-chart-bar', route: '/admin/reportes/dashboard' },
      { label: 'Analytics', icon: 'pi pi-chart-line' }
    ]
  },
  {
    match: /^\/admin\/reportes\/inventario$/,
    crumbs: [
      { label: 'Reportes', icon: 'pi pi-chart-bar', route: '/admin/reportes/dashboard' },
      { label: 'Inventario', icon: 'pi pi-box' }
    ]
  },
  {
    match: /^\/admin\/pedidos$/,
    crumbs: [
      { label: 'Gestión', icon: 'pi pi-sitemap', route: '/admin/pedidos' },
      { label: 'Pedidos', icon: 'pi pi-file-edit' }
    ]
  },
  {
    match: /^\/admin\/pedidos\/nuevo$/,
    crumbs: [
      { label: 'Gestión', icon: 'pi pi-sitemap', route: '/admin/pedidos' },
      { label: 'Pedidos', icon: 'pi pi-file-edit', route: '/admin/pedidos' },
      { label: 'Nuevo pedido', icon: 'pi pi-plus' }
    ]
  },
  {
    match: /^\/admin\/pedidos\/[^/]+\/editar$/,
    crumbs: [
      { label: 'Gestión', icon: 'pi pi-sitemap', route: '/admin/pedidos' },
      { label: 'Pedidos', icon: 'pi pi-file-edit', route: '/admin/pedidos' },
      { label: 'Editar pedido', icon: 'pi pi-pencil' }
    ]
  },
  {
    match: /^\/admin\/pedidos\/[^/]+$/,
    crumbs: [
      { label: 'Gestión', icon: 'pi pi-sitemap', route: '/admin/pedidos' },
      { label: 'Pedidos', icon: 'pi pi-file-edit', route: '/admin/pedidos' },
      { label: 'Detalle pedido', icon: 'pi pi-eye' }
    ]
  },
  {
    match: /^\/admin\/inbox-pedidos$/,
    crumbs: [
      { label: 'Gestión', icon: 'pi pi-sitemap', route: '/admin/inbox-pedidos' },
      { label: 'Inbox pedidos', icon: 'pi pi-inbox' }
    ]
  },
  {
    match: /^\/admin\/clientes$/,
    crumbs: [
      { label: 'Gestión', icon: 'pi pi-sitemap', route: '/admin/clientes' },
      { label: 'Clientes', icon: 'pi pi-users' }
    ]
  },
  {
    match: /^\/admin\/clientes\/nuevo$/,
    crumbs: [
      { label: 'Gestión', icon: 'pi pi-sitemap', route: '/admin/clientes' },
      { label: 'Clientes', icon: 'pi pi-users', route: '/admin/clientes' },
      { label: 'Nuevo cliente', icon: 'pi pi-user-plus' }
    ]
  },
  {
    match: /^\/admin\/clientes\/[^/]+\/editar$/,
    crumbs: [
      { label: 'Gestión', icon: 'pi pi-sitemap', route: '/admin/clientes' },
      { label: 'Clientes', icon: 'pi pi-users', route: '/admin/clientes' },
      { label: 'Editar cliente', icon: 'pi pi-user-edit' }
    ]
  },
  {
    match: /^\/admin\/clientes\/[^/]+$/,
    crumbs: [
      { label: 'Gestión', icon: 'pi pi-sitemap', route: '/admin/clientes' },
      { label: 'Clientes', icon: 'pi pi-users', route: '/admin/clientes' },
      { label: 'Detalle cliente', icon: 'pi pi-eye' }
    ]
  },
  {
    match: /^\/admin\/inventario$/,
    crumbs: [
      { label: 'Gestión', icon: 'pi pi-sitemap', route: '/admin/inventario' },
      { label: 'Inventario', icon: 'pi pi-box' }
    ]
  },
  {
    match: /^\/admin\/inventario\/nuevo$/,
    crumbs: [
      { label: 'Gestión', icon: 'pi pi-sitemap', route: '/admin/inventario' },
      { label: 'Inventario', icon: 'pi pi-box', route: '/admin/inventario' },
      { label: 'Nuevo producto', icon: 'pi pi-plus' }
    ]
  },
  {
    match: /^\/admin\/inventario\/[^/]+\/editar$/,
    crumbs: [
      { label: 'Gestión', icon: 'pi pi-sitemap', route: '/admin/inventario' },
      { label: 'Inventario', icon: 'pi pi-box', route: '/admin/inventario' },
      { label: 'Editar producto', icon: 'pi pi-pencil' }
    ]
  },
  {
    match: /^\/admin\/inventario\/[^/]+$/,
    crumbs: [
      { label: 'Gestión', icon: 'pi pi-sitemap', route: '/admin/inventario' },
      { label: 'Inventario', icon: 'pi pi-box', route: '/admin/inventario' },
      { label: 'Detalle producto', icon: 'pi pi-eye' }
    ]
  },
  {
    match: /^\/admin\/entregas$/,
    crumbs: [
      { label: 'Gestión', icon: 'pi pi-sitemap', route: '/admin/entregas' },
      { label: 'Entregas', icon: 'pi pi-truck' }
    ]
  },
  {
    match: /^\/admin\/entregas\/[^/]+$/,
    crumbs: [
      { label: 'Gestión', icon: 'pi pi-sitemap', route: '/admin/entregas' },
      { label: 'Entregas', icon: 'pi pi-truck', route: '/admin/entregas' },
      { label: 'Detalle entrega', icon: 'pi pi-eye' }
    ]
  },
  {
    match: /^\/admin\/produccion\/dashboard$/,
    crumbs: [
      { label: 'Operación', icon: 'pi pi-cog', route: '/admin/produccion/dashboard' },
      { label: 'Producción', icon: 'pi pi-bell' }
    ]
  },
  {
    match: /^\/admin\/almacen$/,
    crumbs: [
      { label: 'Almacén', icon: 'pi pi-warehouse', route: '/admin/almacen' },
      { label: 'Operación', icon: 'pi pi-sliders-h' }
    ]
  },
  {
    match: /^\/admin\/dba$/,
    crumbs: [
      { label: 'Sistema', icon: 'pi pi-shield', route: '/admin/dba' },
      { label: 'DBA', icon: 'pi pi-database' }
    ]
  },
  {
    match: /^\/admin\/usuarios$/,
    crumbs: [
      { label: 'Sistema', icon: 'pi pi-shield', route: '/admin/usuarios' },
      { label: 'Usuarios', icon: 'pi pi-user-edit' }
    ]
  },
  {
    match: /^\/admin\/usuarios\/nuevo$/,
    crumbs: [
      { label: 'Sistema', icon: 'pi pi-shield', route: '/admin/usuarios' },
      { label: 'Usuarios', icon: 'pi pi-user-edit', route: '/admin/usuarios' },
      { label: 'Nuevo usuario', icon: 'pi pi-user-plus' }
    ]
  },
  {
    match: /^\/admin\/usuarios\/[^/]+\/editar$/,
    crumbs: [
      { label: 'Sistema', icon: 'pi pi-shield', route: '/admin/usuarios' },
      { label: 'Usuarios', icon: 'pi pi-user-edit', route: '/admin/usuarios' },
      { label: 'Editar usuario', icon: 'pi pi-user-edit' }
    ]
  }
];

@Component({
    selector: 'app-navbar',
    templateUrl: './navbar.component.html',
    styleUrls: ['./navbar.component.css'],
    standalone: false
})
export class NavbarComponent implements OnInit, OnDestroy {

  @Input() collapsed = false;
  @Output() collapsedChange = new EventEmitter<boolean>();
  @Input() mobileMode = false;
  @Input() mobileOpen = false;
  @Output() mobileOpenChange = new EventEmitter<boolean>();

  themeVisible = false;
  breadcrumbs: BreadcrumbItem[] = [];

  accents: (Theme & { name: string })[] = [
    { name: 'Azul',    accent: '#3B82F6', accentLight: '#EEF4FF', accentLightText: '#1E40AF' },
    { name: 'Violeta', accent: '#7C3AED', accentLight: '#F5F0FF', accentLightText: '#5B21B6' },
    { name: 'Teal',    accent: '#0D9488', accentLight: '#F0FDFA', accentLightText: '#0F6E56' },
    { name: 'Rosa',    accent: '#DB2777', accentLight: '#FDF2F8', accentLightText: '#9D174D' },
    { name: 'Naranja', accent: '#EA580C', accentLight: '#FFF7ED', accentLightText: '#9A3412' },
    { name: 'Verde',   accent: '#16A34A', accentLight: '#F0FDF4', accentLightText: '#14532D' },
    { name: 'Índigo',  accent: '#4338CA', accentLight: '#EEF2FF', accentLightText: '#3730A3' },
    { name: 'Rojo',    accent: '#DC2626', accentLight: '#FEF2F2', accentLightText: '#991B1B' },
  ];

  sidebarThemes: SidebarTheme[] = [
    { name: 'Marino', bg: '#1E2A3A' },
    { name: 'Negro',  bg: '#111827' },
    { name: 'Gris',   bg: '#374151' },
    { name: 'Blanco', bg: '#FFFFFF' },
  ];

  selectedAccent = this.accents[0];
  selectedSidebar = this.sidebarThemes[0];
  private destroy$ = new Subject<void>();

  constructor(private router: Router) {}

  toggleSidebar(): void {
    if (this.mobileMode) {
      this.mobileOpenChange.emit(!this.mobileOpen);
      return;
    }

    this.collapsed = !this.collapsed;
    this.collapsedChange.emit(this.collapsed);
  }

  get menuButtonIcon(): string {
    if (this.mobileMode) {
      return this.mobileOpen ? 'pi pi-times' : 'pi pi-bars';
    }

    return 'pi pi-bars';
  }

  get menuButtonLabel(): string {
    if (this.mobileMode) {
      return this.mobileOpen ? 'Cerrar menú' : 'Abrir menú';
    }

    return this.collapsed ? 'Expandir menú' : 'Colapsar menú';
  }

  get themePanelStyle(): { width: string } {
    return {
      width: this.mobileMode ? 'min(86vw, 280px)' : '240px'
    };
  }

  toggleThemePanel(): void {
    this.themeVisible = !this.themeVisible;
  }

  applyAccent(accent: Theme & { name: string }): void {
    this.selectedAccent = accent;
    document.documentElement.style.setProperty('--accent', accent.accent);
    document.documentElement.style.setProperty('--accent-light', accent.accentLight);
    document.documentElement.style.setProperty('--accent-light-text', accent.accentLightText);
    document.documentElement.style.setProperty('--accent-rgb', hexToRgb(accent.accent));
    document.documentElement.style.setProperty('--accent-light-rgb', hexToRgb(accent.accentLight));
    document.documentElement.style.setProperty('--accent-light-text-rgb', hexToRgb(accent.accentLightText));
    this.saveTheme();
  }

  applySidebar(theme: SidebarTheme): void {
    this.selectedSidebar = theme;
    document.documentElement.style.setProperty('--sidebar-bg', theme.bg);
    this.saveTheme();
  }

  saveTheme(): void {
    localStorage.setItem('ac-theme', JSON.stringify({
      accent: this.selectedAccent,
      sidebar: this.selectedSidebar
    }));
  }

  loadTheme(): void {
    const saved = localStorage.getItem('ac-theme');
    if (!saved) return;
    try {
      const { accent, sidebar } = JSON.parse(saved);
      if (accent) this.applyAccent(accent);
      if (sidebar) this.applySidebar(sidebar);
    } catch {}
  }

  ngOnInit(): void {
    this.loadTheme();
    this.updateBreadcrumb(this.router.url);

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(event => this.updateBreadcrumb(event.urlAfterRedirects));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateBreadcrumb(url: string): void {
    const path = this.stripUrl(url);
    const matched = NAV_BREADCRUMBS.find(rule => rule.match.test(path));
    this.breadcrumbs = matched?.crumbs ?? this.fallbackBreadcrumb(path);
  }

  private fallbackBreadcrumb(path: string): BreadcrumbItem[] {
    if (!path || path === '/admin') {
      return [
        { label: 'Principal', icon: 'pi pi-home', route: '/admin/reportes/dashboard' },
        { label: 'Dashboard', icon: 'pi pi-th-large' }
      ];
    }

    const segments = path.split('/').filter(Boolean);
    const adminIndex = segments.indexOf('admin');
    const adminSegments = adminIndex >= 0 ? segments.slice(adminIndex + 1) : segments;

    if (!adminSegments.length) {
      return [
        { label: 'Principal', icon: 'pi pi-home', route: '/admin/reportes/dashboard' },
        { label: 'Dashboard', icon: 'pi pi-th-large' }
      ];
    }

    const section = adminSegments[0];
    const sectionLabel = this.humanizeSegment(section);
    const sectionIcon = this.iconForSection(section);
    const sectionRoute = this.routeForSection(section);
    const rest = adminSegments.slice(1);

    if (!rest.length) {
      return [
        { label: sectionLabel, icon: sectionIcon, route: sectionRoute },
        { label: 'Listado', icon: 'pi pi-list' }
      ];
    }

    const pageLabel = this.pageLabelFromSegments(rest);

    return [
      { label: sectionLabel, icon: sectionIcon, route: sectionRoute },
      { label: pageLabel, icon: this.iconForPage(rest) }
    ];
  }

  private pageLabelFromSegments(segments: string[]): string {
    const last = segments[segments.length - 1];

    if (last === 'nuevo') return 'Nuevo';
    if (last === 'editar') return 'Editar';
    if (last === 'dashboard') return 'Dashboard';

    if (this.looksLikeId(last)) {
      return segments.includes('editar') ? 'Editar' : 'Detalle';
    }

    return segments.map(segment => this.humanizeSegment(segment)).join(' ');
  }

  private iconForPage(segments: string[]): string {
    const last = segments[segments.length - 1];

    if (last === 'nuevo') return 'pi pi-plus';
    if (last === 'editar') return 'pi pi-pencil';
    if (last === 'dashboard') return 'pi pi-th-large';
    if (this.looksLikeId(last)) return 'pi pi-eye';

    return 'pi pi-file';
  }

  private routeForSection(section: string): string {
    const map: Record<string, string> = {
      clientes: '/admin/clientes',
      inventario: '/admin/inventario',
      pedidos: '/admin/pedidos',
      entregas: '/admin/entregas',
      reportes: '/admin/reportes/dashboard',
      produccion: '/admin/produccion/dashboard',
      almacen: '/admin/almacen',
      dba: '/admin/dba',
      usuarios: '/admin/usuarios',
      'inbox-pedidos': '/admin/inbox-pedidos'
    };

    return map[section] ?? '/admin/reportes';
  }

  private iconForSection(section: string): string {
    const map: Record<string, string> = {
      clientes: 'pi pi-users',
      inventario: 'pi pi-box',
      pedidos: 'pi pi-file-edit',
      entregas: 'pi pi-truck',
      reportes: 'pi pi-chart-bar',
      produccion: 'pi pi-bell',
      almacen: 'pi pi-warehouse',
      dba: 'pi pi-database',
      usuarios: 'pi pi-user-edit',
      'inbox-pedidos': 'pi pi-inbox'
    };

    return map[section] ?? 'pi pi-folder';
  }

  private humanizeSegment(segment: string): string {
    return segment
      .split('-')
      .filter(Boolean)
      .map(token => token.charAt(0).toUpperCase() + token.slice(1))
      .join(' ');
  }

  private looksLikeId(value: string): boolean {
    return /^[0-9]+$/.test(value) || /^[a-f0-9-]{6,}$/i.test(value);
  }

  private stripUrl(url: string): string {
    return url.split('?')[0].split('#')[0];
  }
}
