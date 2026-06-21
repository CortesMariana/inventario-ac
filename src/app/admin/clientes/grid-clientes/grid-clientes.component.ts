import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Cliente, ClientesService } from '../clientes.service';

@Component({
    selector: 'app-grid-clientes',
    templateUrl: './grid-clientes.component.html',
    styleUrls: ['./grid-clientes.component.css'],
    standalone: false
})
export class GridClientesComponent implements OnInit, OnDestroy {

  clientes: Cliente[] = [];
  loading = true;
  searchValue = '';
  private destroy$ = new Subject<void>();

  constructor(
    private clientesSrv: ClientesService,
    private router: Router,
    private confirmSrv: ConfirmationService,
    private messageSrv: MessageService
  ) {}

  ngOnInit(): void {
    this.clientesSrv.getAll$()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.clientes = data;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.messageSrv.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los clientes' });
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  nuevo(): void {
    this.router.navigate(['/admin/clientes/nuevo']);
  }

  verDetalle(id: string): void {
    this.router.navigate(['/admin/clientes', id]);
  }

  editar(id: string): void {
    this.router.navigate(['/admin/clientes', id, 'editar']);
  }

  confirmarEliminar(cliente: Cliente): void {
    this.confirmSrv.confirm({
      message: `¿Deseas eliminar a ${cliente.nombre}?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.eliminar(cliente.id!)
    });
  }

  private eliminar(id: string): void {
    this.clientesSrv.delete(id).then(() => {
      this.messageSrv.add({ severity: 'success', summary: 'Listo', detail: 'Cliente eliminado' });
    }).catch(() => {
      this.messageSrv.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar' });
    });
  }
}