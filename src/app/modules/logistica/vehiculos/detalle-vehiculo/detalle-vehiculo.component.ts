import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { BaseComponent } from 'src/app/shared/base/base.component';
import { VehiculosService } from '../vehiculos.service';
import { Vehiculo, EstadoVehiculo, VehiculoHistorial } from '../models/vehiculo.model';
import { ConfirmationService } from 'primeng/api';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EmpleadoService } from '../../../admin/empleados/empleados.service';
import { Empleado } from '../../../admin/empleados/models/empleado.model';
import { firstValueFrom } from 'rxjs';
import { UserService } from 'src/app/shared/service/user.service';

@Component({
  selector: 'app-detalle-vehiculo',
  templateUrl: './detalle-vehiculo.component.html',
  styleUrls: ['./detalle-vehiculo.component.css'],
  providers: [ConfirmationService]
})
export class DetalleVehiculoComponent extends BaseComponent implements OnInit {
  
  vehiculo: Vehiculo | null = null;
  vehiculoId: string = '';
  cargando: boolean = false;
  procesando: boolean = false;

  historial: VehiculoHistorial[] = [];

  formCambioEstado!: FormGroup;
  formAsignacion!: FormGroup;
  formSeguro!: FormGroup;

  mostrarCambioEstado: boolean = false;
  mostrarAsignacion: boolean = false;
  mostrarSeguro: boolean = false;

  // Número económico
  dlgNumeroEconomico = false;
  numeroEconomicoEdicion = '';

  // Límite de litros mensual de gasolina
  dlgLimiteLitros = false;
  limiteLitrosEdicion: number | null = null;

  estadosVehiculo: any[] = [
    { label: 'Disponible', value: 'DISPONIBLE', icon: 'pi pi-check-circle', color: '#4CAF50' },
    { label: 'Seguro vencido', value: 'SEGURO_VENCIDO', icon: 'pi pi-exclamation-triangle', color: '#FF9800' },
    { label: 'Asignado', value: 'ASIGNADO', icon: 'pi pi-user-check', color: '#2196F3' },
    { label: 'Otro', value: 'OTRO', icon: 'pi pi-question-circle', color: '#9C27B0' }
  ];

  empleados: Empleado[] = [];
  empleadosOpciones: any[] = [];

  mostrarCampoOtroEstado: boolean = false;
  otroEstadoTexto: string = '';

  usuarioActual: { id: string, nombre: string } = { id: '', nombre: '' };

  fechaActual: Date = new Date();
  fechaMinimaSeguro: Date = new Date();

  constructor(
    protected override messageService: MessageService,
    private route: ActivatedRoute,
    private router: Router,
    private vehiculosService: VehiculosService,
    private empleadoService: EmpleadoService,
    private confirmationService: ConfirmationService,
    private fb: FormBuilder,
    private userService: UserService
  ) {
    super(messageService);
  }

  async ngOnInit() {
    this.cargando = true;
    
    this.vehiculoId = this.route.snapshot.paramMap.get('firestoreId') || '';
    
    if (!this.vehiculoId) {
      this.handleAlertType('ERROR', 'No se especificó el vehículo');
      this.router.navigate(['/logistica/vehiculos/grid']);
      return;
    }

    await this.cargarUsuarioActual();
    this.initForms();
    this.cargarEmpleados();
    await this.cargarDatos();
  }

  async cargarUsuarioActual() {
    try {
      const userInfo = await firstValueFrom(this.userService.getUserInfo());
      
      try {
        const empleadoData = await firstValueFrom(this.userService.consultarEmpleado());
        this.usuarioActual = {
          id: empleadoData.empleadoId || userInfo.EmpleadoId || 'admin',
          nombre: `${empleadoData.nombre || ''} ${empleadoData.apellidoPaterno || ''}`.trim() || userInfo.name || 'Administrador'
        };
      } catch (error) {
        this.usuarioActual = {
          id: userInfo.EmpleadoId || 'admin',
          nombre: userInfo.name || 'Administrador'
        };
      }
    } catch (error) {
      console.error('Error al cargar usuario actual:', error);
      this.usuarioActual = {
        id: 'admin',
        nombre: 'Administrador'
      };
    }
  }

