import { Component, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import { BaseComponent } from 'src/app/shared/base/base.component';
import { TecnicoService } from '../tecnicos.service';
import { EmpleadoService } from '../../empleados/empleados.service';
import { Empleado } from '../../empleados/models/empleado.model';
import { Tecnico } from '../models/tecnico.model';

@Component({
  selector: 'app-grid-tecnicos',
  templateUrl: './grid-tecnicos.component.html',
  styleUrls: ['./grid-tecnicos.component.css']
})
export class GridTecnicosComponent extends BaseComponent implements OnInit {
  
  tecnicos: Tecnico[] = [];
  empleados: Empleado[] = [];
  empleadosFiltrados: Empleado[] = [];
  
  filtroTipo: string = 'todos';
  filtroBusqueda: string = '';
  
  nuevoTecnico: {
    empleadoId: string | null;
    empleadoNombre: string | null;
    tipo: 'oficina' | 'campo' | null;
  } = {
    empleadoId: null,
    empleadoNombre: null,
    tipo: null
  };
  
  opcionesEmpleados: any[] = [];
  
  cargando: boolean = false;
  mostrandoFormulario: boolean = false;
  procesando: boolean = false;
  
  opcionesTipo: any[] = [
    { label: 'Todos', value: 'todos' },
    { label: 'Oficina', value: 'oficina' },
    { label: 'Campo', value: 'campo' }
  ];
  
  constructor(
    protected override messageService: MessageService,
    private tecnicoService: TecnicoService,
    private empleadoService: EmpleadoService
  ) {
    super(messageService);
  }
  
  ngOnInit(): void {
    this.cargarDatos();
  }
  
  async cargarDatos() {
    this.cargando = true;
    
    try {
      const [tecnicosData, empleadosData] = await Promise.all([
        this.tecnicoService.getTecnicos().toPromise(),
        this.empleadoService.getEmpleados().toPromise()
      ]);
      
      this.tecnicos = tecnicosData || [];
      this.empleados = empleadosData || [];
      
      this.actualizarListas();
      
    } catch (error) {
      console.error('Error al cargar datos:', error);
      this.handleAlertType('ERROR', 'Error al cargar los datos');
    } finally {
      this.cargando = false;
    }
  }
  
  actualizarListas() {
    const idsTecnicos = this.tecnicos.map(t => t.empleadoId);
    this.empleadosFiltrados = this.empleados.filter(empleado => 
      !idsTecnicos.includes(empleado.empleadoId)
    );
    
    this.prepararOpcionesEmpleados();
  }
  
  prepararOpcionesEmpleados() {
    this.opcionesEmpleados = this.empleadosFiltrados.map(empleado => ({
      label: this.getNombreCompleto(empleado),
      value: empleado.empleadoId,
      empleado: empleado,
      puesto: empleado.puesto?.nombre || 'Sin puesto',
      empresa: empleado.empresa?.razonSocial || 'Sin empresa'
    }));
  }
  
  getNombreCompleto(empleado: Empleado): string {
    return `${empleado.nombre} ${empleado.apellidoPaterno} ${empleado.apellidoMaterno}`.trim();
  }
  
  onEmpleadoSeleccionado(empleadoId: string) {
    const empleadoSeleccionado = this.empleados.find(e => e.empleadoId === empleadoId);
    
    if (empleadoSeleccionado) {
      this.nuevoTecnico.empleadoId = empleadoSeleccionado.empleadoId;
      this.nuevoTecnico.empleadoNombre = this.getNombreCompleto(empleadoSeleccionado);
    } else {
      this.nuevoTecnico.empleadoId = null;
      this.nuevoTecnico.empleadoNombre = null;
    }
  }
  
  async agregarTecnico() {
    if (!this.nuevoTecnico.empleadoId || !this.nuevoTecnico.tipo) {
      this.handleAlertType('WARNING', 'Por favor selecciona un empleado y especifica el tipo');
      return;
    }
    
    this.procesando = true;
    
    try {
      const yaEsTecnico = await this.tecnicoService.isEmpleadoTecnico(this.nuevoTecnico.empleadoId);
      
      if (yaEsTecnico) {
        this.handleAlertType('WARNING', 'Este empleado ya está registrado como técnico');
        this.procesando = false;
        return;
      }
      
      const tecnico: Tecnico = {
        empleadoId: this.nuevoTecnico.empleadoId,
        nombre: this.nuevoTecnico.empleadoNombre || 'Sin nombre',
        tipo: this.nuevoTecnico.tipo
      };
      
      const firestoreId = await this.tecnicoService.addTecnico(tecnico);
      
      await this.cargarDatos();
      
      this.resetFormulario();
      
      this.handleAlertType('SUCCESS', 'Técnico agregado correctamente');
      
    } catch (error: any) {
      console.error('Error al agregar técnico:', error);
      
      let mensajeError = 'Error al agregar el técnico';
      if (error.message) {
        mensajeError += `: ${error.message}`;
      }
      
      this.handleAlertType('ERROR', mensajeError);
    } finally {
      this.procesando = false;
    }
  }
  
  async eliminarTecnico(tecnico: Tecnico) {
    if (!tecnico.firestoreId) {
      this.handleAlertType('ERROR', 'No se puede eliminar el técnico: ID no encontrado');
      return;
    }
    
    const confirmado = confirm(`¿Estás seguro de eliminar al técnico ${tecnico.nombre}?\nEsto también removerá sus permisos de técnico.`);
    
    if (!confirmado) return;
    
    this.cargando = true;
    
    try {
      await this.tecnicoService.deleteTecnico(tecnico.firestoreId, tecnico.empleadoId);
      
      this.tecnicos = this.tecnicos.filter(t => t.firestoreId !== tecnico.firestoreId);
      
      this.actualizarListas();
      
      this.handleAlertType('SUCCESS', 'Técnico y sus permisos eliminados correctamente');
      
    } catch (error) {
      console.error('Error al eliminar técnico:', error);
      this.handleAlertType('ERROR', 'Error al eliminar el técnico');
    } finally {
      this.cargando = false;
    }
  }
  
  aplicarFiltros() {
    let filtrados = [...this.tecnicos];
    
    if (this.filtroTipo !== 'todos') {
      filtrados = filtrados.filter(tecnico => tecnico.tipo === this.filtroTipo);
    }
    
    if (this.filtroBusqueda.trim()) {
      const busqueda = this.filtroBusqueda.toLowerCase();
      filtrados = filtrados.filter(tecnico => 
        tecnico.nombre.toLowerCase().includes(busqueda) ||
        (tecnico.empleadoId && tecnico.empleadoId.toLowerCase().includes(busqueda))
      );
    }
    
    return filtrados;
  }
  
  limpiarFiltros() {
    this.filtroTipo = 'todos';
    this.filtroBusqueda = '';
  }
  
  resetFormulario() {
    this.nuevoTecnico = {
      empleadoId: null,
      empleadoNombre: null,
      tipo: null
    };
    this.mostrandoFormulario = false;
  }
  
  getTecnicosFiltrados(): Tecnico[] {
    return this.aplicarFiltros();
  }
  
  getTotalTecnicos(): number {
    return this.tecnicos.length;
  }
  
  getTecnicosPorTipo(tipo: 'oficina' | 'campo'): number {
    return this.tecnicos.filter(t => t.tipo === tipo).length;
  }
  
  getColorTipo(tipo: 'oficina' | 'campo'): string {
    return tipo === 'oficina' ? '#2196F3' : '#4CAF50';
  }
  
  getIconoTipo(tipo: 'oficina' | 'campo'): string {
    return tipo === 'oficina' ? 'pi pi-building' : 'pi pi-car';
  }
  
  getFechaFormateada(fecha: any): string {
    if (!fecha) return 'Sin fecha';
    
    try {
      const date = fecha instanceof Date ? fecha : new Date(fecha);
      if (isNaN(date.getTime())) return 'Fecha inválida';
      
      return date.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  }
  
  alternarFormulario() {
    this.mostrandoFormulario = !this.mostrandoFormulario;
    if (!this.mostrandoFormulario) {
      this.resetFormulario();
    }
  }
  
  getEmpleadoById(empleadoId: string): Empleado | undefined {
    return this.empleados.find(e => e.empleadoId === empleadoId);
  }

  getTecnicoId(tecnico: Tecnico): string {
    return tecnico.tecnicoId || tecnico.empleadoId || 'Sin ID';
  }
}