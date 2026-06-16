import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MessageService } from 'primeng/api';
import { Entrega, EntregasService } from '../entregas.service';

@Component({
  selector: 'app-grid-entregas',
  templateUrl: './grid-entregas.component.html',
  styleUrls: ['./grid-entregas.component.css']
})
export class GridEntregasComponent implements OnInit, OnDestroy {

  entregas: Entrega[] = [];
  loading = true;
  dialogVisible = false;
  entregaSeleccionada: Entrega | null = null;
  repartidorNombre = '';
  private destroy$ = new Subject<void>();

  constructor(
    private entregasSrv: EntregasService,
    private router: Router,
    private messageSrv: MessageService
  ) {}

  ngOnInit(): void {
    this.entregasSrv.getAll$()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.entregas = data;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.messageSrv.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las entregas' });
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  verDetalle(id: string): void {
    this.router.navigate(['/admin/entregas', id]);
  }

  abrirDialogTransito(entrega: Entrega): void {
    this.entregaSeleccionada = entrega;
    this.repartidorNombre = '';
    this.dialogVisible = true;
  }

  confirmarTransito(): void {
    if (!this.entregaSeleccionada || !this.repartidorNombre.trim()) {
      this.messageSrv.add({ severity: 'warn', summary: 'Atención', detail: 'Ingresa el nombre del repartidor' });
      return;
    }
    this.entregasSrv.marcarEnTransito(this.entregaSeleccionada.id!, this.repartidorNombre)
      .then(() => {
        this.messageSrv.add({ severity: 'success', summary: 'Listo', detail: 'Entrega en tránsito' });
        this.dialogVisible = false;
      })
      .catch(() => {
        this.messageSrv.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar' });
      });
  }

  marcarEntregado(entrega: Entrega): void {
    this.entregasSrv.marcarEntregado(entrega.id!)
      .then(() => {
        this.messageSrv.add({ severity: 'success', summary: 'Listo', detail: 'Entrega completada' });
      })
      .catch(() => {
        this.messageSrv.add({ severity: 'error', summary: 'Error', detail: 'No se pudo actualizar' });
      });
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
}