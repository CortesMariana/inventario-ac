import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { BaseComponent } from 'src/app/shared/base/base.component';
import { VehiculosService } from '../vehiculos.service';
import { EmpleadoService } from '../../../admin/empleados/empleados.service';
import { Empleado } from '../../../admin/empleados/models/empleado.model';
import { Vehiculo } from '../models/vehiculo.model';

interface ColaboradorVehiculo {
  empleadoId: string;
  nombreCompleto: string;
  puesto: string;
  empresa: string;
  lugarTrabajo: string;
  fotografiaMiniatura?: string | null;
  vehiculosAsignados: Vehiculo[];
  totalVehiculos: number;
  ultimaAsignacion: Date | null;
}

@Component({
  selector: 'app-grid-colaboradores',
  templateUrl: './grid-colaboradores.component.html',
  styleUrls: ['./grid-colaboradores.component.css']
})
export class GridColaboradoresComponent extends BaseComponent implements OnInit {
  colaboradores: ColaboradorVehiculo[] = [];
  colaboradoresFiltrados: ColaboradorVehiculo[] = [];
  cargando: boolean = false;

  filtroBusqueda: string = '';
  filtroEmpresa: string = 'todas';
  filtroUbicacion: string = 'todas';
  filtroMinVehiculos: number = 0;

  opcionesEmpresa: any[] = [];
  opcionesUbicacion: any[] = [];

  vistaActual: 'cards' | 'lista' = 'cards';

  currentPage: number = 1;
  itemsPerPage: number = 10;
  paginatedColaboradores: ColaboradorVehiculo[] = [];
  totalPages: number = 1;
  pageNumbers: number[] = [];

  totalColaboradores: number = 0;
  totalVehiculosAsignados: number = 0;
  promedioVehiculos: number = 0;

  private readonly STORAGE_KEYS = {
    VISTA: 'colaboradores_vehiculos_preferencia_vista',
    ITEMS_POR_PAGINA: 'colaboradores_vehiculos_items_por_pagina'
  };

  constructor(
    protected override messageService: MessageService,
    private router: Router,
    private vehiculosService: VehiculosService,
    private empleadoService: EmpleadoService
  ) {
    super(messageService);
  }

  ngOnInit() {
    this.cargarPreferencias();
    this.cargarDatos();
  }

  private cargarPreferencias() {
    try {
      const vistaGuardada = localStorage.getItem(this.STORAGE_KEYS.VISTA);
      if (vistaGuardada && (vistaGuardada === 'cards' || vistaGuardada === 'lista')) {
        this.vistaActual = vistaGuardada as 'cards' | 'lista';
      }

      const itemsGuardados = localStorage.getItem(this.STORAGE_KEYS.ITEMS_POR_PAGINA);
      if (itemsGuardados) {
        const items = parseInt(itemsGuardados, 10);
        if ([5, 10, 20, 50].includes(items)) {
          this.itemsPerPage = items;
        }
      }
    } catch (error) {
      console.error('Error al cargar preferencias:', error);
    }
  }

  private guardarPreferencias() {
    try {
      localStorage.setItem(this.STORAGE_KEYS.VISTA, this.vistaActual);
      localStorage.setItem(this.STORAGE_KEYS.ITEMS_POR_PAGINA, this.itemsPerPage.toString());
    } catch (error) {
      console.error('Error al guardar preferencias:', error);
    }
  }