  initForms() {
    this.formCambioEstado = this.fb.group({
      nuevoEstado: ['', Validators.required],
      otroEstadoTexto: [''],
      observaciones: ['']
    });

    this.formAsignacion = this.fb.group({
      empleadoId: ['', Validators.required],
      empleadoNombre: ['', Validators.required],
      observaciones: ['']
    });

    this.formSeguro = this.fb.group({
      fechaVencimiento: ['', Validators.required],
      observaciones: ['']
    });

    this.formCambioEstado.get('nuevoEstado')?.valueChanges.subscribe(estado => {
      this.mostrarCampoOtroEstado = estado === 'OTRO';
      if (!this.mostrarCampoOtroEstado) {
        this.formCambioEstado.patchValue({ otroEstadoTexto: '' });
      }
    });
  }

  async cargarEmpleados() {
    try {
      const empleados = await firstValueFrom(this.empleadoService.getEmpleados());
      const empleadosActivos = empleados.filter(e => e.activo !== false);
      
      this.empleadosOpciones = empleadosActivos.map(e => ({
        label: `${e.nombre} ${e.apellidoPaterno || ''} ${e.apellidoMaterno || ''}`.trim(),
        value: e.empleadoId,
        data: e
      }));

      this.empleados = empleadosActivos;
    } catch (error) {
      console.error('Error al cargar empleados:', error);
    }
  }

  async cargarDatos() {
    try {
      this.vehiculo = await this.vehiculosService.getVehiculo(this.vehiculoId);
      
      if (!this.vehiculo) {
        this.handleAlertType('ERROR', 'Vehículo no encontrado');
        this.router.navigate(['/logistica/vehiculos/grid']);
        return;
      }

      this.historial = await this.vehiculosService.getHistorialVehiculo(this.vehiculoId);
      this.formatearFechas();

      this.cargando = false;

    } catch (error) {
      console.error('Error al cargar datos:', error);
      this.handleAlertType('ERROR', 'Error al cargar los datos del vehículo');
      this.cargando = false;
    }
  }

  formatearFechas() {
    if (this.vehiculo) {
      this.vehiculo.fechaCreacionFormatted = this.formatFecha(this.vehiculo.fechaCreacion);
      if (this.vehiculo.fechaVencimientoSeguro) {
        this.vehiculo.fechaVencimientoSeguroFormatted = this.formatFecha(this.vehiculo.fechaVencimientoSeguro);
      }
      if (this.vehiculo.asignadoAFecha) {
        this.vehiculo.fechaAsignacionFormatted = this.formatFecha(this.vehiculo.asignadoAFecha);
      }
    }

    this.historial.forEach(item => {
      item.fechaMovimientoFormatted = this.formatFecha(item.fechaMovimiento);
    });
  }

  volver() {
    this.router.navigate(['/logistica/vehiculos/grid']);
  }

  editar() {
    if (this.vehiculo?.firestoreId) {
      this.router.navigate(['/logistica/vehiculos/editar', this.vehiculo.firestoreId]);
    }
  }

  toggleCambioEstado() {
    this.mostrarCambioEstado = !this.mostrarCambioEstado;
    if (this.mostrarCambioEstado) {
      this.formCambioEstado.reset({
        nuevoEstado: this.vehiculo?.estadoVehiculo,
        otroEstadoTexto: this.vehiculo?.otroEstadoTexto || '',
        observaciones: ''
      });
      this.mostrarCampoOtroEstado = this.vehiculo?.estadoVehiculo === 'OTRO';
    }
  }

  toggleAsignacion() {
    this.mostrarAsignacion = !this.mostrarAsignacion;
    if (this.mostrarAsignacion && this.vehiculo) {
      this.formAsignacion.patchValue({
        empleadoId: this.vehiculo.asignadoAId,
        empleadoNombre: this.vehiculo.asignadoANombre,
        observaciones: ''
      });
    }
  }

  toggleSeguro() {
    this.mostrarSeguro = !this.mostrarSeguro;
    if (this.mostrarSeguro && this.vehiculo) {
      this.formSeguro.patchValue({
        fechaVencimiento: this.vehiculo.fechaVencimientoSeguro ? new Date(this.vehiculo.fechaVencimientoSeguro) : null,
        observaciones: ''
      });
    }
  }

  onEmpleadoSelect(event: any) {
    if (event && event.value) {
      const empleadoSeleccionado = this.empleados.find(e => e.empleadoId === event.value);
      
      if (empleadoSeleccionado) {
        const nombreCompleto = `${empleadoSeleccionado.nombre} ${empleadoSeleccionado.apellidoPaterno || ''} ${empleadoSeleccionado.apellidoMaterno || ''}`.trim();
        
        this.formAsignacion.patchValue({
          empleadoNombre: nombreCompleto
        });
        
        this.messageService.add({
          severity: 'info',
          summary: 'Asignación',
          detail: `Vehículo se asignará a: ${nombreCompleto}`
        });
      }
    } else {
      this.formAsignacion.patchValue({
        empleadoNombre: ''
      });
    }
  }

