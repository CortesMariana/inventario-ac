import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { BaseComponent } from 'src/app/shared/base/base.component';
import { VehiculosService } from '../vehiculos.service';
import { EmpleadoService } from '../../../admin/empleados/empleados.service';
import { Empleado } from '../../../admin/empleados/models/empleado.model';
import { Vehiculo } from '../models/vehiculo.model';

interface ColaboradorVehiculoDetalle {
  empleadoId: string;
  nombreCompleto: string;
  puesto: string;
  empresa: string;
  lugarTrabajo: string;
  fotografiaMiniatura?: string | null;
  email?: string | null;
  fechaIngreso?: string;
  vehiculosAsignados: Vehiculo[];
  totalVehiculos: number;
  ultimaAsignacion: Date | null;
}

@Component({
  selector: 'app-detalle-colaborador',
  templateUrl: './detalle-colaborador.component.html',
  styleUrls: ['./detalle-colaborador.component.css']
})
export class DetalleColaboradorComponent extends BaseComponent implements OnInit {
  colaborador: ColaboradorVehiculoDetalle | null = null;
  cargando: boolean = false;
  empleadoId: string = '';

  vehiculosFiltrados: Vehiculo[] = [];
  filtroBusqueda: string = '';
  filtroMarca: string = 'todos';
  filtroEstado: string = 'todos';
  
  opcionesMarca: any[] = [];
  opcionesEstado: any[] = [];

  estadisticas: any = {
    porMarca: {},
    porEstado: {},
    antiguedadPromedio: 0
  };

  vistaVehiculos: 'grid' | 'lista' = 'lista';

  fechaActual: Date = new Date();

  constructor(
    protected override messageService: MessageService,
    private route: ActivatedRoute,
    private router: Router,
    private vehiculosService: VehiculosService,
    private empleadoService: EmpleadoService
  ) {
    super(messageService);
  }

  ngOnInit() {
    this.empleadoId = this.route.snapshot.paramMap.get('empleadoId') || '';
    if (this.empleadoId) {
      this.cargarColaborador();
    } else {
      this.handleAlertType('ERROR', 'ID de colaborador no válido');
      this.volver();
    }
  }

  async cargarColaborador() {
    this.cargando = true;
    try {
      let empleado: Empleado | null = null;
      try {
        const empleados = await this.empleadoService.getEmpleados().toPromise();
        if (empleados) {
          empleado = empleados.find(e => e.empleadoId === this.empleadoId) || null;
        }
      } catch (error) {
        console.error('Error al obtener empleado:', error);
      }

      const vehiculos = await this.vehiculosService.getAllVehiculos();
      const vehiculosAsignados = vehiculos.filter(v => 
        v.estadoVehiculo === 'ASIGNADO' && 
        v.asignadoAId === this.empleadoId
      );

      if (vehiculosAsignados.length === 0) {
        this.handleAlertType('WARNING', 'No se encontraron vehículos asignados a este colaborador');
        this.volver();
        return;
      }

      let nombreCompleto = vehiculosAsignados[0].asignadoANombre || 'Sin nombre';
      if (empleado) {
        nombreCompleto = `${empleado.nombre} ${empleado.apellidoPaterno || ''} ${empleado.apellidoMaterno || ''}`.trim();
      }
      
      let puesto = 'Por definir';
      if (empleado?.puesto) {
        puesto = empleado.puesto.nombre;
      }
      
      let empresa = 'Por definir';
      if (empleado?.empresa) {
        empresa = empleado.empresa.razonSocial;
      }
      
      let lugarTrabajo = 'Por definir';
      if (empleado?.lugarDeTrabajo) {
        lugarTrabajo = empleado.lugarDeTrabajo.nombre;
      }

      this.colaborador = {
        empleadoId: this.empleadoId,
        nombreCompleto,
        puesto,
        empresa,
        lugarTrabajo,
        fotografiaMiniatura: empleado?.fotografiaMiniatura,
        email: empleado?.correoPersonal,
        fechaIngreso: empleado?.fechaIngreso,
        vehiculosAsignados: vehiculosAsignados,
        totalVehiculos: vehiculosAsignados.length,
        ultimaAsignacion: vehiculosAsignados.reduce((latest, v) => {
          if (!v.asignadoAFecha) return latest;
          const fecha = new Date(v.asignadoAFecha);
          return !latest || fecha > latest ? fecha : latest;
        }, null as Date | null)
      };

      this.vehiculosFiltrados = [...this.colaborador.vehiculosAsignados];
      this.cargarOpcionesFiltros();
      this.calcularEstadisticas();
      
    } catch (error) {
      console.error('Error al cargar colaborador:', error);
      this.handleAlertType('ERROR', 'Error al cargar los datos del colaborador');
    } finally {
      this.cargando = false;
    }
  }

  cargarOpcionesFiltros() {
    if (!this.colaborador) return;

    const marcas = [...new Set(this.colaborador.vehiculosAsignados.map(v => v.marca))];
    this.opcionesMarca = [
      { label: 'Todas las marcas', value: 'todos' },
      ...marcas.map(m => ({ label: m, value: m }))
    ];

    this.opcionesEstado = [
      { label: 'Todos los estados', value: 'todos' },
      { label: 'Disponible', value: 'DISPONIBLE' },
      { label: 'Seguro vencido', value: 'SEGURO_VENCIDO' },
      { label: 'Asignado', value: 'ASIGNADO' },
      { label: 'Otro', value: 'OTRO' }
    ];
  }

