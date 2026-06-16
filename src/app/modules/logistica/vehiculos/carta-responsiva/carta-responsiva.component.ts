import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { BaseComponent } from 'src/app/shared/base/base.component';
import { CartaResponsivaService } from '../carta-responsiva.service';
import { VehiculosService } from '../vehiculos.service';
import { CartaResponsiva } from '../models/carta-responsiva.model';
import { EmpleadoService } from '../../../admin/empleados/empleados.service';

@Component({
  selector: 'app-carta-responsiva-vehiculo',
  templateUrl: './carta-responsiva.component.html',
  styleUrls: ['./carta-responsiva.component.css']
})
export class CartaResponsivaVehiculoComponent extends BaseComponent implements OnInit {
  @ViewChild('cartaPDF') cartaPDFElement!: ElementRef;
  
  vehiculoId: string = '';
  vehiculo: any = null;
  carta: CartaResponsiva | null = null;
  colaborador: any = null;
  cargando: boolean = false;
  generandoPDF: boolean = false;

  constructor(
    protected override messageService: MessageService,
    private route: ActivatedRoute,
    private router: Router,
    private cartaService: CartaResponsivaService,
    private vehiculoService: VehiculosService,
    private empleadoService: EmpleadoService
  ) {
    super(messageService);
  }

  ngOnInit() {
    this.vehiculoId = this.route.snapshot.paramMap.get('vehiculoId') || '';
    this.cargarDatos();
  }

  async cargarDatos() {
    try {
      this.cargando = true;
      
      this.vehiculo = await this.vehiculoService.getVehiculo(this.vehiculoId);
      
      if (!this.vehiculo) {
        this.handleAlertType('ERROR', 'Vehículo no encontrado');
        this.volver();
        return;
      }
      
      this.carta = await this.cartaService.getCartaPorVehiculo(this.vehiculoId);

      if (!this.carta && this.vehiculo.asignadoAId) {
        await this.crearCartaAutomatica();
      } else if (this.carta && this.vehiculo.asignadoAId) {
        await this.cargarColaborador(this.vehiculo.asignadoAId);
      }
      
    } catch (error) {
      console.error('Error al cargar datos:', error);
      this.handleAlertType('ERROR', 'Error al cargar los datos');
    } finally {
      this.cargando = false;
    }
  }

  async crearCartaAutomatica() {
    try {
      // Cargar datos del colaborador asignado
      await this.cargarColaborador(this.vehiculo.asignadoAId);
      
      if (!this.colaborador) {
        this.handleAlertType('WARNING', 'No se pudo cargar la información del colaborador');
        return;
      }
      
      const usuario = { id: 'sistema', nombre: 'Sistema' };
      const cartaId = await this.cartaService.crearCartaAutomatica(
        this.vehiculoId,
        this.colaborador,
        this.vehiculo,
        usuario
      );
      
      this.carta = await this.cartaService.getCarta(cartaId);
      this.handleAlertType('SUCCESS', 'Carta responsiva generada automáticamente');
      
    } catch (error) {
      console.error('Error al crear carta:', error);
      this.handleAlertType('ERROR', 'Error al generar la carta responsiva');
    }
  }

  async cargarColaborador(empleadoId: string) {
    try {
      const empleados = await this.empleadoService.getEmpleados().toPromise() || [];
      this.colaborador = empleados.find(e => e.empleadoId === empleadoId);
    } catch (error) {
      console.error('Error al cargar colaborador:', error);
    }
  }

  async descargarPDF() {
    if (!this.cartaPDFElement) {
      this.handleAlertType('ERROR', 'No se pudo generar el PDF');
      return;
    }
    
    this.generandoPDF = true;
    
    try {
      await this.cartaService.generarPDF(this.carta!, this.cartaPDFElement.nativeElement);
      this.handleAlertType('SUCCESS', 'PDF descargado correctamente');
    } catch (error) {
      console.error('Error al descargar PDF:', error);
      this.handleAlertType('ERROR', 'Error al generar el PDF');
    } finally {
      this.generandoPDF = false;
    }
  }

  volver() {
    this.router.navigate(['/logistica/vehiculos/detalle', this.vehiculoId]);
  }
}