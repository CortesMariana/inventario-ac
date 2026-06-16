import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MessageService } from 'primeng/api';
import { Pedido, PedidosService } from '../pedidos.service';

@Component({
  selector: 'app-detalle-pedidos',
  templateUrl: './detalle-pedidos.component.html',
  styleUrls: ['./detalle-pedidos.component.css']
})
export class DetallePedidosComponent implements OnInit, OnDestroy {

  pedido: Pedido | null = null;
  loading = true;
  private destroy$ = new Subject<void>();

  constructor(
    private pedidosSrv: PedidosService,
    private route: ActivatedRoute,
    private router: Router,
    private messageSrv: MessageService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.pedidosSrv.getById$(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.pedido = data;
          this.loading = false;
        },
        error: () => this.loading = false
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getEstadoSeverity(estado: string): string {
    const map: Record<string, string> = {
      pendiente:   'warning',
      en_transito: 'info',
      entregado:   'success',
      cancelado:   'danger',
      sin_stock:   'danger'
    };
    return map[estado] ?? 'info';
  }

  getEstadoLabel(estado: string): string {
    const map: Record<string, string> = {
      pendiente:   'Pendiente',
      en_transito: 'En tránsito',
      entregado:   'Entregado',
      cancelado:   'Cancelado',
      sin_stock:   'Sin stock'
    };
    return map[estado] ?? estado;
  }

  volver(): void {
    this.router.navigate(['/admin/pedidos']);
  }
}