  calcularEstadisticas() {
    if (!this.colaborador) return;

    const porMarca: any = {};
    const porEstado: any = {};
    
    this.colaborador.vehiculosAsignados.forEach(v => {
      porMarca[v.marca] = (porMarca[v.marca] || 0) + 1;
      porEstado[v.estadoVehiculo] = (porEstado[v.estadoVehiculo] || 0) + 1;
    });
    
    this.estadisticas.porMarca = porMarca;
    this.estadisticas.porEstado = porEstado;

    if (this.colaborador.vehiculosAsignados.length > 0) {
      const ahora = new Date();
      const diasTotales = this.colaborador.vehiculosAsignados.reduce((sum, v) => {
        if (v.asignadoAFecha) {
          const diff = ahora.getTime() - new Date(v.asignadoAFecha).getTime();
          const dias = diff / (1000 * 60 * 60 * 24);
          return sum + dias;
        }
        return sum;
      }, 0);
      this.estadisticas.antiguedadPromedio = Math.round(diasTotales / this.colaborador.vehiculosAsignados.length);
    }
  }

  aplicarFiltros() {
    if (!this.colaborador) return;

    let filtrados = [...this.colaborador.vehiculosAsignados];

    if (this.filtroBusqueda.trim()) {
      const busqueda = this.filtroBusqueda.toLowerCase();
      filtrados = filtrados.filter(v => 
        v.marca?.toLowerCase().includes(busqueda) ||
        v.modelo?.toLowerCase().includes(busqueda) ||
        v.placa?.toLowerCase().includes(busqueda) ||
        v.numeroSerie?.toLowerCase().includes(busqueda) ||
        v.folio?.toLowerCase().includes(busqueda)
      );
    }

    if (this.filtroMarca !== 'todos') {
      filtrados = filtrados.filter(v => v.marca === this.filtroMarca);
    }

    if (this.filtroEstado !== 'todos') {
      filtrados = filtrados.filter(v => v.estadoVehiculo === this.filtroEstado);
    }

    this.vehiculosFiltrados = filtrados;
  }

  limpiarFiltros() {
    this.filtroBusqueda = '';
    this.filtroMarca = 'todos';
    this.filtroEstado = 'todos';
    this.aplicarFiltros();
  }

  verDetalleVehiculo(vehiculo: Vehiculo, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.router.navigate(['/logistica/vehiculos/detalle', vehiculo.firestoreId]);
  }

  volver() {
    this.router.navigate(['/logistica/vehiculos/colaboradores']);
  }

  getInitials(nombre: string): string {
    return nombre
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  getColorPorEmpresa(empresa: string): string {
    const colores = [
      '#667eea', '#4CAF50', '#FF9800', '#9C27B0', '#F44336', '#00BCD4'
    ];
    let hash = 0;
    for (let i = 0; i < empresa.length; i++) {
      hash = empresa.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colores[Math.abs(hash) % colores.length];
  }

  formatFecha(fecha: Date | null | undefined): string {
    if (!fecha) return 'N/A';
    try {
      const date = fecha instanceof Date ? fecha : new Date(fecha);
      if (isNaN(date.getTime())) return 'Fecha inválida';
      
      return date.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return 'Fecha inválida';
    }
  }

  formatFechaDetalle(fecha: Date | null | undefined): string {
    if (!fecha) return 'No disponible';
    try {
      const date = fecha instanceof Date ? fecha : new Date(fecha);
      if (isNaN(date.getTime())) return 'Fecha inválida';
      
      return date.toLocaleDateString('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Fecha inválida';
    }
  }

  getCantidadMarcas(): number {
    return Object.keys(this.estadisticas.porMarca).length;
  }

  getCantidadEstados(): number {
    return Object.keys(this.estadisticas.porEstado).length;
  }

  getEstadoIcon(estado: string): string {
    switch (estado) {
      case 'DISPONIBLE':
        return 'pi pi-check-circle';
      case 'SEGURO_VENCIDO':
        return 'pi pi-exclamation-triangle';
      case 'ASIGNADO':
        return 'pi pi-user-check';
      case 'OTRO':
        return 'pi pi-question-circle';
      default:
        return 'pi pi-question-circle';
    }
  }
  
  getEstadoClass(estado: string): string {
    switch (estado) {
      case 'DISPONIBLE':
        return 'estado-disponible';
      case 'SEGURO_VENCIDO':
        return 'estado-seguro-vencido';
      case 'ASIGNADO':
        return 'estado-asignado';
      case 'OTRO':
        return 'estado-otro';
      default:
        return 'estado-default';
    }
  }
  
  getEstadoLabel(estado: string): string {
    switch (estado) {
      case 'DISPONIBLE':
        return 'Disponible';
      case 'SEGURO_VENCIDO':
        return 'Seguro vencido';
      case 'ASIGNADO':
        return 'Asignado';
      case 'OTRO':
        return 'Otro';
      default:
        return estado;
    }
  }
}