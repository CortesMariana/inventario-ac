import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { BlockUIModule } from 'primeng/blockui';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { CalendarModule } from 'primeng/calendar';
import { firstValueFrom, catchError, of } from 'rxjs';

import { BaseComponent } from 'src/app/shared/base/base.component';
import { UserService } from 'src/app/shared/service/user.service';
import { InsumosLogisticaService } from '../../insumos/insumos-logistica.service';
import { InsumoLogisticaModel } from '../../insumos/models/insumo-logistica.model';
import { VehiculosService } from '../../vehiculos/vehiculos.service';
import { Vehiculo } from '../../vehiculos/models/vehiculo.model';
import { TicketsLogisticaService } from '../tickets.service';
import { TipoTicketLogistica, LineaInsumoTicket } from '../models/ticket-logistica.model';

interface LineaForm {
  insumoSeleccionado: InsumoLogisticaModel | null;
  cantidad: number;
}

@Component({
  selector: 'app-nuevo-ticket',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DropdownModule,
    InputTextareaModule,
    InputTextModule,
    InputNumberModule,
    BlockUIModule,
    ProgressSpinnerModule,
    ToastModule,
    TooltipModule,
    CalendarModule,
  ],
  templateUrl: './nuevo-ticket.component.html',
  styleUrl: './nuevo-ticket.component.scss',
  providers: [MessageService],
})
export class NuevoTicketComponent extends BaseComponent implements OnInit {

  cargando = true;
  guardando = false;
  fechaHoy = new Date();

  usuario: any = null;
  tipoSeleccionado: TipoTicketLogistica | null = null;

  /* PRODUCTO */
  insumosDisponibles: InsumoLogisticaModel[] = [];
  insumoOptions: { label: string; value: InsumoLogisticaModel }[] = [];
  lineas: LineaForm[] = [{ insumoSeleccionado: null, cantidad: 1 }];

  lineasOptions: { label: string; value: InsumoLogisticaModel }[][] = [[]];
  justificacionProducto = '';

  placasInputProducto = '';
  placasEstadoProducto: 'idle' | 'ok' | 'error' = 'idle';
  vehiculoProducto: Vehiculo | null = null;

  /* GASOLINA */
  placasInputGasolina = '';
  placasEstadoGasolina: 'idle' | 'ok' | 'error' = 'idle';
  vehiculoGasolina: Vehiculo | null = null;
  litrosSolicitados: number = 0;
  justificacionGasolina = '';
  estacionGasolina = '';
  fechaCargaEstimada: Date | null = null;
  archivosGasolina: File[] = [];

  /* REPARACIÓN */
  vehiculosDisponibles: Vehiculo[] = [];
  placasInput = '';
  placasEstado: 'idle' | 'ok' | 'error' = 'idle';
  vehiculoEncontrado: Vehiculo | null = null;
  tipoReparacion = '';
  justificacionReparacion = '';

  constructor(
    protected override messageService: MessageService,
    private router: Router,
    private userSrv: UserService,
    private insumosService: InsumosLogisticaService,
    private vehiculosService: VehiculosService,
    private ticketsService: TicketsLogisticaService,
  ) {
    super(messageService);
  }

  async ngOnInit() {
    try {
      const [usuario, insumos, vehiculos] = await Promise.all([
        firstValueFrom(this.userSrv.consultarEmpleado().pipe(catchError(() => of(null)))),
        this.insumosService.getAllInsumos(),
        this.vehiculosService.getAllVehiculos(),
      ]);

      this.usuario = usuario;

      this.insumosDisponibles = insumos.filter(i => i.activo);
      this.insumoOptions = this.insumosDisponibles.map(i => ({
        label: `${i.nombre}${i.SKU ? ' — ' + i.SKU : ''}${i.familia ? ' [' + i.familia + ']' : ''}`,
        value: i,
      }));
      this.recalcularOpciones();

      this.vehiculosDisponibles = vehiculos;
    } catch (error) {
      console.error('Error al cargar datos:', error);
      this.handleAlertType('ERROR', 'Error al cargar la información');
    } finally {
      this.cargando = false;
    }
  }

  seleccionarTipo(tipo: TipoTicketLogistica) {
    this.tipoSeleccionado = tipo;
  }

