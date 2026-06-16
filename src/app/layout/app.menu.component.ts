import { OnInit } from '@angular/core';
import { Component } from '@angular/core';
import { UserService } from '../shared/service/user.service';
import { OAuthService } from 'angular-oauth2-oidc';
import { Router, RouterLink } from '@angular/router';
import { DepartamentoService, Departamento } from '../shared/service/departamento.service';

@Component({
  selector: 'app-menu',
  templateUrl: './app.menu.component.html',
  styleUrls: ['./app.menu.component.css']
})
export class AppMenuComponent implements OnInit {
  model: any[] = [];
  usuario!: any;
  esAdministrador: boolean = false;
  esTecnico: boolean = false;
  esAdminActivos: boolean = false;
  esAdminInsumos: boolean = false;

  esUsuarioRH: boolean = false;
  esAdminRH: boolean = false;

  esAdminLogistica: boolean = false;
  esAdminVehiculos: boolean = false;
  esOperadorLogistica: boolean = false;
  esAutorizadorTickets: boolean = false;
  esCompletaInsumos: boolean = false;
  esCompletaReparacion: boolean = false;
  esAutorizadorGasolina: boolean = false;
  departamentoActual: Departamento = null;

  menuState: { [key: string]: boolean } = {
    tickets: false,
    campo: false,
    activos: false,
    tecnicos: false,
    solicitudes: false,
    insumos: false,
    vehiculos: false
  };

  constructor(
    private userSrv: UserService,
    private oauthService: OAuthService,
    private router: Router,
    private deptoSrv: DepartamentoService
  ) {}

  ngOnInit() {
    this.deptoSrv.departamento$.subscribe(depto => {
      this.departamentoActual = depto;
      this.construirMenuBase();
      if (this.usuario && this.usuario.id) {
        this.validarPermisosPorDepartamento();
      }
    });

    this.construirMenuBase();

    this.getUsuario().subscribe((data) => {
      this.usuario = data;
      if (data && this.usuario.id && this.departamentoActual) {
        this.validarPermisosPorDepartamento();
      }
    });
  }

  private construirMenuBase() {
    let menuBase: any[] = [
      {
        label: 'MENÚ PRINCIPAL',
        icon: 'pi pi-fw pi-home',
        items: [
          {
            label: this.departamentoActual === 'RH' ? 'Nueva Solicitud' :
                    this.departamentoActual === 'LOGISTICA' ? 'Nuevo Ticket' : 'Crear ticket',
            icon: this.departamentoActual === 'RH' ? 'pi pi-file-plus' :
                  this.departamentoActual === 'LOGISTICA' ? 'pi pi-plus' : 'pi pi-plus',
            routerLink: this.departamentoActual === 'RH' ? ['/rh/nueva-solicitud'] :
                       this.departamentoActual === 'LOGISTICA' ? ['/logistica/tickets/nuevo'] : ['/']
          },
          {
            label: this.departamentoActual === 'RH' ? 'Mis Solicitudes' :
                    this.departamentoActual === 'LOGISTICA' ? 'Mis Solicitudes' : 'Mis Tickets',
            icon: this.departamentoActual === 'RH' ? 'pi pi-file' :
                  this.departamentoActual === 'LOGISTICA' ? 'pi pi-list' : 'pi pi-ticket',
            routerLink: this.departamentoActual === 'RH' ? ['/rh/mis-solicitudes'] :
                       this.departamentoActual === 'LOGISTICA' ? ['/logistica/tickets/mis-solicitudes'] : ['/mis-tickets']
          },
          {
            label: 'Cerrar Sesión',
            icon: 'pi pi-sign-out',
            command: () => this.cerrarSesion()
          }
        ]
      },
      {
        label: 'DEPARTAMENTO',
        icon: 'pi pi-building',
        items: [
          {
            label: 'TI - Ir a Tecnologías de la Información',
            icon: 'pi pi-desktop',
            visible: this.departamentoActual !== 'TI',
            command: () => this.cambiarDepartamento('TI'),
            badge: this.departamentoActual === 'TI' ? 'Actual' : null
          },
          {
            label: 'RH - Ir a Recursos Humanos',
            icon: 'pi pi-users',
            visible: this.departamentoActual !== 'RH',
            command: () => this.cambiarDepartamento('RH'),
            badge: this.departamentoActual === 'RH' ? 'Actual' : null
          },
          {
            label: 'LOGÍSTICA - Ir a Logística',
            icon: 'pi pi-truck',
            visible: this.departamentoActual !== 'LOGISTICA',
            command: () => this.cambiarDepartamento('LOGISTICA'),
            badge: this.departamentoActual === 'LOGISTICA' ? 'Actual' : null
          },
          {
            label: 'Cambiar de departamento',
            icon: 'pi pi-arrow-right-arrow-left',
            command: () => this.irSeleccionDepartamento(),
            separator: true
          }
        ]
      }
    ];

    this.model = menuBase;
  }

