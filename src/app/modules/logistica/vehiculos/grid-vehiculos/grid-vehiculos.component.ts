import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { BaseComponent } from 'src/app/shared/base/base.component';
import { VehiculosService } from '../vehiculos.service';
import { Vehiculo, EstadoVehiculo } from '../models/vehiculo.model';

@Component({
  selector: 'app-grid-vehiculos',
  templateUrl: './grid-vehiculos.component.html',
  styleUrls: ['./grid-vehiculos.component.css']
})
export class GridVehiculosComponent extends BaseComponent implements OnInit {
  vehiculos: Vehiculo[] = [];
  vehiculosFiltrados: Vehiculo[] = [];
  cargando: boolean = false;

  filtroEstado: string = 'todos';
  filtroMarca: string = 'todas';
  filtroTipo: string = 'todos';
  filtroBusqueda: string = '';

  opcionesEstado: any[] = [
    { label: 'Todos los estados', value: 'todos' },
    { label: 'Disponible', value: 'DISPONIBLE' },
    { label: 'Seguro vencido', value: 'SEGURO_VENCIDO' },
    { label: 'Asignado', value: 'ASIGNADO' },
    { label: 'Otro', value: 'OTRO' }
  ];

  opcionesMarca: any[] = [];
  opcionesTipo: any[] = [];

  vistaActual: 'cards' | 'lista' = 'cards';

  currentPage: number = 1;
  itemsPerPage: number = 10;
  paginatedVehiculos: Vehiculo[] = [];
  totalPages: number = 1;
  pageNumbers: number[] = [];

  private readonly STORAGE_KEYS = {
    VISTA: 'vehiculos_preferencia_vista',
    ITEMS_POR_PAGINA: 'vehiculos_items_por_pagina'
  };

  fechaActual: Date = new Date();

