import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService, ConfirmationService } from 'primeng/api';
import { BaseComponent } from 'src/app/shared/base/base.component';
import { InsumosService } from '../insumos.service';
import { Insumo, MovimientoInsumo } from '../models/insumo.model';
import { UserService } from 'src/app/shared/service/user.service';
import { firstValueFrom, catchError, of } from 'rxjs';

@Component({
  selector: 'app-detalle-insumo',
  templateUrl: './detalle-insumo.component.html',
  styleUrls: ['./detalle-insumo.component.css'],
  providers: [ConfirmationService]
})
export class DetalleInsumoComponent extends BaseComponent implements OnInit {
  insumo: Insumo | null = null;
  insumoId: string = '';
  cargando: boolean = true;
  procesando: boolean = false;
  
  usuario: any;
  
  historialMovimientos: MovimientoInsumo[] = [];
  
  mostrarDialogMovimiento: boolean = false;
  tipoMovimiento: 'INCREMENTO' | 'DECREMENTO' = 'INCREMENTO';
  cantidadMovimiento: number = 1;
  observacionesMovimiento: string = '';
  motivoMovimiento: string = '';
  tipoDescuento: 'UNIDADES' | 'EMPAQUES' = 'UNIDADES'; 
  maxCantidadDisponible: number = 0;

  resumenUnidades: { empaques: number, unidades: number, tipoUnidad: string } | null = null;
  
  constructor(
    protected override messageService: MessageService,
    private route: ActivatedRoute,
    private router: Router,
    private insumosService: InsumosService,
    private confirmationService: ConfirmationService,
    private userSrv: UserService 
  ) {
    super(messageService);
  }
  
  async ngOnInit() {
    this.insumoId = this.route.snapshot.paramMap.get('firestoreId') || '';
    
    if (!this.insumoId) {
      this.handleAlertType('ERROR', 'No se especificó el insumo');
      this.router.navigate(['/admin/insumos/insumos']);
      return;
    }
    
    try {
      this.usuario = await firstValueFrom(this.userSrv.consultarEmpleado().pipe(
        catchError((error) => {
          console.error('Error al obtener usuario:', error);
          return of(null);
        })
      ));
      
      if (!this.usuario) {
        console.warn('No se pudo obtener usuario, usando valores por defecto');
        this.usuario = {
          id: 'usuario_desconocido',
          nombreCompleto: 'Usuario Desconocido',
          nombre: 'Usuario'
        };
      }
    } catch (error) {
      console.error('Error al cargar usuario:', error);
      this.usuario = {
        id: 'usuario_desconocido',
        nombreCompleto: 'Usuario Desconocido',
        nombre: 'Usuario'
      };
    }
    
    await this.cargarInsumo();
  }

  obtenerUnidadesDisponibles(): number {
    if (!this.insumo) return 0;
    const unidades = this.insumo.cantidadUnidades || (this.insumo.cantidad * (this.insumo.unidadesPorEmpaque || 1));
    return unidades;
  }

  actualizarMaxCantidad() {
    if (this.tipoMovimiento === 'DECREMENTO') {
      if (this.insumo?.unidadesPorEmpaque && this.tipoDescuento === 'UNIDADES') {
        this.maxCantidadDisponible = this.obtenerUnidadesDisponibles();
      } else {
        const unidades = this.obtenerUnidadesDisponibles();
        const empaquesReales = Math.ceil(unidades / (this.insumo?.unidadesPorEmpaque || 1));
        this.maxCantidadDisponible = empaquesReales;
      }
      
      if (this.cantidadMovimiento > this.maxCantidadDisponible) {
        this.cantidadMovimiento = this.maxCantidadDisponible;
      }
    }
  }

  validarCantidad() {
    if (this.cantidadMovimiento > this.maxCantidadDisponible) {
      this.cantidadMovimiento = this.maxCantidadDisponible;
    }
    if (this.cantidadMovimiento < 0.01) {
      this.cantidadMovimiento = 0.01;
    }
  }

  cerrarDialog() {
    this.mostrarDialogMovimiento = false;
    this.cantidadMovimiento = 1;
    this.observacionesMovimiento = '';
    this.motivoMovimiento = '';
    this.tipoDescuento = 'UNIDADES';
  }

