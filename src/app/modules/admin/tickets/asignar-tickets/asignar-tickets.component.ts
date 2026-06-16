import { Component, OnInit } from '@angular/core';
import { MessageService, ConfirmationService } from 'primeng/api';
import { BaseComponent } from 'src/app/shared/base/base.component';
import { Empleado } from '../../empleados/models/empleado.model';
import { EmpleadoService } from '../../empleados/empleados.service';
import { TicketService } from '../tickets.service';
import { TecnicoService } from '../../tecnicos/tecnicos.service';
import { Tecnico } from '../../tecnicos/models/tecnico.model';

@Component({
  selector: 'app-asignar-tickets',
  templateUrl: './asignar-tickets.component.html',
  styleUrls: ['./asignar-tickets.component.css'],
  providers: [MessageService, ConfirmationService]
})
export class AsignarTicketsComponent extends BaseComponent implements OnInit {
  ticketsNuevos: any[] = [];
  empleados: Empleado[] = [];
  tecnicos: Tecnico[] = []; 
  cargando: boolean = false;
  asignando: { [ticketId: string]: boolean } = {};

  filtroBusqueda: string = '';

  empleadosPorTicket: { [ticketId: string]: Tecnico | null } = {}; 

  constructor(
    protected override messageService: MessageService,
    private ticketService: TicketService,
    private tecnicoService: TecnicoService, 
    private confirmationService: ConfirmationService
  ) {
    super(messageService);
  }

  ngOnInit() {
    this.cargarDatos();
  }

  async cargarDatos() {
    this.cargando = true;
    
    try {
      const tickets = await this.ticketService.getAllTickets();
      const tecnicosObservable = this.tecnicoService.getTecnicos();
      const tecnicos = await tecnicosObservable.toPromise();
      
      this.ticketsNuevos = tickets;
      this.tecnicos = this.prepararTecnicos(tecnicos || []);
      
      this.inicializarDropdowns();
      this.procesarTickets();
      
    } catch (error) {
      console.error('Error al cargar datos:', error);
      this.handleAlertType('ERROR', 'Error al cargar los tickets');
    } finally {
      this.cargando = false;
    }
  }

  inicializarDropdowns() {
    this.empleadosPorTicket = {};
    this.ticketsNuevos.forEach(ticket => {
      if (ticket.asignadoA?.id) {
        const tecnicoAsignado = this.tecnicos.find(t => t.empleadoId === ticket.asignadoA.id);
        this.empleadosPorTicket[ticket.firestoreId] = tecnicoAsignado || null;
      } else {
        this.empleadosPorTicket[ticket.firestoreId] = null;
      }
    });
  }

  procesarTickets() {
    this.ticketsNuevos.forEach(ticket => {
      ticket.fechaCreacionFormatted = this.formatFecha(ticket.fechaCreacion);
      ticket.fechaLimiteFormatted = ticket.fechaLimite ? 
        this.formatFecha(ticket.fechaLimite) : 'Sin fecha límite';
      
      if (ticket.fechaLimite) {
        const fechaLimite = this.convertirFecha(ticket.fechaLimite);
        const hoy = new Date();
        const diffTime = fechaLimite.getTime() - hoy.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        ticket.diasRestantes = diffDays >= 0 ? diffDays : 0;
      } else {
        ticket.diasRestantes = null;
      }

      ticket.colorPrioridad = this.getColorPrioridad(ticket.prioridad);
      ticket.iconoTipo = this.getIconoTipo(ticket.tipo);

      if (ticket.asignadoA) {
        ticket.asignadoTexto = `Asignado a: ${ticket.asignadoA.nombre}`;
        ticket.yaAsignado = ticket.estatus !== 'Nuevo'; 
      } else {
        ticket.asignadoTexto = 'Sin asignar';
        ticket.yaAsignado = false;
      }
    });

    this.ticketsNuevos.sort((a, b) => {
      const prioridadOrden: { [key: string]: number } = { 
        'Critica': 0, 
        'Alta': 1, 
        'Mediana': 2, 
        'baja': 3 
      };
      
      const ordenA = prioridadOrden[a.prioridad] || 4;
      const ordenB = prioridadOrden[b.prioridad] || 4;
      
      if (ordenA !== ordenB) return ordenA - ordenB;
      
      const fechaA = this.convertirFecha(a.fechaCreacion);
      const fechaB = this.convertirFecha(b.fechaCreacion);
      
      return fechaA.getTime() - fechaB.getTime();
    });
  }

  prepararTecnicos(tecnicos: Tecnico[]): Tecnico[] {
    return tecnicos
      .filter(tecnico => tecnico.activo !== false) 
      .map(tecnico => ({
        ...tecnico,
        displayText: `${tecnico.nombre} (${tecnico.tecnicoId}) - ${tecnico.tipo}`
      }));
  }

