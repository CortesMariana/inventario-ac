import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Cliente, ClientesService, formatDireccion } from '../clientes.service';

@Component({
    selector: 'app-detalle-clientes',
    templateUrl: './detalle-clientes.component.html',
    styleUrls: ['./detalle-clientes.component.css'],
    standalone: false
})
export class DetalleClientesComponent implements OnInit, OnDestroy {

  cliente: Cliente | null = null;
  loading = true;
  readonly formatDireccion = formatDireccion;
  private destroy$ = new Subject<void>();

  constructor(
    private clientesSrv: ClientesService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.clientesSrv.getById$(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.cliente = data;
          this.loading = false;
        },
        error: () => this.loading = false
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  editar(): void {
    this.router.navigate(['/admin/clientes', this.cliente?.id, 'editar']);
  }

  volver(): void {
    this.router.navigate(['/admin/clientes']);
  }
}