  constructor(
    protected override messageService: MessageService,
    private router: Router,
    private vehiculosService: VehiculosService
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
      this.vehiculos = vehiculos || [];
      
      const tipos = await this.vehiculosService.getTiposVehiculos();
      this.opcionesTipo = [
        { label: 'Todos los tipos', value: 'todos' },
        ...tipos.map(t => ({ label: t.nombre, value: t.id }))
      ];

      const marcasUnicas = [...new Set(this.vehiculos.map(v => v.marca).filter(Boolean))];
      this.opcionesMarca = [
        { label: 'Todas las marcas', value: 'todas' },
        ...marcasUnicas.map(m => ({ label: m, value: m }))
      ];

      this.procesarVehiculos();
      this.aplicarFiltros();

    } catch (error) {
      console.error('Error al cargar vehículos:', error);
      this.handleAlertType('ERROR', 'Error al cargar los vehículos');
    } finally {
      this.cargando = false;
    }
  }

  procesarVehiculos() {
    this.vehiculos.forEach(vehiculo => {
      vehiculo.fechaCreacionFormatted = this.formatFecha(vehiculo.fechaCreacion);
      if (vehiculo.fechaVencimientoSeguro) {
        vehiculo.fechaVencimientoSeguroFormatted = this.formatFecha(vehiculo.fechaVencimientoSeguro);
      }
      if (vehiculo.asignadoAFecha) {
        vehiculo.fechaAsignacionFormatted = this.formatFecha(vehiculo.asignadoAFecha);
      }
    });
  }

  aplicarFiltros() {
    let filtrados = [...this.vehiculos];

    if (this.filtroBusqueda.trim()) {
      const busqueda = this.filtroBusqueda.toLowerCase();
      filtrados = filtrados.filter(vehiculo => 
        vehiculo.folio?.toLowerCase().includes(busqueda) ||
        vehiculo.marca?.toLowerCase().includes(busqueda) ||
        vehiculo.modelo?.toLowerCase().includes(busqueda) ||
        vehiculo.placa?.toLowerCase().includes(busqueda) ||
        vehiculo.numeroSerie?.toLowerCase().includes(busqueda) ||
        vehiculo.asignadoANombre?.toLowerCase().includes(busqueda) ||
        vehiculo.color?.toLowerCase().includes(busqueda)
      );
    }

    if (this.filtroEstado !== 'todos') {
      filtrados = filtrados.filter(vehiculo => vehiculo.estadoVehiculo === this.filtroEstado);
    }

    if (this.filtroMarca !== 'todas') {
      filtrados = filtrados.filter(vehiculo => vehiculo.marca === this.filtroMarca);
    }

    if (this.filtroTipo !== 'todos') {
      filtrados = filtrados.filter(vehiculo => vehiculo.tipo === this.filtroTipo);
    }

    this.vehiculosFiltrados = filtrados;
    this.currentPage = 1;
    this.updatePagination();
  }

  updatePagination() {
    this.totalPages = Math.ceil(this.vehiculosFiltrados.length / this.itemsPerPage);
    this.pageNumbers = Array.from({ length: this.totalPages }, (_, i) => i + 1);
    this.updatePaginatedVehiculos();
  }

  updatePaginatedVehiculos() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedVehiculos = this.vehiculosFiltrados.slice(startIndex, endIndex);
  }

  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedVehiculos();
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
    const end = Math.min(this.currentPage * this.itemsPerPage, this.vehiculosFiltrados.length);
    return `${start}-${end}`;
  }

  limpiarFiltros() {
    this.filtroEstado = 'todos';
    this.filtroMarca = 'todas';
    this.filtroTipo = 'todos';
    this.filtroBusqueda = '';
    this.aplicarFiltros();
  }

  cambiarVista(tipo: 'cards' | 'lista') {
    this.vistaActual = tipo;
    this.guardarPreferencias();
  }

  verDetalle(vehiculo: Vehiculo, event?: Event) {
    if (event) {
      const target = event.target as HTMLElement;
      if (target.closest('.btn-accion')) {
        return;
      }
    }
    
    if (vehiculo.firestoreId) {
      this.router.navigate(['/logistica/vehiculos/detalle', vehiculo.firestoreId]);
    }
  }

  crearVehiculo() {
    this.router.navigate(['/logistica/vehiculos/crear']);
  }

  editarVehiculo(vehiculo: Vehiculo, event: Event) {
    event.stopPropagation();
    if (vehiculo.firestoreId) {
      this.router.navigate(['/logistica/vehiculos/editar', vehiculo.firestoreId]);
    }
  }

  getTotalVehiculos(): number {
    return this.vehiculos.length;
  }

  getVehiculosPorEstado(estado: EstadoVehiculo): number {
    return this.vehiculos.filter(v => v.estadoVehiculo === estado).length;
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

  private formatFecha(fecha: any): string {
    if (!fecha) return 'Sin fecha';
    
    try {
      let date: Date;
      if (fecha.toDate) {
        date = fecha.toDate();
      } else if (fecha instanceof Date) {
        date = fecha;
      } else if (typeof fecha === 'string') {
        date = new Date(fecha);
      } else if (fecha?.seconds) {
        date = new Date(fecha.seconds * 1000);
      } else {
        return 'Fecha inválida';
      }
      
      return date.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  }

  refrescar() {
    this.cargarDatos();
  }

  irAReportes() {
    this.router.navigate(['/logistica/vehiculos/reportes']);
  }

  irAColaboradores() {
    this.router.navigate(['/logistica/vehiculos/colaboradores']);
  }

  getSeguroVencidoWarning(vehiculo: Vehiculo): boolean {
    if (!vehiculo.fechaVencimientoSeguro) return false;
    const hoy = new Date();
    const vencimiento = new Date(vehiculo.fechaVencimientoSeguro);
    return vencimiento < hoy;
  }

  cartaResponsiva(vehiculo: any) {
    this.router.navigate(['/logistica/vehiculos/carta-responsiva', vehiculo.firestoreId]);
  }
}