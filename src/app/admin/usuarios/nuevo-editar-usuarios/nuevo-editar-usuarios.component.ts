import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MessageService } from 'primeng/api';
import { RolUsuario, Usuario, UsuariosService } from '../usuarios.service';

@Component({
  selector: 'app-nuevo-editar-usuarios',
  templateUrl: './nuevo-editar-usuarios.component.html',
  styleUrls: ['./nuevo-editar-usuarios.component.css']
})
export class NuevoEditarUsuariosComponent implements OnInit, OnDestroy {

  form!: FormGroup;
  editMode = false;
  usuarioId: string | null = null;
  loading = false;
  private destroy$ = new Subject<void>();

  roles: { label: string; value: RolUsuario }[] = [
    { label: 'Administrador', value: 'admin' },
    { label: 'Gerente',       value: 'gerente' },
    { label: 'Cajero',        value: 'cajero' },
    { label: 'Repartidor',    value: 'repartidor' }
  ];

  sucursales = [
    { label: 'León',      value: 'leon' },
    { label: 'Silao',     value: 'silao' },
    { label: 'Irapuato',  value: 'irapuato' },
    { label: 'Salamanca', value: 'salamanca' }
  ];

  constructor(
    private fb: FormBuilder,
    private usuariosSrv: UsuariosService,
    private route: ActivatedRoute,
    private router: Router,
    private messageSrv: MessageService
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.usuarioId = this.route.snapshot.paramMap.get('id');
    if (this.usuarioId) {
      this.editMode = true;
      this.loadUsuario(this.usuarioId);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private buildForm(): void {
    this.form = this.fb.group({
      nombre:     ['', [Validators.required, Validators.minLength(3)]],
      email:      ['', [Validators.required, Validators.email]],
      password:   ['', this.editMode ? [] : [Validators.required, Validators.minLength(6)]],
      rol:        ['', Validators.required],
      sucursalId: [''],
      sucursal:   [''],
      activo:     [true]
    });
  }

  private loadUsuario(id: string): void {
    this.usuariosSrv.getById$(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(usuario => {
        this.form.patchValue(usuario);
        this.form.get('password')?.clearValidators();
        this.form.get('password')?.updateValueAndValidity();
      });
  }

  get f() { return this.form.controls; }

  onSucursalChange(event: any): void {
    const found = this.sucursales.find(s => s.value === event.value);
    if (found) this.form.patchValue({ sucursal: found.label });
  }

  async guardar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    const { password, ...data } = this.form.value;

    try {
      if (this.editMode && this.usuarioId) {
        await this.usuariosSrv.update(this.usuarioId, data as Partial<Usuario>);
        this.messageSrv.add({ severity: 'success', summary: 'Listo', detail: 'Usuario actualizado' });
      } else {
        await this.usuariosSrv.create(data as Usuario, password);
        this.messageSrv.add({ severity: 'success', summary: 'Listo', detail: 'Usuario creado' });
      }
      this.router.navigate(['/admin/usuarios']);
    } catch (err: any) {
      this.messageSrv.add({ severity: 'error', summary: 'Error', detail: err.message ?? 'No se pudo guardar' });
    } finally {
      this.loading = false;
    }
  }

  cancelar(): void {
    this.router.navigate(['/admin/usuarios']);
  }
}