import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MessageService } from 'primeng/api';
import { Usuario, UsuariosService } from '../usuarios.service';

@Component({
    selector: 'app-grid-usuarios',
    templateUrl: './grid-usuarios.component.html',
    styleUrls: ['./grid-usuarios.component.css'],
    standalone: false
})
export class GridUsuariosComponent implements OnInit, OnDestroy {

  usuarios: Usuario[] = [];
  usuariosFiltrados: Usuario[] = [];
  loading = true;
  searchTerm = '';
  tabActivo = 'todos';

  confirmVisible = false;
  confirmMessage = '';
  confirmAction: (() => void) | null = null;

  resetVisible = false;
  resetMessage = '';
  private resetUsuarioEmail = '';

  private destroy$ = new Subject<void>();

  roles: Record<string, string> = {
    admin:      'Administrador',
    gerente:    'Gerente',
    cajero:     'Cajero',
    repartidor: 'Repartidor'
  };

  constructor(
    private usuariosSrv: UsuariosService,
    private router: Router,
    private messageSrv: MessageService
  ) {}

  ngOnInit(): void {
    this.usuariosSrv.getAll$()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.usuarios = data;
          this.filtrar();
          this.loading = false;
        },
        error: (err) => {
          console.error('Error cargando usuarios:', err);
          this.loading = false;
          this.messageSrv.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los usuarios' });
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get totalActivos(): number {
    return this.usuarios.filter(u => u.activo).length;
  }

  get rolesUnicos(): number {
    return new Set(this.usuarios.map(u => u.rol)).size;
  }

  setTab(tab: string): void {
    this.tabActivo = tab;
    this.filtrar();
  }

  filtrar(): void {
    let lista = [...this.usuarios];
    if (this.tabActivo !== 'todos') {
      lista = lista.filter(u => u.rol === this.tabActivo);
    }
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      lista = lista.filter(u =>
        u.nombre.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        u.sucursal?.toLowerCase().includes(term)
      );
    }
    lista.sort((a, b) => a.nombre.localeCompare(b.nombre));
    this.usuariosFiltrados = lista;
  }

  getIniciales(nombre: string): string {
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
    return map[rol] ?? 'badge-cajero';
  }

  nuevo(): void {
    this.router.navigate(['/admin/usuarios/nuevo']);
  }

  editar(id: string): void {
    this.router.navigate(['/admin/usuarios', id, 'editar']);
  }

  toggleActivo(usuario: Usuario): void {
    this.usuariosSrv.toggleActivo(usuario.id!, !usuario.activo)
      .then(() => {
        this.messageSrv.add({
          severity: 'success',
          summary: 'Listo',
          detail: `Usuario ${!usuario.activo ? 'activado' : 'desactivado'}`
        });
      })
      .catch(() => {
        this.messageSrv.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar' });
      });
  }

  confirmarEliminar(usuario: Usuario): void {
    this.confirmMessage = `¿Deseas eliminar a ${usuario.nombre}? Esta acción no se puede deshacer.`;
    this.confirmAction = () => this.eliminar(usuario.id!);
    this.confirmVisible = true;
  }

  private eliminar(id: string): void {
    this.usuariosSrv.delete(id).then(() => {
      this.messageSrv.add({ severity: 'success', summary: 'Listo', detail: 'Usuario eliminado' });
    }).catch(() => {
      this.messageSrv.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar' });
    });
  }

  onConfirm(): void {
    if (this.confirmAction) this.confirmAction();
    this.confirmVisible = false;
  }

  onCancel(): void {
    this.confirmVisible = false;
    this.confirmAction = null;
  }

  confirmarResetPassword(usuario: Usuario): void {
    this.resetUsuarioEmail = usuario.email;
    this.resetMessage = `Se enviará un enlace de recuperación al correo ${usuario.email} para que ${usuario.nombre} pueda establecer una nueva contraseña.`;
    this.resetVisible = true;
  }

  async onConfirmReset(): Promise<void> {
    this.resetVisible = false;
    try {
      await this.usuariosSrv.resetearPassword(this.resetUsuarioEmail);
      this.messageSrv.add({ severity: 'success', summary: 'Enviado', detail: 'Enlace de recuperación enviado al correo del usuario' });
    } catch {
      this.messageSrv.add({ severity: 'error', summary: 'Error', detail: 'No se pudo enviar el enlace de recuperación' });
    }
  }

  onCancelReset(): void {
    this.resetVisible = false;
    this.resetUsuarioEmail = '';
  }
}