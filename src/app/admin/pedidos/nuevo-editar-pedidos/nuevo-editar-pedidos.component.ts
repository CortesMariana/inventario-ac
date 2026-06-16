import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ClientesService } from '../../clientes/clientes.service';
import { InventarioService } from '../../inventario/inventario.service';
import { PedidosService, ProductoPedido } from '../pedidos.service';

@Component({
  selector: 'app-nuevo-editar-pedidos',
  templateUrl: './nuevo-editar-pedidos.component.html',
  styleUrls: ['./nuevo-editar-pedidos.component.css']
})
export class NuevoEditarPedidosComponent implements OnInit, OnDestroy {

  form!: FormGroup;
  loading = false;
  clientes: any[] = [];
  productos: any[] = [];
  clienteSeleccionado: any = null;
  private destroy$ = new Subject<void>();

  sucursales = [
    { label: 'León',      value: 'leon' },
    { label: 'Silao',     value: 'silao' },
    { label: 'Irapuato',  value: 'irapuato' },
    { label: 'Salamanca', value: 'salamanca' }
  ];

  constructor(
    private fb: FormBuilder,
    private pedidosSrv: PedidosService,
    private clientesSrv: ClientesService,
    private inventarioSrv: InventarioService,
    private router: Router,
    private messageSrv: MessageService
  ) {}

  ngOnInit(): void {
    this.buildForm();
    this.loadClientes();
    this.loadProductos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private buildForm(): void {
    this.form = this.fb.group({
      clienteId:    ['', Validators.required],
      sucursalId:   ['', Validators.required],
      productos:    this.fb.array([])
    });
  }

  private loadClientes(): void {
    this.clientesSrv.getAll$()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => this.clientes = data.map(c => ({ label: c.nombre, value: c })));
  }

  private loadProductos(): void {
    this.inventarioSrv.getProductos$()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => this.productos = data.map(p => ({ label: p.nombre, value: p })));
  }

  get productosArray(): FormArray {
    return this.form.get('productos') as FormArray;
  }

  get f() { return this.form.controls; }

  onClienteChange(event: any): void {
    this.clienteSeleccionado = event.value;
  }

  agregarProducto(): void {
    const grupo = this.fb.group({
      producto:  [null, Validators.required],
      cantidad:  [1, [Validators.required, Validators.min(1)]]
    });
    this.productosArray.push(grupo);
  }

  eliminarProducto(index: number): void {
    this.productosArray.removeAt(index);
  }

  calcularSubtotal(): number {
    return this.productosArray.controls.reduce((acc, ctrl) => {
      const producto = ctrl.get('producto')?.value;
      const cantidad = ctrl.get('cantidad')?.value ?? 0;
      return acc + ((producto?.precioVenta ?? 0) * cantidad);
    }, 0);
  }

  calcularDescuento(): number {
    const subtotal = this.calcularSubtotal();
    const descuento = this.clienteSeleccionado?.descuento ?? 0;
    return subtotal * (descuento / 100);
  }

  calcularTotal(): number {
    return this.calcularSubtotal() - this.calcularDescuento();
  }

  async guardar(): Promise<void> {
    if (this.form.invalid || this.productosArray.length === 0) {
      this.form.markAllAsTouched();
      this.messageSrv.add({ severity: 'warn', summary: 'Atención', detail: 'Agrega al menos un producto' });
      return;
    }

    this.loading = true;
    const cliente = this.clienteSeleccionado;
    const sucursalObj = this.sucursales.find(s => s.value === this.form.value.sucursalId);

    const productosFormateados: ProductoPedido[] = this.productosArray.controls.map(ctrl => {
      const p = ctrl.get('producto')?.value;
      const cantidad = ctrl.get('cantidad')?.value;
      return {
        productoId:     p.id,
        nombreProducto: p.nombre,
        cantidad,
        precioUnitario: p.precioVenta,
        subtotal:       p.precioVenta * cantidad
      };
    });

    const subtotal  = this.calcularSubtotal();
    const descuento = this.calcularDescuento();
    const total     = this.calcularTotal();

    try {
      await this.pedidosSrv.create({
        clienteId:        cliente.id,
        clienteNombre:    cliente.nombre,
        clienteRfc:       cliente.rfc,
        descuentoCliente: cliente.descuento,
        sucursalId:       this.form.value.sucursalId,
        sucursal:         sucursalObj?.label ?? '',
        productos:        productosFormateados,
        subtotal,
        descuento,
        total,
        totalProductos:   productosFormateados.reduce((a, p) => a + p.cantidad, 0),
        estado:           'pendiente'
      });
      this.messageSrv.add({ severity: 'success', summary: 'Listo', detail: 'Pedido creado correctamente' });
      this.router.navigate(['/admin/pedidos']);
    } catch (err: any) {
      this.messageSrv.add({ severity: 'error', summary: 'Error de stock', detail: err.message });
    } finally {
      this.loading = false;
    }
  }

  cancelar(): void {
    this.router.navigate(['/admin/pedidos']);
  }
}