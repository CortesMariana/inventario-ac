import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { catchError, Observable, of, Subject, takeUntil } from 'rxjs';
import { BaseComponent } from 'src/app/shared/base/base.component';
import { v4 as uuidv4 } from 'uuid';
import { ActivosService } from '../activos.service';
import { LugaresTrabajoService } from '../../empleados/lugares-trabajo.service';
import { UserService } from 'src/app/shared/service/user.service';
import { EstadoTecnico } from '../models/activo.model';
import { EmpleadoService } from '../../empleados/empleados.service';
import { Empleado } from '../../empleados/models/empleado.model';
import { FolioService } from '../folio.service';

@Component({
  selector: 'app-nuevo-editar-activo',
  templateUrl: './nuevo-editar-activo.component.html',
  styleUrls: ['./nuevo-editar-activo.component.css']
})
export class NuevoEditarActivoComponent extends BaseComponent implements OnInit, OnDestroy {
  
  usuario: any;

  formActivo!: FormGroup;

  titulo: string = 'Nuevo Activo';
  tituloCard: string = 'Nuevo Activo';
  isNew: boolean = true;
  cargando: boolean = false;
  private destroy$ = new Subject<void>();

  estadosTecnicos: any[] = [
    { label: 'Disponible', value: 'DISPONIBLE' },
    { label: 'Asignado', value: 'ASIGNADO' },
    { label: 'En Reparación', value: 'EN_REPARACION' },
    { label: 'Fuera de Servicio', value: 'FUERA_DE_SERVICIO' },
    { label: 'Baja Técnica', value: 'BAJA_TECNICA' }
  ];

  marcas: any[] = [
    { label: 'GHIA', value: 'GHIA' },
    { label: 'HP', value: 'HP' },
    { label: 'Dell', value: 'Dell' },
    { label: 'Lenovo', value: 'Lenovo' },
    { label: 'Apple', value: 'Apple' },
    { label: 'Samsung', value: 'Samsung' },
    { label: 'Motorola', value: 'Motorola' },
    { label: 'Epson', value: 'Epson' },
    { label: 'Brother', value: 'Brother' },
    { label: 'Cisco', value: 'Cisco' },
    { label: 'Ubiquiti', value: 'Ubiquiti' },
    { label: 'MikroTik', value: 'MikroTik' },
    { label: 'Otra', value: 'OTRA' }
  ];

  ubicaciones: any[] = [];
  ubicacionesCargando: boolean = false;

  isMobileView: boolean = false;

  categorias: any[] = [];
  subalmacenes: any[] = [];
  subalmacenesAgrupados: any[] = [];

  mostrarPanelAsignacion: boolean = false;
  empleados: Empleado[] = [];
  empleadosOpciones: any[] = [];

  mostrarCampoOtraMarca: boolean = false;
  marcaPersonalizada: string = '';

  constructor(
    protected override messageService: MessageService,
    private fb: FormBuilder,
    private router: Router,
    private activeRoute: ActivatedRoute,
    private activosService: ActivosService,
    private lugaresTrabajoSrv: LugaresTrabajoService,
    private empleadoService: EmpleadoService, 
    private userSrv: UserService,
    private folioService: FolioService
  ) {
    super(messageService);
  }