  cancelarTipo() {
    this.tipoSeleccionado = null;
  }


  agregarLinea() {
    this.lineas.push({ insumoSeleccionado: null, cantidad: 1 });
    this.recalcularOpciones();
  }

  eliminarLinea(index: number) {
    if (this.lineas.length > 1) {
      this.lineas.splice(index, 1);
      this.recalcularOpciones();
    }
  }

  onInsumoChange(linea: LineaForm) {
    if (!linea.cantidad || linea.cantidad < 1) linea.cantidad = 1;
    this.recalcularOpciones();
  }

  recalcularOpciones() {
    this.lineasOptions = this.lineas.map((_, i) => {
      const yaSeleccionados = this.lineas
        .filter((l, j) => j !== i && l.insumoSeleccionado)
        .map(l => l.insumoSeleccionado!.firestoreId);
      return this.insumoOptions.filter(o => !yaSeleccionados.includes(o.value.firestoreId));
    });
  }

  getSubtotal(linea: LineaForm): number {
    if (!linea.insumoSeleccionado || !linea.cantidad) return 0;
    return linea.insumoSeleccionado.precioUnitario * linea.cantidad;
  }

  getTotalEstimado(): number {
    return this.lineas.reduce((acc, l) => acc + this.getSubtotal(l), 0);
  }

  getLineasValidas(): LineaForm[] {
    return this.lineas.filter(l => l.insumoSeleccionado && l.cantidad > 0);
  }

  validarPlacasProducto() {
    const placas = this.placasInputProducto.trim().toUpperCase();
    if (!placas) { this.placasEstadoProducto = 'idle'; this.vehiculoProducto = null; return; }
    const encontrado = this.vehiculosDisponibles.find(v => (v.placa || '').toUpperCase() === placas);
    if (encontrado) {
      this.vehiculoProducto = encontrado;
      this.placasEstadoProducto = 'ok';
    } else {
      this.vehiculoProducto = null;
      this.placasEstadoProducto = 'error';
    }
  }

  isProductoValido(): boolean {
    return this.getLineasValidas().length > 0 &&
      this.justificacionProducto.trim().length >= 10 &&
      this.placasEstadoProducto === 'ok' &&
      !!this.vehiculoProducto;
  }

  validarPlacas() {
    const placas = this.placasInput.trim().toUpperCase();
    if (!placas) { this.placasEstado = 'idle'; this.vehiculoEncontrado = null; return; }

    const encontrado = this.vehiculosDisponibles.find(
      v => (v.placa || '').toUpperCase() === placas
    );

    if (encontrado) {
      this.vehiculoEncontrado = encontrado;
      this.placasEstado = 'ok';
    } else {
      this.vehiculoEncontrado = null;
      this.placasEstado = 'error';
    }
  }

  validarPlacasGasolina() {
    const placas = this.placasInputGasolina.trim().toUpperCase();
    if (!placas) { this.placasEstadoGasolina = 'idle'; this.vehiculoGasolina = null; return; }
    const encontrado = this.vehiculosDisponibles.find(v => (v.placa || '').toUpperCase() === placas);
    if (encontrado) {
      this.vehiculoGasolina = encontrado;
      this.placasEstadoGasolina = 'ok';
    } else {
      this.vehiculoGasolina = null;
      this.placasEstadoGasolina = 'error';
    }
  }

  isGasolinaValida(): boolean {
    return this.placasEstadoGasolina === 'ok' &&
      !!this.vehiculoGasolina &&
      this.litrosSolicitados > 0 &&
      this.justificacionGasolina.trim().length >= 10;
  }

  onArchivosGasolina(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;
    const nuevos = Array.from(input.files);
    this.archivosGasolina = [...this.archivosGasolina, ...nuevos];
    input.value = '';
  }

  removerArchivoGasolinaForm(index: number) {
    this.archivosGasolina.splice(index, 1);
  }

  isReparacionValida(): boolean {
    return this.placasEstado === 'ok' &&
      !!this.vehiculoEncontrado &&
      this.tipoReparacion.trim().length >= 3 &&
      this.justificacionReparacion.trim().length >= 10;
  }

