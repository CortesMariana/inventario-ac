import {Component, OnInit} from '@angular/core';
import {BlockUIModule} from "primeng/blockui";
import {CheckboxModule} from "primeng/checkbox";
import {ConfirmDialogModule} from "primeng/confirmdialog";
import {DatePipe, DecimalPipe, NgClass, NgForOf, NgIf} from "@angular/common";
import {DropdownModule} from "primeng/dropdown";
import {InputTextModule} from "primeng/inputtext";
import {PaginatorModule} from "primeng/paginator";
import {ProgressSpinnerModule} from "primeng/progressspinner";
import {ToastModule} from "primeng/toast";
import {TooltipModule} from "primeng/tooltip";
import {InsumoLogisticaModel} from "../models/insumo-logistica.model";
import {ConfirmationService, MessageService} from "primeng/api";
import {Router} from "@angular/router";
import {InsumosLogisticaService} from "../insumos-logistica.service";
import {BaseComponent} from "../../../../shared/base/base.component";

@Component({
  selector: 'app-grid-insumos',
  standalone: true,
    imports: [
        BlockUIModule,
        CheckboxModule,
        ConfirmDialogModule,
        DecimalPipe,
        DropdownModule,
        InputTextModule,
        NgForOf,
        NgIf,
        PaginatorModule,
        ProgressSpinnerModule,
        ToastModule,
        TooltipModule,
        DatePipe,
        NgClass
    ],
  templateUrl: './grid-insumos.component.html',
  styleUrl: './grid-insumos.component.scss'
})
export class GridInsumosComponent extends BaseComponent implements OnInit {
    insumos:InsumoLogisticaModel[]=[];
    insumosFiltrados:InsumoLogisticaModel[]=[];
    cargando:boolean=false;

    filtroNombre: string = '';
    filtroDescripcion: string = '';
    filtroMarca: string = '';
    filtroFamilia: string = '';

    ordenamientoColumnas: { [key: string]: 'asc' | 'desc' | null } = {
        nombre: null,
        descripcion: null,
        familia: null,
        marca: null,
        SKU: null,
        precioUnitario: null,
        fechaCreacion: 'desc'
    };
    columnaActiva: string = 'fechaCreacion';

    currentPage: number = 1;
    itemsPerPage: number = 10;
    paginatedInsumos: InsumoLogisticaModel[] = [];
    totalPages: number = 1;
    pageNumbers: number[] = [];

    private readonly STORAGE_KEYS = {
        ITEMS_POR_PAGINA: 'insumos_logistica_items_por_pagina',
        ORDENAMIENTO_COLUMNAS: 'insumos_logistica_ordenamiento_columnas',
        COLUMNA_ACTIVA: 'insumos_logistica_columna_activa'
    };

    constructor(
        protected override messageService: MessageService,
        public router: Router,
        private insumosService: InsumosLogisticaService,
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
            this.aplicarFiltrosYOrdenamiento();
        } catch (error) {
            console.error('Error al cargar insumos:', error);
            this.handleAlertType('ERROR', 'Error al cargar los insumos');
        } finally {
            this.cargando = false;
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

        if (this.filtroFamilia) {
            filtrados = filtrados.filter((i) =>{
                return i.familia && i.familia.toLowerCase().includes(this.filtroFamilia.toLowerCase());
                }
            );
        }

        if (this.filtroMarca) {
            filtrados = filtrados.filter((i) =>{
                    return i.marca && i.marca.toLowerCase().includes(this.filtroMarca.toLowerCase());
                }
            );
        }

        if (this.filtroDescripcion) {
            filtrados = filtrados.filter((i) =>{
                    return i.descripcion && i.descripcion.toLowerCase().includes(this.filtroDescripcion.toLowerCase());
                }
            );
        }

        filtrados = this.aplicarOrdenamiento(filtrados);

        this.insumosFiltrados = filtrados;
        this.currentPage = 1;
        this.updatePagination();
    }

    private aplicarOrdenamiento(insumos: InsumoLogisticaModel[]): InsumoLogisticaModel[] {
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
                case 'descripcion':
                    valorA = a.descripcion || '';
                    valorB = b.descripcion || '';
                    break;
                case 'marca':
                    valorA = a.marca || 0;
                    valorB = b.marca || 0;
                    break;
                case 'familia':
                    valorA = a.familia || '';
                    valorB = b.familia || '';
                    break;
                case 'SKU':
                    valorA = a.SKU || '';
                    valorB = b.SKU || '';
                    break;
                case 'precioUnitario':
                    valorA = a.precioUnitario || 0;
                    valorB = b.precioUnitario || 0;
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

    getFecha(fecha: any): Date | null {
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
        this.aplicarFiltrosYOrdenamiento();
    }

    verDetalle(insumo: InsumoLogisticaModel) {
        if (insumo.firestoreId) {
            this.router.navigate(['/logistica/insumos/detalle', insumo.firestoreId]);
        }
    }

    editarInsumo(insumo: InsumoLogisticaModel, event: Event) {
        event.stopPropagation();
        if (insumo.firestoreId) {
            this.router.navigate(['/logistica/insumos/editar', insumo.firestoreId]);
        }
    }

    eliminarInsumo(insumo: InsumoLogisticaModel, event: Event) {
        event.stopPropagation();

        const esActivo = insumo.activo;
        const titulo = esActivo ? 'Desactivar Insumo' : 'Activar Insumo';
        const mensaje = esActivo
            ? `¿Estás seguro de desactivar el insumo "${insumo.nombre}"?<br><small class="text-gray-500">El insumo quedará oculto del inventario principal pero podrás reactivarlo después.</small>`
            : `¿Estás seguro de reactivar el insumo "${insumo.nombre}"?<br><small class="text-green-500">El insumo volverá a estar disponible en el inventario.</small>`;
        const icono = esActivo ? 'pi pi-exclamation-triangle' : 'pi pi-refresh';
        const botonTexto = esActivo ? 'Sí, desactivar' : 'Sí, reactivar';
        const botonClass = esActivo ? 'p-button-danger' : 'p-button-success';

        this.confirmationService.confirm({
            key: 'confirmInsumos',
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
            },
            reject: () => {}
        });
    }

    async confirmarReactivacion(insumo: InsumoLogisticaModel) {
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

    async confirmarEliminacion(insumo: InsumoLogisticaModel) {
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

    refrescar() {
        this.cargarInsumos();
    }

    getTotalInsumos(): number {
        return this.insumos.length;
    }
}
