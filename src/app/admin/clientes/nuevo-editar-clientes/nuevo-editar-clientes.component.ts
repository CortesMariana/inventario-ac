import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MessageService } from 'primeng/api';
import { Cliente, ClientesService } from '../clientes.service';

@Component({
  selector: 'app-nuevo-editar-clientes',
  templateUrl: './nuevo-editar-clientes.component.html',
  styleUrls: ['./nuevo-editar-clientes.component.css']
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
    this.clienteId = this.route.snapshot.paramMap.get('id');
    if (this.clienteId) {
      this.editMode = true;
      this.loadCliente(this.clienteId);
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
      direccion: ['', Validators.required],
      telefono:  ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      descuento: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      activo:    [true]
    });
  }

  private loadCliente(id: string): void {
    this.clientesSrv.getById$(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(cliente => this.form.patchValue(cliente));
  }

  get f() { return this.form.controls; }

  async guardar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    const data = this.form.value as Cliente;
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