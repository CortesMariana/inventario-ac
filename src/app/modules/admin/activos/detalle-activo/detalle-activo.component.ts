import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { BaseComponent } from 'src/app/shared/base/base.component';
import { ActivosService } from '../activos.service';
import { ActivoTI, ActivoHistorial, EstadoTecnico, Evidencia } from '../models/activo.model'; 
import { ConfirmationService } from 'primeng/api';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LugaresTrabajoService } from '../../empleados/lugares-trabajo.service';
import { EmpleadoService } from '../../empleados/empleados.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';
import { UserService } from 'src/app/shared/service/user.service';

@Component({
  selector: 'app-detalle-activo',
  templateUrl: './detalle-activo.component.html',
  styleUrls: ['./detalle-activo.component.css'],
  providers: [ConfirmationService]
})
export class DetalleActivoComponent extends BaseComponent implements OnInit {
  
  activo: ActivoTI | null = null;
  activoId: string = '';
  cargando: boolean = false;
  procesando: boolean = false;

  historial: ActivoHistorial[] = [];

  formCambioEstado!: FormGroup;
  formCambioUbicacion!: FormGroup;
  formAsignacion!: FormGroup;

  mostrarCambioEstado: boolean = false;
  mostrarCambioUbicacion: boolean = false;
  mostrarAsignacion: boolean = false;

  estadosTecnicos: any[] = [
    { label: 'Disponible', value: 'DISPONIBLE' },
    { label: 'Asignado', value: 'ASIGNADO' },
    { label: 'En Reparación', value: 'EN_REPARACION' },
    { label: 'Fuera de Servicio', value: 'FUERA_DE_SERVICIO' },
    { label: 'Baja Técnica', value: 'BAJA_TECNICA' }
  ];

  ubicaciones: any[] = [];
  empleados: any[] = []; 

  mostrarModalSubirEvidencia: boolean = false;
  mostrarModalVerEvidencia: boolean = false;
  archivoSeleccionado: File | null = null;
  descripcionArchivo: string = '';
  dragActive: boolean = false;
  errorArchivo: string = '';
  subiendoEvidencia: boolean = false;
  evidenciaSeleccionada: Evidencia | null = null;

  usuarioActual: { id: string, nombre: string } = { id: '', nombre: '' }; 

  constructor(
    protected override messageService: MessageService,
    private route: ActivatedRoute,
    private router: Router,
    private activosService: ActivosService,
    private lugaresTrabajoSrv: LugaresTrabajoService,
    private empleadoService: EmpleadoService,
    private confirmationService: ConfirmationService,
    private fb: FormBuilder,
    private sanitizer: DomSanitizer,
    private userService: UserService 
  ) {
    super(messageService);
  }

