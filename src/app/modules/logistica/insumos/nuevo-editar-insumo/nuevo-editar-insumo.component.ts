import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subject, catchError, firstValueFrom, of } from 'rxjs';
import { BlockUIModule } from 'primeng/blockui';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { DropdownModule } from 'primeng/dropdown';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { BaseComponent } from 'src/app/shared/base/base.component';
import { InsumosLogisticaService } from '../insumos-logistica.service';
import { CatalogosLogisticaService } from '../catalogos-logistica.service';
import { CatalogoItemLogistica } from '../models/insumo-logistica.model';
import { UserService } from 'src/app/shared/service/user.service';

@Component({
  selector: 'app-nuevo-editar-insumo',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    BlockUIModule,
    InputTextModule,
    InputNumberModule,
    InputTextareaModule,
    DropdownModule,
    ProgressSpinnerModule,
    ToastModule,
  ],
  templateUrl: './nuevo-editar-insumo.component.html',
  styleUrl: './nuevo-editar-insumo.component.scss',
  providers: [MessageService],
})
export class NuevoEditarInsumoComponent extends BaseComponent implements OnInit, OnDestroy {

  usuario: any;
  formInsumo!: FormGroup;

  titulo: string = 'Nuevo Insumo';
  isNew: boolean = true;
  cargando: boolean = false;
  guardando: boolean = false;

  familias: CatalogoItemLogistica[] = [];
  marcas: CatalogoItemLogistica[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    protected override messageService: MessageService,
    private fb: FormBuilder,
    private router: Router,
    private activeRoute: ActivatedRoute,
    private insumosService: InsumosLogisticaService,
    private catalogosService: CatalogosLogisticaService,
    private userSrv: UserService,
  ) {
    super(messageService);
  }

  async ngOnInit() {
    this.cargando = true;

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
      console.error('Error al cargar usuario:', error);
      this.usuario = {
        id: 'usuario_desconocido',
        nombreCompleto: 'Usuario Desconocido',
        nombre: 'Usuario',
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

    await Promise.all([
      this.cargarCatalogos(),
      this.isNew ? Promise.resolve() : this.cargarInsumoExistente(),
    ]);

    this.cargando = false;
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initForm() {
    this.formInsumo = this.fb.group({
      id:             [Date.now()],
      idERP:          [''],
      nombre:         ['', [Validators.required, Validators.minLength(3)]],
      descripcion:    [''],
      familia:        [''],
      marca:          [''],
      SKU:            [''],
      precioUnitario: [0, [Validators.required, Validators.min(0)]],
      notas:          [''],
    });
  }

  async cargarCatalogos() {
    try {
      const [familias, marcas] = await Promise.all([
        this.catalogosService.getFamilias(),
        this.catalogosService.getMarcas(),
      ]);
      this.familias = familias;
      this.marcas   = marcas;
    } catch (error) {
      console.error('Error al cargar catálogos:', error);
      this.handleAlertType('ERROR', 'Error al cargar familias y marcas');
    }
  }

  async cargarInsumoExistente() {
    const firestoreId = this.activeRoute.snapshot.paramMap.get('firestoreId');
    if (firestoreId) {
        console.log('SI SE ENCONTRÓ: ',firestoreId)
      try {
        const insumo = await this.insumosService.getInsumo(firestoreId);
          console.log('Insumo Insumo: ',insumo);
        if (insumo) {
          this.formInsumo.patchValue({
            id:             insumo.id,
            idERP:          insumo.idERP          || '',
            nombre:         insumo.nombre,
            descripcion:    insumo.descripcion    || '',
            familia:        insumo.familia        || '',
            marca:          insumo.marca          || '',
            SKU:            insumo.SKU            || '',
            precioUnitario: insumo.precioUnitario,
            notas:          insumo.notas          || '',
          });
        }
      } catch (error) {
        console.error('Error al cargar insumo:', error);
        this.handleAlertType('ERROR', 'Error al cargar el insumo');
      }
    }else{
        console.log('NO SE ENCONTRÓ')
    }
  }

  cancelar() {
    this.router.navigate(['/logistica/insumos/insumos']);
  }

  async guardarInsumo() {
    this.formInsumo.markAllAsTouched();

    if (this.formInsumo.valid) {
      this.guardando = true;
      try {
        const formValue = this.formInsumo.getRawValue();

        const insumoData = {
          id:             formValue.id,
          idERP:          formValue.idERP          || '',
          nombre:         formValue.nombre,
          descripcion:    formValue.descripcion    || '',
          familia:        formValue.familia        || '',
          marca:          formValue.marca          || '',
          SKU:            formValue.SKU            || '',
          precioUnitario: formValue.precioUnitario,
          notas:          formValue.notas          || '',
          activo:         true,
        };

        const usuarioMovimiento = {
          id:     this.usuario?.id             || 'usuario_desconocido',
          nombre: this.usuario?.nombreCompleto || this.usuario?.nombre || 'Usuario Desconocido',
        };

        if (this.isNew) {
          const firestoreId = await this.insumosService.createInsumo(insumoData, usuarioMovimiento);
          this.handleAlertType('SUCCESS', 'Insumo creado correctamente');
          this.router.navigate(['/logistica/insumos/detalle', firestoreId]);
        } else {
          const firestoreId = this.activeRoute.snapshot.paramMap.get('firestoreId');
          if (firestoreId) {
            await this.insumosService.updateInsumo(firestoreId, insumoData, usuarioMovimiento);
            this.handleAlertType('SUCCESS', 'Insumo actualizado correctamente');
            this.router.navigate(['/logistica/insumos/detalle', firestoreId]);
          }
        }
      } catch (error: any) {
        console.error('Error al guardar insumo:', error);
        this.handleAlertType('ERROR', error.message || 'Error al guardar el insumo');
        this.guardando = false;
      }
    } else {
      this.handleAlertType('WARNING', 'Formulario incompleto', 'Complete los campos requeridos');
      this.marcarCamposInvalidos(this.formInsumo);
    }
  }

  override marcarCamposInvalidos(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach((key) => {
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