  async confirmarCambioEstado() {
    if (this.formCambioEstado.invalid) {
      this.formCambioEstado.markAllAsTouched();
      return;
    }

    const formValue = this.formCambioEstado.value;
    const nuevoEstado = formValue.nuevoEstado;
    const otroTexto = nuevoEstado === 'OTRO' ? formValue.otroEstadoTexto : undefined;

    this.confirmationService.confirm({
      message: `¿Estás seguro de cambiar el estado a "${this.getEstadoLabel(nuevoEstado)}"?`,
      header: 'Confirmar cambio de estado',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, cambiar',
      rejectLabel: 'Cancelar',
      accept: async () => {
        this.procesando = true;
        try {
          let asignadoA = undefined;
          if (nuevoEstado === 'ASIGNADO' && this.vehiculo?.asignadoAId) {
            asignadoA = {
              id: this.vehiculo.asignadoAId,
              nombre: this.vehiculo.asignadoANombre || ''
            };
          }

          await this.vehiculosService.cambiarEstadoVehiculo(
            this.vehiculoId,
            nuevoEstado,
            this.usuarioActual,
            formValue.observaciones,
            otroTexto,
            asignadoA
          );

          await this.cargarDatos();
          
          this.mostrarCambioEstado = false;
          this.handleAlertType('SUCCESS', 'Estado actualizado correctamente');
        } catch (error: any) {
          this.handleAlertType('ERROR', error.message || 'Error al cambiar estado');
        } finally {
          this.procesando = false;
        }
      }
    });
  }

  async confirmarAsignacion() {
    if (this.formAsignacion.invalid) {
      this.formAsignacion.markAllAsTouched();
      return;
    }

    const formValue = this.formAsignacion.value;

    this.confirmationService.confirm({
      message: `¿Estás seguro de asignar este vehículo a ${formValue.empleadoNombre}?`,
      header: 'Confirmar asignación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, asignar',
      rejectLabel: 'Cancelar',
      accept: async () => {
        this.procesando = true;
        try {
          await this.vehiculosService.cambiarEstadoVehiculo(
            this.vehiculoId,
            'ASIGNADO',
            this.usuarioActual,
            formValue.observaciones,
            undefined,
            { id: formValue.empleadoId, nombre: formValue.empleadoNombre }
          );

          await this.cargarDatos();
          
          this.mostrarAsignacion = false;
          this.handleAlertType('SUCCESS', 'Vehículo asignado correctamente');
        } catch (error: any) {
          this.handleAlertType('ERROR', error.message || 'Error al asignar vehículo');
        } finally {
          this.procesando = false;
        }
      }
    });
  }

