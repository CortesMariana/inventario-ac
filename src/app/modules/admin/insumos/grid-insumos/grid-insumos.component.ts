import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService, ConfirmationService } from 'primeng/api';
import { BaseComponent } from 'src/app/shared/base/base.component';
import { InsumosService } from '../insumos.service';
import { Insumo, TipoEmpaque, EstadoInsumo } from '../models/insumo.model';

@Component({
  selector: 'app-grid-insumos',
  templateUrl: './grid-insumos.component.html',
  styleUrls: ['./grid-insumos.component.css'],
  providers: [ConfirmationService]
})
export class GridInsumosComponent extends BaseComponent implements OnInit {
  insumos: Insumo[] = [];
  insumosFiltrados: Insumo[] = [];
  cargando: boolean = false;

  filtroNombre: string = '';
  filtroMarca: string = '';
  filtroEstado: string = 'todos';
  filtroSubalmacen: string = 'todos';
  filtroStockBajo: boolean = false;

  ordenamientoColumnas: { [key: string]: 'asc' | 'desc' | null } = {
    nombre: null,
    tipoEmpaque: null,
    cantidad: null,
    marca: null,
    estado: null,
    precioUnitario: null,
    precioTotal: null,
    subalmacenNombre: null,
    fechaCreacion: 'desc'
  };
  columnaActiva: string = 'fechaCreacion';

  currentPage: number = 1;
  itemsPerPage: number = 10;
  paginatedInsumos: Insumo[] = [];
  totalPages: number = 1;
  pageNumbers: number[] = [];

  opcionesTipoEmpaque: { label: string, value: TipoEmpaque }[] = [
    { label: 'Unitario', value: 'Unitario' },
    { label: 'Bolsa', value: 'Bolsa' },
    { label: 'Caja', value: 'Caja' },
    { label: 'Kit', value: 'Kit' },
    { label: 'Paquete', value: 'Paquete' },
    { label: 'Rollo', value: 'Rollo' },
    { label: 'Set', value: 'Set' }
  ];

  opcionesEstado: { label: string, value: EstadoInsumo | 'todos' }[] = [
    { label: 'Todos', value: 'todos' },
    { label: 'Nuevo', value: 'Nuevo' },
    { label: 'Usado', value: 'Usado' }
  ];

  opcionesSubalmacenes: any[] = [];

  private readonly STORAGE_KEYS = {
    ITEMS_POR_PAGINA: 'insumos_items_por_pagina',
    ORDENAMIENTO_COLUMNAS: 'insumos_ordenamiento_columnas',
    COLUMNA_ACTIVA: 'insumos_columna_activa'
  };

  constructor(
    protected override messageService: MessageService,
    public router: Router,
    private insumosService: InsumosService,
    private confirmationService: ConfirmationService
  ) {
    super(messageService);
  }

  ngOnInit() {
    this.cargarPreferencias();
    this.cargarInsumos();
  }

  private cargarPreferencias() {
    try {
      const itemsGuardados = localStorage.getItem(this.STORAGE_KEYS.ITEMS_POR_PAGINA);
      if (itemsGuardados) {
        const items = parseInt(itemsGuardados, 10);
        if ([5, 10, 20, 50, 100].includes(items)) {
          this.itemsPerPage = items;
        }
      }

      const ordenamientoGuardado = localStorage.getItem(this.STORAGE_KEYS.ORDENAMIENTO_COLUMNAS);
      if (ordenamientoGuardado) {
        this.ordenamientoColumnas = JSON.parse(ordenamientoGuardado);
      }

      const columnaActivaGuardada = localStorage.getItem(this.STORAGE_KEYS.COLUMNA_ACTIVA);
      if (columnaActivaGuardada) {
        this.columnaActiva = columnaActivaGuardada;
      }
    } catch (error) {
      console.error('Error al cargar preferencias:', error);
    }
  }

  private guardarPreferencias() {
    try {
      localStorage.setItem(this.STORAGE_KEYS.ITEMS_POR_PAGINA, this.itemsPerPage.toString());
      localStorage.setItem(this.STORAGE_KEYS.ORDENAMIENTO_COLUMNAS, JSON.stringify(this.ordenamientoColumnas));
      localStorage.setItem(this.STORAGE_KEYS.COLUMNA_ACTIVA, this.columnaActiva);
    } catch (error) {
      console.error('Error al guardar preferencias:', error);
    }
  }

