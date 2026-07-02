import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subject, takeUntil } from 'rxjs';
import { formatDate } from 'src/app/shared/date-utils';
import {
  getMermaTipoLabel,
  getMermaTipoSeverity,
  MermaRegistro,
  MermaTipo,
  MermasService
} from '../mermas.service';

type TipoFiltroMerma = 'todos' | MermaTipo;

interface TipoMermaMenu {
  value: TipoFiltroMerma;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-grid-mermas',
  templateUrl: './grid-mermas.component.html',
  styleUrls: ['./grid-mermas.component.css'],
  standalone: false
})
export class GridMermasComponent implements OnInit, OnDestroy {
  mermas: MermaRegistro[] = [];
  loading = true;
  searchTerm = '';
  tipoFiltro: TipoFiltroMerma = 'todos';
  mermaSeleccionadaId: string | null = null;

  readonly tipos: TipoMermaMenu[] = [
    { value: 'todos', label: 'Todos', icon: 'pi pi-filter' },
    { value: 'devuelto', label: 'Devueltos', icon: 'pi pi-undo' },
    { value: 'caducado', label: 'Caducados', icon: 'pi pi-calendar-times' },
    { value: 'roto', label: 'Rotos', icon: 'pi pi-ban' }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private mermasSrv: MermasService,
    private router: Router,
    private messageSrv: MessageService
  ) {}

  ngOnInit(): void {
    this.mermasSrv.getMermas$()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.mermas = data;
          this.loading = false;
          if (!this.mermaSeleccionadaId && data.length > 0) {
            this.mermaSeleccionadaId = data[0].id ?? null;
          }
        },
        error: () => {
          this.loading = false;
          this.messageSrv.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las mermas' });
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get totalRegistros(): number {
    return this.mermas.length;
  }

  get totalUnidades(): number {
    return this.mermas.reduce((acc, merma) => acc + Number(merma.cantidad ?? 0), 0);
  }

  get totalCaducados(): number {
    return this.mermas.filter(merma => merma.tipo === 'caducado').length;
  }

  get totalRotos(): number {
    return this.mermas.filter(merma => merma.tipo === 'roto').length;
  }

  get mermasVisibles(): MermaRegistro[] {
    const term = this.searchTerm.trim().toLowerCase();

    return this.mermas
      .filter(merma => this.matchesTipo(merma) && this.matchesTexto(merma, term))
      .sort((a, b) => this.getSortValue(b) - this.getSortValue(a));
  }

  get mermaSeleccionada(): MermaRegistro | null {
    return this.mermasVisibles.find(merma => merma.id === this.mermaSeleccionadaId)
      ?? this.mermasVisibles[0]
      ?? null;
  }

  get totalVisibles(): number {
    return this.mermasVisibles.length;
  }

  onSearch(event: Event): void {
    this.searchTerm = (event.target as HTMLInputElement).value ?? '';
  }

  activarFiltro(tipo: TipoFiltroMerma): void {
    this.tipoFiltro = tipo;
  }

  seleccionarMerma(merma: MermaRegistro): void {
    this.mermaSeleccionadaId = merma.id ?? null;
  }

  abrirInventario(): void {
    this.router.navigate(['/admin/inventario']);
  }

  getIniciales(valor?: string): string {
    const tokens = String(valor ?? '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (tokens.length === 0) {
      return 'M';
    }

    return tokens.slice(0, 2).map(token => token.charAt(0).toUpperCase()).join('');
  }

  getTipoLabel(tipo: MermaTipo): string {
    return getMermaTipoLabel(tipo);
  }

  getTipoSeverity(tipo: MermaTipo): string {
    return getMermaTipoSeverity(tipo);
  }

  getTipoCount(tipo: TipoFiltroMerma): number {
    if (tipo === 'todos') {
      return this.totalRegistros;
    }

    return this.mermas.filter(merma => merma.tipo === tipo).length;
  }

  formatFecha(valor?: unknown): string {
    return formatDate(valor, { includeTime: true });
  }

  private matchesTipo(merma: MermaRegistro): boolean {
    return this.tipoFiltro === 'todos' || merma.tipo === this.tipoFiltro;
  }

  private matchesTexto(merma: MermaRegistro, term: string): boolean {
    if (!term) {
      return true;
    }

    const campos = [
      merma.codigoProducto,
      merma.nombreProducto,
      merma.descripcion ?? '',
      merma.sucursal,
      merma.sucursalId,
      merma.motivo,
      merma.responsable ?? '',
      merma.numeroLote ?? '',
      getMermaTipoLabel(merma.tipo)
    ];

    return campos.some(campo => String(campo).toLowerCase().includes(term));
  }

  private getSortValue(merma: MermaRegistro): number {
    const fecha = merma.fechaRegistro;
    return fecha instanceof Date ? fecha.getTime() : 0;
  }
}
