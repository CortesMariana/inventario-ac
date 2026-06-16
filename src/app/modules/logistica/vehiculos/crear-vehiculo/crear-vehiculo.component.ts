import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';
import { BaseComponent } from 'src/app/shared/base/base.component';
import { v4 as uuidv4 } from 'uuid';
import { VehiculosService } from '../vehiculos.service';
import { UserService } from 'src/app/shared/service/user.service';
import { EmpleadoService } from '../../../admin/empleados/empleados.service';
import { Empleado } from '../../../admin/empleados/models/empleado.model';
import { catchError, of } from 'rxjs';
import { Vehiculo } from '../models/vehiculo.model';

@Component({
  selector: 'app-crear-vehiculo',
  templateUrl: './crear-vehiculo.component.html',
  styleUrls: ['./crear-vehiculo.component.css']
})
export class CrearVehiculoComponent extends BaseComponent implements OnInit, OnDestroy {
  
  usuario: any;
  formVehiculo!: FormGroup;
  cargando: boolean = false;
  guardando: boolean = false;
  isMobileView: boolean = false;
  vehiculoId: string | null = null;

  tiposVehiculos: any[] = [];
  marcasVehiculos: any[] = [];
  empleados: Empleado[] = [];
  empleadosOpciones: any[] = [];

  mostrarCampoOtroEstado: boolean = false;
  mostrarPanelAsignacion: boolean = false;

  mostrarCampoMarcaPersonalizada: boolean = false;
  mostrarCampoTipoPersonalizado: boolean = false;

  isNew: boolean = true;
  anioMaximo: number = new Date().getFullYear() + 1;
  fechaMinimaSeguro: Date = new Date();

  opcionesEstado: any[] = [
    { label: 'Disponible', value: 'DISPONIBLE' },
    { label: 'Seguro vencido', value: 'SEGURO_VENCIDO' },
    { label: 'Asignado', value: 'ASIGNADO' },
    { label: 'Otro', value: 'OTRO' }
  ];

  constructor(
    protected override messageService: MessageService,
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private vehiculosService: VehiculosService,
    private userSrv: UserService,
    private empleadoService: EmpleadoService
  ) {
    super(messageService);
  }

