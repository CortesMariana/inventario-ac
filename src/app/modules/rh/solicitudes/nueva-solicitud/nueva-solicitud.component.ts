import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subject, takeUntil } from 'rxjs';
import { BaseComponent } from 'src/app/shared/base/base.component';
import { UserService } from 'src/app/shared/service/user.service';
import { SolicitudesService } from '../solicitudes.service';
import { CamposSolicitudService } from '../../admin-rh/campos-solicitud/campos-solicitud.service';
import { TiposSolicitudService } from '../../admin-rh/campos-solicitud/tipos-solicitud.service';
import { CampoConfiguracion } from '../../admin-rh/campos-solicitud/models/campo-solicitud.model';

@Component({
  selector: 'app-nueva-solicitud',
  templateUrl: './nueva-solicitud.component.html',
  styleUrls: ['./nueva-solicitud.component.css']
})
export class NuevaSolicitudComponent extends BaseComponent implements OnInit, OnDestroy {
  formSolicitud!: FormGroup;
  usuario: any;
  cargando: boolean = false;
  cargandoCampos: boolean = false;
  cargandoTipos: boolean = true; 
  private destroy$ = new Subject<void>();

  tiposSolicitud: any[] = [];
  
  camposConfigurados: CampoConfiguracion[] = [];
  camposPorCategoria: any = {};
  categoriasOrdenadas: string[] = [];
  
  prioridades: any[] = [
    { label: 'Baja', value: 'baja', color: '#28a745' },
    { label: 'Media', value: 'media', color: '#ffc107' },
    { label: 'Alta', value: 'alta', color: '#fd7e14' },
    { label: 'Urgente', value: 'urgente', color: '#dc3545' }
  ];

  tipoSeleccionado: string = '';
  mostrarCamposFechas: boolean = false;
  mostrarCampoMonto: boolean = false;
  mostrarCampoConstancia: boolean = false;
  mostrarCampoCambioDatos: boolean = false;
  
  documentos: File[] = [];
  
  minDate: Date = new Date();

  constructor(
    protected override messageService: MessageService,
    private fb: FormBuilder,
    private router: Router,
    private userSrv: UserService,
    private solicitudesSrv: SolicitudesService,
    private camposSrv: CamposSolicitudService,
    private tiposSrv: TiposSolicitudService
  ) {
    super(messageService);
  }