  async cargarInsumos() {
    this.cargando = true;
    try {
      this.insumos = await this.insumosService.getAllInsumos();
      this.formatearFechas();
      this.aplicarFiltrosYOrdenamiento();
    } catch (error) {
      console.error('Error al cargar insumos:', error);
      this.handleAlertType('ERROR', 'Error al cargar los insumos');
    } finally {
      this.cargando = false;
    }
  }

  private formatearFechas() {
    this.insumos.forEach(insumo => {
      if (insumo.fechaCreacion) {
        insumo.fechaCreacionFormatted = this.formatFecha(insumo.fechaCreacion);
      }
      if (insumo.fechaModificacion) {
        insumo.fechaModificacionFormatted = this.formatFecha(insumo.fechaModificacion);
      }
    });
  }

  formatFecha(fecha: any): string {
    const date = this.getFecha(fecha);
    if (!date) return 'Sin fecha';
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  private getFecha(fecha: any): Date | null {
    if (!fecha) return null;
    try {
      if (fecha.toDate) return fecha.toDate();
      if (fecha instanceof Date) return fecha;
      if (typeof fecha === 'string') return new Date(fecha);
      if (fecha && typeof fecha === 'object' && fecha.seconds) return new Date(fecha.seconds * 1000);
      return null;
    } catch {
      return null;
    }
  }

  cambiarOrdenamientoColumna(columna: string) {
    if (this.columnaActiva === columna) {
      const direccionActual = this.ordenamientoColumnas[columna];
      if (direccionActual === 'asc') {
        this.ordenamientoColumnas[columna] = 'desc';
      } else if (direccionActual === 'desc') {
        this.ordenamientoColumnas[columna] = null;
        this.columnaActiva = '';
      } else {
        this.ordenamientoColumnas[columna] = 'asc';
        this.columnaActiva = columna;
      }
    } else {
      Object.keys(this.ordenamientoColumnas).forEach(key => {
        if (key !== columna) {
          this.ordenamientoColumnas[key] = null;
        }
      });
      this.ordenamientoColumnas[columna] = 'asc';
      this.columnaActiva = columna;
    }
    
    this.guardarPreferencias();
    this.aplicarFiltrosYOrdenamiento();
  }

  getOrdenIcono(columna: string): string {
    if (this.columnaActiva === columna) {
      return this.ordenamientoColumnas[columna] === 'asc' ? 'pi pi-arrow-up' : 'pi pi-arrow-down';
    }
    return 'pi pi-sort';
  }

  aplicarFiltrosYOrdenamiento() {
    let filtrados = [...this.insumos];

    if (this.filtroNombre) {
      filtrados = filtrados.filter(i => 
        i.nombre.toLowerCase().includes(this.filtroNombre.toLowerCase())
      );
    }

    if (this.filtroMarca) {
      filtrados = filtrados.filter(i => 
        i.marca.toLowerCase().includes(this.filtroMarca.toLowerCase())
      );
    }

    if (this.filtroEstado !== 'todos') {
      filtrados = filtrados.filter(i => i.estado === this.filtroEstado);
    }

    if (this.filtroSubalmacen !== 'todos') {
      filtrados = filtrados.filter(i => i.subalmacenId === this.filtroSubalmacen);
    }

    if (this.filtroStockBajo) {
      filtrados = filtrados.filter(i => (i.stockMinimo || 5) >= i.cantidad);
    }


    filtrados = this.aplicarOrdenamiento(filtrados);

    this.insumosFiltrados = filtrados;
    this.currentPage = 1;
    this.updatePagination();
  }

  private aplicarOrdenamiento(insumos: Insumo[]): Insumo[] {
    if (!this.columnaActiva || !this.ordenamientoColumnas[this.columnaActiva]) {
      return insumos;
    }

    const direccion = this.ordenamientoColumnas[this.columnaActiva];
    const orden = direccion === 'asc' ? 1 : -1;

    return [...insumos].sort((a, b) => {
      let valorA: any;
      let valorB: any;

      switch (this.columnaActiva) {
        case 'nombre':
          valorA = a.nombre || '';
          valorB = b.nombre || '';
          break;
        case 'tipoEmpaque':
          valorA = a.tipoEmpaque || '';
          valorB = b.tipoEmpaque || '';
          break;
        case 'cantidad':
          valorA = a.cantidadUnidades || (a.cantidad * (a.unidadesPorEmpaque || 1));
          valorB = b.cantidadUnidades || (b.cantidad * (b.unidadesPorEmpaque || 1));
          break;
        case 'marca':
          valorA = a.marca || '';
          valorB = b.marca || '';
          break;
        case 'estado':
          valorA = a.estado || '';
          valorB = b.estado || '';
          break;
        case 'precioUnitario':
          valorA = a.precioUnitario || 0;
          valorB = b.precioUnitario || 0;
          break;
        case 'precioTotal':
          valorA = a.precioTotal || 0;
          valorB = b.precioTotal || 0;
          break;
        case 'subalmacenNombre':
          valorA = a.subalmacenNombre || '';
          valorB = b.subalmacenNombre || '';
          break;
        case 'fechaCreacion':
          valorA = this.getFecha(a.fechaCreacion)?.getTime() || 0;
          valorB = this.getFecha(b.fechaCreacion)?.getTime() || 0;
          break;
        default:
          return 0;
      }

      if (valorA < valorB) return -1 * orden;
      if (valorA > valorB) return 1 * orden;
      return 0;
    });
  }

  updatePagination() {
    this.totalPages = Math.ceil(this.insumosFiltrados.length / this.itemsPerPage);
    this.pageNumbers = Array.from({ length: this.totalPages }, (_, i) => i + 1);
    this.updatePaginatedInsumos();
  }

  updatePaginatedInsumos() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedInsumos = this.insumosFiltrados.slice(startIndex, endIndex);
  }

  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePaginatedInsumos();
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
    const end = Math.min(this.currentPage * this.itemsPerPage, this.insumosFiltrados.length);
    return `${start}-${end}`;
  }

  limpiarFiltros() {
    this.filtroNombre = '';
    this.filtroMarca = '';
    this.filtroEstado = 'todos';
    this.filtroSubalmacen = 'todos';
    this.filtroStockBajo = false;
    this.aplicarFiltrosYOrdenamiento();
  }

  verDetalle(insumo: Insumo) {
    if (insumo.firestoreId) {
      this.router.navigate(['/admin/insumos/detalle', insumo.firestoreId]);
    }
  }

  editarInsumo(insumo: Insumo, event: Event) {
    event.stopPropagation();
    if (insumo.firestoreId) {
      this.router.navigate(['/admin/insumos/editar', insumo.firestoreId]);
    }
  }

  eliminarInsumo(insumo: Insumo, event: Event) {
    event.stopPropagation();
    
    const esActivo = insumo.activo !== false;
    const titulo = esActivo ? 'Desactivar Insumo' : 'Activar Insumo';
    const mensaje = esActivo 
      ? `¿Estás seguro de desactivar el insumo "${insumo.nombre}"?<br><small class="text-gray-500">El insumo quedará oculto del inventario principal pero podrás reactivarlo después.</small>`
      : `¿Estás seguro de reactivar el insumo "${insumo.nombre}"?<br><small class="text-green-500">El insumo volverá a estar disponible en el inventario.</small>`;
    const icono = esActivo ? 'pi pi-exclamation-triangle' : 'pi pi-refresh';
    const botonTexto = esActivo ? 'Sí, desactivar' : 'Sí, reactivar';
    const botonClass = esActivo ? 'p-button-danger' : 'p-button-success';
    
    this.confirmationService.confirm({
      message: mensaje,
      header: titulo,
      icon: icono,
      acceptLabel: botonTexto,
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: botonClass,
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        if (esActivo) {
          this.confirmarEliminacion(insumo);
        } else {
          this.confirmarReactivacion(insumo);
        }
      }
    });
  }

  async confirmarReactivacion(insumo: Insumo) {
    this.cargando = true;
    try {
      const usuarioMovimiento = {
        id: 'admin',
        nombre: 'Administrador'
      };
      await this.insumosService.reactivarInsumo(insumo.firestoreId!, usuarioMovimiento);
      this.handleAlertType('SUCCESS', `Insumo "${insumo.nombre}" reactivado correctamente`);
      this.cargarInsumos();
    } catch (error: any) {
      console.error('Error al reactivar insumo:', error);
      this.handleAlertType('ERROR', error.message || 'Error al reactivar el insumo');
    } finally {
      this.cargando = false;
    }
  }

  async confirmarEliminacion(insumo: Insumo) {
    this.cargando = true;
    try {
      const usuarioMovimiento = {
        id: 'admin',
        nombre: 'Administrador'
      };
      await this.insumosService.deleteInsumo(insumo.firestoreId!, usuarioMovimiento);
      this.handleAlertType('SUCCESS', `Insumo "${insumo.nombre}" eliminado correctamente`);
      this.cargarInsumos();
    } catch (error: any) {
      console.error('Error al eliminar insumo:', error);
      this.handleAlertType('ERROR', error.message || 'Error al eliminar el insumo');
    } finally {
      this.cargando = false;
    }
  }

  getEstadoClass(estado: EstadoInsumo): string {
    return estado === 'Nuevo' ? 'estado-nuevo' : 'estado-usado';
  }

  getEstadoColor(estado: EstadoInsumo): string {
    return estado === 'Nuevo' ? '#4CAF50' : '#FF9800';
  }

  getStockClass(cantidad: number, stockMinimo?: number, activo: boolean = true): string {
    if (!activo) return 'stock-desactivado';
    const minimo = stockMinimo || 5;
    if (cantidad === 0) return 'stock-critico';
    if (cantidad <= minimo) return 'stock-bajo';
    return 'stock-normal';
  }

  getStockText(cantidad: number, stockMinimo?: number, activo: boolean = true): string {
    if (!activo) return 'Desactivado';
    const minimo = stockMinimo || 5;
    if (cantidad === 0) return 'Sin stock';
    if (cantidad <= minimo) return 'Stock bajo';
    return 'Stock normal';
  }

  refrescar() {
    this.cargarInsumos();
  }

  getTotalInsumos(): number {
    return this.insumos.length;
  }

  getStockBajoCount(): number {
    return this.insumos.filter(i => i.cantidad <= (i.stockMinimo || 5)).length;
  }

  getSinStockCount(): number {
    return this.insumos.filter(i => i.cantidad === 0).length;
  }

  getNuevosCount(): number {
    return this.insumos.filter(i => i.estado === 'Nuevo').length;
  }

  obtenerTextoStock(insumo: Insumo): string {
    if (insumo.unidadesPorEmpaque && insumo.unidadesPorEmpaque > 0) {
      const unidadesTotales = insumo.cantidadUnidades || (insumo.cantidad * insumo.unidadesPorEmpaque);
      
      if (unidadesTotales === 0) {
        return `0 ${insumo.tipoContenido === 'METROS' ? 'metros' : 'piezas'}`;
      }

      const tipoUnidad = insumo.tipoContenido === 'METROS' ? 'metros' : 'piezas';
      return `${insumo.cantidad} ${insumo.tipoEmpaque}${insumo.cantidad !== 1 ? 's' : ''} (${unidadesTotales} ${tipoUnidad})`;
    } else {
      return `${insumo.cantidad} ${insumo.tipoEmpaque}${insumo.cantidad !== 1 ? 's' : ''}`;
    }
  }

  getStockClassGrid(insumo: Insumo): string {
    if (insumo.activo === false) return 'stock-desactivado';
    
    let cantidadParaValidar = insumo.cantidad;
    
    if (insumo.unidadesPorEmpaque && insumo.unidadesPorEmpaque > 0) {
      cantidadParaValidar = insumo.cantidadUnidades || (insumo.cantidad * insumo.unidadesPorEmpaque);
    }
    
    const minimo = insumo.stockMinimo || 5;
    if (cantidadParaValidar === 0) return 'stock-critico';
    if (cantidadParaValidar <= minimo) return 'stock-bajo';
    return 'stock-normal';
  }

  getStockTextGrid(insumo: Insumo): string {
    if (insumo.activo === false) return 'Desactivado';
    
    let cantidadParaValidar = insumo.cantidad;
    
    if (insumo.unidadesPorEmpaque && insumo.unidadesPorEmpaque > 0) {
      cantidadParaValidar = insumo.cantidadUnidades || (insumo.cantidad * insumo.unidadesPorEmpaque);
    }
    
    const minimo = insumo.stockMinimo || 5;
    if (cantidadParaValidar === 0) return 'Sin stock';
    if (cantidadParaValidar <= minimo) return 'Stock bajo';
    return 'Stock normal';
  }

}