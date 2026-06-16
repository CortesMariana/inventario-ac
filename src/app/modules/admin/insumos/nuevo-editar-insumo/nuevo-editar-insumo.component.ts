import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subject, takeUntil, firstValueFrom, catchError, of } from 'rxjs';
import { BaseComponent } from 'src/app/shared/base/base.component';
import { v4 as uuidv4 } from 'uuid';
import { InsumosService } from '../insumos.service';
import { ActivosService } from '../../activos/activos.service';
import { TipoEmpaque, EstadoInsumo } from '../models/insumo.model';
import { UserService } from 'src/app/shared/service/user.service';

@Component({
  selector: 'app-nuevo-editar-insumo',
  templateUrl: './nuevo-editar-insumo.component.html',
  styleUrls: ['./nuevo-editar-insumo.component.css']
})
export class NuevoEditarInsumoComponent extends BaseComponent implements OnInit, OnDestroy {
  
  usuario: any;
  formInsumo!: FormGroup;
  
  titulo: string = 'Nuevo Insumo';
  isNew: boolean = true;
  cargando: boolean = false;
  private destroy$ = new Subject<void>();
  
  subalmacenes: any[] = [];
  subalmacenesAgrupados: any[] = [];
  
  opcionesTipoEmpaque: { label: string, value: TipoEmpaque }[] = [
    { label: 'Unitario', value: 'Unitario' },
    { label: 'Bolsa', value: 'Bolsa' },
    { label: 'Caja', value: 'Caja' },
    { label: 'Rollo', value: 'Rollo' },
    { label: 'Kit', value: 'Kit' },
  ];
  
  opcionesEstado: { label: string, value: EstadoInsumo }[] = [
    { label: 'Nuevo', value: 'Nuevo' },
    { label: 'Usado', value: 'Usado' }
  ];

  mostrarCamposUnidades: boolean = false;
  tipoUnidadOptions = [
    { label: 'Piezas', value: 'PIEZAS' },
    { label: 'Metros', value: 'METROS' }
  ];

  constructor(
    protected override messageService: MessageService,
    private fb: FormBuilder,
    private router: Router,
    private activeRoute: ActivatedRoute,
    private insumosService: InsumosService,
    private activosService: ActivosService,
    private userSrv: UserService, 
  ) {
    super(messageService);
  }

  async ngOnInit() {
    this.cargando = true;
    
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
    
    if (this.router.url.includes('crear')) {
      this.titulo = 'Nuevo Insumo';
      this.isNew = true;
    } else {
      this.titulo = 'Editar Insumo';
      this.isNew = false;
    }
    
    this.initForm();
    await this.cargarSubalmacenes();
    
    if (!this.isNew) {
      await this.cargarInsumoExistente();
    }
    
    this.formInsumo.get('cantidad')?.valueChanges.subscribe(() => {
      this.calcularPrecioTotal();
    });
    
    this.formInsumo.get('precioUnitario')?.valueChanges.subscribe(() => {
      this.calcularPrecioTotal();
    });
    
    this.cargando = false;
  }
  
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  initForm() {
    this.formInsumo = this.fb.group({
      id: [uuidv4()],
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      tipoEmpaque: ['Unitario', Validators.required],
      cantidad: [1, [Validators.required, Validators.min(1)]],
      unidadesPorEmpaque: [1, [Validators.min(1)]],
      tipoContenido: ['PIEZAS'],
      marca: ['Generico', Validators.required],
      estado: ['Usado', Validators.required],
      precioUnitario: [0, [Validators.required, Validators.min(0)]],
      precioTotal: [{ value: 0, disabled: true }],
      subalmacenId: ['', Validators.required],
      subalmacenNombre: [''],
      lugarTrabajoId: [''],
      lugarTrabajoNombre: [''],
      notas: [''],
      stockMinimo: [5, [Validators.required, Validators.min(0)]]
    });
    
    this.formInsumo.get('tipoEmpaque')?.valueChanges.subscribe((tipo: TipoEmpaque) => {
      this.actualizarCamposPorTipo(tipo);
    });
    
    this.formInsumo.get('cantidad')?.valueChanges.subscribe(() => {
      this.calcularPrecioTotal();
      this.calcularUnidadesTotales();
    });
    
    this.formInsumo.get('unidadesPorEmpaque')?.valueChanges.subscribe(() => {
      this.calcularUnidadesTotales();
    });
    
    this.formInsumo.get('precioUnitario')?.valueChanges.subscribe(() => {
      this.calcularPrecioTotal();
    });
  }

