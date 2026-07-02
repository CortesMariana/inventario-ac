import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MessageService } from 'primeng/api';
import { formatDate } from 'src/app/shared/date-utils';
import {
  getPedidoEstadoLabel,
  getPedidoEstadoSeverity,
  Pedido,
  PedidosService,
  ProductoPedido
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
  private returnUrl = '/admin/pedidos';
  private destroy$ = new Subject<void>();

  constructor(
    private pedidosSrv: PedidosService,
    private route: ActivatedRoute,
    private router: Router,
    private messageSrv: MessageService
  ) {}

  ngOnInit(): void {
    const navigationState = this.router.getCurrentNavigation()?.extras.state as { returnUrl?: string } | undefined;
    this.returnUrl = navigationState?.returnUrl ?? (history.state?.returnUrl as string | undefined) ?? '/admin/pedidos';

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

  formatFecha(valor?: unknown): string {
    return formatDate(valor, { includeTime: true });
  }

  getProductoCodigo(item: ProductoPedido): string {
    return String(item.codigoProducto ?? item.productoId ?? item.inventarioItemId ?? '').trim();
  }

  getProductoNombre(item: ProductoPedido): string {
    const codigo = this.getProductoCodigo(item);
    const nombre = String(item.descripcion ?? item.nombreProducto ?? '').trim();
    return nombre && nombre !== codigo ? nombre : '';
  }

  volver(): void {
    this.router.navigateByUrl(this.returnUrl);
  }
}