  async ngOnInit() {
    this.cargando = true;
    
    this.activoId = this.route.snapshot.paramMap.get('firestoreId') || '';
    
    if (!this.activoId) {
      this.handleAlertType('ERROR', 'No se especificó el activo');
      this.router.navigate(['/admin/activos']);
      return;
    }

    await this.cargarUsuarioActual();

    this.initForms();
    this.cargarDatos();
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
      
      console.log('Usuario actual:', this.usuarioActual);
      
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
      observaciones: [''],
      ticketRelacionado: ['']
    });

    this.formCambioUbicacion = this.fb.group({
      ubicacionId: ['', Validators.required],
      ubicacionNombre: ['', Validators.required],
      observaciones: ['']
    });

    this.formAsignacion = this.fb.group({
      empleadoId: ['', Validators.required],
      empleadoNombre: ['', Validators.required],
      ubicacionId: ['', Validators.required],
      ubicacionNombre: ['', Validators.required],
      observaciones: ['']
    });
  }

  async cargarDatos() {
    try {
      this.activo = await this.activosService.getActivo(this.activoId);
      
      if (!this.activo) {
        this.handleAlertType('ERROR', 'Activo no encontrado');
        this.router.navigate(['/admin/activos']);
        return;
      }

      if (!this.activo.evidencias) {
        this.activo.evidencias = [];
      }

      this.historial = await this.activosService.getHistorialActivo(this.activoId);
      this.historial = await this.activosService.getHistorialActivo(this.activoId);

      const ubicaciones = await this.lugaresTrabajoSrv.getLugaresTrabajo().toPromise() || [];
      this.ubicaciones = ubicaciones.map(u => ({
        label: u.nombre,
        value: u.id,
        data: u
      }));

      const empleados = await this.empleadoService.getEmpleados().toPromise() || [];

      const empleadosActivos = empleados;
      
      this.empleados = empleadosActivos.map(e => ({
        label: `${e.nombre} ${e.apellidoPaterno || ''} ${e.apellidoMaterno || ''}`.trim(),
        value: e.empleadoId,
        data: e
      }));

      this.formatearFechas();

      this.cargando = false;

    } catch (error) {
      console.error('Error al cargar datos:', error);
      this.handleAlertType('ERROR', 'Error al cargar los datos del activo');
      this.cargando = false;
    }
  }

  formatearFechas() {
    if (this.activo) {
      this.activo.fechaCreacionFormatted = this.formatFecha(this.activo.fechaCreacion);
      if (this.activo.fechaAsignacion) {
        this.activo.fechaAsignacionFormatted = this.formatFecha(this.activo.fechaAsignacion);
      }
    }

    this.historial.forEach(item => {
      item.fechaMovimientoFormatted = this.formatFecha(item.fechaMovimiento);
    });
  }

  volver() {
    this.router.navigate(['/admin/activos']);
  }

  editar() {
    if (this.activo?.firestoreId) {
      this.router.navigate(['/admin/activos/editar', this.activo.firestoreId]);
    }
  }

  generarCarta() {
    if (this.activo?.firestoreId) {
      this.router.navigate(['/admin/activos/carta', this.activo.firestoreId]);
    }
  }

  toggleCambioEstado() {
    this.mostrarCambioEstado = !this.mostrarCambioEstado;
    if (this.mostrarCambioEstado) {
      this.formCambioEstado.reset({
        nuevoEstado: this.activo?.estadoTecnico,
        observaciones: '',
        ticketRelacionado: ''
      });
    }
  }

  toggleCambioUbicacion() {
    this.mostrarCambioUbicacion = !this.mostrarCambioUbicacion;
    if (this.mostrarCambioUbicacion && this.activo) {
      this.formCambioUbicacion.patchValue({
        ubicacionId: this.activo.ubicacionId,
        ubicacionNombre: this.activo.ubicacionNombre,
        observaciones: ''
      });
    }
  }

  toggleAsignacion() {
    this.mostrarAsignacion = !this.mostrarAsignacion;
    if (this.mostrarAsignacion && this.activo) {
      this.formAsignacion.patchValue({
        empleadoId: this.activo.usuarioAsignadoId,
        empleadoNombre: this.activo.usuarioAsignadoNombre,
        ubicacionId: this.activo.ubicacionId,
        ubicacionNombre: this.activo.ubicacionNombre,
        observaciones: ''
      });
    }
  }

  onUbicacionSelect(event: any, form: FormGroup) {
    const ubicacion = this.ubicaciones.find(u => u.value === event.value);
    if (ubicacion) {
      form.patchValue({
        ubicacionNombre: ubicacion.label
      });
    }
  }

  onEmpleadoSelect(event: any) {
    if (event && event.value) {
      const empleadoSeleccionado = this.empleados.find(e => e.value === event.value);
      
      if (empleadoSeleccionado && empleadoSeleccionado.data) {
        const empleado = empleadoSeleccionado.data;
        
        const ubicacionEmpleado = empleado.lugarDeTrabajo;
        
        if (ubicacionEmpleado && ubicacionEmpleado.id) {
          const ubicacionEncontrada = this.ubicaciones.find(u => u.value === ubicacionEmpleado.id);
          
          if (ubicacionEncontrada) {
            this.formAsignacion.patchValue({
              empleadoNombre: empleadoSeleccionado.label,
              ubicacionId: ubicacionEmpleado.id,
              ubicacionNombre: ubicacionEmpleado.nombre || ubicacionEncontrada.label
            });
            
            this.messageService.add({
              severity: 'info',
              summary: 'Ubicación automática',
              detail: `Se ha seleccionado la ubicación del empleado: ${ubicacionEmpleado.nombre}`
            });
          } else {
            this.formAsignacion.patchValue({
              empleadoNombre: empleadoSeleccionado.label,
              ubicacionId: null,
              ubicacionNombre: null
            });
            
            this.messageService.add({
              severity: 'warn',
              summary: 'Ubicación no encontrada',
              detail: 'La ubicación del empleado no está en la lista. Selecciona manualmente.'
            });
          }
        } else {
          this.formAsignacion.patchValue({
            empleadoNombre: empleadoSeleccionado.label,
            ubicacionId: null,
            ubicacionNombre: null
          });
          
          this.messageService.add({
            severity: 'warn',
            summary: 'Sin ubicación',
            detail: 'El empleado no tiene una ubicación asignada. Selecciona manualmente.'
          });
        }
      }
    }
  }

  async confirmarCambioEstado() {
    if (this.formCambioEstado.invalid) {
      this.formCambioEstado.markAllAsTouched();
      return;
    }

    const formValue = this.formCambioEstado.value;
    const usuarioMovimiento = {
      id: 'admin',
      nombre: 'Administrador'
    };

    this.confirmationService.confirm({
      message: `¿Estás seguro de cambiar el estado a "${this.getEstadoLabel(formValue.nuevoEstado)}"?`,
      header: 'Confirmar cambio de estado',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, cambiar',
      rejectLabel: 'Cancelar',
      accept: async () => {
        this.procesando = true;
        try {
          await this.activosService.cambiarEstadoTecnico(
            this.activoId,
            formValue.nuevoEstado,
            usuarioMovimiento,
            formValue.observaciones,
            formValue.ticketRelacionado || undefined
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

  async confirmarCambioUbicacion() {
    if (this.formCambioUbicacion.invalid) {
      this.formCambioUbicacion.markAllAsTouched();
      return;
    }

    const formValue = this.formCambioUbicacion.value;
    const usuarioMovimiento = {
      id: 'admin',
      nombre: 'Administrador'
    };

    this.confirmationService.confirm({
      message: `¿Estás seguro de cambiar la ubicación a "${formValue.ubicacionNombre}"?`,
      header: 'Confirmar cambio de ubicación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, cambiar',
      rejectLabel: 'Cancelar',
      accept: async () => {
        this.procesando = true;
        try {
          await this.activosService.cambiarUbicacion(
            this.activoId,
            { id: formValue.ubicacionId, nombre: formValue.ubicacionNombre },
            usuarioMovimiento,
            formValue.observaciones
          );

          await this.cargarDatos();
          
          this.mostrarCambioUbicacion = false;
          this.handleAlertType('SUCCESS', 'Ubicación actualizada correctamente');
        } catch (error: any) {
          this.handleAlertType('ERROR', error.message || 'Error al cambiar ubicación');
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

    if (this.activo?.estadoTecnico !== 'DISPONIBLE') {
      this.handleAlertType('WARNING', 'El activo no está disponible para asignación');
      return;
    }

    const formValue = this.formAsignacion.value;
    const usuarioMovimiento = {
      id: 'admin',
      nombre: 'Administrador'
    };

    this.confirmationService.confirm({
      message: `¿Estás seguro de asignar este activo a ${formValue.empleadoNombre}?`,
      header: 'Confirmar asignación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, asignar',
      rejectLabel: 'Cancelar',
      accept: async () => {
        this.procesando = true;
        try {
          await this.activosService.asignarActivo(
            this.activoId,
            { id: formValue.empleadoId, nombre: formValue.empleadoNombre },
            { id: formValue.ubicacionId, nombre: formValue.ubicacionNombre },
            usuarioMovimiento,
            formValue.observaciones
          );

          await this.cargarDatos();
          
          this.mostrarAsignacion = false;
          this.handleAlertType('SUCCESS', 'Activo asignado correctamente');
        } catch (error: any) {
          this.handleAlertType('ERROR', error.message || 'Error al asignar activo');
        } finally {
          this.procesando = false;
        }
      }
    });
  }
  get caracteristicas(): any {
    return this.activo ? (this.activo as any).caracteristicas || {} : {};
  }


  hasCaracteristica(nombre: string): boolean {
    return !!this.caracteristicas[nombre];
  }

  getCaracteristica(nombre: string, defaultValue: any = ''): any {
    const valor = this.caracteristicas[nombre];
    return valor !== undefined && valor !== null ? valor : defaultValue;
  }

  getCargadorText(): string {
    return this.getCaracteristica('cargadorIncluido', false) ? 'Incluido' : 'No incluido';
  }

  tieneCaracteristicas(): boolean {
    return !!(this.activo && Object.keys(this.caracteristicas).length > 0);
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

  getTipoEventoClass(tipo: string): string {
    switch (tipo) {
        case 'CREACION':
        return 'evento-creacion';
        case 'ASIGNACION':
        return 'evento-asignacion';
        case 'CAMBIO_ESTADO':
        return 'evento-cambio-estado';
        case 'CAMBIO_UBICACION':
        return 'evento-cambio-ubicacion';
        default:
        return 'evento-default';
    }
    }

  getTipoEventoIcon(tipo: string): string {
    switch (tipo) {
      case 'CREACION':
        return 'pi pi-plus-circle';
      case 'ASIGNACION':
        return 'pi pi-user-check';
      case 'CAMBIO_ESTADO':
        return 'pi pi-sync';
      case 'CAMBIO_UBICACION':
        return 'pi pi-map-marker';
      default:
        return 'pi pi-history';
    }
  }

  puedeAsignar(): boolean {
    return this.activo?.estadoTecnico === 'DISPONIBLE';
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

  async iniciarBaja() {
    if (!this.activo || this.activo.estadoTecnico === 'BAJA_TECNICA') {
      this.handleAlertType('WARNING', 'El activo ya está dado de baja');
      return;
    }

    const usuarioMovimiento = {
      id: 'admin', 
      nombre: 'Administrador'
    };

    this.confirmationService.confirm({
      message: `¿Estás seguro de dar de baja el activo "${this.activo.nombre}"? Esta acción cambiará su estado a "Baja Técnica".`,
      header: 'Confirmar Baja',
      icon: 'pi pi-exclamation-triangle',
      accept: async () => {
        this.procesando = true;
        try {
          await this.activosService.cambiarEstadoTecnico(
            this.activoId,
            'BAJA_TECNICA',
            usuarioMovimiento,
            'Baja iniciada desde el detalle del activo'
          );

          this.confirmationService.confirm({
            message: 'Activo marcado como baja. ¿Deseas generar el formato de baja en PDF?',
            header: 'Generar Formato',
            icon: 'pi pi-file-pdf',
            accept: () => {
              this.router.navigate(['/admin/activos/formato-baja', this.activoId]);
            },
            reject: () => {
              this.cargarDatos();
            }
          });

        } catch (error: any) {
          this.handleAlertType('ERROR', error.message);
        } finally {
          this.procesando = false;
        }
      }
    });
  }

  abrirModalSubirEvidencia() {
    this.mostrarModalSubirEvidencia = true;
    this.archivoSeleccionado = null;
    this.descripcionArchivo = '';
    this.errorArchivo = '';
  }

  cerrarModalSubirEvidencia() {
    this.mostrarModalSubirEvidencia = false;
    this.archivoSeleccionado = null;
    this.descripcionArchivo = '';
    this.errorArchivo = '';
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragActive = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragActive = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragActive = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.validarYAsignarArchivo(files[0]);
    }
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.validarYAsignarArchivo(file);
    }
  }

  validarYAsignarArchivo(file: File) {
    this.errorArchivo = '';

    const tiposPermitidos = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (!tiposPermitidos.includes(file.type)) {
      this.errorArchivo = 'Tipo de archivo no permitido. Solo imágenes, PDF, Word y Excel';
      return;
    }

    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      this.errorArchivo = `El archivo no puede ser mayor a 20MB (tamaño actual: ${(file.size / 1024 / 1024).toFixed(2)}MB)`;
      return;
    }

    this.archivoSeleccionado = file;
  }

  removerArchivo(event: Event) {
    event.stopPropagation();
    this.archivoSeleccionado = null;
    this.errorArchivo = '';
  }

  getFileIcon(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'pi pi-image';
    if (mimeType === 'application/pdf') return 'pi pi-file-pdf';
    if (mimeType.includes('word')) return 'pi pi-file-word';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'pi pi-file-excel';
    return 'pi pi-file';
  }

  async subirEvidencia() {
    if (!this.archivoSeleccionado || !this.activo || !this.activo.firestoreId) return;

    this.subiendoEvidencia = true;
    try {
      const evidencia = await this.activosService.subirEvidencia(
        this.activo.firestoreId,
        this.archivoSeleccionado,
        this.usuarioActual,
        this.descripcionArchivo
      );

      if (!this.activo.evidencias) {
        this.activo.evidencias = [];
      }
      this.activo.evidencias.push(evidencia);
      
      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Evidencia subida correctamente'
      });

      this.cerrarModalSubirEvidencia();

    } catch (error: any) {
      console.error('Error al subir evidencia:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'Error al subir la evidencia'
      });
    } finally {
      this.subiendoEvidencia = false;
    }
  }

  confirmarEliminarEvidencia(evidencia: Evidencia) {
    this.confirmationService.confirm({
      message: `¿Estás seguro de eliminar "${evidencia.nombre}"?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.eliminarEvidencia(evidencia)
    });
  }

  async eliminarEvidencia(evidencia: Evidencia) {
    if (!this.activo || !this.activo.firestoreId) return;
    
    this.procesando = true;
    try {
      await this.activosService.eliminarEvidencia(
        this.activo.firestoreId,
        evidencia,
        this.usuarioActual
      );

      if (this.activo.evidencias) {
        this.activo.evidencias = this.activo.evidencias.filter(e => e.id !== evidencia.id);
      }
      
      if (this.evidenciaSeleccionada?.id === evidencia.id) {
        this.cerrarModalVerEvidencia();
      }

      this.messageService.add({
        severity: 'success',
        summary: 'Éxito',
        detail: 'Evidencia eliminada correctamente'
      });

    } catch (error: any) {
      console.error('Error al eliminar evidencia:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'Error al eliminar la evidencia'
      });
    } finally {
      this.procesando = false;
    }
  }

  verEvidencia(evidencia: Evidencia) {
    this.evidenciaSeleccionada = evidencia;
    this.mostrarModalVerEvidencia = true;
  }

  cerrarModalVerEvidencia() {
    this.mostrarModalVerEvidencia = false;
    this.evidenciaSeleccionada = null;
  }

  descargarEvidencia(evidencia: Evidencia) {
    window.open(evidencia.url, '_blank');
  }

  esImagen(tipo: string): boolean {
    return tipo.startsWith('image/');
  }

  getSafeUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  formatFechaEvidencia(fecha: any): Date | null {
    if (!fecha) return null;
    
    try {
      if (fecha.toDate && typeof fecha.toDate === 'function') {
        return fecha.toDate();
      }
      else if (fecha.seconds) {
        return new Date(fecha.seconds * 1000);
      }
      else {
        return new Date(fecha);
      }
    } catch (error) {
      console.error('Error formateando fecha:', error);
      return null;
    }
  }
}