  async cargarResumenUnidades() {
    if (this.insumoId && this.insumo?.unidadesPorEmpaque) {
      const unidades = this.insumo.cantidadUnidades || (this.insumo.cantidad * this.insumo.unidadesPorEmpaque);
      const empaques = unidades > 0 ? 1 : 0;
      const tipo = this.insumo.tipoContenido === 'METROS' ? 'metros' : 'piezas';
      
      this.resumenUnidades = {
        empaques: empaques,
        unidades: unidades,
        tipoUnidad: tipo
      };
      
      if (this.insumo && unidades > 0 && this.insumo.cantidad === 0) {
        this.insumo.cantidad = 1;
      }
    }
  }
  
  async cargarInsumo() {
    this.cargando = true;
    try {
      this.insumo = await this.insumosService.getInsumo(this.insumoId);
      
      if (!this.insumo) {
        this.handleAlertType('ERROR', 'Insumo no encontrado');
        this.router.navigate(['/admin/insumos/insumos']);
        return;
      }

      await this.cargarResumenUnidades();
      
      this.formatearFechas();
      await this.cargarHistorial();
      
    } catch (error) {
      console.error('Error al cargar insumo:', error);
      this.handleAlertType('ERROR', 'Error al cargar el insumo');
    } finally {
      this.cargando = false;
    }
  }
  
  formatearFechas() {
    if (this.insumo?.fechaCreacion) {
      this.insumo.fechaCreacionFormatted = this.formatFecha(this.insumo.fechaCreacion);
    }
    if (this.insumo?.fechaModificacion) {
      this.insumo.fechaModificacionFormatted = this.formatFecha(this.insumo.fechaModificacion);
    }
  }
  
  async cargarHistorial() {
    if (this.insumoId) {
      this.historialMovimientos = await this.insumosService.getHistorialMovimientos(this.insumoId);
      this.formatearFechasHistorial();
    }
  }
  
  formatearFechasHistorial() {
    this.historialMovimientos.forEach(mov => {
      mov.fechaMovimientoFormatted = this.formatFecha(mov.fechaMovimiento);
    });
  }
  
  formatFecha(fecha: any): string {
    const date = this.getFecha(fecha);
    if (!date) return 'Sin fecha';
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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
  
  volver() {
    this.router.navigate(['/admin/insumos/insumos']);
  }
  
  editar() {
    if (this.insumo?.firestoreId) {
      this.router.navigate(['/admin/insumos/editar', this.insumo.firestoreId]);
    }
  }
  
  abrirDialogMovimiento(tipo: 'INCREMENTO' | 'DECREMENTO') {
    this.tipoMovimiento = tipo;
    this.cantidadMovimiento = 1;
    this.observacionesMovimiento = '';
    this.motivoMovimiento = '';
    this.tipoDescuento = 'UNIDADES';
    
    if (tipo === 'DECREMENTO') {
      if (this.insumo?.unidadesPorEmpaque) {
        this.maxCantidadDisponible = this.obtenerUnidadesDisponibles();
      } else {
        this.maxCantidadDisponible = this.insumo?.cantidad || 0;
      }
    } else {
      this.maxCantidadDisponible = 999999;
    }
    
    this.mostrarDialogMovimiento = true;
  }
  
  async realizarMovimiento() {
    if (this.cantidadMovimiento <= 0) {
      this.handleAlertType('WARNING', 'La cantidad debe ser mayor a 0');
      return;
    }
    
    if (this.cantidadMovimiento > this.maxCantidadDisponible) {
      this.handleAlertType('WARNING', `La cantidad no puede exceder ${this.maxCantidadDisponible}`);
      return;
    }
    
    this.procesando = true;
    
    try {
      const usuarioMovimiento = {
        id: this.usuario?.id || 'usuario_desconocido',
        nombre: this.usuario?.nombreCompleto || this.usuario?.nombre || 'Usuario Desconocido'
      };
      
      const observaciones = this.observacionesMovimiento || '';
      const motivo = this.motivoMovimiento || '';
      
      if (this.tipoMovimiento === 'INCREMENTO') {
        await this.insumosService.incrementarCantidad(
          this.insumoId,
          this.cantidadMovimiento,
          usuarioMovimiento,
          observaciones,
          motivo
        );
        this.handleAlertType('SUCCESS', `Se agregaron ${this.cantidadMovimiento} unidades al insumo`);
      } else {
          if (this.insumo?.unidadesPorEmpaque && this.tipoDescuento === 'UNIDADES') {
            const resultado = await this.insumosService.decrementarPorUnidades(
              this.insumoId,
              this.cantidadMovimiento,
              usuarioMovimiento,
              observaciones,
              motivo
            );
            this.handleAlertType('SUCCESS', resultado.mensaje);
          } else {
          await this.insumosService.decrementarCantidad(
            this.insumoId,
            this.cantidadMovimiento,
            usuarioMovimiento,
            observaciones,
            motivo
          );
          const unidadTexto = this.insumo?.tipoEmpaque || 'unidades';
          const plural = this.cantidadMovimiento !== 1 ? 's' : '';
          this.handleAlertType('SUCCESS', `Se descontaron correctamente del insumo`);
        }
      }
      
      this.cerrarDialog();
      await this.cargarInsumo();
      
    } catch (error: any) {
      console.error('Error al realizar movimiento:', error);
      this.handleAlertType('ERROR', error.message || 'Error al realizar el movimiento');
    } finally {
      this.procesando = false;
    }
  }
  
  eliminarInsumo() {
    this.confirmationService.confirm({
      message: `¿Estás seguro de eliminar el insumo "${this.insumo?.nombre}"?<br><small class="text-red-500">Esta acción desactivará el insumo y lo ocultará del inventario</small>`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.confirmarEliminacion();
      }
    });
  }
  
