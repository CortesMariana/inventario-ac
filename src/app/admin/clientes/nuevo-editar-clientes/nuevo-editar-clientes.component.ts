import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MessageService } from 'primeng/api';
import { Cliente, ClientesService, formatDireccion, parseDireccionTexto } from '../clientes.service';

@Component({
    selector: 'app-nuevo-editar-clientes',
    templateUrl: './nuevo-editar-clientes.component.html',
    styleUrls: ['./nuevo-editar-clientes.component.css'],
    standalone: false
})
export class NuevoEditarClientesComponent implements OnInit, OnDestroy {

  form!: FormGroup;
  editMode = false;
  clienteId: string | null = null;
  loading = false;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private clientesSrv: ClientesService,
    private route: ActivatedRoute,
    private router: Router,
    private messageSrv: MessageService
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.setupFiscalSync();
    this.clienteId = this.route.snapshot.paramMap.get('id');
    if (this.clienteId) {
      this.editMode = true;
      this.loadCliente(this.clienteId);
    } else {
      this.syncFiscalAddress(this.form.get('domicilioFiscalIgualFisica')?.value === true);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private buildForm(): void {
    this.form = this.fb.group({
      nombre:    ['', [Validators.required, Validators.minLength(3)]],
      rfc:       ['', [Validators.required, Validators.pattern(/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/i)]],
      telefono:  ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      email:     ['', [Validators.email]],
      descuento: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      personaCargo: [''],
      telefonoContacto: ['', [Validators.pattern(/^\d{10}$/)]],
      direccionFisica: this.fb.group({
        calle: ['', Validators.required],
        numeroExterior: ['', Validators.required],
        colonia: ['', Validators.required],
        ciudad: ['', Validators.required],
        codigoPostal: ['', [Validators.required, Validators.pattern(/^\d{5}$/)]]
      }),
      domicilioFiscalIgualFisica: [true],
      domicilioFiscal: this.fb.group({
        calle: ['', Validators.required],
        numeroExterior: ['', Validators.required],
        colonia: ['', Validators.required],
        ciudad: ['', Validators.required],
        codigoPostal: ['', [Validators.required, Validators.pattern(/^\d{5}$/)]]
      }),
      activo:    [true]
    });
  }

  private setupFiscalSync(): void {
    this.form.get('domicilioFiscalIgualFisica')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((igual: boolean) => this.syncFiscalAddress(igual));

    this.direccionFisicaGroup.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((direccion) => {
        if (this.form.get('domicilioFiscalIgualFisica')?.value) {
          this.domicilioFiscalGroup.patchValue(direccion, { emitEvent: false });
        }
      });
  }

  private loadCliente(id: string): void {
    this.clientesSrv.getById$(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(cliente => {
        const direccionFisica = cliente.direccionFisica ?? parseDireccionTexto(cliente.direccion);
        const domicilioFiscal = cliente.domicilioFiscal ?? (cliente.domicilioFiscalIgualFisica ?? true ? direccionFisica : undefined);

        this.form.patchValue({
          nombre: cliente.nombre ?? '',
          rfc: cliente.rfc ?? '',
          telefono: cliente.telefono ?? '',
          email: cliente.email ?? '',
          descuento: cliente.descuento ?? 0,
          personaCargo: cliente.personaCargo ?? '',
          telefonoContacto: cliente.telefonoContacto ?? '',
          activo: cliente.activo ?? true,
          domicilioFiscalIgualFisica: cliente.domicilioFiscalIgualFisica ?? !cliente.domicilioFiscal,
          direccionFisica,
          domicilioFiscal
        }, { emitEvent: false });

        this.syncFiscalAddress(this.form.get('domicilioFiscalIgualFisica')?.value === true);
      });
  }

  get f() { return this.form.controls; }

  get direccionFisicaGroup(): FormGroup {
    return this.form.get('direccionFisica') as FormGroup;
  }

  get domicilioFiscalGroup(): FormGroup {
    return this.form.get('domicilioFiscal') as FormGroup;
  }

  get resumenInicial(): string {
    const nombre = String(this.form?.get('nombre')?.value ?? '').trim();
    return nombre ? nombre.charAt(0).toUpperCase() : 'C';
  }

  get resumenNombre(): string {
    const nombre = String(this.form?.get('nombre')?.value ?? '').trim();
    return nombre || 'Sin nombre';
  }

  get resumenRfc(): string {
    const rfc = String(this.form?.get('rfc')?.value ?? '').trim().toUpperCase();
    return rfc || 'RFC pendiente';
  }

  get resumenTelefono(): string {
    return String(this.form?.get('telefono')?.value ?? '').trim() || 'Sin información';
  }

  get resumenEmail(): string {
    return String(this.form?.get('email')?.value ?? '').trim() || 'Sin información';
  }

  get resumenContacto(): string {
    return String(this.form?.get('personaCargo')?.value ?? '').trim() || 'Sin información';
  }

  get resumenTelefonoContacto(): string {
    return String(this.form?.get('telefonoContacto')?.value ?? '').trim() || 'Sin información';
  }

  get resumenDireccionFisica(): string {
    return formatDireccion(this.direccionFisicaGroup.getRawValue()) || 'Sin información';
  }

  get resumenDomicilioFiscal(): string {
    const igualFisica = !!this.form?.get('domicilioFiscalIgualFisica')?.value;
    if (igualFisica) {
      return this.resumenDireccionFisica;
    }

    return formatDireccion(this.domicilioFiscalGroup.getRawValue()) || 'Sin información';
  }

  get resumenDomicilioFiscalEstado(): string {
    return this.form?.get('domicilioFiscalIgualFisica')?.value ? 'Igual a física' : 'Independiente';
  }

  get resumenDescuento(): string {
    const descuento = Number(this.form?.get('descuento')?.value ?? 0);
    return `${descuento}%`;
  }

  get resumenEstado(): string {
    return this.form?.get('activo')?.value ? 'Activo' : 'Inactivo';
  }

  private syncFiscalAddress(igual: boolean): void {
    if (igual) {
      const direccion = this.direccionFisicaGroup.getRawValue();
      this.domicilioFiscalGroup.patchValue(direccion, { emitEvent: false });
      this.domicilioFiscalGroup.disable({ emitEvent: false });
      return;
    }

    this.domicilioFiscalGroup.enable({ emitEvent: false });
  }

  async guardar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    const data = this.form.getRawValue() as Partial<Cliente>;
    try {
      if (this.editMode && this.clienteId) {
        await this.clientesSrv.update(this.clienteId, data);
        this.messageSrv.add({ severity: 'success', summary: 'Listo', detail: 'Cliente actualizado' });
      } else {
        await this.clientesSrv.create(data);
        this.messageSrv.add({ severity: 'success', summary: 'Listo', detail: 'Cliente creado' });
      }
      this.router.navigate(['/admin/clientes']);
    } catch {
      this.messageSrv.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar' });
    } finally {
      this.loading = false;
    }
  }

  cancelar(): void {
    this.router.navigate(['/admin/clientes']);
  }
}