  ngOnInit() {
    this.cargando = true;

    console.log('URL actual:', this.router.url);
    this.vehiculoId = this.route.snapshot.paramMap.get('id');
    
    if (!this.vehiculoId) {
      const urlSegments = this.router.url.split('/');
      const editIndex = urlSegments.indexOf('editar');
      if (editIndex !== -1 && urlSegments[editIndex + 1]) {
        this.vehiculoId = urlSegments[editIndex + 1];
      }
    }

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.vehiculoId = id;
        this.isNew = false;
        console.log('ID obtenido de parámetros:', this.vehiculoId);
      }
    });
    
    this.isNew = !this.vehiculoId;
    console.log('isNew:', this.isNew, 'vehiculoId:', this.vehiculoId);

    this.initForm().then(async () => {
      if (!this.isNew && this.vehiculoId) {
        console.log('Cargando vehículo para editar con ID:', this.vehiculoId);
        await this.cargarVehiculoParaEditar(this.vehiculoId);
      } else {
        console.log('Modo creación, no se cargan datos');
      }
      
      this.userSrv.consultarEmpleado().pipe(
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

    this.cargarTiposYMarcas();
    this.cargarEmpleados();

    this.formVehiculo.get('estadoVehiculo')?.valueChanges.subscribe(estado => {
      this.mostrarCampoOtroEstado = estado === 'OTRO';
      this.mostrarPanelAsignacion = estado === 'ASIGNADO';
      
      if (!this.mostrarPanelAsignacion) {
        this.formVehiculo.patchValue({
          asignadoAId: null,
          asignadoANombre: null,
          observacionesAsignacion: null
        });
      }
      
      if (!this.mostrarCampoOtroEstado) {
        this.formVehiculo.patchValue({
          otroEstadoTexto: ''
        });
      }
    });

    this.checkScreenSize();
    window.addEventListener('resize', () => {
      this.checkScreenSize();
    });
  }

  ngOnDestroy() {
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
      }
    });
  }

  async cargarTiposYMarcas() {
    try {
      const tipos = await this.vehiculosService.getTiposVehiculos();
      this.tiposVehiculos = tipos.map(t => ({ 
        label: t.nombre, 
        value: t.nombre
      }));

      const marcas = await this.vehiculosService.getMarcasVehiculos();
      this.marcasVehiculos = marcas.map(m => ({ 
        label: m.nombre, 
        value: m.nombre
      }));
      
    } catch (error) {
      console.error('Error al cargar tipos y marcas:', error);
      this.tiposVehiculos = [
        { label: 'Auto', value: 'Auto' },
        { label: 'Camión', value: 'Camión' },
        { label: 'Camioneta', value: 'Camioneta' },
        { label: 'Furgón', value: 'Furgón' },
        { label: 'Motocicleta', value: 'Motocicleta' },
        { label: 'Otro', value: 'Otro' }
      ];
      
      this.marcasVehiculos = [
        { label: 'Nissan', value: 'Nissan' },
        { label: 'Toyota', value: 'Toyota' },
        { label: 'Ford', value: 'Ford' },
        { label: 'Volkswagen', value: 'Volkswagen' },
        { label: 'Chevrolet', value: 'Chevrolet' },
        { label: 'Honda', value: 'Honda' },
        { label: 'Mazda', value: 'Mazda' },
        { label: 'Hyundai', value: 'Hyundai' },
        { label: 'Kia', value: 'Kia' },
        { label: 'Mercedes-Benz', value: 'Mercedes-Benz' },
        { label: 'BMW', value: 'BMW' },
        { label: 'Audi', value: 'Audi' },
        { label: 'Renault', value: 'Renault' },
        { label: 'Peugeot', value: 'Peugeot' },
        { label: 'Otro', value: 'Otro' }
      ];
    }
  }

  async cargarVehiculoParaEditar(id: string) {
    console.log('cargarVehiculoParaEditar llamado con ID:', id);
    try {
      const vehiculo = await this.vehiculosService.getVehiculo(id);
      console.log('Vehículo obtenido:', vehiculo);
      
      if (vehiculo) {
        const tipoExiste = this.tiposVehiculos.some(t => t.value === vehiculo.tipo);
        const marcaExiste = this.marcasVehiculos.some(m => m.value === vehiculo.marca);
        
        this.mostrarCampoTipoPersonalizado = !tipoExiste && vehiculo.tipo !== 'Otro';
        this.mostrarCampoMarcaPersonalizada = !marcaExiste && vehiculo.marca !== 'Otro';
        
        this.formVehiculo.patchValue({
          tipo: vehiculo.tipo,
          marca: vehiculo.marca,
          modelo: vehiculo.modelo,
          placa: vehiculo.placa,
          numeroEconomico: vehiculo.numeroEconomico || '',
          limiteLitrosMensual: vehiculo.limiteLitrosMensual || null,
          numeroSerie: vehiculo.numeroSerie,
          color: vehiculo.color || '',
          anio: vehiculo.anio,
          cargaMaxKg: vehiculo.cargaMaxKg || 0,
          estadoVehiculo: vehiculo.estadoVehiculo,
          otroEstadoTexto: vehiculo.otroEstadoTexto || '',
          asignadoAId: vehiculo.asignadoAId || null,
          asignadoANombre: vehiculo.asignadoANombre || null,
          observacionesAsignacion: vehiculo.observacionesAsignacion || '',
          fechaVencimientoSeguro: vehiculo.fechaVencimientoSeguro ? new Date(vehiculo.fechaVencimientoSeguro) : null,
          observaciones: vehiculo.observaciones || '',
          costo: vehiculo.costo || 0, 
        });
        
        this.mostrarPanelAsignacion = vehiculo.estadoVehiculo === 'ASIGNADO';
        this.mostrarCampoOtroEstado = vehiculo.estadoVehiculo === 'OTRO';
        
        console.log('Formulario actualizado con datos del vehículo');
      } else {
        console.error('No se encontró el vehículo con ID:', id);
        this.handleAlertType('ERROR', 'No se encontró el vehículo');
        this.router.navigate(['/logistica/vehiculos/grid']);
      }
    } catch (error) {
      console.error('Error al cargar vehículo:', error);
      this.handleAlertType('ERROR', 'Error al cargar los datos del vehículo');
      this.router.navigate(['/logistica/vehiculos/grid']);
    }
  }

  onMarcaChange(event: any) {
    this.mostrarCampoMarcaPersonalizada = event.value === 'Otro';
    
    if (!this.mostrarCampoMarcaPersonalizada) {
      this.formVehiculo.patchValue({ marca: event.value });
    } else {
      this.formVehiculo.patchValue({ marca: '' });
    }
  }

  onTipoChange(event: any) {
    this.mostrarCampoTipoPersonalizado = event.value === 'Otro';
    
    if (!this.mostrarCampoTipoPersonalizado) {
      this.formVehiculo.patchValue({ tipo: event.value });
    } else {
      this.formVehiculo.patchValue({ tipo: '' });
    }
  }

  initForm(): Promise<boolean> {
    return new Promise((resolve) => {
      this.formVehiculo = this.fb.group({
        id: [uuidv4()],
        tipo: ['', Validators.required],
        marca: ['', Validators.required],
        modelo: ['', Validators.required],
        placa: ['', Validators.required],
        numeroEconomico: [''],
        limiteLitrosMensual: [null],
        numeroSerie: ['', Validators.required],
        color: [''],
        anio: ['', [Validators.required, Validators.min(1900), Validators.max(new Date().getFullYear() + 1)]],
        cargaMaxKg: [0],
        costo: [0, [Validators.required, Validators.min(0)]],
        estadoVehiculo: ['DISPONIBLE', Validators.required],
        otroEstadoTexto: [''],
        asignadoAId: [null],
        asignadoANombre: [null],
        observacionesAsignacion: [''],
        fechaVencimientoSeguro: [null],
        observaciones: ['']
      });
      resolve(true);
    });
  }

  onEmpleadoSelect(event: any) {
    if (event && event.value) {
      const empleadoSeleccionado = this.empleados.find(e => e.empleadoId === event.value);
      
      if (empleadoSeleccionado) {
        const nombreCompleto = `${empleadoSeleccionado.nombre} ${empleadoSeleccionado.apellidoPaterno || ''} ${empleadoSeleccionado.apellidoMaterno || ''}`.trim();
        
        this.formVehiculo.patchValue({
          asignadoAId: empleadoSeleccionado.empleadoId,
          asignadoANombre: nombreCompleto
        });
        
        this.messageService.add({
          severity: 'success',
          summary: 'Asignación',
          detail: `Vehículo asignado a: ${nombreCompleto}`
        });
      }
    } else {
      this.formVehiculo.patchValue({
        asignadoAId: null,
        asignadoANombre: null
      });
    }
  }

  cancelar() {
    this.router.navigate(['/logistica/vehiculos/grid']);
  }

  async guardarVehiculo() {
    this.formVehiculo.markAllAsTouched();

    if (!this.formVehiculo.valid) {
      this.handleAlertType('WARNING', 'Formulario incompleto', 'Complete los campos requeridos');
      this.marcarCamposInvalidos(this.formVehiculo);
      return;
    }

    this.guardando = true;
    try {
        const formValue = this.formVehiculo.getRawValue();
        
        const vehiculoData: any = {
          tipo: formValue.tipo,
          marca: formValue.marca,
          modelo: formValue.modelo,
          placa: formValue.placa.toUpperCase(),
          numeroEconomico: formValue.numeroEconomico?.trim() || '',
          ...(formValue.limiteLitrosMensual > 0 && { limiteLitrosMensual: formValue.limiteLitrosMensual }),
          numeroSerie: formValue.numeroSerie,
          color: formValue.color || '',
          anio: formValue.anio,
          costo: formValue.costo || 0,
          cargaMaxKg: formValue.cargaMaxKg || 0,
          estadoVehiculo: formValue.estadoVehiculo,
          observaciones: formValue.observaciones || '',
          fechaVencimientoSeguro: formValue.fechaVencimientoSeguro ? new Date(formValue.fechaVencimientoSeguro) : null
        };

        if (formValue.estadoVehiculo === 'OTRO' && formValue.otroEstadoTexto) {
          vehiculoData.otroEstadoTexto = formValue.otroEstadoTexto;
        }

        if (formValue.estadoVehiculo === 'ASIGNADO') {
          vehiculoData.asignadoAId = formValue.asignadoAId;
          vehiculoData.asignadoANombre = formValue.asignadoANombre;
          if (this.isNew) {
            vehiculoData.asignadoAFecha = new Date();
          }
        }

        const usuarioMovimiento = {
          id: this.usuario?.id || 'sistema',
          nombre: this.usuario?.nombreCompleto || 'Sistema'
        };

        let resultado;
        if (this.isNew) {
          console.log('Creando nuevo vehículo');
          resultado = await this.vehiculosService.createVehiculo(vehiculoData, usuarioMovimiento);
          this.handleAlertType('SUCCESS', 'Vehículo creado correctamente');
        } else if (this.vehiculoId) {
          console.log('Actualizando vehículo existente:', this.vehiculoId);
          await this.vehiculosService.updateVehiculo(this.vehiculoId, vehiculoData);
          this.handleAlertType('SUCCESS', 'Vehículo actualizado correctamente');
          resultado = this.vehiculoId;
        }
        
        this.router.navigate(['/logistica/vehiculos/detalle', resultado]);
        
    } catch (error: any) {
      console.error('Error al guardar vehículo:', error);
      this.handleAlertType('ERROR', error.message || `Error al ${this.isNew ? 'crear' : 'actualizar'} el vehículo`);
    } finally {
      this.guardando = false;
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
}