  async confirmarEliminacion() {
    this.procesando = true;
    try {
      const usuarioMovimiento = {
        id: this.usuario?.id || 'usuario_desconocido',
        nombre: this.usuario?.nombreCompleto || this.usuario?.nombre || 'Usuario Desconocido'
      };
      await this.insumosService.deleteInsumo(this.insumoId, usuarioMovimiento);
      this.handleAlertType('SUCCESS', 'Insumo eliminado correctamente');
      this.router.navigate(['/admin/insumos/insumos']);
    } catch (error: any) {
      console.error('Error al eliminar insumo:', error);
      this.handleAlertType('ERROR', error.message || 'Error al eliminar el insumo');
    } finally {
      this.procesando = false;
    }
  }
  
  getEstadoClass(estado: string): string {
    return estado === 'Nuevo' ? 'estado-nuevo' : 'estado-usado';
  }
  
  getStockClass(cantidad: number, stockMinimo?: number): string {
    const minimo = stockMinimo ?? 0; 
    if (cantidad === 0) return 'stock-critico';
    if (stockMinimo !== undefined && cantidad <= minimo && minimo > 0) return 'stock-bajo';
    return 'stock-normal';
  }

  getStockText(cantidad: number, stockMinimo?: number): string {
    const minimo = stockMinimo ?? 0; 
    if (cantidad === 0) return 'Sin stock';
    if (stockMinimo !== undefined && cantidad <= minimo && minimo > 0) return 'Stock bajo';
    return 'Stock normal';
  }
  
  getMovimientoIcon(tipo: string): string {
    switch (tipo) {
      case 'INCREMENTO': return 'pi pi-plus-circle';
      case 'DECREMENTO': return 'pi pi-minus-circle';
      case 'CREACION': return 'pi pi-plus';
      case 'EDICION': return 'pi pi-pencil';
      case 'ELIMINACION': return 'pi pi-trash';
      case 'REACTIVACION': return 'pi pi-refresh';
      default: return 'pi pi-info-circle';
    }
  }

  getMovimientoClass(tipo: string): string {
    switch (tipo) {
      case 'INCREMENTO': return 'movimiento-incremento';
      case 'DECREMENTO': return 'movimiento-decremento';
      case 'CREACION': return 'movimiento-creacion';
      case 'EDICION': return 'movimiento-edicion';
      case 'ELIMINACION': return 'movimiento-eliminacion';
      case 'REACTIVACION': return 'movimiento-reactivacion';
      default: return '';
    }
  }

  navegarAlTicket(ticketId?: string) {
    if (ticketId) {
      this.router.navigate(['/admin/tickets/tickets', ticketId]);
    }
  }

  obtenerVistaPreviaIncremento(): string {
    if (this.tipoMovimiento === 'INCREMENTO' && this.insumo?.unidadesPorEmpaque) {
      const unidadesAAgregar = this.cantidadMovimiento * this.insumo.unidadesPorEmpaque;
      return `Se agregarán ${this.cantidadMovimiento} ${this.insumo.tipoEmpaque}(s) = ${unidadesAAgregar} ${this.insumo.tipoContenido === 'METROS' ? 'metros' : 'piezas'}`;
    }
    return '';
  }
}