  ngOnInit() {
    this.cargando = true;

    if (this.router.url.includes('crear')) {
      this.titulo = 'Nuevo Activo';
      this.tituloCard = 'Nuevo Activo';
      this.isNew = true;
    } else {
      this.titulo = 'Editar Activo';
      this.tituloCard = 'Editar Activo';
      this.isNew = false;
    }

    this.initForm().then(() => {
      this.getUsuario().pipe(
        catchError((error) => {
          this.handleAlertType('ERROR', 'Error al consultar el usuario');
          return of(null);
        })
      ).subscribe((data) => {
        if (data) {
          this.usuario = data;
        }
        this.cargando = false;
      });
    });

    this.cargarUbicaciones();
    this.cargarCategoriasYSubalmacenes(); 
    this.cargarEmpleados(); 

    if (!this.isNew) {
      this.cargarActivoExistente();
    }

    this.formActivo.get('estadoTecnico')?.valueChanges.subscribe(estado => {
      this.mostrarPanelAsignacion = estado === 'ASIGNADO';
      
      if (!this.mostrarPanelAsignacion) {
        this.formActivo.patchValue({
          usuarioAsignadoId: null,
          usuarioAsignadoNombre: null,
          ubicacionAsignadaId: null,
          ubicacionAsignadaNombre: null,
          observacionesAsignacion: null
        });
      }
    });

    this.checkScreenSize();
    window.addEventListener('resize', () => {
      this.checkScreenSize();
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    window.removeEventListener('resize', () => this.checkScreenSize());
  }

  checkScreenSize() {
    this.isMobileView = window.innerWidth <= 768;
  }

  cargarEmpleados(): void {
    this.empleadoService.getEmpleados().subscribe({
      next: (empleados: Empleado[]) => {
        const empleadosActivos = empleados.filter(e => e.activo !== false);
        
        this.empleadosOpciones = empleadosActivos.map(e => ({
          label: `${e.nombre} ${e.apellidoPaterno || ''} ${e.apellidoMaterno || ''}`.trim(),
          value: e.empleadoId,
          data: e
        }));

        this.empleados = empleadosActivos;
      },
      error: (error) => {
        console.error('Error al cargar empleados:', error);
        this.handleAlertType('WARNING', 'Error al cargar empleados');
      }
    });
  }

  initForm(): Promise<boolean> {
    return new Promise((resolve) => {
      this.formActivo = this.fb.group({
        id: [uuidv4()],
        nombre: ['', Validators.required],
        descripcion: [''],
        tipoActivo: ['Tablet', Validators.required],
        numeroSerie: [''],
        marca: ['', Validators.required],
        modelo: [''],
        categoriaId: ['', Validators.required],
        categoriaNombre: [''],
        estadoTecnico: ['DISPONIBLE', Validators.required],
        ubicacionId: [''],
        ubicacionNombre: [''],
        erpId: [''],
        precioEntrega: [null],
        nip: [''],
        activoFijo: [''],
        procesador: [''],
        memoriaRam: [null],
        ip: [''],
        imei: [''],
        cargadorIncluido: [true],
        condicionEquipo: ['usado'],
        condicionDetalle: ['En buenas condiciones'],
        usuarioAsignadoId: [null],
        usuarioAsignadoNombre: [null],
        ubicacionAsignadaId: [null],
        ubicacionAsignadaNombre: [null],
        observacionesAsignacion: ['']
      });
      resolve(true);
    });
  }

  getUsuario(): Observable<any> {
    return this.userSrv.consultarEmpleado();
  }

  onEmpleadoSelect(event: any) {
    if (event && event.value) {
      const empleadoSeleccionado = this.empleados.find(e => e.empleadoId === event.value);
      
      if (empleadoSeleccionado) {
        const ubicacionEmpleado = empleadoSeleccionado.lugarDeTrabajo;
        const nombreCompleto = `${empleadoSeleccionado.nombre} ${empleadoSeleccionado.apellidoPaterno || ''} ${empleadoSeleccionado.apellidoMaterno || ''}`.trim();
        
        if (ubicacionEmpleado && ubicacionEmpleado.id) {
          this.formActivo.patchValue({
            usuarioAsignadoId: empleadoSeleccionado.empleadoId,
            usuarioAsignadoNombre: nombreCompleto,
            ubicacionAsignadaId: ubicacionEmpleado.id,
            ubicacionAsignadaNombre: ubicacionEmpleado.nombre,
            ubicacionId: ubicacionEmpleado.id,
            ubicacionNombre: ubicacionEmpleado.nombre
          });
          
          this.messageService.add({
            severity: 'success',
            summary: 'Ubicación automática',
            detail: `El activo se asignará a la ubicación: ${ubicacionEmpleado.nombre}`
          });
        } else {
          this.formActivo.patchValue({
            usuarioAsignadoId: empleadoSeleccionado.empleadoId,
            usuarioAsignadoNombre: nombreCompleto,
            ubicacionAsignadaId: null,
            ubicacionAsignadaNombre: null
          });
          
          this.messageService.add({
            severity: 'warn',
            summary: 'Sin ubicación',
            detail: 'El empleado no tiene una ubicación asignada. Debes seleccionar una manualmente.'
          });
        }
      }
    } else {
      this.formActivo.patchValue({
        usuarioAsignadoId: null,
        usuarioAsignadoNombre: null,
        ubicacionAsignadaId: null,
        ubicacionAsignadaNombre: null
      });
    }
  }

  cargarUbicaciones(): void {
    this.ubicacionesCargando = true;
    this.lugaresTrabajoSrv.getLugaresTrabajo()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.ubicaciones = data.map((ubicacion: any) => ({
            label: ubicacion.nombre || 'Ubicación sin nombre',
            value: ubicacion.id,
            data: ubicacion
          }));
          
          this.ubicaciones.unshift({
            label: 'Sin ubicación',
            value: null,
            data: null
          });
          
          this.ubicacionesCargando = false;
        },
        error: (error) => {
          console.error('Error al cargar ubicaciones:', error);
          this.handleAlertType('WARNING', 'Error al cargar ubicaciones');
          this.ubicacionesCargando = false;
        }
      });
  }

  async cargarActivoExistente(): Promise<void> {
    const firestoreId = this.activeRoute.snapshot.paramMap.get('firestoreId');
    if (firestoreId) {
      this.cargando = true;
      try {
        if (this.empleados.length === 0) {
          await new Promise<void>((resolve) => {
            const checkEmpleados = setInterval(() => {
              if (this.empleados.length > 0) {
                clearInterval(checkEmpleados);
                resolve();
              }
            }, 100);
          });
        }
        
        const activo = await this.activosService.getActivo(firestoreId);
        if (activo) {
          const formValue: any = {
            id: activo.id,
            nombre: activo.nombre || '',
            descripcion: activo.descripcion || '',
            numeroSerie: activo.numeroSerie || '',
            marca: activo.marca || '',
            modelo: activo.modelo || '',
            estadoTecnico: activo.estadoTecnico || 'DISPONIBLE',
            ubicacionId: activo.ubicacionId || '',
            ubicacionNombre: activo.ubicacionNombre || '',
            erpId: activo.erpId || '',
            precioEntrega: activo.precioEntrega || null,
            nip: activo.nip || '',
            activoFijo: activo.activoFijo || '',
            tipoActivo: activo.tipoActivo || 'Tablet',
            categoriaId: activo.categoriaId || '',
            categoriaNombre: activo.categoriaNombre || '',
            procesador: (activo as any).procesador || '',
            memoriaRam: (activo as any).memoriaRam || null,
            ip: (activo as any).ip || '',
            imei: (activo as any).imei || '',
            cargadorIncluido: (activo as any).cargadorIncluido !== undefined ? (activo as any).cargadorIncluido : true,
            condicionEquipo: (activo as any).condicionEquipo || 'usado',
            condicionDetalle: (activo as any).condicionDetalle || 'En buenas condiciones',
            usuarioAsignadoId: (activo as any).usuarioAsignadoId || null,
            usuarioAsignadoNombre: (activo as any).usuarioAsignadoNombre || null,
            ubicacionAsignadaId: (activo as any).ubicacionAsignadaId || null,
            ubicacionAsignadaNombre: (activo as any).ubicacionAsignadaNombre || null,
            observacionesAsignacion: (activo as any).observacionesAsignacion || ''
          };
          
          const marcasPredefinidas = this.marcas.map(m => m.value);
          if (formValue.marca && !marcasPredefinidas.includes(formValue.marca)) {
            this.mostrarCampoOtraMarca = true;
            this.marcaPersonalizada = formValue.marca;
          }

          this.formActivo.patchValue(formValue);
          
          if (formValue.estadoTecnico === 'ASIGNADO') {
            this.mostrarPanelAsignacion = true;
            
            if (formValue.usuarioAsignadoId) {
              const empleadoAsignado = this.empleados.find(e => e.empleadoId === formValue.usuarioAsignadoId);
              if (empleadoAsignado) {
                const ubicacionEmpleado = empleadoAsignado.lugarDeTrabajo;
                const nombreCompleto = `${empleadoAsignado.nombre} ${empleadoAsignado.apellidoPaterno || ''} ${empleadoAsignado.apellidoMaterno || ''}`.trim();
                
                this.formActivo.patchValue({
                  usuarioAsignadoNombre: nombreCompleto
                });
                
                if (ubicacionEmpleado && ubicacionEmpleado.id) {
                  this.formActivo.patchValue({
                    ubicacionAsignadaId: ubicacionEmpleado.id,
                    ubicacionAsignadaNombre: ubicacionEmpleado.nombre,
                    ubicacionId: this.formActivo.get('ubicacionId')?.value || ubicacionEmpleado.id,
                    ubicacionNombre: this.formActivo.get('ubicacionNombre')?.value || ubicacionEmpleado.nombre
                  });
                  
                  const ubicacionActualId = this.formActivo.get('ubicacionId')?.value;
                  if (!ubicacionActualId || ubicacionActualId === '') {
                    this.formActivo.patchValue({
                      ubicacionId: ubicacionEmpleado.id,
                      ubicacionNombre: ubicacionEmpleado.nombre
                    });
                  }
                }
              } else {
                console.warn('Empleado no encontrado en lista local:', formValue.usuarioAsignadoId);
              }
            }
          }
        }
        this.cargando = false;
      } catch (error) {
        console.error('Error al cargar activo:', error);
        this.handleAlertType('ERROR', 'Error al cargar el activo');
        this.cargando = false;
      }
    }
  }

  onUbicacionSelect(event: any): void {
    const ubicacionSeleccionada = this.ubicaciones.find(u => u.value === event.value);
    
    if (ubicacionSeleccionada && ubicacionSeleccionada.value) {
      this.formActivo.patchValue({
        ubicacionId: ubicacionSeleccionada.value,
        ubicacionNombre: ubicacionSeleccionada.label
      });
    } else {
      this.formActivo.patchValue({
        ubicacionId: '',
        ubicacionNombre: ''
      });
    }
  }

  getUbicacionLabel(value: string): string {
    if (!value) return 'Sin ubicación';
    const ubicacion = this.ubicaciones.find(u => u.value === value);
    return ubicacion ? ubicacion.label : value;
  }

  onCondicionChange() {
    const condicion = this.formActivo.get('condicionEquipo')?.value;
    if (condicion !== 'Dañado') {
      this.formActivo.patchValue({ condicionDetalle: '' });
    }
  }

  get mostrarCampoDanos(): boolean {
    return this.formActivo?.get('condicionDetalle')?.value === 'Dañado';
  }

  cancelar() {
    this.router.navigate(['/admin/activos']);
  }

  async guardarActivo() {
    this.cargando = true;
    this.formActivo.markAllAsTouched();
    
    if (this.formActivo.valid) {
      try {
        const formValue = this.formActivo.getRawValue();
        
        const categoria = this.categorias.find(c => c.id === formValue.categoriaId);
        const categoriaNombre = categoria?.nombre || formValue.categoriaNombre || '';

        const subalmacen = this.subalmacenes.find(s => s.id === formValue.ubicacionId);

        const activoData: any = {
          nombre: formValue.nombre,
          descripcion: formValue.descripcion || '',
          tipoActivo: formValue.tipoActivo,
          categoriaId: formValue.categoriaId,
          categoriaNombre: categoriaNombre,
          numeroSerie: formValue.numeroSerie || '',
          marca: formValue.marca,
          modelo: formValue.modelo || '',
          estadoTecnico: formValue.estadoTecnico,
          
          ubicacionId: formValue.estadoTecnico === 'ASIGNADO' 
            ? (formValue.ubicacionAsignadaId || formValue.ubicacionId) 
            : (formValue.ubicacionId || null),
          ubicacionNombre: formValue.estadoTecnico === 'ASIGNADO' 
            ? (formValue.ubicacionAsignadaNombre || formValue.ubicacionNombre) 
            : (formValue.ubicacionNombre || null),
          lugarTrabajoId: subalmacen?.lugarDeTrabajoId || null,
          lugarTrabajoNombre: subalmacen?.lugarNombre || null,
          
          erpId: formValue.erpId || '',
          precioEntrega: formValue.precioEntrega || null,
          nip: formValue.nip || '',
          activoFijo: formValue.activoFijo || '',
          
          procesador: formValue.procesador || '',
          memoriaRam: formValue.memoriaRam || null,
          ip: formValue.ip || '',
          imei: formValue.imei || '',
          cargadorIncluido: formValue.cargadorIncluido !== undefined ? formValue.cargadorIncluido : true,
          
          condicionEquipo: formValue.condicionEquipo || 'usado',
          condicionDetalle: formValue.condicionDetalle || '',
          
          usuarioAsignadoId: formValue.estadoTecnico === 'ASIGNADO' ? formValue.usuarioAsignadoId : null,
          usuarioAsignadoNombre: formValue.estadoTecnico === 'ASIGNADO' ? formValue.usuarioAsignadoNombre : null,
          ubicacionAsignadaId: formValue.estadoTecnico === 'ASIGNADO' ? formValue.ubicacionAsignadaId : null,
          ubicacionAsignadaNombre: formValue.estadoTecnico === 'ASIGNADO' ? formValue.ubicacionAsignadaNombre : null,
          observacionesAsignacion: formValue.observacionesAsignacion || ''
        };

        Object.keys(activoData).forEach(key => {
          if (activoData[key] === undefined) {
            activoData[key] = null;
          }
        });

        if (this.isNew) {
          const nuevoFolio = await this.folioService.generarSiguienteFolio();
          activoData.folio = nuevoFolio;

          const usuarioMovimiento = {
            id: this.usuario?.id || 'sistema',
            nombre: this.usuario?.nombreCompleto || 'Sistema'
          };

          const activoId = await this.activosService.createActivo(activoData, usuarioMovimiento);
          
          this.handleAlertType('SUCCESS', 'Activo creado correctamente');
          this.router.navigate(['/admin/activos/detalle', activoId]);
        } else {
          const firestoreId = this.activeRoute.snapshot.paramMap.get('firestoreId');
          if (firestoreId) {
            await this.activosService.updateActivo(firestoreId, activoData);
            
            this.handleAlertType('SUCCESS', 'Activo actualizado correctamente');
            this.router.navigate(['/admin/activos/detalle', firestoreId]);
          }
        }
      } catch (error: any) {
        console.error('Error al guardar activo:', error);
        this.handleAlertType('ERROR', error.message || 'Error al guardar el activo');
        this.cargando = false;
      }
    } else {
      this.handleAlertType('WARNING', 'Formulario incompleto', 'Complete los campos requeridos');
      this.cargando = false;
      this.marcarCamposInvalidos(this.formActivo);
    }
  }

  override marcarCamposInvalidos(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      if (control?.invalid) {
        control.markAsTouched();
      }
      if (control instanceof FormGroup) {
        this.marcarCamposInvalidos(control);
      }
    });
  }

  override resetForm(): void {
    this.formActivo.reset({
      id: uuidv4(),
      estadoTecnico: 'DISPONIBLE',
      tipoActivo: 'Tablet',
      condicionEquipo: 'usado',
      condicionDetalle: 'En buenas condiciones',
      cargadorIncluido: true
    });
  }

  async cargarCategoriasYSubalmacenes() {
    try {
      this.categorias = await this.activosService.getCategorias();
      
      const jerarquia = await this.activosService.getJerarquiaCompleta();
      
      this.subalmacenesAgrupados = jerarquia.map((lugar: any) => ({
        label: lugar.nombre,
        value: lugar.id,
        items: lugar.subalmacenes?.map((s: any) => ({
          label: s.nombre,
          value: s.id,
          lugarId: lugar.id,
          lugarNombre: lugar.nombre
        })) || []
      }));
      
      this.subalmacenes = jerarquia.flatMap((l: any) => 
        l.subalmacenes?.map((s: any) => ({
          ...s,
          lugarNombre: l.nombre
        })) || []
      );
      
    } catch (error) {
      console.error('Error al cargar categorías y subalmacenes:', error);
      this.handleAlertType('ERROR', 'Error al cargar categorías y ubicaciones');
    }
  }

  onSubalmacenSelect(event: any) {
    if (event.value) {
      const subalmacen = this.subalmacenes.find(s => s.id === event.value);
      if (subalmacen) {
        this.formActivo.patchValue({
          ubicacionNombre: subalmacen.nombre,
          lugarTrabajoId: subalmacen.lugarDeTrabajoId,
          lugarTrabajoNombre: subalmacen.lugarNombre
        });
      }
    } else {
      this.formActivo.patchValue({
        ubicacionNombre: '',
        lugarTrabajoId: null,
        lugarTrabajoNombre: ''
      });
    }
  }

  getColorCategoria(categoria: any): string {
    if (!categoria) return '#667eea';
    
    const colores = ['#667eea', '#4CAF50', '#FF9800', '#9C27B0', '#F44336', '#00BCD4', '#795548'];
    let hash = 0;
    for (let i = 0; i < categoria.nombre.length; i++) {
      hash = categoria.nombre.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colores[Math.abs(hash) % colores.length];
  }

  onMarcaSelect(event: any) {
    if (event.value === 'OTRA') {
      this.mostrarCampoOtraMarca = true;
      this.formActivo.patchValue({
        marca: ''
      });
    } else {
      this.mostrarCampoOtraMarca = false;
      this.marcaPersonalizada = '';
      this.formActivo.patchValue({
        marca: event.value
      });
    }
  }

  onMarcaPersonalizadaChange(event: any) {
    const marcaIngresada = event.target.value;
    if (marcaIngresada && marcaIngresada.trim()) {
      this.formActivo.patchValue({
        marca: marcaIngresada.trim()
      });
    }
  }
}