  ngOnInit() {
    this.initForm();
    this.cargarUsuario();
    this.cargarTiposSolicitud();
    
    this.formSolicitud.get('tipoSolicitud')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(tipo => {
        console.log('valueChanges detectó cambio a:', tipo);
        this.tipoSeleccionado = tipo;
        this.actualizarCamposPorTipo(tipo);
        this.cargarCamposDinamicos(tipo); 
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initForm() {
    this.formSolicitud = this.fb.group({
      titulo: ['', Validators.required],
      descripcion: ['', Validators.required],
      tipoSolicitud: ['', Validators.required],
      prioridad: ['media', Validators.required],
      
      camposPersonalizados: this.fb.group({}),
      
      fechaInicio: [null],
      fechaFin: [null],
      diasSolicitados: [null],
      montoSolicitado: [null],
      motivoPrestamo: [''],
      numeroPagos: [null],
      tipoConstancia: [''],
      datoAModificar: [''],
      valorActual: [''],
      valorNuevo: [''],
      
      empleado: this.fb.group({
        id: [''],
        nombre: [''],
        numeroEmpleado: [''],
        puesto: [''],
        departamento: [''],
        sucursal: [''],
        fechaIngreso: [null]
      }),
      
      creadoPor: this.fb.group({
        id: [''],
        nombre: [''],
        numeroEmpleado: ['']
      })
    });
  }

  async cargarTiposSolicitud() {
    this.cargandoTipos = true;
    try {
      const tipos = await this.tiposSrv.getTiposActivos();
      
      if (tipos && tipos.length > 0) {
        this.tiposSolicitud = tipos;
        console.log('Tipos cargados desde Firestore:', this.tiposSolicitud);
      } else {
        this.tiposSolicitud = [];
        this.handleAlertType('WARNING', 'No hay tipos de solicitud configurados', 'Contacte al administrador');
      }
    } catch (error) {
      console.error('Error al cargar tipos:', error);
      this.tiposSolicitud = [];
      this.handleAlertType('ERROR', 'Error al cargar tipos de solicitud');
    } finally {
      this.cargandoTipos = false;
    }
  }

  cargarUsuario() {
    this.cargando = true;
    this.userSrv.consultarEmpleado()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (empleado) => {
          this.usuario = empleado;
          
          const empleadoInfo = {
            id: empleado.id,
            nombre: empleado.nombreCompleto || `${empleado.nombre} ${empleado.apellidoPaterno}`,
            numeroEmpleado: empleado.numeroEmpleado || empleado.id,
            puesto: empleado.puesto?.nombre || 'No especificado',
            departamento: empleado.empresa?.razonSocial || 'No especificado',
            sucursal: empleado.lugarDeTrabajo?.nombre || 'No especificado',
            fechaIngreso: empleado.fechaIngreso ? new Date(empleado.fechaIngreso) : null
          };
          
          this.formSolicitud.patchValue({
            empleado: empleadoInfo,
            creadoPor: {
              id: empleado.id,
              nombre: empleadoInfo.nombre,
              numeroEmpleado: empleadoInfo.numeroEmpleado
            }
          });
          
          this.cargando = false;
        },
        error: (error) => {
          console.error('Error al cargar usuario:', error);
          this.handleAlertType('ERROR', 'Error al cargar información del empleado');
          this.cargando = false;
        }
      });
  }

  async cargarCamposDinamicos(tipoSolicitud: string) {
    if (!tipoSolicitud) {
      console.log('No hay tipo seleccionado');
      return;
    }
    
    console.log('===== CARGANDO CAMPOS PARA TIPO:', tipoSolicitud, '=====');
    this.cargandoCampos = true;
    
    try {
      console.log('Llamando a camposSrv.getCampos con:', tipoSolicitud);
      this.camposConfigurados = await this.camposSrv.getCampos(tipoSolicitud);
      
      console.log('Campos CRUDOS desde Firestore:', JSON.stringify(this.camposConfigurados, null, 2));
      
      this.camposConfigurados = this.camposConfigurados
        .filter(c => {
          console.log(`Evaluando campo ${c.nombre}:`, {
            activo: c.activo,
            visibleCreacion: c.visibleCreacion,
            tipoSolicitud: c.tipoSolicitud,
            tipoSeleccionado: tipoSolicitud
          });
          
          const esActivo = c.activo === true;
          const esVisible = c.visibleCreacion === true;
          const coincideTipo = c.tipoSolicitud === tipoSolicitud || c.tipoSolicitud === 'todos';
          
          return esActivo && esVisible && coincideTipo;
        })
        .sort((a, b) => a.orden - b.orden);
      
      console.log('Campos FILTRADOS:', this.camposConfigurados.length);
      console.log('Campos filtrados detalle:', this.camposConfigurados.map(c => ({
        nombre: c.nombre,
        etiqueta: c.etiqueta,
        tipo: c.tipo,
        categoria: c.categoria
      })));
      
      if (this.camposConfigurados.length === 0) {
        console.warn('NO HAY CAMPOS CONFIGURADOS para el tipo:', tipoSolicitud);
        this.messageService.add({
          severity: 'warn',
          summary: 'Sin campos',
          detail: 'No hay campos configurados para este tipo de solicitud'
        });
      }
      
      this.camposPorCategoria = {};
      this.categoriasOrdenadas = [];
      
      const categorias = this.camposSrv.getCategorias();
      
      this.camposConfigurados.forEach(campo => {
        if (!this.camposPorCategoria[campo.categoria]) {
          this.camposPorCategoria[campo.categoria] = {
            titulo: this.getCategoriaTitulo(campo.categoria),
            icono: this.getCategoriaIcono(campo.categoria),
            campos: []
          };
          
          if (!this.categoriasOrdenadas.includes(campo.categoria)) {
            this.categoriasOrdenadas.push(campo.categoria);
          }
        }
        this.camposPorCategoria[campo.categoria].campos.push(campo);
      });
      
      console.log('Categorías ordenadas:', this.categoriasOrdenadas);
      console.log('Campos por categoría:', this.camposPorCategoria);
      
      this.reconstruirFormularioDinamico();
      
    } catch (error) {
      console.error('Error al cargar campos dinámicos:', error);
      this.handleAlertType('ERROR', 'Error al cargar la configuración de campos');
    } finally {
      this.cargandoCampos = false;
    }
  }

reconstruirFormularioDinamico() {
  console.log('===== RECONSTRUYENDO FORMULARIO DINÁMICO =====');
  
  const camposGroup = this.formSolicitud.get('camposPersonalizados') as FormGroup;
  console.log('Grupo de campos personalizados existe:', !!camposGroup);
  
  const controlesExistentes = Object.keys(camposGroup.controls);
  console.log('Controles existentes a limpiar:', controlesExistentes);
  
  controlesExistentes.forEach(key => {
    camposGroup.removeControl(key);
  });
  
  console.log('Agregando nuevos controles para', this.camposConfigurados.length, 'campos');
  
  this.camposConfigurados.forEach((campo, index) => {
    console.log(`Procesando campo ${index + 1}:`, campo.nombre, campo.etiqueta);
    
    const validators = [];
    
    if (campo.requerido) {
      validators.push(Validators.required);
    }
    
    if (campo.tipo === 'numero') {
      if (campo.validaciones?.min !== null && campo.validaciones?.min !== undefined) {
        validators.push(Validators.min(campo.validaciones.min));
      }
      if (campo.validaciones?.max !== null && campo.validaciones?.max !== undefined) {
        validators.push(Validators.max(campo.validaciones.max));
      }
    }
    
    if (campo.tipo === 'texto' || campo.tipo === 'textarea') {
      if (campo.validaciones?.minLength) {
        validators.push(Validators.minLength(campo.validaciones.minLength));
      }
      if (campo.validaciones?.maxLength) {
        validators.push(Validators.maxLength(campo.validaciones.maxLength));
      }
      if (campo.validaciones?.pattern) {
        validators.push(Validators.pattern(campo.validaciones.pattern));
      }
    }
    
    let defaultValue = null;
    if (campo.tipo === 'checkbox') {
      defaultValue = false;
    }
    
    console.log(`Agregando control para ${campo.nombre} con validators:`, validators.length);
    camposGroup.addControl(
      campo.nombre,
      this.fb.control(defaultValue, validators)
    );
  });
  
  console.log('Controles finales en camposPersonalizados:', Object.keys(camposGroup.controls));
}

  getCategoriaTitulo(categoria: string): string {
    console.log('Buscando título para categoría:', categoria);
    const categorias: any = {
      'basico': 'Información Básica',
      'contacto': 'Contacto',
      'fechas': 'Fechas',
      'economico': 'Información Económica',
      'documentos': 'Documentos',
      'otro': 'Otros'
    };
    const titulo = categorias[categoria] || categoria;
    console.log('Título encontrado:', titulo);
    return titulo;
  }

  getCategoriaIcono(categoria: string): string {
    const iconos: any = {
      'basico': 'pi pi-info-circle',
      'contacto': 'pi pi-phone',
      'fechas': 'pi pi-calendar',
      'economico': 'pi pi-credit-card',
      'documentos': 'pi pi-paperclip',
      'otro': 'pi pi-tag'
    };
    return iconos[categoria] || 'pi pi-circle';
  }

  actualizarCamposPorTipo(tipo: string) {
    this.mostrarCamposFechas = false;
    this.mostrarCampoMonto = false;
    this.mostrarCampoConstancia = false;
    this.mostrarCampoCambioDatos = false;
    
    this.limpiarValidacionesDinamicas();
    
    switch(tipo) {
      case 'vacaciones':
      case 'permiso':
      case 'incapacidad':
        this.mostrarCamposFechas = true;
        this.agregarValidacionesFechas();
        break;
        
      case 'prestamo':
        this.mostrarCampoMonto = true;
        this.agregarValidacionesPrestamo();
        break;
        
      case 'constancia':
        this.mostrarCampoConstancia = true;
        break;
        
      case 'cambio-datos':
        this.mostrarCampoCambioDatos = true;
        break;
    }
  }

  limpiarValidacionesDinamicas() {
    const camposDinamicos = ['fechaInicio', 'fechaFin', 'diasSolicitados', 'montoSolicitado', 
                            'motivoPrestamo', 'numeroPagos', 'tipoConstancia', 
                            'datoAModificar', 'valorActual', 'valorNuevo'];
    
    camposDinamicos.forEach(campo => {
      const control = this.formSolicitud.get(campo);
      control?.clearValidators();
      control?.updateValueAndValidity();
    });
  }

  agregarValidacionesFechas() {
    this.formSolicitud.get('fechaInicio')?.setValidators([Validators.required]);
    this.formSolicitud.get('fechaFin')?.setValidators([Validators.required]);
    
    this.formSolicitud.get('fechaInicio')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.calcularDias());
      
    this.formSolicitud.get('fechaFin')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.calcularDias());
  }

  agregarValidacionesPrestamo() {
    this.formSolicitud.get('montoSolicitado')?.setValidators([Validators.required, Validators.min(1)]);
    this.formSolicitud.get('motivoPrestamo')?.setValidators([Validators.required]);
    this.formSolicitud.get('numeroPagos')?.setValidators([Validators.required, Validators.min(1)]);
  }

  calcularDias() {
    const inicio = this.formSolicitud.get('fechaInicio')?.value;
    const fin = this.formSolicitud.get('fechaFin')?.value;
    
    if (inicio && fin) {
      const diffTime = Math.abs(fin.getTime() - inicio.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      this.formSolicitud.patchValue({ diasSolicitados: diffDays });
    }
  }

  onFileSelect(event: any) {
    const files = event.target.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        this.documentos.push(files[i]);
      }
    }
  }

  removeFile(index: number) {
    this.documentos.splice(index, 1);
  }

  cancelar() {
    this.router.navigate(['/rh/mis-solicitudes']);
  }

  async guardarSolicitud() {
    this.cargando = true;
    this.formSolicitud.markAllAsTouched();
    
    const camposGroup = this.formSolicitud.get('camposPersonalizados') as FormGroup;
    if (camposGroup) {
      Object.keys(camposGroup.controls).forEach(key => {
        const control = camposGroup.get(key);
        control?.markAsTouched();
      });
    }
    
    if (this.formSolicitud.valid) {
      try {
        const formValue = this.formSolicitud.getRawValue();
        
        const detalles: any = {};
        
        if (this.mostrarCamposFechas) {
          detalles.fechaInicio = formValue.fechaInicio;
          detalles.fechaFin = formValue.fechaFin;
          detalles.diasSolicitados = formValue.diasSolicitados;
        }
        
        if (this.mostrarCampoMonto) {
          detalles.montoSolicitado = formValue.montoSolicitado;
          detalles.motivoPrestamo = formValue.motivoPrestamo;
          detalles.numeroPagos = formValue.numeroPagos;
        }
        
        if (this.mostrarCampoConstancia) {
          detalles.tipoConstancia = formValue.tipoConstancia;
        }
        
        if (this.mostrarCampoCambioDatos) {
          detalles.datoAModificar = formValue.datoAModificar;
          detalles.valorActual = formValue.valorActual;
          detalles.valorNuevo = formValue.valorNuevo;
        }
        
        const solicitudData = {
          ...formValue,
          camposPersonalizados: formValue.camposPersonalizados || {},
          detalles,
          estatus: 'Nueva',
          fechasEstatus: {
            fechaNueva: new Date()
          }
        };

        delete solicitudData.fechaInicio;
        delete solicitudData.fechaFin;
        delete solicitudData.diasSolicitados;
        delete solicitudData.montoSolicitado;
        delete solicitudData.motivoPrestamo;
        delete solicitudData.numeroPagos;
        delete solicitudData.tipoConstancia;
        delete solicitudData.datoAModificar;
        delete solicitudData.valorActual;
        delete solicitudData.valorNuevo;
        
        const solicitudId = await this.solicitudesSrv.addSolicitud(solicitudData);
        
        if (this.documentos.length > 0) {
          for (const archivo of this.documentos) {
            const url = await this.solicitudesSrv.uploadDocument(archivo, solicitudId);
            await this.solicitudesSrv.addDocumentToSolicitud(solicitudId, {
              url,
              nombre: archivo.name,
              tipo: archivo.type
            });
          }
        }
        
        this.handleAlertType('SUCCESS', 'Solicitud creada correctamente');
        this.router.navigate(['/rh/mis-solicitudes']);
        
      } catch (error) {
        console.error('Error al crear solicitud:', error);
        this.handleAlertType('ERROR', 'Error al crear la solicitud');
        this.cargando = false;
      }
    } else {
      this.handleAlertType('WARNING', 'Formulario incompleto', 'Complete todos los campos requeridos');
      this.cargando = false;
      this.marcarCamposInvalidos(this.formSolicitud);
    }
  }

  getFileIcon(file: File): string {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'pdf': return 'pi pi-file-pdf text-red-500';
      case 'doc': case 'docx': return 'pi pi-file-word text-blue-500';
      case 'xls': case 'xlsx': return 'pi pi-file-excel text-green-500';
      case 'jpg': case 'jpeg': case 'png': return 'pi pi-image text-purple-500';
      default: return 'pi pi-file text-gray-500';
    }
  }

  getTipoLabel(tipoValue: string): string {
    if (!this.tiposSolicitud || this.tiposSolicitud.length === 0) return 'No disponible';
    const tipo = this.tiposSolicitud.find(t => t.value === tipoValue);
    return tipo ? tipo.label : 'No especificado';
  }

  getPrioridadLabel(prioridadValue: string): string {
    const prioridad = this.prioridades.find(p => p.value === prioridadValue);
    return prioridad ? prioridad.label : 'Media';
  }

  getPrioridadColor(prioridadValue: string): string {
    const prioridad = this.prioridades.find(p => p.value === prioridadValue);
    return prioridad ? prioridad.color : '#ffc107';
  }

  getOpcionesCampo(campo: CampoConfiguracion): any[] {
    if (!campo.opciones) return [];
    return campo.opciones.sort((a, b) => (a.orden || 0) - (b.orden || 0));
  }

  isCampoInvalido(campoNombre: string): boolean {
    const control = (this.formSolicitud.get('camposPersonalizados') as FormGroup)?.get(campoNombre);
    return control ? control.invalid && control.touched : false;
  }

  getCampoError(campo: CampoConfiguracion): string {
    const control = (this.formSolicitud.get('camposPersonalizados') as FormGroup)?.get(campo.nombre);
    if (!control || !control.errors || !control.touched) return '';
    
    if (control.errors['required']) {
      return `${campo.etiqueta} es requerido`;
    }
    
    if (control.errors['min']) {
      return `El valor mínimo es ${campo.validaciones?.min}`;
    }
    
    if (control.errors['max']) {
      return `El valor máximo es ${campo.validaciones?.max}`;
    }
    
    if (control.errors['minlength']) {
      return `Mínimo ${campo.validaciones?.minLength} caracteres`;
    }
    
    if (control.errors['maxlength']) {
      return `Máximo ${campo.validaciones?.maxLength} caracteres`;
    }
    
    if (control.errors['pattern']) {
      return 'El formato no es válido';
    }
    
    return 'Campo inválido';
  }

  seleccionarTipo(valor: string) {
    console.log('Tipo seleccionado:', valor);
    this.formSolicitud.patchValue({ tipoSolicitud: valor });
    this.cargarCamposDinamicos(valor); 
  }
}