  actualizarCamposPorTipo(tipo: TipoEmpaque) {
    if (tipo === 'Bolsa' || tipo === 'Caja') {
      this.mostrarCamposUnidades = true;
      this.formInsumo.get('tipoContenido')?.setValue('PIEZAS');
      this.formInsumo.get('tipoContenido')?.enable();
      this.formInsumo.get('unidadesPorEmpaque')?.enable();
      this.formInsumo.get('unidadesPorEmpaque')?.setValidators([Validators.required, Validators.min(1)]);
    } else if (tipo === 'Rollo') {
      this.mostrarCamposUnidades = true;
      this.formInsumo.get('tipoContenido')?.setValue('METROS');
      this.formInsumo.get('tipoContenido')?.disable(); 
      this.formInsumo.get('unidadesPorEmpaque')?.enable();
      this.formInsumo.get('unidadesPorEmpaque')?.setValidators([Validators.required, Validators.min(0.1)]);
    } else {
      this.mostrarCamposUnidades = false;
      this.formInsumo.get('unidadesPorEmpaque')?.clearValidators();
      this.formInsumo.get('unidadesPorEmpaque')?.setValue(null);
      this.formInsumo.get('tipoContenido')?.setValue('PIEZAS');
    }
    this.formInsumo.get('unidadesPorEmpaque')?.updateValueAndValidity();
  }

  calcularUnidadesTotales() {
    const cantidad = this.formInsumo.get('cantidad')?.value || 0;
    const unidadesPorEmpaque = this.formInsumo.get('unidadesPorEmpaque')?.value || 0;
    const totalUnidades = cantidad * unidadesPorEmpaque;
    this.formInsumo.patchValue({ cantidadUnidades: totalUnidades }, { emitEvent: false });
  }

  async cargarInsumoExistente() {
    const firestoreId = this.activeRoute.snapshot.paramMap.get('firestoreId');
    if (firestoreId) {
      this.cargando = true;
      try {
        const insumo = await this.insumosService.getInsumo(firestoreId);
        if (insumo) {
          this.formInsumo.patchValue({
            id: insumo.id,
            nombre: insumo.nombre,
            tipoEmpaque: insumo.tipoEmpaque,
            cantidad: insumo.cantidad,
            unidadesPorEmpaque: insumo.unidadesPorEmpaque || 1,
            tipoContenido: insumo.tipoContenido || 'PIEZAS',
            marca: insumo.marca,
            estado: insumo.estado,
            precioUnitario: insumo.precioUnitario,
            precioTotal: insumo.precioTotal,
            subalmacenId: insumo.subalmacenId,
            subalmacenNombre: insumo.subalmacenNombre,
            lugarTrabajoId: insumo.lugarTrabajoId,
            lugarTrabajoNombre: insumo.lugarTrabajoNombre,
            notas: insumo.notas || '',
            stockMinimo: insumo.stockMinimo || 5
          });
          this.actualizarCamposPorTipo(insumo.tipoEmpaque);
        }
        this.cargando = false;
      } catch (error) {
        console.error('Error al cargar insumo:', error);
        this.handleAlertType('ERROR', 'Error al cargar el insumo');
        this.cargando = false;
      }
    }
  }
  
  calcularPrecioTotal() {
    const cantidad = this.formInsumo.get('cantidad')?.value || 0;
    const precioUnitario = this.formInsumo.get('precioUnitario')?.value || 0;
    const precioTotal = cantidad * precioUnitario;
    this.formInsumo.patchValue({ precioTotal: precioTotal }, { emitEvent: false });
  }
  
