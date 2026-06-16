import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { BaseComponent } from 'src/app/shared/base/base.component';
import { ColaboradoresActivosService } from '../colaboradores-activos.service';
import { ColaboradorActivo } from '../models/colaborador-activo.model';

@Component({
  selector: 'app-grid-colaboradores',
  templateUrl: './grid-colaboradores.component.html',
  styleUrls: ['./grid-colaboradores.component.css']
})
export class GridColaboradoresComponent extends BaseComponent implements OnInit {
  colaboradores: ColaboradorActivo[] = [];
  colaboradoresFiltrados: ColaboradorActivo[] = [];
  cargando: boolean = false;

  filtroBusqueda: string = '';
  filtroEmpresa: string = 'todas';
  filtroUbicacion: string = 'todas';
  filtroMinActivos: number = 0;

  opcionesEmpresa: any[] = [];
  opcionesUbicacion: any[] = [];

  vistaActual: 'cards' | 'lista' = 'cards';

  currentPage: number = 1;
  itemsPerPage: number = 10;
  paginatedColaboradores: ColaboradorActivo[] = [];
  totalPages: number = 1;
  pageNumbers: number[] = [];

  totalColaboradores: number = 0;
  totalActivosAsignados: number = 0;
  promedioActivos: number = 0;
  colaboradorConMasActivos: { nombre: string, total: number } | null = null;

  private readonly STORAGE_KEYS = {
    VISTA: 'colaboradores_preferencia_vista',
    ITEMS_POR_PAGINA: 'colaboradores_items_por_pagina'
  };

  constructor(
    protected override messageService: MessageService,
    private router: Router,
    private colaboradoresService: ColaboradoresActivosService
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
      this.colaboradores = await this.colaboradoresService.getColaboradoresConActivos();
      
      const empresas = [...new Set(this.colaboradores.map(c => c.empresa))];
      this.opcionesEmpresa = [
        { label: 'Todas las empresas', value: 'todas' },
        ...empresas.map(e => ({ label: e, value: e }))
      ];

      const ubicaciones = [...new Set(this.colaboradores.map(c => c.lugarTrabajo))];
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
    this.totalActivosAsignados = this.colaboradores.reduce((sum, c) => sum + c.totalActivos, 0);
    this.promedioActivos = this.totalColaboradores > 0 
      ? Number((this.totalActivosAsignados / this.totalColaboradores).toFixed(1)) 
      : 0;

    if (this.colaboradores.length > 0) {
      const maxActivos = Math.max(...this.colaboradores.map(c => c.totalActivos));
      const topColaborador = this.colaboradores.find(c => c.totalActivos === maxActivos);
      if (topColaborador) {
        this.colaboradorConMasActivos = {
          nombre: topColaborador.nombreCompleto,
          total: maxActivos
        };
      }
    }
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
        c.activosAsignados.some(a => 
          a.nombre.toLowerCase().includes(busqueda) ||
          a.marca.toLowerCase().includes(busqueda) ||
          a.numeroSerie.toLowerCase().includes(busqueda)
        )
      );
    }

    if (this.filtroEmpresa !== 'todas') {
      filtrados = filtrados.filter(c => c.empresa === this.filtroEmpresa);
    }

    if (this.filtroUbicacion !== 'todas') {
      filtrados = filtrados.filter(c => c.lugarTrabajo === this.filtroUbicacion);
    }

    if (this.filtroMinActivos > 0) {
      filtrados = filtrados.filter(c => c.totalActivos >= this.filtroMinActivos);
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
    this.filtroMinActivos = 0;
    this.aplicarFiltros();
  }

  cambiarVista(tipo: 'cards' | 'lista') {
    this.vistaActual = tipo;
    this.guardarPreferencias(); 
  }

  verDetalle(colaborador: ColaboradorActivo, event?: Event) {
    if (event) {
      const target = event.target as HTMLElement;
      if (target.closest('.btn-accion')) {
        return;
      }
    }
    
    this.router.navigate(['/admin/activos/colaborador', colaborador.empleadoId]);
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

  refrescar() {
    this.cargarDatos();
  }
}