import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MessageService } from 'primeng/api';
import { Cliente, ClientesService, formatDireccion } from '../clientes.service';
import { Table } from 'primeng/table';

@Component({
    selector: 'app-grid-clientes',
    templateUrl: './grid-clientes.component.html',
    styleUrls: ['./grid-clientes.component.css'],
    standalone: false
})
export class GridClientesComponent implements OnInit, OnDestroy {

  @ViewChild('dt') dt!: Table;

  clientes: Cliente[] = [];
  loading = true;
  searchValue = '';
  totalClientes = 0;
  clientesActivos = 0;
  clientesConContacto = 0;
  clientesDomicilioIgual = 0;
  confirmVisible = false;
  confirmMessage = '';
  private confirmAction: (() => void) | null = null;
  readonly formatDireccion = formatDireccion;
  private destroy$ = new Subject<void>();

  constructor(
    private clientesSrv: ClientesService,
    private router: Router,
    private messageSrv: MessageService
  ) {}

  ngOnInit(): void {
    this.clientesSrv.getAll$()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.clientes = data;
          this.totalClientes = data.length;
          this.clientesActivos = data.filter(cliente => cliente.activo).length;
          this.clientesConContacto = data.filter(cliente => !!cliente.personaCargo || !!cliente.telefonoContacto).length;
          this.clientesDomicilioIgual = data.filter(cliente => !!cliente.domicilioFiscalIgualFisica).length;
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

  filtrarGlobal(event: Event): void {
    const valor = (event.target as HTMLInputElement).value;
    this.dt?.filterGlobal(valor, 'contains');
  }

  getIniciales(nombre?: string): string {
    const tokens = String(nombre ?? '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (tokens.length === 0) {
      return 'C';
    }

    return tokens
      .slice(0, 2)
      .map(token => token.charAt(0).toUpperCase())
      .join('');
  }

  get porcentajeActivos(): number {
    if (!this.totalClientes) {
      return 0;
    }

    return Math.round((this.clientesActivos / this.totalClientes) * 100);
  }

  direccionFisica(cliente: Cliente): string {
    return this.formatDireccion(cliente.direccionFisica) || cliente.direccion || 'Sin información';
  }

  domicilioFiscal(cliente: Cliente): string {
    return this.formatDireccion(cliente.domicilioFiscal)
      || (cliente.domicilioFiscalIgualFisica ? this.direccionFisica(cliente) : 'Sin información');
  }

  confirmarEliminar(cliente: Cliente): void {
    this.confirmMessage = `¿Deseas eliminar a ${cliente.nombre}? Esta acción no se puede deshacer.`;
    this.confirmAction = () => this.eliminar(cliente.id!);
    this.confirmVisible = true;
  }

  onConfirm(): void {
    if (this.confirmAction) {
      this.confirmAction();
    }
    this.confirmVisible = false;
  }

  onCancel(): void {
    this.confirmVisible = false;
    this.confirmAction = null;
  }

  private eliminar(id: string): void {
    this.clientesSrv.delete(id).then(() => {
      this.messageSrv.add({ severity: 'success', summary: 'Listo', detail: 'Cliente eliminado' });
    }).catch(() => {
      this.messageSrv.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar' });
    });
  }
}
