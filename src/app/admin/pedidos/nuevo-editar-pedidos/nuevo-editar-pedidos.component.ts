import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MessageService } from 'primeng/api';
import { Cliente, ClientesService } from '../../clientes/clientes.service';
import { InventarioItem, InventarioService } from '../../inventario/inventario.service';
import { PedidosService, ProductoPedido } from '../pedidos.service';

export interface ProductoOpcion {
  label: string;
  value: InventarioItem;
  disabled: boolean;
}

@Component({
    selector: 'app-nuevo-editar-pedidos',
    templateUrl: './nuevo-editar-pedidos.component.html',
    styleUrls: ['./nuevo-editar-pedidos.component.css'],
    standalone: false
})
export class NuevoEditarPedidosComponent implements OnInit, OnDestroy {

  form!: FormGroup;
  loading = false;

  clientes: { label: string; value: Cliente }[] = [];
  productosOpciones: ProductoOpcion[] = [];
  productosSinStock: InventarioItem[] = [];

  clienteSeleccionado: Cliente | null = null;
  sucursalSeleccionada: string | null = null;
  inventarioCargado = false;

  notificandoProduccion: Record<string, boolean> = {};

  private destroy$ = new Subject<void>();

  sucursales = [
    { label: 'León',      value: 'leon' },
    { label: 'Silao',     value: 'silao' },
    { label: 'Irapuato',  value: 'irapuato' },
    { label: 'Salamanca', value: 'salamanca' }
  ];

  tiposPedido = [
    { label: 'Factura',  value: 'factura'  },
    { label: 'Consigna', value: 'consigna' }
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
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private buildForm(): void {
    this.form = this.fb.group({
      clienteId:  ['', Validators.required],
      sucursalId: ['', Validators.required],
      tipoPedido: ['factura', Validators.required],
      productos:  this.fb.array([])
    });
  }

  private loadClientes(): void {
    this.clientesSrv.getAll$()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.clientes = data
          .filter(c => c.activo)
          .map(c => ({
            label: `${c.nombre} ${c.rfc}`,
            value: c
          }));
      });
  }

  private loadInventarioPorSucursal(sucursalId: string): void {
    this.inventarioCargado = false;
    this.inventarioSrv.getInventarioBySucursal$(sucursalId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(items => {
        this.productosSinStock = items.filter(i => i.stock === 0);
        this.productosOpciones = items.map(item => ({
          label: item.descripcion || item.nombreProducto || item.codigoProducto || 'Sin nombre',
          value: item,
          disabled: item.stock === 0
        }));
        this.inventarioCargado = true;
        // Limpia productos seleccionados si cambia la sucursal
        this.productosArray.clear();
      });
  }

  get productosArray(): FormArray {
    return this.form.get('productos') as FormArray;
  }

  get f() { return this.form.controls; }

  getIniciales(nombre: string): string {
    if (!nombre) return '?';
    return nombre.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
  }

  onClienteChange(event: any): void {
    this.clienteSeleccionado = event.value ?? null;
  }

  onSucursalChange(event: any): void {
    const sucursalId = event.value;
    this.sucursalSeleccionada = sucursalId;
    if (sucursalId) {
      this.loadInventarioPorSucursal(sucursalId);
    }
  }

  setTipoPedido(tipo: 'factura' | 'consigna'): void {
    this.form.patchValue({ tipoPedido: tipo });
  }

  irANuevoCliente(): void {
    this.router.navigate(['/admin/clientes/nuevo']);
  }

  agregarProducto(): void {
    if (!this.sucursalSeleccionada) {
      this.messageSrv.add({ severity: 'warn', summary: 'Atención', detail: 'Selecciona primero una sucursal para ver el catálogo de productos' });
      return;
    }
    const grupo = this.fb.group({
      producto: [null, Validators.required],
      cantidad: [1, [Validators.required, Validators.min(1)]]
    });
    this.productosArray.push(grupo);
  }

  eliminarProducto(index: number): void {
    this.productosArray.removeAt(index);
  }

  calcularSubtotal(): number {
    return this.productosArray.controls.reduce((acc, ctrl) => {
      const item: InventarioItem | null = ctrl.get('producto')?.value;
      const cantidad = ctrl.get('cantidad')?.value ?? 0;
      return acc + ((item?.valorUnitario ?? 0) * cantidad);
    }, 0);
  }

  calcularDescuento(): number {
    return this.calcularSubtotal() * ((this.clienteSeleccionado?.descuento ?? 0) / 100);
  }

  calcularTotal(): number {
    return this.calcularSubtotal() - this.calcularDescuento();
  }

  async notificarProduccion(item: InventarioItem): Promise<void> {
    this.notificandoProduccion[item.id!] = true;
    try {
      await this.pedidosSrv.notificarProduccion(item);
      this.messageSrv.add({
        severity: 'success',
        summary: 'Notificado',
        detail: `Se notificó a producción sobre "${item.descripcion || item.nombreProducto}"`
      });
    } catch {
      this.messageSrv.add({ severity: 'error', summary: 'Error', detail: 'No se pudo enviar la notificación' });
    } finally {
      this.notificandoProduccion[item.id!] = false;
    }
  }

  async guardar(): Promise<void> {
    if (this.form.invalid || this.productosArray.length === 0) {
      this.form.markAllAsTouched();
      this.messageSrv.add({ severity: 'warn', summary: 'Atención', detail: 'Completa todos los campos y agrega al menos un producto' });
      return;
    }

    this.loading = true;
    const cliente = this.clienteSeleccionado!;
    const sucursalObj = this.sucursales.find(s => s.value === this.form.value.sucursalId);

    const productosFormateados: ProductoPedido[] = this.productosArray.controls.map(ctrl => {
      const item: InventarioItem = ctrl.get('producto')?.value;
      const cantidad = ctrl.get('cantidad')?.value;
      const precio = item.valorUnitario ?? 0;
      return {
        productoId:       item.productoId,
        inventarioItemId: item.id!,           // ID real del doc en Firestore
        nombreProducto:   item.descripcion || item.nombreProducto,
        cantidad,
        precioUnitario:   precio,
        subtotal:         precio * cantidad
      };
    });

    const subtotal  = this.calcularSubtotal();
    const descuento = this.calcularDescuento();
    const total     = this.calcularTotal();

    const pedido = {
      clienteId:        cliente.id!,
      clienteNombre:    cliente.nombre,
      clienteRfc:       cliente.rfc,
      clienteEmail:     cliente.email ?? '',
      descuentoCliente: cliente.descuento,
      tipoPedido:       this.form.value.tipoPedido as 'factura' | 'consigna',
      sucursalId:       this.form.value.sucursalId,
      sucursal:         sucursalObj?.label ?? '',
      productos:        productosFormateados,
      subtotal,
      descuento,
      total,
      totalProductos:   productosFormateados.reduce((a, p) => a + p.cantidad, 0),
      estado:           'en_revision' as const
    };

    try {
      await this.pedidosSrv.create(pedido);

      // Envía confirmación por email si el cliente tiene correo registrado
      if (cliente.email) {
        await this.pedidosSrv.enviarConfirmacionEmail(pedido).catch(() => {
          // No bloquea si el email falla
        });
      }

      this.messageSrv.add({
        severity: 'success',
        summary: 'Pedido creado',
        detail: cliente.email
          ? 'Pedido en revisión. Se envió confirmación al correo del cliente.'
          : 'Pedido en revisión.'
      });
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
