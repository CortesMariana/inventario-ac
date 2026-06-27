import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { MessageService } from 'primeng/api';
import { BarcodeLabelsService } from '../../inventario/barcode-labels.service';
import { InventarioItem, InventarioService } from '../../inventario/inventario.service';
import { ProduccionAlerta, ProduccionDashboardKpis, ProduccionService } from '../produccion.service';

@Component({
    selector: 'app-dashboard-produccion',
    templateUrl: './dashboard-produccion.component.html',
    styleUrls: ['./dashboard-produccion.component.css'],
    standalone: false
})
export class DashboardProduccionComponent implements OnInit, OnDestroy {

  kpis: ProduccionDashboardKpis = {
    totalProductos: 0,
    alertasActivas: 0,
    alertasCriticas: 0,
    alertasBajas: 0,
    stockCero: 0,
    sucursalesAfectadas: 0,
    unidadesPorReponer: 0,
    alertasPrioritarias: [],
    alertas: []
  };

  loading = true;
  dialogVisible = false;
  guardandoProduccion = false;
  alertaSeleccionada: ProduccionAlerta | null = null;
  produccionForm!: FormGroup;
  private bodyScrollLocked = false;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private produccionSrv: ProduccionService,
    private inventarioSrv: InventarioService,
    private barcodeLabelsSrv: BarcodeLabelsService,
    private messageSrv: MessageService
  ) {}

  ngOnInit(): void {
    this.buildForm();

    this.produccionSrv.getDashboard$()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.kpis = data;
          this.loading = false;
        },
        error: (err) => {
          console.error('Error cargando produccion:', err);
          this.loading = false;
        }
      });
  }

  ngOnDestroy(): void {
    this.unlockBodyScroll();
    this.destroy$.next();
    this.destroy$.complete();
  }

  get tieneAlertas(): boolean {
    return this.kpis.alertasActivas > 0;
  }

  get fProduccion() {
    return this.produccionForm.controls;
  }

  get cantidadProduccion(): number {
    const cantidad = Number(this.produccionForm?.value?.cantidad ?? 0);
    return Math.max(0, Math.floor(Number.isFinite(cantidad) ? cantidad : 0));
  }

  get stockDespuesProduccion(): number {
    return (this.alertaSeleccionada?.stock ?? 0) + this.cantidadProduccion;
  }

  get faltanteDespuesProduccion(): number {
    const stockMinimo = Number(this.alertaSeleccionada?.stockMinimo ?? 0);
    return Math.max(0, stockMinimo - this.stockDespuesProduccion);
  }

  get notificationClass(): string {
    if (this.kpis.alertasCriticas > 0) {
      return 'production-notification notification-critical';
    }

    if (this.kpis.alertasActivas > 0) {
      return 'production-notification notification-warning';
    }

    return 'production-notification notification-safe';
  }

  get notificationTitle(): string {
    if (this.kpis.alertasCriticas > 0) {
      return 'Atencion inmediata requerida';
    }

    if (this.kpis.alertasActivas > 0) {
      return 'Alertas activas en produccion';
    }

    return 'Produccion estable';
  }

  get notificationText(): string {
    if (this.kpis.alertasCriticas > 0) {
      return 'Toca una alerta para capturar la produccion y subir el stock.';
    }

    if (this.kpis.alertasActivas > 0) {
      return 'Toca una alerta para registrar la produccion y resolver el stock bajo.';
    }

    return 'No hay alertas activas de stock bajo.';
  }

  get notificationLabel(): string {
    if (this.kpis.alertasCriticas > 0) {
      return 'Urgente';
    }

    if (this.kpis.alertasActivas > 0) {
      return 'Pendiente';
    }

    return 'OK';
  }

  get kpiCardClass(): string {
    return this.kpis.alertasCriticas > 0 ? 'kpi-card kpi-card-critical' : 'kpi-card';
  }

  trackByAlerta(_: number, alerta: ProduccionAlerta): string {
    return alerta.id ?? `${alerta.productoId}-${alerta.sucursalId}-${alerta.nombreProducto}`;
  }

  getTagSeverity(alerta: ProduccionAlerta): 'danger' | 'warning' {
    return alerta.nivel === 'critical' ? 'danger' : 'warning';
  }

  getTagLabel(alerta: ProduccionAlerta): string {
    return alerta.nivel === 'critical' ? 'Critica' : 'Baja';
  }

  getAlertClass(alerta: ProduccionAlerta): string {
    return alerta.nivel === 'critical' ? 'alert-item alert-critical' : 'alert-item alert-warning';
  }

  getMarkerClass(alerta: ProduccionAlerta): string {
    return alerta.nivel === 'critical' ? 'alert-dot dot-red' : 'alert-dot dot-amber';
  }

  getProgressWidth(alerta: ProduccionAlerta): number {
    return alerta.cobertura;
  }

  formatUnits(value: number): string {
    return `${value} unidades`;
  }

  formatRatio(alerta: ProduccionAlerta): string {
    return `${alerta.stock}/${alerta.stockMinimo}`;
  }

  abrirProduccionRapida(): void {
    const alerta = this.kpis.alertasPrioritarias[0] ?? this.kpis.alertas[0];

    if (!alerta) {
      this.messageSrv.add({
        severity: 'warn',
        summary: 'Sin alertas',
        detail: 'No hay una alerta activa para registrar producción'
      });
      return;
    }

    this.abrirProduccion(alerta);
  }

  abrirProduccion(alerta: ProduccionAlerta): void {
    this.alertaSeleccionada = alerta;
    this.dialogVisible = true;
    this.lockBodyScroll();
    this.produccionForm.reset({
      cantidad: Math.max(1, Number(alerta.faltante || 1)),
      fechaElaboracion: this.todayInputValue(),
      fechaCaducidad: '',
      numeroLote: '',
      observaciones: '',
      imprimirEtiquetas: true
    });
  }

  cerrarProduccion(): void {
    if (this.guardandoProduccion) {
      return;
    }

    this.dialogVisible = false;
    this.alertaSeleccionada = null;
    this.unlockBodyScroll();
  }

  async registrarProduccion(): Promise<void> {
    if (!this.alertaSeleccionada) {
      return;
    }

    if (this.produccionForm.invalid) {
      this.produccionForm.markAllAsTouched();
      this.messageSrv.add({
        severity: 'warn',
        summary: 'Atencion',
        detail: 'Completa la cantidad y la fecha de elaboracion'
      });
      return;
    }

    const cantidad = Math.max(1, Math.floor(Number(this.produccionForm.value.cantidad ?? 0)));
    if (!Number.isFinite(cantidad) || cantidad < 1) {
      this.messageSrv.add({
        severity: 'warn',
        summary: 'Atencion',
        detail: 'La cantidad producida debe ser mayor a cero'
      });
      return;
    }

    const alerta = this.alertaSeleccionada;
    const fechaElaboracion = this.normalizeDateValue(this.produccionForm.value.fechaElaboracion) || this.todayInputValue();
    const fechaCaducidad = this.normalizeDateValue(this.produccionForm.value.fechaCaducidad);
    const numeroLote = this.normalizeText(this.produccionForm.value.numeroLote);
    const observaciones = this.normalizeText(this.produccionForm.value.observaciones);
    const imprimirEtiquetas = Boolean(this.produccionForm.value.imprimirEtiquetas);
    const printWindow = imprimirEtiquetas ? this.barcodeLabelsSrv.openPrintWindow() : null;

    this.guardandoProduccion = true;
    try {
      const inventarioActualizado = await this.inventarioSrv.registrarProduccion(alerta.id!, {
        cantidad,
        fechaElaboracion,
        fechaCaducidad,
        numeroLote,
        observaciones
      });

      if (imprimirEtiquetas) {
        if (!printWindow) {
          this.messageSrv.add({
            severity: 'warn',
            summary: 'Impresion bloqueada',
            detail: 'Permite ventanas emergentes para imprimir etiquetas'
          });
        } else {
          const printed = this.barcodeLabelsSrv.printLabels({
            ...inventarioActualizado,
            nombreProducto: inventarioActualizado.nombreProducto || alerta.nombreProducto,
            codigoProducto: inventarioActualizado.codigoProducto || alerta.codigoProducto,
            codigoBarras: inventarioActualizado.codigoBarras || alerta.codigoProducto,
            sucursal: inventarioActualizado.sucursal || alerta.sucursal,
            sucursalId: inventarioActualizado.sucursalId || alerta.sucursalId,
            stock: inventarioActualizado.stock ?? this.stockDespuesProduccion,
            stockMinimo: inventarioActualizado.stockMinimo ?? alerta.stockMinimo,
            fechaElaboracion,
            fechaCaducidad: fechaCaducidad || inventarioActualizado.fechaCaducidad,
            numeroLote: numeroLote || inventarioActualizado.numeroLote
          }, cantidad, printWindow);

          if (!printed) {
            this.messageSrv.add({
              severity: 'warn',
              summary: 'Impresion bloqueada',
              detail: 'No se pudieron generar las etiquetas'
            });
          }
        }
      }

      this.messageSrv.add({
        severity: 'success',
        summary: 'Produccion registrada',
        detail: `Se agregaron ${cantidad} ${cantidad === 1 ? 'unidad' : 'unidades'} de ${alerta.nombreProducto}`
      });

      this.guardandoProduccion = false;
      this.cerrarProduccion();
    } catch (err: any) {
      printWindow?.close();
      this.messageSrv.add({
        severity: 'error',
        summary: 'Error',
        detail: err?.message ?? 'No se pudo registrar la produccion'
      });
    } finally {
      this.guardandoProduccion = false;
    }
  }

  private buildForm(): void {
    this.produccionForm = this.fb.group({
      cantidad: [1, [Validators.required, Validators.min(1)]],
      fechaElaboracion: [this.todayInputValue(), Validators.required],
      fechaCaducidad: [''],
      numeroLote: [''],
      observaciones: [''],
      imprimirEtiquetas: [true]
    });
  }

  private todayInputValue(): string {
    const date = new Date();
    const local = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
    return local.toISOString().slice(0, 10);
  }

  private normalizeText(value: unknown): string {
    return String(value ?? '').trim();
  }

  private normalizeDateValue(value: unknown): string {
    return String(value ?? '').trim();
  }

  private lockBodyScroll(): void {
    if (this.bodyScrollLocked || typeof document === 'undefined') {
      return;
    }

    document.body.style.overflow = 'hidden';
    this.bodyScrollLocked = true;
  }

  private unlockBodyScroll(): void {
    if (!this.bodyScrollLocked || typeof document === 'undefined') {
      return;
    }

    document.body.style.overflow = '';
    this.bodyScrollLocked = false;
  }
}