  irSeleccionDepartamento() {
    console.log('Navegando a selección de departamento');
    this.deptoSrv.clearDepartamento();
    this.router.navigate(['/seleccionar-departamento']);
  }

  cambiarDepartamento(depto: Departamento) {
    console.log('Cambiando a departamento:', depto);
    this.deptoSrv.setDepartamento(depto);

    if (depto === 'TI') {
      this.router.navigate(['/']);
    } else if (depto === 'RH') {
      this.router.navigate(['/rh']);
    } else if (depto === 'LOGISTICA') {
      this.router.navigate(['/logistica']);
    }
  }

  getSectionKey(label: string): string {
    const map: { [key: string]: string } = {
      'Gestión de Tickets': 'tickets',
      'Trabajo en Campo': 'campo',
      'Activos': 'activos',
      'Técnicos': 'tecnicos',
      'Gestión de Solicitudes': 'solicitudes',
      'Insumos': 'insumos',
      'Vehículos': 'vehiculos'
    };
    return map[label] || '';
  }

  toggleSection(section: string) {
    this.menuState[section] = !this.menuState[section];
    this.actualizarExpandedEnModel();
  }

  actualizarExpandedEnModel() {
    const menuAdminTI = this.model.find(item => item.label === 'ADMINISTRACIÓN TI');
    if (menuAdminTI) {
      menuAdminTI.items.forEach((item: any) => {
        if (item.label === 'Gestión de Tickets') {
          item.expanded = this.menuState['tickets'];
        } else if (item.label === 'Trabajo en Campo') {
          item.expanded = this.menuState['campo'];
        } else if (item.label === 'Activos') {
          item.expanded = this.menuState['activos'];
        } else if (item.label === 'Técnicos') {
          item.expanded = this.menuState['tecnicos'];
        } else if (item.label === 'Insumos') {
          item.expanded = this.menuState['insumos'];
        }
      });
    }

    const menuAdminRH = this.model.find(item => item.label === 'ADMINISTRACIÓN RH');
    if (menuAdminRH) {
      menuAdminRH.items.forEach((item: any) => {
        if (item.label === 'Gestión de Solicitudes') {
          item.expanded = this.menuState['solicitudes'];
        }
      });
    }

    const menuAdminLogistica = this.model.find(item => item.label === 'ADMINISTRACIÓN LOGÍSTICA');
    if (menuAdminLogistica) {
      menuAdminLogistica.items.forEach((item: any) => {
        if (item.label === 'Vehículos') {
          item.expanded = this.menuState['vehiculos'];
        }
      });
    }
  }

  isActiveRoute(route: string): boolean {
    if (!route) return false;
    return this.router.isActive(route, {
      paths: 'exact',
      queryParams: 'ignored',
      fragment: 'ignored',
      matrixParams: 'ignored'
    });
  }

  cerrarSesion() {
    console.log('Cerrar Sesión');
    this.deptoSrv.clearDepartamento();
    this.oauthService.logOut();
  }

