import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { BaseComponent } from 'src/app/shared/base/base.component';
import { ActivosService } from '../activos.service';
import { ActivoTI, EstadoTecnico } from '../models/activo.model';
import { LugaresTrabajoService } from '../../empleados/lugares-trabajo.service';

@Component({
  selector: 'app-grid-activos',
  templateUrl: './grid-activos.component.html',
  styleUrls: ['./grid-activos.component.css']
})
export class GridActivosComponent extends BaseComponent implements OnInit {
  activos: ActivoTI[] = [];
  activosFiltrados: ActivoTI[] = [];
  cargando: boolean = false;
  private ubicacionTimeout: any;

  filtroEstado: string = 'todos';
  filtroUbicacion: string = 'todas';
  filtroCategoria: string = 'todas';
  filtroMarca: string = 'todas';
  filtroBusqueda: string = '';

  opcionesEstado: any[] = [
    { label: 'Todos los estados', value: 'todos' },
    { label: 'Disponible', value: 'DISPONIBLE' },
    { label: 'Asignado', value: 'ASIGNADO' },
    { label: 'En Reparación', value: 'EN_REPARACION' },
    { label: 'Fuera de Servicio', value: 'FUERA_DE_SERVICIO' },
    { label: 'Baja Técnica', value: 'BAJA_TECNICA' }
  ];

  opcionesMarca: any[] = [];
  opcionesUbicacion: any[] = [];
  opcionesCategoria: any[] = [];

  vistaActual: 'cards' | 'lista' = 'cards';

  currentPage: number = 1;
  itemsPerPage: number = 5;
  paginatedActivos: ActivoTI[] = [];
  totalPages: number = 1;
  pageNumbers: number[] = [];

  private readonly STORAGE_KEYS = {
    VISTA: 'activos_preferencia_vista',
    ITEMS_POR_PAGINA: 'activos_items_por_pagina'
  };

  filterText: string = '';