  async guardar() {
    if (!this.usuario) {
      this.handleAlertType('ERROR', 'No se pudo cargar tu información de usuario. Recarga la página e intenta de nuevo.');
      return;
    }

    const solicitante = {
      id: (this.usuario.id || this.usuario.empleadoId || '').toString().trim(),
      nombre: (this.usuario.nombreCompleto || `${this.usuario.nombre || ''} ${this.usuario.apellidoPaterno || ''}`).trim(),
    };

    if (!solicitante.id || !solicitante.nombre) {
      this.handleAlertType('ERROR', 'Tu información de usuario está incompleta. Recarga la página e intenta de nuevo.');
      return;
    }

    this.guardando = true;
    try {
      if (this.tipoSeleccionado === 'PRODUCTO') {
        if (!this.isProductoValido()) {
          this.handleAlertType('WARNING', 'Agrega al menos un insumo y una justificación de mínimo 10 caracteres');
          return;
        }

        const lineas: LineaInsumoTicket[] = this.getLineasValidas().map(l => {
          const insumo = l.insumoSeleccionado!;
          return {
            insumoId: insumo.firestoreId!,
            insumoNombre: insumo.nombre,
            insumoSKU: insumo.SKU,
            insumoFamilia: insumo.familia,
            insumoMarca: insumo.marca,
            cantidad: l.cantidad,
            precioUnitario: insumo.precioUnitario,
            subtotal: insumo.precioUnitario * l.cantidad,
          };
        });

        await this.ticketsService.createTicketProducto(
          lineas,
          this.justificacionProducto.trim(),
          solicitante,
          {
            vehiculoId: this.vehiculoProducto!.firestoreId || this.vehiculoProducto!.id?.toString() || '',
            placas: this.vehiculoProducto!.placa,
          },
        );

      } else if (this.tipoSeleccionado === 'GASOLINA') {
        if (!this.isGasolinaValida()) {
          this.handleAlertType('WARNING', 'Completa el vehículo, los litros y una justificación de mínimo 10 caracteres');
          return;
        }

        await this.ticketsService.createTicketGasolina({
          vehiculoId: this.vehiculoGasolina!.firestoreId || this.vehiculoGasolina!.id?.toString() || '',
          placas: this.vehiculoGasolina!.placa,
          litrosSolicitados: this.litrosSolicitados,
          justificacion: this.justificacionGasolina.trim(),
          solicitante,
          ...(this.estacionGasolina.trim() && { estacion: this.estacionGasolina.trim() }),
          ...(this.fechaCargaEstimada && { fechaCargaEstimada: this.fechaCargaEstimada }),
          ...(this.archivosGasolina.length > 0 && { archivos: this.archivosGasolina }),
        });

        try {
          const ids = await this.userSrv.getIdsAutorizadoresGasolina();
          ids.forEach(id =>
            this.ticketsService.mandarNotificacionAutorizadorGasolina({
              empleadoNotificacionId: id,
              solicitante: solicitante.nombre,
            }).subscribe({ error: (e: any) => console.warn('Notificación gasolina fallida para', id, e) })
          );
        } catch (e) {
          console.warn('Error al obtener autorizadores de gasolina:', e);
        }

      } else if (this.tipoSeleccionado === 'REPARACION') {
        if (!this.isReparacionValida()) {
          this.handleAlertType('WARNING', 'Completa el vehículo, tipo de reparación y descripción');
          return;
        }

        await this.ticketsService.createTicketReparacion({
          vehiculoId: this.vehiculoEncontrado!.firestoreId || this.vehiculoEncontrado!.id?.toString() || '',
          placas: this.vehiculoEncontrado!.placa,
          tipoReparacion: this.tipoReparacion.trim(),
          justificacion: this.justificacionReparacion.trim(),
          solicitante,
        });
      }

      this.handleAlertType('SUCCESS', 'Solicitud enviada correctamente');
      setTimeout(() => this.router.navigate(['/logistica/tickets/mis-solicitudes']), 1500);
    } catch (error: any) {
      this.handleAlertType('ERROR', error.message || 'Error al enviar la solicitud');
    } finally {
      this.guardando = false;
    }
  }

  cancelar() {
    this.router.navigate(['/logistica/tickets/mis-solicitudes']);
  }

  formatPrecio(precio: number): string {
    return precio.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
  }
}