  validarPermisosPorDepartamento() {
    if (!this.usuario || !this.usuario.id || !this.departamentoActual) return;

    if (this.departamentoActual === 'TI') {
      Promise.all([
        this.userSrv.esAdminEnDepartamento(this.usuario.id, 'TI'),
        this.userSrv.esTecnicoEnTI(this.usuario.id, 'TI'),
        this.userSrv.esAdminActivosEnTI(this.usuario.id, 'TI'),
        this.userSrv.esAdminInsumosEnTI(this.usuario.id, 'TI')
      ]).then(([esAdmin, esTecnico, esAdminActivos, esAdminInsumos]) => {
        this.esAdministrador = esAdmin;
        this.esTecnico = esTecnico;
        this.esAdminActivos = esAdminActivos;
        this.esAdminInsumos = esAdminInsumos;

        if (esAdmin || esAdminActivos || esAdminInsumos) {
          this.agregarMenuAdminTI();
        }

        if (esTecnico) {
          this.agregarMenuTecnicoTI();
        }
      }).catch(error => {
        console.error('Error validando permisos TI:', error);
      });
    } else if (this.departamentoActual === 'RH') {
      Promise.all([
        this.userSrv.esAdminRH(this.usuario.id, 'RH'),
        this.userSrv.esUsuarioRH(this.usuario.id, 'RH')
      ]).then(([esAdmin, esUsuario]) => {
        this.esAdminRH = esAdmin;
        this.esUsuarioRH = esUsuario;

        if (esAdmin) {
          this.agregarMenuAdminRH();
        }
        if (esUsuario) {
          this.agregarMenuTecnicoRH();
        }
      }).catch(error => {
        console.error('Error validando permisos RH:', error);
      });
    } else if (this.departamentoActual === 'LOGISTICA') {
      Promise.all([
        this.userSrv.esAdminEnDepartamento(this.usuario.id, 'LOGISTICA'),
        this.userSrv.esAdminVehiculosEnLogistica(this.usuario.id, 'LOGISTICA'),
        this.userSrv.esOperadorLogistica(this.usuario.id, 'LOGISTICA'),
        this.userSrv.esAutorizadorTicketsLogistica(this.usuario.id),
        this.userSrv.esResponsableCompletarInsumosLogistica(this.usuario.id),
        this.userSrv.esResponsableCompletarReparacionLogistica(this.usuario.id),
        this.userSrv.esAutorizadorGasolina(this.usuario.id),
      ]).then(([esAdmin, esAdminVehiculos, esOperador, esAutorizador, esCompletaInsumos, esCompletaReparacion, esAutorizadorGas]) => {
        this.esAdminLogistica      = esAdmin;
        this.esAdminVehiculos      = esAdminVehiculos;
        this.esAutorizadorTickets  = esAutorizador;
        this.esCompletaInsumos     = esCompletaInsumos;
        this.esCompletaReparacion  = esCompletaReparacion;
        this.esAutorizadorGasolina = esAutorizadorGas;

        if (esAdmin || esAdminVehiculos || esAutorizador || esCompletaInsumos || esCompletaReparacion || esAutorizadorGas) {
          this.agregarMenuAdminLogistica();
        }
      }).catch(error => {
        console.error('Error validando permisos LOGÍSTICA:', error);
      });
    }
  }

  private agregarMenuAdminTI() {
    const existeMenuAdmin = this.model.some(item => item.label === 'ADMINISTRACIÓN TI');

    if (!existeMenuAdmin) {
      const indexDepto = this.model.findIndex(item => item.label === 'DEPARTAMENTO');

      const menuItems: any[] = [];

      if (this.esAdministrador) {
        menuItems.push({
          label: 'Gestión de Tickets',
          icon: 'pi pi-fw pi-ticket',
          expanded: this.menuState['tickets'],
          items: [
            { label: 'Crear Ticket', icon: 'pi pi-plus', routerLink: ['/admin/tickets/crear'] },
            { label: 'Todos los Tickets', icon: 'pi pi-list', routerLink: ['/admin/tickets/tickets'] },
            { label: 'Asignar Tickets', icon: 'pi pi-user-edit', routerLink: ['/admin/tickets/asignar'] },
            { label: 'Reportes', icon: 'pi pi-chart-line', routerLink: ['/admin/tickets/reportes'] }
          ]
        });

        menuItems.push({
          label: 'Trabajo en Campo',
          icon: 'pi pi-car',
          expanded: this.menuState['campo'],
          items: [
            { label: 'Recorridos', icon: 'pi pi-gauge', routerLink: ['/admin/campo/recorridos'] }
          ]
        });
      }

      if (this.esAdministrador || this.esAdminActivos) {
        menuItems.push({
          label: 'Activos',
          icon: 'pi pi-desktop',
          expanded: this.menuState['activos'],
          items: [
            { label: 'Todos los activos', icon: 'pi pi-list-check', routerLink: ['/admin/activos/activos'] },
            { label: 'Agregar activo', icon: 'pi pi-plus', routerLink: ['/admin/activos/crear'] },
            { label: 'Colaboradores', icon: 'pi pi-users', routerLink: ['/admin/activos/colaboradores'] },
            { label: 'Importar', icon: 'pi pi-upload', routerLink: ['/admin/activos/importar'] },
            { label: 'Categorías', icon: 'pi pi-tags', routerLink: ['/admin/activos/categorias'] },
            { label: 'Subalmacenes', icon: 'pi pi-building', routerLink: ['/admin/activos/subalmacenes'] },
            { label: 'Reportes', icon: 'pi pi-chart-bar', routerLink: ['/admin/activos/reportes'] },
            { label: 'Alta Rápida', icon: 'pi pi-bolt', routerLink: ['/admin/activos/alta-rapida'] }
          ]
        });
      }

      if (this.esAdministrador || this.esAdminInsumos) {
        menuItems.push({
          label: 'Insumos',
          icon: 'pi pi-box',
          expanded: this.menuState['insumos'],
          items: [
            { label: 'Todos los Insumos', icon: 'pi pi-list', routerLink: ['/admin/insumos/insumos'] },
            { label: 'Agregar Insumo', icon: 'pi pi-plus', routerLink: ['/admin/insumos/crear'] }
          ]
        });
      }

      if (this.esAdministrador) {
        menuItems.push({
          label: 'Técnicos',
          icon: 'pi pi-users',
          expanded: this.menuState['tecnicos'],
          items: [
            { label: 'Técnicos', icon: 'pi pi-users', routerLink: ['/admin/tecnicos/tecnicos'] }
          ]
        });
      }

      if (menuItems.length > 0) {
        const menuAdmin = {
          label: 'ADMINISTRACIÓN TI',
          icon: 'pi pi-fw pi-key',
          items: menuItems
        };

        if (indexDepto !== -1) {
          this.model.splice(indexDepto, 0, menuAdmin);
        } else {
          this.model.push(menuAdmin);
        }
      }
    }
  }

