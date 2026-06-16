import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MessageService } from 'primeng/api';
import { InventarioItem, InventarioService } from '../inventario.service';

@Component({
  selector: 'app-nuevo-editar-inventario',
  templateUrl: './nuevo-editar-inventario.component.html',
  styleUrls: ['./nuevo-editar-inventario.component.css']
})
export class NuevoEditarInventarioComponent implements OnInit, OnDestroy {

  form!: FormGroup;
  editMode = false;
  itemId: string | null = null;
  loading = false;
  private destroy$ = new Subject<void>();

  sucursales = [
    { label: 'León',      value: 'leon' },
    { label: 'Silao',     value: 'silao' },
    { label: 'Irapuato',  value: 'irapuato' },
    { label: 'Salamanca', value: 'salamanca' }
  ];

  constructor(
    private fb: FormBuilder,
    private inventarioSrv: InventarioService,
    private route: ActivatedRoute,
    private router: Router,
    private messageSrv: MessageService
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.itemId = this.route.snapshot.paramMap.get('id');
    if (this.itemId) {
      this.editMode = true;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private buildForm(): void {
    this.form = this.fb.group({
      nombreProducto: ['', Validators.required],
      productoId:     ['', Validators.required],
      sucursalId:     ['', Validators.required],
      sucursal:       ['', Validators.required],
      stock:          [0, [Validators.required, Validators.min(0)]],
      stockMinimo:    [5, [Validators.required, Validators.min(0)]]
    });
  }

  get f() { return this.form.controls; }

  onSucursalChange(event: any): void {
    const found = this.sucursales.find(s => s.value === event.value);
    if (found) this.form.patchValue({ sucursal: found.label });
  }

  async guardar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    const data = this.form.value as InventarioItem;
    try {
      await this.inventarioSrv.createInventarioItem(data);
      this.messageSrv.add({ severity: 'success', summary: 'Listo', detail: 'Producto agregado al inventario' });
      this.router.navigate(['/admin/inventario']);
    } catch {
      this.messageSrv.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar' });
    } finally {
      this.loading = false;
    }
  }

  cancelar(): void {
    this.router.navigate(['/admin/inventario']);
  }
}