  async cargarDatos() {
    this.cargando = true;
    
    try {
      const vehiculos = await this.vehiculosService.getAllVehiculos();
      const vehiculosAsignados = vehiculos.filter(v => 
        v.estadoVehiculo === 'ASIGNADO' && v.asignadoAId
      );

      const empleados = await this.empleadoService.getEmpleados().toPromise();
      const mapaEmpleados = new Map<string, Empleado>();
      
      if (empleados) {
        empleados.forEach(empleado => {
          if (empleado.empleadoId) {
            mapaEmpleados.set(empleado.empleadoId, empleado);
          }
        });
      }

      const mapaVehiculosPorEmpleado = new Map<string, Vehiculo[]>();
      
      vehiculosAsignados.forEach(vehiculo => {
        if (vehiculo.asignadoAId) {
          if (!mapaVehiculosPorEmpleado.has(vehiculo.asignadoAId)) {
            mapaVehiculosPorEmpleado.set(vehiculo.asignadoAId, []);
          }
          mapaVehiculosPorEmpleado.get(vehiculo.asignadoAId)!.push(vehiculo);
        }
      });

      this.colaboradores = Array.from(mapaVehiculosPorEmpleado.entries()).map(([empleadoId, vehiculos]) => {
        const empleado = mapaEmpleados.get(empleadoId);
        
        let nombreCompleto = vehiculos[0]?.asignadoANombre || 'Sin nombre';
        if (empleado) {
          nombreCompleto = `${empleado.nombre} ${empleado.apellidoPaterno || ''} ${empleado.apellidoMaterno || ''}`.trim();
        }
        
        let puesto = 'Por definir';
        if (empleado?.puesto) {
          puesto = empleado.puesto.nombre;
        }
        
        let empresa = 'Por definir';
        if (empleado?.empresa) {
          empresa = empleado.empresa.razonSocial;
        }
        
        let lugarTrabajo = 'Por definir';
        if (empleado?.lugarDeTrabajo) {
          lugarTrabajo = empleado.lugarDeTrabajo.nombre;
        }
        
        const ultimaAsignacion = vehiculos.reduce((latest, v) => {
          if (!v.asignadoAFecha) return latest;
          const fecha = new Date(v.asignadoAFecha);
          return !latest || fecha > latest ? fecha : latest;
        }, null as Date | null);

        return {
          empleadoId,
          nombreCompleto,
          puesto,
          empresa,
          lugarTrabajo,
          fotografiaMiniatura: empleado?.fotografiaMiniatura,
          vehiculosAsignados: vehiculos,
          totalVehiculos: vehiculos.length,
          ultimaAsignacion
        };
      });

      this.colaboradores.sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto));

      const empresas = [...new Set(this.colaboradores.map(c => c.empresa).filter(e => e !== 'Por definir'))];
      this.opcionesEmpresa = [
        { label: 'Todas las empresas', value: 'todas' },
        ...empresas.map(e => ({ label: e, value: e }))
      ];

      const ubicaciones = [...new Set(this.colaboradores.map(c => c.lugarTrabajo).filter(u => u !== 'Por definir'))];
      this.opcionesUbicacion = [
        { label: 'Todas las ubicaciones', value: 'todas' },
        ...ubicaciones.map(u => ({ label: u, value: u }))
      ];