  private agregarMenuTecnicoTI() {
    const existeMenuTecnico = this.model.some(item => item.label === 'TÉCNICO TI');

    if (!existeMenuTecnico) {
      const indexDepto = this.model.findIndex(item => item.label === 'DEPARTAMENTO');

      const menuTecnico = {
        label: 'TÉCNICO TI',
        icon: 'pi pi-fw pi-wrench',
        items: [
          { label: 'Crear Ticket', icon: 'pi pi-plus', routerLink: ['/tecnico/tickets/crear-ticket'] },
          { label: 'Mis Tickets', icon: 'pi pi-list', routerLink: ['/tecnico/tickets/tickets'] },
          { label: 'Mis Estadísticas', icon: 'pi pi-chart-pie', routerLink: ['/tecnico/estadisticas/estadisticas'] }
        ]
      };

      if (indexDepto !== -1) {
        this.model.splice(indexDepto, 0, menuTecnico);
      } else {
        this.model.push(menuTecnico);
      }
    }
  }

  private agregarMenuAdminRH() {
    const existeMenuAdmin = this.model.some(item => item.label === 'ADMINISTRACIÓN RH');

    if (!existeMenuAdmin) {
      const indexDepto = this.model.findIndex(item => item.label === 'DEPARTAMENTO');

      const menuAdmin = {
        label: 'ADMINISTRACIÓN RH',
        icon: 'pi pi-fw pi-key',
        items: [
          {
            label: 'Configuración de Campos',
            icon: 'pi pi-cog',
            routerLink: ['/rh/admin/campos'],
            items: [
              {
                label: 'Campos de Solicitud',
                icon: 'pi pi-list',
                routerLink: ['/rh/admin/campos']
              }
            ]
          },
          {
            label: 'Gestión de Solicitudes',
            icon: 'pi pi-fw pi-file',
            expanded: this.menuState['solicitudes'],
            items: [
              { label: 'Todas las Solicitudes', icon: 'pi pi-list', routerLink: ['/rh/admin/solicitudes'] },
              { label: 'Reportes RH', icon: 'pi pi-chart-line', routerLink: ['/rh/admin/reportes'] },
            ]
          },
        ]
      };

      if (indexDepto !== -1) {
        this.model.splice(indexDepto, 0, menuAdmin);
      } else {
        this.model.push(menuAdmin);
      }
    }
  }

