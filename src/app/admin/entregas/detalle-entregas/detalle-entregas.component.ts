import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MessageService } from 'primeng/api';
import { Entrega, EntregasService } from '../entregas.service';

@Component({
    selector: 'app-detalle-entregas',
    templateUrl: './detalle-entregas.component.html',
    styleUrls: ['./detalle-entregas.component.css'],
    standalone: false
})
export class DetalleEntregasComponent implements OnInit, OnDestroy {

  entrega: Entrega | null = null;
  loading = true;
  private destroy$ = new Subject<void>();

  timeline: any[] = [];

  constructor(
    private entregasSrv: EntregasService,
    private route: ActivatedRoute,
    private router: Router,
    private messageSrv: MessageService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.entregasSrv.getById$(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.entrega = data;
          this.buildTimeline(data);
          this.loading = false;
        },
        error: () => this.loading = false
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private buildTimeline(entrega: Entrega): void {
    this.timeline = [
      {
        status: 'Pedido asignado',
        date: entrega.fechaAsignacion?.toDate?.() ?? null,
        icon: 'pi pi-check',
        color: '#16A34A',
        completado: true
      },
      {
        status: 'En tránsito',
        date: null,
        icon: 'pi pi-truck',
        color: entrega.estado === 'en_transito' || entrega.estado === 'entregado' ? '#3B82F6' : '#d1d5db',
        completado: entrega.estado === 'en_transito' || entrega.estado === 'entregado'
      },
      {
        status: 'Entregado',
        date: entrega.fechaEntrega?.toDate?.() ?? null,
        icon: 'pi pi-home',
        color: entrega.estado === 'entregado' ? '#16A34A' : '#d1d5db',
        completado: entrega.estado === 'entregado'
      }
    ];
  }

  getEstadoSeverity(estado: string): string {
    const map: Record<string, string> = {
      asignado:    'warning',
      en_transito: 'info',
      entregado:   'success'
    };
    return map[estado] ?? 'info';
  }

  getEstadoLabel(estado: string): string {
    const map: Record<string, string> = {
      asignado:    'Asignado',
      en_transito: 'En tránsito',
      entregado:   'Entregado'
    };
    return map[estado] ?? estado;
  }

  volver(): void {
    this.router.navigate(['/admin/entregas']);
  }
}