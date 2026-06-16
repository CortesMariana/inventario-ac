import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Usuario, UsuariosService } from '../usuarios.service';

@Component({
  selector: 'app-grid-usuarios',
  templateUrl: './grid-usuarios.component.html',
  styleUrls: ['./grid-usuarios.component.css']
})
export class GridUsuariosComponent implements OnInit, OnDestroy {

  usuarios: Usuario[] = [];
  loading = true;
  private destroy$ = new Subject<void>();

  roles: Record<string, string> = {
    admin:       'Administrador',
    gerente:     'Gerente',
    cajero:      'Cajero',
    repartidor:  'Repartidor'
  };

  constructor(
    private usuariosSrv: UsuariosService,
    private router: Router,
    private confirmSrv: ConfirmationService,
    private messageSrv: MessageService
  ) {}

  ngOnInit(): void {
    this.usuariosSrv.getAll$()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.usuarios = data;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.messageSrv.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los usuarios' });
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
    this.confirmSrv.confirm({
      message: `¿Deseas eliminar a ${usuario.nombre}?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.usuariosSrv.delete(usuario.id!).then(() => {
          this.messageSrv.add({ severity: 'success', summary: 'Listo', detail: 'Usuario eliminado' });
        }).catch(() => {
          this.messageSrv.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar' });
        });
      }
    });
  }

  getRolSeverity(rol: string): string {
    const map: Record<string, string> = {
      admin:      'danger',
      gerente:    'warning',
      cajero:     'info',
      repartidor: 'success'
    };
    return map[rol] ?? 'info';
  }
}