  async confirmarActualizarSeguro() {
    if (this.formSeguro.invalid) {
      this.formSeguro.markAllAsTouched();
      return;
    }

    const formValue = this.formSeguro.value;
    const fechaVencimiento = new Date(formValue.fechaVencimiento);

    this.confirmationService.confirm({
      message: `¿Estás seguro de actualizar la fecha de vencimiento del seguro a ${fechaVencimiento.toLocaleDateString()}?`,
      header: 'Confirmar actualización de seguro',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, actualizar',
      rejectLabel: 'Cancelar',
      accept: async () => {
        this.procesando = true;
        try {
          await this.vehiculosService.actualizarSeguro(
            this.vehiculoId,
            fechaVencimiento,
            this.usuarioActual
          );

          await this.cargarDatos();
          
          this.mostrarSeguro = false;
          this.handleAlertType('SUCCESS', 'Fecha de seguro actualizada correctamente');
        } catch (error: any) {
          this.handleAlertType('ERROR', error.message || 'Error al actualizar seguro');
        } finally {
          this.procesando = false;
        }
      }
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

  getTipoEventoClass(tipo: string): string {
    switch (tipo) {
      case 'CREACION':             return 'evento-creacion';
      case 'ASIGNACION':           return 'evento-asignacion';
      case 'CAMBIO_ESTADO':        return 'evento-cambio-estado';
      case 'CAMBIO_SEGURO':        return 'evento-cambio-seguro';
      case 'CAMBIO_LIMITE_GASOLINA': return 'evento-limite-gas';
      default:                     return 'evento-default';
    }
  }

  getTipoEventoIcon(tipo: string): string {
    switch (tipo) {
      case 'CREACION':             return 'pi pi-plus-circle';
      case 'ASIGNACION':           return 'pi pi-user-check';
      case 'CAMBIO_ESTADO':        return 'pi pi-sync';
      case 'CAMBIO_SEGURO':        return 'pi pi-calendar';
      case 'CAMBIO_LIMITE_GASOLINA': return 'pi pi-bolt';
      default:                     return 'pi pi-history';
    }
  }

  puedeAsignar(): boolean {
    return this.vehiculo?.estadoVehiculo === 'DISPONIBLE';
  }

  abrirEditarNumeroEconomico() {
    this.numeroEconomicoEdicion = this.vehiculo?.numeroEconomico || '';
    this.dlgNumeroEconomico = true;
  }

  async guardarNumeroEconomico() {
    if (!this.vehiculoId) return;
    this.procesando = true;
    try {
      await this.vehiculosService.updateVehiculo(this.vehiculoId, {
        numeroEconomico: this.numeroEconomicoEdicion.trim(),
        fechaModificacion: new Date(),
      });
      if (this.vehiculo) {
        this.vehiculo.numeroEconomico = this.numeroEconomicoEdicion.trim();
      }
      this.dlgNumeroEconomico = false;
      this.handleAlertType('SUCCESS', 'Número económico actualizado');
    } catch (error: any) {
      this.handleAlertType('ERROR', error.message || 'Error al actualizar');
    } finally {
      this.procesando = false;
    }
  }

  abrirEditarLimiteLitros() {
    this.limiteLitrosEdicion = this.vehiculo?.limiteLitrosMensual ?? null;
    this.dlgLimiteLitros = true;
  }

  async guardarLimiteLitros() {
    if (!this.vehiculoId) return;
    this.procesando = true;
    try {
      const nuevoLimite = (this.limiteLitrosEdicion ?? 0) > 0
        ? this.limiteLitrosEdicion!
        : undefined;
      const limiteAnterior = this.vehiculo?.limiteLitrosMensual;

      const updatePayload: Partial<Vehiculo> = { fechaModificacion: new Date() };
      if (nuevoLimite) {
        updatePayload.limiteLitrosMensual = nuevoLimite;
      }
      await this.vehiculosService.updateVehiculo(this.vehiculoId, updatePayload);

      // Registrar evento en el historial del vehículo
      await this.vehiculosService.registrarEventoHistorial(this.vehiculoId, {
        tipoEvento: 'CAMBIO_LIMITE_GASOLINA',
        observaciones: nuevoLimite
          ? `Límite de gasolina mensual ${limiteAnterior ? 'actualizado' : 'establecido'}: ${nuevoLimite} L/mes${limiteAnterior ? ` (antes: ${limiteAnterior} L)` : ''}`
          : `Límite de gasolina mensual eliminado${limiteAnterior ? ` (antes: ${limiteAnterior} L)` : ''}`,
        usuarioMovimientoId: this.usuarioActual.id,
        usuarioMovimientoNombre: this.usuarioActual.nombre,
        limiteLitrosAnterior: limiteAnterior,
        limiteLitrosNuevo: nuevoLimite,
      });

      if (this.vehiculo) {
        this.vehiculo.limiteLitrosMensual = nuevoLimite;
      }
      // Recargar historial para reflejar el nuevo evento
      this.historial = await this.vehiculosService.getHistorialVehiculo(this.vehiculoId);
      this.formatearFechas();

      this.dlgLimiteLitros = false;
      this.handleAlertType('SUCCESS', nuevoLimite
        ? `Límite establecido en ${nuevoLimite} L/mes`
        : 'Límite eliminado');
    } catch (error: any) {
      this.handleAlertType('ERROR', error.message || 'Error al actualizar');
    } finally {
      this.procesando = false;
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
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  }

  getSeguroVencidoWarning(): boolean {
    if (!this.vehiculo?.fechaVencimientoSeguro) return false;
    const hoy = new Date();
    const vencimiento = new Date(this.vehiculo.fechaVencimientoSeguro);
    return vencimiento < hoy;
  }

  getDiasParaVencimientoSeguro(): number | null {
    if (!this.vehiculo?.fechaVencimientoSeguro) return null;
    const hoy = new Date();
    const vencimiento = new Date(this.vehiculo.fechaVencimientoSeguro);
    const diffTime = vencimiento.getTime() - hoy.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
  
  formatearCosto(costo: number): string {
    if (!costo && costo !== 0) return 'No especificado';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2
    }).format(costo);
  }
}