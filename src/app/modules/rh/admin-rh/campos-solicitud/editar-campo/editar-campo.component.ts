import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subject, takeUntil } from 'rxjs';
import { BaseComponent } from 'src/app/shared/base/base.component';
import { CamposSolicitudService } from '../campos-solicitud.service';
import { CampoConfiguracion } from '../models/campo-solicitud.model';

@Component({
  selector: 'app-editar-campo',
  templateUrl: './editar-campo.component.html',
  styleUrls: ['./editar-campo.component.css']
})
export class EditarCampoComponent extends BaseComponent implements OnInit, OnDestroy {
  formCampo!: FormGroup;
  cargando: boolean = false;
  esNuevo: boolean = true;
  campoId: string | null = null;
  
  tiposCampo: any[] = [];
  categorias: any[] = [];
  tiposSolicitud: any[] = [];
  
  mostrarOpciones: boolean = false;
  mostrarValidacionesNumericas: boolean = false;
  mostrarValidacionesTexto: boolean = false;
  
  private destroy$ = new Subject<void>();

  constructor(
    protected override messageService: MessageService,
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private camposSrv: CamposSolicitudService
  ) {
    super(messageService);
  }

  ngOnInit() {
    this.cargarOpciones();
    this.initForm();
    this.verificarEdicion();
    this.escucharCambiosTipo();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async cargarOpciones() {
    this.tiposCampo = this.camposSrv.getTiposCampo();
    this.categorias = this.camposSrv.getCategorias();
    
    try {
      this.tiposSolicitud = await this.camposSrv.getTiposSolicitudParaDropdown();
      console.log('Tipos cargados en editar-campo:', this.tiposSolicitud);
    } catch (error) {
      console.error('Error al cargar tipos de solicitud:', error);
      this.tiposSolicitud = [
        { label: 'Todos los tipos', value: 'todos', icon: 'pi pi-globe' },
        { label: 'Vacaciones', value: 'vacaciones', icon: 'pi pi-sun' },
        { label: 'Permiso', value: 'permiso', icon: 'pi pi-calendar-plus' },
        { label: 'Incapacidad', value: 'incapacidad', icon: 'pi pi-heart' },
        { label: 'Préstamo', value: 'prestamo', icon: 'pi pi-credit-card' },
        { label: 'Constancia', value: 'constancia', icon: 'pi pi-file-pdf' },
        { label: 'Cambio de datos', value: 'cambio-datos', icon: 'pi pi-pencil' },
        { label: 'Otro', value: 'otro', icon: 'pi pi-file' }
      ];
    }
  }


  initForm() {
    this.formCampo = this.fb.group({
      nombre: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9_]+$/)]],
      etiqueta: ['', Validators.required],
      descripcion: [''],
      tipo: ['texto', Validators.required],
      categoria: ['basico', Validators.required],
      tipoSolicitud: ['todos', Validators.required],
      requerido: [false],
      orden: [0, [Validators.required, Validators.min(0)]],
      columna: [12, Validators.required],
      ayuda: [''],
      placeholder: [''],
      activo: [true],
      visibleCreacion: [true],
      visibleEdicion: [true],
      visibleDetalle: [true],
      
      validaciones: this.fb.group({
        min: [null],
        max: [null],
        minLength: [null],
        maxLength: [null],
        pattern: ['']
      }),
      
      opciones: this.fb.array([])
    });
  }

  get opcionesArray(): FormArray {
    return this.formCampo.get('opciones') as FormArray;
  }

  nuevaOpcion() {
    const opcionForm = this.fb.group({
      valor: ['', Validators.required],
      etiqueta: ['', Validators.required],
      orden: [this.opcionesArray.length]
    });
    this.opcionesArray.push(opcionForm);
  }

  eliminarOpcion(index: number) {
    this.opcionesArray.removeAt(index);
  }

  async verificarEdicion() {
    this.campoId = this.route.snapshot.paramMap.get('id');
    
    if (this.campoId && this.campoId !== 'nuevo') {
      this.esNuevo = false;
      await this.cargarCampo();
    } else {
      this.asignarSiguienteOrden();
    }
  }

  async asignarSiguienteOrden() {
    try {
      const campos = await this.camposSrv.getCampos();
      const maxOrden = Math.max(...campos.map(c => c.orden), -1);
      this.formCampo.patchValue({ orden: maxOrden + 1 });
    } catch (error) {
      console.error('Error al calcular orden:', error);
    }
  }

  async cargarCampo() {
    if (!this.campoId) return;
    
    this.cargando = true;
    try {
      const campos = await this.camposSrv.getCampos();
      const campo = campos.find(c => c.firestoreId === this.campoId);
      
      if (campo) {
        this.formCampo.patchValue({
          nombre: campo.nombre,
          etiqueta: campo.etiqueta,
          descripcion: campo.descripcion,
          tipo: campo.tipo,
          categoria: campo.categoria,
          tipoSolicitud: campo.tipoSolicitud,
          requerido: campo.requerido,
          orden: campo.orden,
          columna: campo.columna,
          ayuda: campo.ayuda,
          placeholder: campo.placeholder,
          activo: campo.activo,
          visibleCreacion: campo.visibleCreacion,
          visibleEdicion: campo.visibleEdicion,
          visibleDetalle: campo.visibleDetalle
        });
        
        if (campo.validaciones) {
          this.formCampo.patchValue({ validaciones: campo.validaciones });
        }
        
        if (campo.opciones) {
          campo.opciones.forEach(op => {
            this.opcionesArray.push(this.fb.group({
              valor: [op.valor, Validators.required],
              etiqueta: [op.etiqueta, Validators.required],
              orden: [op.orden || this.opcionesArray.length]
            }));
          });
        }
      }
    } catch (error) {
      console.error('Error al cargar campo:', error);
      this.handleAlertType('ERROR', 'Error al cargar el campo');
    } finally {
      this.cargando = false;
    }
  }

  escucharCambiosTipo() {
    this.formCampo.get('tipo')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(tipo => {
        this.mostrarOpciones = ['select', 'radio'].includes(tipo);
        this.mostrarValidacionesNumericas = ['numero'].includes(tipo);
        this.mostrarValidacionesTexto = ['texto', 'textarea'].includes(tipo);
      });
  }

  async guardar() {
    if (this.formCampo.invalid) {
      this.formCampo.markAllAsTouched();
      this.handleAlertType('WARNING', 'Formulario incompleto');
      return;
    }

    const nombreValido = await this.camposSrv.validarNombreUnico(
      this.formCampo.get('nombre')?.value,
      this.esNuevo ? undefined : this.campoId!
    );
    
    if (!nombreValido) {
      this.handleAlertType('ERROR', 'El nombre interno ya existe');
      return;
    }

    this.cargando = true;
    const formValue = this.formCampo.value;

    try {
      if (this.esNuevo) {
        await this.camposSrv.guardarCampo(formValue);
        this.handleAlertType('SUCCESS', 'Campo creado correctamente');
      } else {
        await this.camposSrv.actualizarCampo(this.campoId!, formValue);
        this.handleAlertType('SUCCESS', 'Campo actualizado correctamente');
      }
      
      this.router.navigate(['/rh/admin/campos']);
    } catch (error) {
      console.error('Error al guardar:', error);
      this.handleAlertType('ERROR', 'Error al guardar el campo');
    } finally {
      this.cargando = false;
    }
  }

  cancelar() {
    this.router.navigate(['/rh/admin/campos']);
  }
}