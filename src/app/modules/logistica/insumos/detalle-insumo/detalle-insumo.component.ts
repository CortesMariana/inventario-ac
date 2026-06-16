import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { firstValueFrom, catchError, of } from 'rxjs';
import { BaseComponent } from 'src/app/shared/base/base.component';
import { InsumosLogisticaService } from '../insumos-logistica.service';
import { InsumoLogisticaModel, MovimientoInsumoLogisticaModel } from '../models/insumo-logistica.model';
import { UserService } from 'src/app/shared/service/user.service';

@Component({
  selector: 'app-detalle-insumo',
  standalone: true,
  imports: [
    CommonModule,
    ConfirmDialogModule,
    ProgressSpinnerModule,
    ToastModule,
    TooltipModule,
  ],
  templateUrl: './detalle-insumo.component.html',
  styleUrl: './detalle-insumo.component.scss',
  providers: [MessageService, ConfirmationService],
})
export class DetalleInsumoComponent extends BaseComponent implements OnInit {

  insumo: InsumoLogisticaModel | null = null;
  insumoId: string = '';
  cargando: boolean = true;
  procesando: boolean = false;

  usuario: any;

  historialMovimientos: MovimientoInsumoLogisticaModel[] = [];

  constructor(
    protected override messageService: MessageService,
    private route: ActivatedRoute,
    private router: Router,
    private insumosService: InsumosLogisticaService,
    private confirmationService: ConfirmationService,
    private userSrv: UserService,
  ) {
    super(messageService);
  }

  async ngOnInit() {
    this.insumoId = this.route.snapshot.paramMap.get('firestoreId') || '';

    if (!this.insumoId) {
      this.handleAlertType('ERROR', 'No se especificó el insumo');
      this.router.navigate(['/logistica/insumos/insumos']);
      return;
    }

    try {
      this.usuario = await firstValueFrom(
        this.userSrv.consultarEmpleado().pipe(
          catchError((error) => {
            console.error('Error al obtener usuario:', error);
            return of(null);
          })
        )
      );

      if (!this.usuario) {
        this.usuario = {
          id: 'usuario_desconocido',
          nombreCompleto: 'Usuario Desconocido',
          nombre: 'Usuario',
        };
      }
    } catch (error) {
      this.usuario = {
        id: 'usuario_desconocido',
        nombreCompleto: 'Usuario Desconocido',
        nombre: 'Usuario',
      };
    }

    await this.cargarInsumo();
  }

  async cargarInsumo() {
    this.cargando = true;
    try {
      this.insumo = await this.insumosService.getInsumo(this.insumoId);

      if (!this.insumo) {
        this.handleAlertType('ERROR', 'Insumo no encontrado');
        this.router.navigate(['/logistica/insumos/insumos']);
        return;
      }

      this.historialMovimientos = await this.insumosService.getHistorialMovimientos(this.insumoId);

    } catch (error) {
      console.error('Error al cargar insumo:', error);
      this.handleAlertType('ERROR', 'Error al cargar el insumo');
    } finally {
      this.cargando = false;
    }
  }


  volver() {
    this.router.navigate(['/logistica/insumos/insumos']);
  }

  editar() {
    if (this.insumo?.firestoreId) {
      this.router.navigate(['/logistica/insumos/editar', this.insumo.firestoreId]);
    }
  }


  toggleEstado() {
    if (!this.insumo) return;

    const esActivo = this.insumo.activo;
    this.confirmationService.confirm({
      key: 'confirmDetalle',
      message: esActivo
        ? `¿Estás seguro de desactivar el insumo "<strong>${this.insumo.nombre}</strong>"?<br><small>Quedará oculto del inventario pero podrás reactivarlo después.</small>`
        : `¿Estás seguro de reactivar el insumo "<strong>${this.insumo.nombre}</strong>"?`,
      header: esActivo ? 'Desactivar Insumo' : 'Reactivar Insumo',
      icon: esActivo ? 'pi pi-exclamation-triangle' : 'pi pi-refresh',
      acceptLabel: esActivo ? 'Sí, desactivar' : 'Sí, reactivar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: esActivo ? 'p-button-danger' : 'p-button-success',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        if (esActivo) {
          this.confirmarDesactivar();
        } else {
          this.confirmarReactivar();
        }
      },
      reject: () => {},
    });
  }

  async confirmarDesactivar() {
    this.procesando = true;
    try {
      const usuarioMovimiento = this.getUsuarioMovimiento();
      await this.insumosService.deleteInsumo(this.insumoId, usuarioMovimiento);
      this.handleAlertType('SUCCESS', 'Insumo desactivado correctamente');
      await this.cargarInsumo();
    } catch (error: any) {
      this.handleAlertType('ERROR', error.message || 'Error al desactivar el insumo');
    } finally {
      this.procesando = false;
    }
  }

  async confirmarReactivar() {
    this.procesando = true;
    try {
      const usuarioMovimiento = this.getUsuarioMovimiento();
      await this.insumosService.reactivarInsumo(this.insumoId, usuarioMovimiento);
      this.handleAlertType('SUCCESS', 'Insumo reactivado correctamente');
      await this.cargarInsumo();
    } catch (error: any) {
      this.handleAlertType('ERROR', error.message || 'Error al reactivar el insumo');
    } finally {
      this.procesando = false;
    }
  }


  private getUsuarioMovimiento() {
    return {
      id:     this.usuario?.id             || 'usuario_desconocido',
      nombre: this.usuario?.nombreCompleto || this.usuario?.nombre || 'Usuario Desconocido',
    };
  }

  formatFecha(fecha: any): string {
    const date = this.getFechaDate(fecha);
    if (!date) return 'Sin fecha';
    return date.toLocaleDateString('es-MX', {
      day:    '2-digit',
      month:  '2-digit',
      year:   'numeric',
      hour:   '2-digit',
      minute: '2-digit',
    });
  }

  getFechaDate(fecha: any): Date | null {
    if (!fecha) return null;
    try {
      if (fecha.toDate)                                         return fecha.toDate();
      if (fecha instanceof Date)                                return fecha;
      if (typeof fecha === 'string')                            return new Date(fecha);
      if (fecha && typeof fecha === 'object' && fecha.seconds)  return new Date(fecha.seconds * 1000);
      return null;
    } catch {
      return null;
    }
  }

  getMovimientoIcon(tipo: string): string {
    switch (tipo) {
      case 'CREACION':    return 'pi pi-plus';
      case 'EDICION':     return 'pi pi-pencil';
      case 'ELIMINACION': return 'pi pi-trash';
      case 'REACTIVACION':return 'pi pi-refresh';
      case 'USO':         return 'pi pi-send';
      default:            return 'pi pi-info-circle';
    }
  }

  getMovimientoClass(tipo: string): string {
    switch (tipo) {
      case 'CREACION':    return 'movimiento-creacion';
      case 'EDICION':     return 'movimiento-edicion';
      case 'ELIMINACION': return 'movimiento-eliminacion';
      case 'REACTIVACION':return 'movimiento-reactivacion';
      case 'USO':         return 'movimiento-uso';
      default:            return '';
    }
  }

  getMovimientoLabel(tipo: string): string {
    switch (tipo) {
      case 'CREACION':    return 'Creación';
      case 'EDICION':     return 'Edición';
      case 'ELIMINACION': return 'Eliminación';
      case 'REACTIVACION':return 'Reactivación';
      case 'USO':         return 'Uso';
      default:            return tipo;
    }
  }
}
