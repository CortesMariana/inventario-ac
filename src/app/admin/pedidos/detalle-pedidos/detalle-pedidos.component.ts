import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MessageService } from 'primeng/api';
import {
  getPedidoEstadoLabel,
  getPedidoEstadoSeverity,
  Pedido,
  PedidosService
} from '../pedidos.service';

@Component({
    selector: 'app-detalle-pedidos',
    templateUrl: './detalle-pedidos.component.html',
    styleUrls: ['./detalle-pedidos.component.css'],
    standalone: false
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
    return getPedidoEstadoSeverity(estado);
  }

  getEstadoLabel(estado: string): string {
    return getPedidoEstadoLabel(estado);
  }

  volver(): void {
    this.router.navigate(['/admin/pedidos']);
  }
}
