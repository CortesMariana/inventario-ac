import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { BaseComponent } from 'src/app/shared/base/base.component';
import { ActivosService } from '../activos.service';
import { ActivoTI } from '../models/activo.model';
import { EmpleadoService } from '../../empleados/empleados.service';

@Component({
  selector: 'app-carta-responsiva-activo',
  templateUrl: './carta-responsiva-activo.component.html',
  styleUrls: ['./carta-responsiva-activo.component.css']
})
export class CartaResponsivaActivoComponent extends BaseComponent implements OnInit {
  
  activo: ActivoTI | null = null;
  activoId: string = '';
  cargando: boolean = false;
  
  fechaActual: Date = new Date();
  nombreEmpresa: string = 'Grupo Enermax, S de R.L de C.V.';
  
  usuarioAsignado: any = {
    nombre: '',
    puesto: ''
  };

  resguardadaPor: string = '';

  politicas = [
    'A01-PR-02-MTT Política de Administración del Equipo de Cómputo.',
    'A02-PR-02-MTT Política de Gestión de Equipos de Comunicación.'
  ];

  constructor(
    protected override messageService: MessageService,
    private route: ActivatedRoute,
    private router: Router,
    private activosService: ActivosService,
    private empleadoService: EmpleadoService
  ) {
    super(messageService);
  }

  ngOnInit() {
    this.cargando = true;
    
    this.activoId = this.route.snapshot.paramMap.get('firestoreId') || '';
    
    if (!this.activoId) {
      this.handleAlertType('ERROR', 'No se especificó el activo');
      this.router.navigate(['/admin/activos']);
      return;
    }

    this.cargarActivo();
  }

  async cargarActivo() {
    try {
      this.activo = await this.activosService.getActivo(this.activoId);
      
      if (!this.activo) {
        this.handleAlertType('ERROR', 'Activo no encontrado');
        this.router.navigate(['/admin/activos']);
        return;
      }

      if (this.activo.cartaResguardadaPor) {
        this.resguardadaPor = this.activo.cartaResguardadaPor;
      }

      if (this.activo.usuarioAsignadoId) {
        await this.cargarDatosUsuarioAsignado();
      } else {
        this.usuarioAsignado = {
          nombre: 'Sin asignar',
          puesto: 'No aplica'
        };
      }

      this.cargando = false;

    } catch (error) {
      console.error('Error al cargar activo:', error);
      this.handleAlertType('ERROR', 'Error al cargar el activo');
      this.cargando = false;
    }
  }

  async guardarResguardante() {
    if (this.activoId && this.resguardadaPor) {
      try {
        await this.activosService.updateActivo(this.activoId, {
          cartaResguardadaPor: this.resguardadaPor
        });
        this.handleAlertType('SUCCESS', 'Resguardante guardado correctamente');
      } catch (error) {
        console.error('Error al guardar resguardante:', error);
        this.handleAlertType('ERROR', 'Error al guardar el resguardante');
      }
    }
  }

  async cargarDatosUsuarioAsignado() {
    try {
      const empleados = await this.empleadoService.getEmpleados().toPromise() || [];
      const empleado = empleados.find(e => e.empleadoId === this.activo?.usuarioAsignadoId);
      
      if (empleado) {
        this.usuarioAsignado = {
          id: empleado.empleadoId,
          nombre: `${empleado.nombre} ${empleado.apellidoPaterno || ''} ${empleado.apellidoMaterno || ''}`.trim(),
          puesto: empleado.puesto?.nombre || 'No especificado',
          correo: empleado.correoPersonal,
          lugarTrabajo: empleado.lugarDeTrabajo?.nombre
        };
      } else {
        this.usuarioAsignado = {
          nombre: this.activo?.usuarioAsignadoNombre || 'Usuario no encontrado',
          puesto: 'No disponible'
        };
      }
    } catch (error) {
      console.error('Error al cargar datos del usuario:', error);
      this.usuarioAsignado = {
        nombre: this.activo?.usuarioAsignadoNombre || 'Error al cargar',
        puesto: 'No disponible'
      };
    }
  }

  volver() {
    if (this.resguardadaPor !== this.activo?.cartaResguardadaPor) {
      this.guardarResguardante();
    }
    this.router.navigate(['/admin/activos/detalle', this.activoId]);
  }

  imprimir() {
    event?.preventDefault();
  
    if (this.resguardadaPor !== this.activo?.cartaResguardadaPor) {
      this.guardarResguardante();
    }
  
    document.body.classList.add('printing-carta');
    document.documentElement.classList.add('printing-carta');
    
    let tituloPDF = `Carta_Responsiva_${this.activo?.nombre || 'Activo'}`;
    
    if (this.resguardadaPor && this.resguardadaPor.trim()) {
      tituloPDF += `_${this.resguardadaPor.trim().replace(/\s+/g, '_')}`;
    }
    
    const originalTitle = document.title;
    document.title = tituloPDF;
    
    setTimeout(() => {
      window.print();
      
      setTimeout(() => {
        document.body.classList.remove('printing-carta');
        document.documentElement.classList.remove('printing-carta');
        document.title = originalTitle;
      }, 500);
    }, 100);
  }

  formatFecha(fecha: Date): string {
    if (!fecha) return '';
    
    const dia = fecha.getDate().toString().padStart(2, '0');
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const año = fecha.getFullYear();
    
    return `${dia}/${mes}/${año}`;
  }

  private get caracteristicas(): any {
    return this.activo ? (this.activo as any).caracteristicas || {} : {};
  }

  tieneCaracteristicas(): boolean {
    return !!this.activo && Object.keys(this.caracteristicas).length > 0;
  }

  hasCaracteristica(nombre: string): boolean {
    return this.tieneCaracteristicas() && this.caracteristicas[nombre] !== undefined && this.caracteristicas[nombre] !== null;
  }

  getCaracteristica(nombre: string, defaultValue: any = ''): any {
    if (!this.tieneCaracteristicas()) {
      return defaultValue;
    }
    const valor = this.caracteristicas[nombre];
    return valor !== undefined && valor !== null ? valor : defaultValue;
  }

  getCargadorTexto(): string {
    return this.getCaracteristica('cargadorIncluido', false) ? 'SÍ' : 'SI';
  }

  getCondicionEquipoTexto(): string {
    const condicion = this.getCaracteristica('condicionEquipo', 'usado');
    switch (condicion) {
      case 'nuevo':
        return 'Nuevo';
      case 'prestado':
        return 'Prestado';
      default:
        return 'Usado';
    }
  }

  esCondicionEquipo(condicion: string): boolean {
    return this.getCaracteristica('condicionEquipo') === condicion;
  }

  esDanado(): boolean {
    return this.getCaracteristica('condicionDetalle') === '-';
  }
 
  getMemoriaRamTexto(): string {
    const ram = this.getCaracteristica('memoriaRam', '-');
    return `${ram} GB`;
  }

  getPrecioEntregaTexto(): string {
    if (!this.activo || !this.activo.precioEntrega) {
      return '-';
    }
    return this.activo.precioEntrega.toFixed(2);
  }

  getActivoFijo(): string {
    return this.activo?.activoFijo || '-';
  }

  getNip(): string {
    return this.activo?.nip || '-';
  }

  getNumeroSerie(): string {
    return this.activo?.numeroSerie || '-';
  }

  getModelo(): string {
    return this.activo?.modelo || '-';
  }

  getMarca(): string {
    return this.activo?.marca || '-';
  }

  getTipoActivo(): string {
    return this.activo?.tipoActivo || '-';
  }
}