  convertirFecha(fecha: any): Date {
    if (!fecha) return new Date();
    
    if (fecha.toDate) {
      return fecha.toDate();
    } else if (fecha instanceof Date) {
      return fecha;
    } else if (typeof fecha === 'string') {
      return new Date(fecha);
    } else if (fecha && typeof fecha === 'object' && fecha.seconds) {
      return new Date(fecha.seconds * 1000);
    } else {
      return new Date();
    }
  }

  formatFecha(fecha: any): string {
    const date = this.convertirFecha(fecha);
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getColorPrioridad(prioridad: string): string {
    switch (prioridad) {
      case 'Critica':
        return '#F44336';
      case 'Alta':
        return '#FF9800';
      case 'Mediana':
        return '#FFC107';
      case 'baja':
        return '#4CAF50';
      default:
        return '#607D8B';
    }
  }

  getIconoTipo(tipo: string): string {
    switch (tipo) {
      case 'mantenimiento':
        return 'pi pi-wrench';
      case 'incidente':
        return 'pi pi-exclamation-triangle';
      case 'requerimiento':
        return 'pi pi-pencil';
      case 'asignacion activo/dispositivo':
        return 'pi pi-desktop';
      default:
        return 'pi pi-ticket';
    }
  }

  async asignarTicket(ticket: any) {
    const tecnicoSeleccionado = this.empleadosPorTicket[ticket.firestoreId];
    
    if (!tecnicoSeleccionado) {
      this.handleAlertType('WARNING', 'Por favor selecciona un técnico para este ticket');
      return;
    }

    const confirmMessage = ticket.asignadoA 
      ? `¿Reasignar el ticket "${ticket.titulo}" a ${tecnicoSeleccionado.nombre}?`
      : `¿Asignar el ticket "${ticket.titulo}" a ${tecnicoSeleccionado.nombre}?`;

    this.confirmationService.confirm({
      message: confirmMessage,
      header: ticket.asignadoA ? 'Confirmar reasignación' : 'Confirmar asignación',
      icon: ticket.asignadoA ? 'pi pi-user-edit' : 'pi pi-user-check',
      acceptLabel: ticket.asignadoA ? 'Sí, reasignar' : 'Sí, asignar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: ticket.asignadoA ? 'p-button-warning' : 'p-button-success',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: async () => {
        await this.confirmarAsignacion(ticket, tecnicoSeleccionado);
      }
    });
  }

  async confirmarAsignacion(ticket: any, tecnico: Tecnico) {
    this.asignando[ticket.firestoreId] = true;
    
    try {
      const asignado = await this.ticketService.asignarTicket(
        ticket.firestoreId,
        tecnico as any 
      );
      
      if (asignado) {
        const index = this.ticketsNuevos.findIndex(t => t.firestoreId === ticket.firestoreId);
        if (index !== -1) {
          this.ticketsNuevos[index].asignadoA = {
            id: tecnico.empleadoId,
            nombre: tecnico.nombre
          };
          this.ticketsNuevos[index].estatus = 'Asignado';
          this.ticketsNuevos[index].asignadoTexto = `Asignado a: ${tecnico.nombre}`;
          this.ticketsNuevos[index].yaAsignado = true;
        }
        
        const mensaje = ticket.asignadoA 
          ? `Ticket reasignado a ${tecnico.nombre}` 
          : `Ticket asignado a ${tecnico.nombre}`;
        
        this.handleAlertType('SUCCESS', mensaje);
      } else {
        this.handleAlertType('ERROR', 'No se pudo asignar el ticket');
      }
    } catch (error) {
      console.error('Error al asignar ticket:', error);
      this.handleAlertType('ERROR', 'Error al asignar el ticket');
    } finally {
      this.asignando[ticket.firestoreId] = false;
    }
  }

  onTecnicoSeleccionado(ticketId: string, event: any) {
    this.empleadosPorTicket[ticketId] = event.value;
  }

  getTicketsFiltrados(): any[] {
    let filtrados = [...this.ticketsNuevos];

    if (this.filtroBusqueda.trim()) {
      const busqueda = this.filtroBusqueda.toLowerCase();
      filtrados = filtrados.filter(ticket => 
        ticket.id?.toLowerCase().includes(busqueda) ||
        ticket.titulo?.toLowerCase().includes(busqueda) ||
        ticket.descripcion?.toLowerCase().includes(busqueda) ||
        ticket.creadoPor?.nombre?.toLowerCase().includes(busqueda) ||
        (ticket.asignadoA?.nombre?.toLowerCase()?.includes(busqueda) || false)
      );
    }

    return filtrados;
  }

  limpiarFiltros() {
    this.filtroBusqueda = '';
    Object.keys(this.empleadosPorTicket).forEach(key => {
      this.empleadosPorTicket[key] = null;
    });
  }

  refrescar() {
    this.cargarDatos();
  }
}