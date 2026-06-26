import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MessageService } from 'primeng/api';
import { RolUsuario, Usuario, UsuariosService } from '../usuarios.service';

@Component({
    selector: 'app-nuevo-editar-usuarios',
    templateUrl: './nuevo-editar-usuarios.component.html',
    styleUrls: ['./nuevo-editar-usuarios.component.css'],
    standalone: false
})
export class NuevoEditarUsuariosComponent implements OnInit, OnDestroy {

  form!: FormGroup;
  editMode = false;
  usuarioId: string | null = null;
  loading = false;
  loadingReset = false;
  rolSeleccionado = '';
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

  private rolDescripciones: Record<string, string> = {
    admin:      'Acceso total al sistema. Puede gestionar usuarios, configurar roles y ver todos los reportes.',
    gerente:    'Acceso a inventario, pedidos y entregas de su sucursal asignada.',
    cajero:     'Puede crear pedidos y consultar clientes e inventario.',
    repartidor: 'Solo puede ver y actualizar el estado de las entregas asignadas.'
  };

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
      password:   ['', [Validators.required, Validators.minLength(6)]],
      rol:        ['', Validators.required],
      sucursalId: [''],
      sucursal:   [''],
      activo:     [true]
    });
  }

  private loadUsuario(id: string): void {
    this.form.get('password')?.clearValidators();
    this.form.get('password')?.updateValueAndValidity();

    this.usuariosSrv.getById$(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(usuario => {
        this.form.patchValue(usuario);
        this.rolSeleccionado = usuario.rol;
      });
  }

  get f() { return this.form.controls; }

  onRolChange(event: any): void {
    this.rolSeleccionado = event.value;
  }

  onSucursalChange(event: any): void {
    const found = this.sucursales.find(s => s.value === event.value);
    if (found) this.form.patchValue({ sucursal: found.label });
  }

  getIniciales(nombre: string): string {
    if (!nombre) return '';
    return nombre.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
  }

  getAvatarClass(rol: string): string {
    const map: Record<string, string> = {
      admin:      'av-blue',
      gerente:    'av-purple',
      cajero:     'av-green',
      repartidor: 'av-teal'
    };
    return map[rol] ?? 'av-blue';
  }

  getRolBadgeClass(rol: string): string {
    const map: Record<string, string> = {
      admin:      'badge-admin',
      gerente:    'badge-gerente',
      cajero:     'badge-cajero',
      repartidor: 'badge-repartidor'
    };
    return map[rol] ?? '';
  }

  getRolLabel(rol: string): string {
    return this.roles.find(r => r.value === rol)?.label ?? rol;
  }

  getRolDescripcion(rol: string): string {
    return this.rolDescripciones[rol] ?? '';
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
        this.messageSrv.add({ severity: 'success', summary: 'Listo', detail: 'Usuario creado correctamente' });
      }
      this.router.navigate(['/admin/usuarios']);
    } catch (err: any) {
      const mensajes: Record<string, string> = {
        'auth/email-already-in-use': 'Este correo ya está registrado',
        'auth/invalid-email':        'Correo inválido',
        'auth/weak-password':        'La contraseña es muy débil'
      };
      const msg = mensajes[err.code] ?? err.message ?? 'No se pudo guardar';
      this.messageSrv.add({ severity: 'error', summary: 'Error', detail: msg });
    } finally {
      this.loading = false;
    }
  }

  async enviarResetPassword(): Promise<void> {
    this.loadingReset = true;
    try {
      await this.usuariosSrv.resetearPassword(this.form.value.email);
      this.messageSrv.add({ severity: 'success', summary: 'Enviado', detail: 'Enlace de recuperación enviado al correo del usuario' });
    } catch {
      this.messageSrv.add({ severity: 'error', summary: 'Error', detail: 'No se pudo enviar el enlace de recuperación' });
    } finally {
      this.loadingReset = false;
    }
  }

  cancelar(): void {
    this.router.navigate(['/admin/usuarios']);
  }
}