  constructor(
    protected override messageService: MessageService,
    private router: Router,
    private activosService: ActivosService,
    private lugaresTrabajoSrv: LugaresTrabajoService
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
      const activos = await this.activosService.getAllActivos();
      this.activos = activos || [];
      
      const ubicaciones = await this.lugaresTrabajoSrv.getLugaresTrabajo().toPromise() || [];
      
      this.opcionesUbicacion = [
        { label: 'Todas las ubicaciones', value: 'todas' },
        ...ubicaciones.map(u => ({ label: u.nombre, value: u.id }))
      ];
      
      const categorias = await this.activosService.getCategorias() || [];
      this.opcionesCategoria = [
        { label: 'Todas las categorías', value: 'todas' },
        ...categorias.map(c => ({ label: c.nombre, value: c.id }))
      ];

      const marcasUnicas = [...new Set(this.activos.map(a => a.marca).filter(Boolean))];
      this.opcionesMarca = [
        { label: 'Todas las marcas', value: 'todas' },
        ...marcasUnicas.map(m => ({ label: m, value: m }))
      ];

      this.procesarActivos();
      
      await this.aplicarFiltros();

    } catch (error) {
      console.error('Error al cargar activos:', error);
      this.handleAlertType('ERROR', 'Error al cargar los activos');
    } finally {
      this.cargando = false;
    }
  }

  procesarActivos() {
    this.activos.forEach(activo => {
      activo.fechaCreacionFormatted = this.formatFecha(activo.fechaCreacion);
      if (activo.fechaAsignacion) {
        activo.fechaAsignacionFormatted = this.formatFecha(activo.fechaAsignacion);
      }
    });
  }

  async aplicarFiltros() {
    let filtrados = [...this.activos];

    if (this.filtroBusqueda.trim()) {
      const busqueda = this.filtroBusqueda.toLowerCase();
      filtrados = filtrados.filter(activo => 
        activo.usuarioAsignadoNombre?.toLowerCase().includes(busqueda) ||
        activo.nombre?.toLowerCase().includes(busqueda) ||
        activo.numeroSerie?.toLowerCase().includes(busqueda) ||
        activo.modelo?.toLowerCase().includes(busqueda) ||
        activo.marca?.toLowerCase().includes(busqueda) ||
        activo.descripcion?.toLowerCase().includes(busqueda) ||
        activo.activoFijo?.toLowerCase().includes(busqueda)
      );
    }

    if (this.filtroEstado !== 'todos') {
      filtrados = filtrados.filter(activo => activo.estadoTecnico === this.filtroEstado);
    }

    if (this.filtroUbicacion !== 'todas') {
      const subalmacenesDeUbicacion = await this.activosService.getSubalmacenesPorLugarTrabajo(this.filtroUbicacion);
      const idsSubalmacenes = subalmacenesDeUbicacion.map(s => s.id);
      
      filtrados = filtrados.filter(activo => 
        activo.lugarTrabajoId === this.filtroUbicacion ||
        activo.ubicacionAsignadaId === this.filtroUbicacion ||
        (activo.ubicacionId && idsSubalmacenes.includes(activo.ubicacionId))
      );
    }

    if (this.filtroCategoria !== 'todas') {
      filtrados = filtrados.filter(activo => activo.categoriaId === this.filtroCategoria);
    }

    if (this.filtroMarca !== 'todas') {
      filtrados = filtrados.filter(activo => activo.marca === this.filtroMarca);
    }

    this.activosFiltrados = filtrados;
    this.currentPage = 1;
    this.updatePagination();
  }

  updatePagination() {
    this.totalPages = Math.ceil(this.activosFiltrados.length / this.itemsPerPage);
    this.pageNumbers = Array.from({ length: this.totalPages }, (_, i) => i + 1);
    this.updatePaginatedActivos();
  }

  updatePaginatedActivos() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedActivos = this.activosFiltrados.slice(startIndex, endIndex);
  }

  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedActivos();
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
    const end = Math.min(this.currentPage * this.itemsPerPage, this.activosFiltrados.length);
    return `${start}-${end}`;
  }

  limpiarFiltros() {
    this.filtroEstado = 'todos';
    this.filtroUbicacion = 'todas';
    this.filtroMarca = 'todas';
    this.filtroBusqueda = '';
    this.aplicarFiltros();
  }

  cambiarVista(tipo: 'cards' | 'lista') {
    this.vistaActual = tipo;
    this.guardarPreferencias(); 
  }

  verDetalle(activo: ActivoTI, event?: Event) {
    if (event) {
      const target = event.target as HTMLElement;
      if (target.closest('.btn-accion')) {
        return;
      }
    }
    
    if (activo.firestoreId) {
      this.router.navigate(['/admin/activos/detalle', activo.firestoreId]);
    }
  }

  crearActivo() {
    this.router.navigate(['/admin/activos/crear']);
  }

  editarActivo(activo: ActivoTI, event: Event) {
    event.stopPropagation();
    if (activo.firestoreId) {
      this.router.navigate(['/admin/activos/editar', activo.firestoreId]);
    }
  }

  generarCarta(activo: ActivoTI, event: Event) {
    event.stopPropagation();
    if (activo.firestoreId) {
      this.router.navigate(['/admin/activos/carta', activo.firestoreId]);
    }
  }

  getTotalActivos(): number {
    return this.activos.length;
  }

  getActivosPorEstado(estado: EstadoTecnico): number {
    return this.activos.filter(a => a.estadoTecnico === estado).length;
  }

  getEstadoClass(estado: string): string {
    switch (estado) {
      case 'DISPONIBLE':
        return 'estado-disponible';
      case 'ASIGNADO':
        return 'estado-asignado';
      case 'EN_REPARACION':
        return 'estado-reparacion';
      case 'FUERA_DE_SERVICIO':
        return 'estado-fuera-servicio';
      case 'BAJA_TECNICA':
        return 'estado-baja';
      default:
        return 'estado-default';
    }
  }

  getEstadoIcon(estado: string): string {
    switch (estado) {
      case 'DISPONIBLE':
        return 'pi pi-check-circle';
      case 'ASIGNADO':
        return 'pi pi-user-check';
      case 'EN_REPARACION':
        return 'pi pi-wrench';
      case 'FUERA_DE_SERVICIO':
        return 'pi pi-stop-circle';
      case 'BAJA_TECNICA':
        return 'pi pi-trash';
      default:
        return 'pi pi-question-circle';
    }
  }

  getEstadoLabel(estado: string): string {
    switch (estado) {
      case 'DISPONIBLE':
        return 'Disponible';
      case 'ASIGNADO':
        return 'Asignado';
      case 'EN_REPARACION':
        return 'En Reparación';
      case 'FUERA_DE_SERVICIO':
        return 'Fuera de Servicio';
      case 'BAJA_TECNICA':
        return 'Baja Técnica';
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

  importarActivos() {
    this.router.navigate(['/admin/activos/importar']);
  }

  irACategorias() {
    this.router.navigate(['/admin/activos/categorias']);
  }

  irASubalmacenes() {
    this.router.navigate(['/admin/activos/subalmacenes']);
  }

  irAReportes() {
    this.router.navigate(['/admin/activos/reportes']);
  }

  altaRapida() {
    this.router.navigate(['/admin/activos/alta-rapida']);
  }

  onFilterChange(event: string) {
    this.filterText = event;
  }

  async onUbicacionChange(value: string) {
    if (this.ubicacionTimeout) {
      clearTimeout(this.ubicacionTimeout);
    }
    
    this.cargando = true;
    
    this.ubicacionTimeout = setTimeout(async () => {
      try {
        await this.aplicarFiltros();
      } finally {
        this.cargando = false;
      }
    }, 300);
  }
}