  async cargarSubalmacenes() {
    try {
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
          id: s.id,
          nombre: s.nombre,
          lugarDeTrabajoId: s.lugarDeTrabajoId,
          lugarNombre: l.nombre
        })) || []
      );
    } catch (error) {
      console.error('Error al cargar subalmacenes:', error);
      this.handleAlertType('ERROR', 'Error al cargar ubicaciones');
    }
  }
  
  onSubalmacenSelect(event: any) {
    if (event.value) {
      const subalmacen = this.subalmacenes.find(s => s.id === event.value);
      if (subalmacen) {
        this.formInsumo.patchValue({
          subalmacenNombre: subalmacen.nombre,
          lugarTrabajoId: subalmacen.lugarDeTrabajoId,
          lugarTrabajoNombre: subalmacen.lugarNombre
        });
      }
    } else {
      this.formInsumo.patchValue({
        subalmacenNombre: '',
        lugarTrabajoId: '',
        lugarTrabajoNombre: ''
      });
    }
  }
  
  cancelar() {
    this.router.navigate(['/admin/insumos/insumos']);
  }
  
  async guardarInsumo() {
    this.cargando = true;
    this.formInsumo.markAllAsTouched();
    
    if (this.formInsumo.valid) {
      try {
        const formValue = this.formInsumo.getRawValue();
        
        let cantidadUnidades = formValue.cantidad;
        if (formValue.tipoEmpaque === 'Bolsa' || formValue.tipoEmpaque === 'Caja') {
          cantidadUnidades = formValue.cantidad * (formValue.unidadesPorEmpaque || 1);
        } else if (formValue.tipoEmpaque === 'Rollo') {
          cantidadUnidades = formValue.cantidad * (formValue.unidadesPorEmpaque || 1);
        }
        
        const insumoData: any = {  
          nombre: formValue.nombre,
          tipoEmpaque: formValue.tipoEmpaque,
          cantidad: formValue.cantidad,
          marca: formValue.marca,
          estado: formValue.estado,
          precioUnitario: formValue.precioUnitario,
          precioTotal: formValue.cantidad * formValue.precioUnitario,
          subalmacenId: formValue.subalmacenId,
          subalmacenNombre: formValue.subalmacenNombre,
          lugarTrabajoId: formValue.lugarTrabajoId,
          lugarTrabajoNombre: formValue.lugarTrabajoNombre,
          notas: formValue.notas || '',
          stockMinimo: formValue.stockMinimo,
          activo: true
        };

        if (formValue.tipoEmpaque === 'Bolsa' || formValue.tipoEmpaque === 'Caja' || formValue.tipoEmpaque === 'Rollo') {
          if (formValue.unidadesPorEmpaque && formValue.unidadesPorEmpaque > 0) {
            insumoData.unidadesPorEmpaque = formValue.unidadesPorEmpaque;
            insumoData.tipoContenido = (formValue.tipoEmpaque === 'Rollo') ? 'METROS' : 'PIEZAS';
            insumoData.cantidadUnidades = cantidadUnidades;
          }
        }
        
        const usuarioMovimiento = {
          id: this.usuario?.id || 'usuario_desconocido',
          nombre: this.usuario?.nombreCompleto || this.usuario?.nombre || 'Usuario Desconocido'
        };
        
        if (this.isNew) {
          const insumoId = await this.insumosService.createInsumo(insumoData, usuarioMovimiento);
          this.handleAlertType('SUCCESS', 'Insumo creado correctamente');
          this.router.navigate(['/admin/insumos/detalle', insumoId]);
        } else {
          const firestoreId = this.activeRoute.snapshot.paramMap.get('firestoreId');
          if (firestoreId) {
            await this.insumosService.updateInsumo(firestoreId, insumoData, usuarioMovimiento);
            this.handleAlertType('SUCCESS', 'Insumo actualizado correctamente');
            this.router.navigate(['/admin/insumos/detalle', firestoreId]);
          }
        }
      } catch (error: any) {
        console.error('Error al guardar insumo:', error);
        this.handleAlertType('ERROR', error.message || 'Error al guardar el insumo');
        this.cargando = false;
      }
    } else {
      this.handleAlertType('WARNING', 'Formulario incompleto', 'Complete los campos requeridos');
      this.cargando = false;
      this.marcarCamposInvalidos(this.formInsumo);
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
  
  getNombreSubalmacen(id: string): string {
    const sub = this.subalmacenes.find(s => s.id === id);
    return sub ? sub.nombre : '';
  }
}