      this.calcularEstadisticas();
      this.aplicarFiltros();

    } catch (error) {
      console.error('Error al cargar colaboradores:', error);
      this.handleAlertType('ERROR', 'Error al cargar los colaboradores');
    } finally {
      this.cargando = false;
    }
  }

  calcularEstadisticas() {
    this.totalColaboradores = this.colaboradores.length;
    this.totalVehiculosAsignados = this.colaboradores.reduce((sum, c) => sum + c.totalVehiculos, 0);
    this.promedioVehiculos = this.totalColaboradores > 0 
      ? Number((this.totalVehiculosAsignados / this.totalColaboradores).toFixed(1)) 
      : 0;
  }

  aplicarFiltros() {
    let filtrados = [...this.colaboradores];

    if (this.filtroBusqueda.trim()) {
      const busqueda = this.filtroBusqueda.toLowerCase();
      filtrados = filtrados.filter(c => 
        c.nombreCompleto.toLowerCase().includes(busqueda) ||
        c.puesto.toLowerCase().includes(busqueda) ||
        c.empresa.toLowerCase().includes(busqueda) ||
        c.lugarTrabajo.toLowerCase().includes(busqueda) ||
        c.vehiculosAsignados.some(v => 
          v.marca?.toLowerCase().includes(busqueda) ||
          v.modelo?.toLowerCase().includes(busqueda) ||
          v.placa?.toLowerCase().includes(busqueda)
        )
      );
    }

    if (this.filtroEmpresa !== 'todas') {
      filtrados = filtrados.filter(c => c.empresa === this.filtroEmpresa);
    }

    if (this.filtroUbicacion !== 'todas') {
      filtrados = filtrados.filter(c => c.lugarTrabajo === this.filtroUbicacion);
    }

    if (this.filtroMinVehiculos > 0) {
      filtrados = filtrados.filter(c => c.totalVehiculos >= this.filtroMinVehiculos);
    }

    this.colaboradoresFiltrados = filtrados;
    this.currentPage = 1;
    this.updatePagination();
  }

  updatePagination() {
    this.totalPages = Math.ceil(this.colaboradoresFiltrados.length / this.itemsPerPage);
    this.pageNumbers = Array.from({ length: this.totalPages }, (_, i) => i + 1);
    this.updatePaginatedColaboradores();
  }

  updatePaginatedColaboradores() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedColaboradores = this.colaboradoresFiltrados.slice(startIndex, endIndex);
  }

  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedColaboradores();
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.changePage(this.currentPage - 1);
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.changePage(this.currentPage + 1);
    }
  }

  onItemsPerPageChange() {
    this.updatePagination();
    this.guardarPreferencias();
  }

  getDisplayRange(): string {
    const start = (this.currentPage - 1) * this.itemsPerPage + 1;
    const end = Math.min(this.currentPage * this.itemsPerPage, this.colaboradoresFiltrados.length);
    return `${start}-${end}`;
  }

  limpiarFiltros() {
    this.filtroBusqueda = '';
    this.filtroEmpresa = 'todas';
    this.filtroUbicacion = 'todas';
    this.filtroMinVehiculos = 0;
    this.aplicarFiltros();
  }

  cambiarVista(tipo: 'cards' | 'lista') {
    this.vistaActual = tipo;
    this.guardarPreferencias();
  }

  verDetalle(colaborador: ColaboradorVehiculo, event?: Event) {
    if (event) {
      const target = event.target as HTMLElement;
      if (target.closest('.btn-accion')) {
        return;
      }
    }
    
    this.router.navigate(['/logistica/vehiculos/detalle-colaborador', colaborador.empleadoId]);
  }

  getInitials(nombre: string): string {
    return nombre
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  getColorPorEmpresa(empresa: string): string {
    const colores = [
      '#667eea', '#4CAF50', '#FF9800', '#9C27B0', '#F44336', '#00BCD4',
      '#3F51B5', '#8BC34A', '#FF5722', '#795548', '#607D8B', '#E91E63'
    ];
    let hash = 0;
    for (let i = 0; i < empresa.length; i++) {
      hash = empresa.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colores[Math.abs(hash) % colores.length];
  }

  formatFecha(fecha: Date | null): string {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  getEstadoClass(estado: string): string {
    switch (estado) {
      case 'DISPONIBLE':
        return 'estado-disponible';
      case 'SEGURO_VENCIDO':
        return 'estado-seguro-vencido';
      case 'ASIGNADO':
        return 'estado-asignado';
      case 'OTRO':
        return 'estado-otro';
      default:
        return 'estado-default';
    }
  }
  
  getEstadoLabel(estado: string): string {
    switch (estado) {
      case 'DISPONIBLE':
        return 'Disponible';
      case 'SEGURO_VENCIDO':
        return 'Seguro vencido';
      case 'ASIGNADO':
        return 'Asignado';
      case 'OTRO':
        return 'Otro';
      default:
        return estado;
    }
  }
  
  getEstadoIcon(estado: string): string {
    switch (estado) {
      case 'DISPONIBLE':
        return 'pi pi-check-circle';
      case 'SEGURO_VENCIDO':
        return 'pi pi-exclamation-triangle';
      case 'ASIGNADO':
        return 'pi pi-user-check';
      case 'OTRO':
        return 'pi pi-question-circle';
      default:
        return 'pi pi-question-circle';
    }
  }
  
  fechaActual: Date = new Date();
  
  tieneSeguroVencido(colaborador: ColaboradorVehiculo): boolean {
    return colaborador.vehiculosAsignados.some(v => {
      if (!v.fechaVencimientoSeguro) return false;
      return new Date(v.fechaVencimientoSeguro) < this.fechaActual;
    });
  }

  refrescar() {
    this.cargarDatos();
  }
}