  private agregarMenuTecnicoRH() {
    const existeMenuTecnico = this.model.some(item => item.label === 'TÉCNICO RH');

    if (!existeMenuTecnico) {
      const indexDepto = this.model.findIndex(item => item.label === 'DEPARTAMENTO');

      const menuTecnico = {
        label: 'TÉCNICO RH',
        icon: 'pi pi-fw pi-users',
        items: [
          {
            label: 'Mis Solicitudes',
            icon: 'pi pi-inbox',
            routerLink: ['/rh/tecnico/solicitudes']
          },
          {
            label: 'Mis Estadísticas',
            icon: 'pi pi-chart-bar',
            routerLink: ['/rh/tecnico/estadisticas']
          }
        ]
      };

      if (indexDepto !== -1) {
        this.model.splice(indexDepto, 0, menuTecnico);
      } else {
        this.model.push(menuTecnico);
      }
    }
  }

  private agregarMenuAdminLogistica() {
    const existeMenuAdmin = this.model.some(item => item.label === 'ADMINISTRACIÓN LOGÍSTICA');

    if (!existeMenuAdmin) {
      const indexDepto = this.model.findIndex(item => item.label === 'DEPARTAMENTO');

      const menuItems: any[] = [];

      if (this.esAdminLogistica || this.esAutorizadorTickets || this.esCompletaInsumos || this.esCompletaReparacion || this.esAutorizadorGasolina) {
        menuItems.push({
          label: 'Solicitudes',
          icon: 'pi pi-fw pi-ticket',
          expanded: this.menuState['tickets'],
          items: [
            { label: 'Todas las solicitudes', icon: 'pi pi-list',       routerLink: ['/logistica/tickets/admin']   },
            { label: 'Reportes',              icon: 'pi pi-chart-line', routerLink: ['/logistica/tickets/reportes'] },
          ],
        });
      }

      if (this.esAdminLogistica || this.esAdminVehiculos || this.esAutorizadorGasolina) {
        const itemsVehiculos: any[] = [];
        if (this.esAdminLogistica || this.esAdminVehiculos) {
          itemsVehiculos.push(
            { label: 'Agregar vehículo',   icon: 'pi pi-plus',       routerLink: ['/logistica/vehiculos/crear'] },
            { label: 'Todos los vehículos', icon: 'pi pi-list-check', routerLink: ['/logistica/vehiculos/grid'] },
            { label: 'Colaboradores',       icon: 'pi pi-users',      routerLink: ['/logistica/vehiculos/colaboradores'] },
            { label: 'Reportes',            icon: 'pi pi-chart-bar',  routerLink: ['/logistica/vehiculos/reportes'] },
          );
        }
        itemsVehiculos.push({
          label: 'Reporte Gasolina',
          icon: 'pi pi-bolt',
          routerLink: ['/logistica/tickets/reportes-gasolina'],
        });
        menuItems.push({
          label: 'Vehículos',
          icon: 'pi pi-truck',
          expanded: this.menuState['vehiculos'],
          items: itemsVehiculos,
        });
      }

        if (this.esAdminLogistica) {
            menuItems.push({
                label: 'Insumos',
                icon: 'pi pi-box',
                expanded: this.menuState['insumos'],
                items: [
                    { label: 'Todos los Insumos', icon: 'pi pi-list', routerLink: ['/logistica/insumos/insumos'] },
                    { label: 'Agregar Insumo', icon: 'pi pi-plus', routerLink: ['/logistica/insumos/crear'] }
                ]
            });
        }

      if (menuItems.length > 0) {
        const menuAdmin = {
          label: 'ADMINISTRACIÓN LOGÍSTICA',
          icon: 'pi pi-fw pi-key',
          items: menuItems
        };

        if (indexDepto !== -1) {
          this.model.splice(indexDepto, 0, menuAdmin);
        } else {
          this.model.push(menuAdmin);
        }
      }
    }
  }

  private agregarMenuTecnicoLogistica() {
    const existeMenuTecnico = this.model.some(item => item.label === 'OPERADOR LOGÍSTICA');

    if (!existeMenuTecnico) {
      const indexDepto = this.model.findIndex(item => item.label === 'DEPARTAMENTO');

      const menuTecnico = {
        label: 'OPERADOR LOGÍSTICA',
        icon: 'pi pi-fw pi-wrench',
        items: [
          { label: 'Mis Tickets', icon: 'pi pi-list', routerLink: ['/logistica/tecnico/tickets/mis-tickets'] }
        ]
      };

      if (indexDepto !== -1) {
        this.model.splice(indexDepto, 0, menuTecnico);
      } else {
        this.model.push(menuTecnico);
      }
    }
  }

  getUsuario() {
    return this.userSrv.consultarEmpleado();
  }
}
