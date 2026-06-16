import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { BaseComponent } from 'src/app/shared/base/base.component';
import { TicketService } from '../tickets.service';
import { ConfirmationService } from 'primeng/api';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TecnicoService } from '../../tecnicos/tecnicos.service';
import { Tecnico } from '../../tecnicos/models/tecnico.model';
import { InsumosService } from '../../../admin/insumos/insumos.service'
import { Insumo } from '../../../admin/insumos/models/insumo.model';
import { UserService } from 'src/app/shared/service/user.service';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-detalle-ticket',
  templateUrl: './detalle-ticket.component.html',
  styleUrls: ['./detalle-ticket.component.css'],
  providers: [ConfirmationService]
})
export class DetalleTicketAdminComponent extends BaseComponent implements OnInit {
  ticket: any = null;
  ticketId: string = '';
  cargando: boolean = false;
  procesando: boolean = false;

  tecnicos: Tecnico[] = [];
  
  historialReasignaciones: any[] = [];
  tecnicosRechazados: string[] = [];
  intentosReasignacion: number = 0;
  
  formComentario!: FormGroup;
  formAsignacion!: FormGroup;
  mostrarFormComentario: boolean = false;
  mostrarFormAsignacion: boolean = false;

  archivosEvidencia: File[] = [];
  subiendoEvidencias: boolean = false;

  insumosSeleccionados: { insumo: Insumo, cantidad: number, tipoDescuento: 'UNIDADES' | 'EMPAQUES' }[] = [];

  historialEstatus: any[] = [];
  historialModificaciones: any[] = [];

  opcionesEstatus: any[] = [
    { label: 'Nuevo', value: 'Nuevo' },
    { label: 'Asignado', value: 'Asignado' },
    { label: 'En proceso', value: 'En proceso' },
    { label: 'Resuelto', value: 'Resuelto' },
    { label: 'Cerrado', value: 'Cerrado' },
    { label: 'Cancelado', value: 'Cancelado' },
    { label: 'Rechazado', value: 'Rechazado' }
  ];

  opcionesTecnicos: any[] = [];

  mostrarDialogInsumos: boolean = false;
  insumosDisponibles: Insumo[] = [];
  insumosFiltrados: Insumo[] = [];
  cargandoInsumos: boolean = false;
  filtroInsumoNombre: string = '';
  filtroInsumoMarca: string = '';

  usuario: any;

  insumosGastados: any[] = [];
  cargandoInsumosGastados: boolean = false;

  constructor(
    protected override messageService: MessageService,
    private route: ActivatedRoute,
    private router: Router,
    private ticketService: TicketService,
    private tecnicoService: TecnicoService,
    private confirmationService: ConfirmationService,
    private insumosService: InsumosService,
    private userSrv: UserService,
    private fb: FormBuilder
  ) {
    super(messageService);
  }

  ngOnInit() {
    this.cargando = true;
    
    this.initFormComentario();
    this.initFormAsignacion();
    
    this.ticketId = this.route.snapshot.paramMap.get('firestoreId') || '';
    
    if (!this.ticketId) {
      this.handleAlertType('ERROR', 'No se especificó el ticket');
      this.router.navigate(['/admin/tickets']);
      return;
    }
    this.cargarDatos();
  }

  async cargarDatos() {
    try {
      this.usuario = await this.userSrv.consultarEmpleado().pipe(
        catchError((error) => {
          console.error('Error al obtener usuario:', error);
          return of(null);
        })
      ).toPromise();

      if (!this.usuario) {
        this.usuario = {
          id: 'admin',
          nombreCompleto: 'Administrador',
          nombre: 'Administrador'
        };
      }

      const tecnicosData = await this.tecnicoService.getTecnicos().toPromise() || [];
      this.tecnicos = this.prepararTecnicos(tecnicosData);
      
      await this.cargarTicket();

    } catch (error) {
      console.error('Error al cargar datos:', error);
      this.handleAlertType('ERROR', 'Error al cargar los datos del ticket');
      this.cargando = false;
    }
  }

  prepararTecnicos(tecnicos: Tecnico[]): Tecnico[] {
    return tecnicos
      .filter(tecnico => tecnico.activo !== false) 
      .sort((a, b) => {
        const numA = a.numeroConsecutivo || 999999;
        const numB = b.numeroConsecutivo || 999999;
        return numA - numB;
      });
  }

  getOpcionesTecnicos(): any[] {
    const tecnicosActivos = this.tecnicos.filter(tecnico => tecnico.activo !== false);
    
    const tecnicosOrdenados = tecnicosActivos.sort((a, b) => {
      const numA = a.numeroConsecutivo || 999999;
      const numB = b.numeroConsecutivo || 999999;
      if (numA !== numB) return numA - numB;
      return (a.nombre || '').localeCompare(b.nombre || '');
    });
    
    return tecnicosOrdenados.map(tecnico => ({
      label: `${tecnico.nombre} - ${tecnico.tecnicoId || 'Sin ID'} ${tecnico.tipo ? `(${tecnico.tipo})` : ''}`,
      value: tecnico.empleadoId,
      data: tecnico
    }));
  }

  async cargarTicket() {
    try {
      this.ticket = await this.ticketService.getTicket(this.ticketId);
      
      if (!this.ticket) {
        this.handleAlertType('ERROR', 'Ticket no encontrado');
        this.router.navigate(['/admin/tickets']);
        return;
      }

      this.opcionesTecnicos = this.getOpcionesTecnicos();

      if (this.ticket.asignadoA?.id) {
        const tecnicoAsignado = this.tecnicos.find(t => t.empleadoId === this.ticket.asignadoA.id);
        this.formAsignacion.patchValue({
          tecnicoId: tecnicoAsignado ? tecnicoAsignado.empleadoId : null
        });
      }

      this.procesarTicket();
      this.cargarHistorialEstatus();
      this.cargarHistorialReasignaciones();
      this.procesarEvidencias();
      this.cargarInformacionReasignacion();
      this.cargarHistorialCambiosEstatus();

      this.cargando = false;
      await this.cargarInsumosGastados();

    } catch (error) {
      console.error('Error al cargar ticket:', error);
      this.handleAlertType('ERROR', 'Error al cargar el ticket');
      this.cargando = false;
    }
  }

  cargarHistorialReasignaciones() {
    this.historialReasignaciones = [];
    
    if (!this.ticket.historialReasignaciones) {
      return;
    }

    this.historialReasignaciones = this.ticket.historialReasignaciones
      .map((item: any) => {
        const fecha = this.getFecha(item.fecha);
        const fechaFormatted = fecha ? this.formatFecha(fecha) : 'Fecha no disponible';
        const fechaOrden = fecha ? fecha.getTime() : 0;
        
        let tecnicoIdRelevante = '';
        let accionEspecifica = item.accion;
        
        if (item.accion === 'reasignado') {
          tecnicoIdRelevante = item.tecnicoIdNuevo;
        } else if (item.accion === 'rechazado' || item.accion === 'aceptado') {
          tecnicoIdRelevante = item.tecnicoIdAnterior || item.tecnicoId;
        } else {
          tecnicoIdRelevante = item.tecnicoId || item.tecnicoIdAnterior || item.tecnicoIdNuevo;
        }
        
        return {
          ...item,
          fechaFormatted: fechaFormatted,
          fechaOrden: fechaOrden,
          tecnicoIdRelevante: tecnicoIdRelevante,
          tecnicoNombreRelevante: this.getNombreTecnicoDirecto(item) 
        };
      })
      .sort((a: any, b: any) => b.fechaOrden - a.fechaOrden); 
  }

  getNombreTecnicoDirecto(item: any): string {
    if (item.accion === 'reasignado') {
      return item.tecnicoNombreNuevo || `Técnico (ID: ${item.tecnicoIdNuevo})`;
    }
    
    if (item.accion === 'rechazado' || item.accion === 'aceptado') {
      return item.tecnicoNombreAnterior || item.tecnicoNombre || `Técnico (ID: ${item.tecnicoIdAnterior || item.tecnicoId})`;
    }
    
    return item.tecnicoNombre || `Técnico (ID: ${item.tecnicoId})`;
  }

  cargarInformacionReasignacion() {
    this.tecnicosRechazados = this.ticket.tecnicosRechazados || [];
    this.intentosReasignacion = this.ticket.intentosReasignacion || 0;
  }

  getTecnicoInfo(tecnicoId: string): Tecnico | null {
    const tecnico = this.tecnicos.find(t => t.empleadoId === tecnicoId);
    return tecnico || null;
  }

  getNombreTecnico(tecnicoId: string, historialItem: any): string {
    if (historialItem.tecnicoNombreAnterior && tecnicoId === historialItem.tecnicoIdAnterior) {
      return historialItem.tecnicoNombreAnterior;
    }
    
    if (historialItem.tecnicoNombreNuevo && tecnicoId === historialItem.tecnicoIdNuevo) {
      return historialItem.tecnicoNombreNuevo;
    }
    
    if (historialItem.tecnicoNombre) {
      return historialItem.tecnicoNombre;
    }
    
    const tecnico = this.tecnicos.find(t => t.empleadoId === tecnicoId);
    if (tecnico) {
      return tecnico.nombre;
    }
    
    return `Técnico (ID: ${tecnicoId})`;
  }

  getNumeroTecnico(tecnicoId: string, historialItem: any): string {
    if (!tecnicoId || tecnicoId === 'undefined') {
      return 'ID no disponible';
    }
    
    const tecnico = this.tecnicos.find(t => t.empleadoId === tecnicoId);
    if (tecnico?.tecnicoId) {
      return tecnico.tecnicoId;
    }
    
    if (tecnico?.numeroConsecutivo) {
      return `Nº ${tecnico.numeroConsecutivo}`;
    }
    
    return `ID: ${tecnicoId}`;
  }

  getTextoAccion(historialItem: any): string {
    const accion = historialItem.accion;
    
    switch (accion) {
      case 'aceptado':
        return 'Aceptó el ticket';
      case 'rechazado':
        return 'Rechazó el ticket';
      case 'reasignado':
        const reasignadoPor = historialItem.asignadoPor?.nombre || 'Administrador';
        return `Reasignado por ${reasignadoPor}`;
      default:
        return accion;
    }
  }

  getClaseAccion(accion: string): string {
    switch (accion) {
      case 'aceptado':
        return 'accion-aceptado';
      case 'rechazado':
        return 'accion-rechazado';
      case 'reasignado':
        return 'accion-reasignado';
      default:
        return 'accion-default';
    }
  }

  getIconoAccion(accion: string): string {
    switch (accion) {
      case 'aceptado':
        return 'pi pi-check-circle';
      case 'rechazado':
        return 'pi pi-times-circle';
      case 'reasignado':
        return 'pi pi-sync';
      default:
        return 'pi pi-info-circle';
    }
  }

  getResumenReasignaciones(): string {
    if (this.intentosReasignacion === 0) {
      return 'No ha sido reasignado';
    }
    
    if (this.intentosReasignacion === 1) {
      return 'Reasignado 1 vez';
    }
    
    return `Reasignado ${this.intentosReasignacion} veces`;
  }

  getNombresTecnicosRechazados(): string {
    if (!this.tecnicosRechazados || this.tecnicosRechazados.length === 0) {
      return 'Ninguno';
    }
    
    const nombres = this.tecnicosRechazados
      .slice(0, 3)
      .map(id => {
        const tecnico = this.tecnicos.find(t => t.empleadoId === id);
        return tecnico ? tecnico.nombre : `Técnico ${id}`;
      });
    
    if (this.tecnicosRechazados.length > 3) {
      return `${nombres.join(', ')} y ${this.tecnicosRechazados.length - 3} más`;
    }
    
    return nombres.join(', ');
  }

  initFormComentario() {
    this.formComentario = this.fb.group({
      comentario: ['', [Validators.required, Validators.minLength(5)]]
    });
  }

  initFormAsignacion() {
    this.formAsignacion = this.fb.group({
      tecnicoId: ['', [Validators.required]]
    });
  }

  procesarEvidencias() {
    if (!this.ticket.evidencias) {
      this.ticket.evidencias = [];
      return;
    }

    this.ticket.evidencias = this.ticket.evidencias.map((evidencia: any) => {
      if (typeof evidencia === 'string') {
        return {
          url: evidencia,
          nombre: 'Evidencia',
          fecha: new Date()
        };
      }

      if (!evidencia.fecha) {
        evidencia.fecha = new Date();
      }
      
      return evidencia;
    });
  }

  procesarTicket() {
    this.ticket.fechaCreacionFormatted = this.formatFecha(this.ticket.fechaCreacion);
    this.ticket.fechaLimiteFormatted = this.ticket.fechaLimite ? 
      this.formatFecha(this.ticket.fechaLimite) : 'Sin fecha límite';
    
    if (this.ticket.fechaLimite) {
      const fechaLimite = this.getFecha(this.ticket.fechaLimite);
      if (fechaLimite) {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        fechaLimite.setHours(0, 0, 0, 0);
        this.ticket.vencido = fechaLimite < hoy && 
          !['Resuelto', 'Cerrado', 'Cancelado'].includes(this.ticket.estatus);
      } else {
        this.ticket.vencido = false;
      }
    } else {
      this.ticket.vencido = false;
    }

    if (this.ticket.fechaLimite && !this.ticket.vencido) {
      const fechaLimite = this.getFecha(this.ticket.fechaLimite);
      if (fechaLimite) {
        const hoy = new Date();
        const diffTime = fechaLimite.getTime() - hoy.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        this.ticket.diasRestantes = diffDays >= 0 ? diffDays : 0;
      } else {
        this.ticket.diasRestantes = null;
      }
    } else {
      this.ticket.diasRestantes = null;
    }

    this.ticket.colorPrioridad = this.getColorPrioridad(this.ticket.prioridad);
    
    this.ticket.iconoTipo = this.getIconoTipo(this.ticket.tipo);
  }

  cargarHistorialEstatus() {
    this.historialEstatus = [];
    
    if (this.ticket.historialCambiosEstatus && this.ticket.historialCambiosEstatus.length > 0) {
      const cambiosOrdenados = [...this.ticket.historialCambiosEstatus].sort(
        (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
      );
      
      cambiosOrdenados.forEach((cambio: any) => {
        const estatusFormatted = this.formatarEstatus(cambio.estatusNuevo);
        this.historialEstatus.push({
          estatus: estatusFormatted,
          fecha: this.formatFecha(cambio.fecha),
          fechaOriginal: cambio.fecha,
          orden: this.getOrdenEstatus(estatusFormatted),
          realizadoPor: cambio.realizadoPor
        });
      });
      
      this.historialEstatus.sort((a, b) => a.orden - b.orden);
      return;
    }
    
    if (!this.ticket.fechasEstatus) {
      return;
    }

    const ordenEstatus = ['fechaNuevo', 'fechaAsignado', 'fechaEnProceso', 
                        'fechaResuelto', 'fechaCerrado', 'fechaCancelado'];

    ordenEstatus.forEach(fechaKey => {
      if (this.ticket.fechasEstatus[fechaKey]) {
        const estatus = fechaKey.replace('fecha', '');
        const estatusFormatted = this.formatarEstatus(estatus);
        const fecha = this.formatFecha(this.ticket.fechasEstatus[fechaKey]);
        
        this.historialEstatus.push({
          estatus: estatusFormatted,
          fecha: fecha,
          fechaOriginal: this.ticket.fechasEstatus[fechaKey],
          orden: ordenEstatus.indexOf(fechaKey),
          realizadoPor: null 
        });
      }
    });

    this.historialEstatus.sort((a, b) => a.orden - b.orden);
  }

  private getOrdenEstatus(estatus: string): number {
    const orden = {
      'Nuevo': 0,
      'Asignado': 1,
      'En Proceso': 2,
      'Resuelto': 3,
      'Cerrado': 4,
      'Cancelado': 5
    };
    return orden[estatus as keyof typeof orden] ?? 99;
  }

  formatarEstatus(estatus: string): string {
    const map: {[key: string]: string} = {
      'Nuevo': 'Nuevo',
      'Asignado': 'Asignado',
      'EnProceso': 'En Proceso',
      'Resuelto': 'Resuelto',
      'Cerrado': 'Cerrado',
      'Cancelado': 'Cancelado'
    };
    
    return map[estatus] || estatus;
  }

  private getFecha(fecha: any): Date | null {
    if (!fecha) return null;
    
    try {
      if (fecha.toDate) {
        return fecha.toDate();
      } else if (fecha instanceof Date) {
        return fecha;
      } else if (typeof fecha === 'string') {
        return new Date(fecha);
      } else if (fecha && typeof fecha === 'object' && fecha.seconds) {
        return new Date(fecha.seconds * 1000);
      }
      return null;
    } catch (error) {
      console.error('Error al convertir fecha:', error);
      return null;
    }
  }

  formatFecha(fecha: any): string {
    const date = this.getFecha(fecha);
    if (!date) return '';
    
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

  getEstatusClass(estatus: string): string {
    switch (estatus) {
      case 'Nuevo':
        return 'estatus-nuevo';
      case 'Asignado':
        return 'estatus-asignado';
      case 'En proceso':
        return 'estatus-proceso';
      case 'Resuelto':
        return 'estatus-resuelto';
      case 'Cerrado':
        return 'estatus-cerrado';
      case 'Cancelado':
        return 'estatus-cancelado';
      default:
        return 'estatus-default';
    }
  }

  getEstatusIcon(estatus: string): string {
    switch (estatus) {
      case 'Nuevo':
        return 'pi pi-plus-circle';
      case 'Asignado':
        return 'pi pi-user-check';
      case 'En proceso':
        return 'pi pi-spinner';
      case 'Resuelto':
        return 'pi pi-check-circle';
      case 'Cerrado':
        return 'pi pi-lock';
      case 'Cancelado':
        return 'pi pi-times-circle';
      default:
        return 'pi pi-ticket';
    }
  }

  getDiasRestantesText(): string {
    if (this.ticket.vencido) {
      return 'VENCIDO';
    }
    
    if (this.ticket.diasRestantes === null) {
      return 'Sin fecha';
    }
    
    if (this.ticket.diasRestantes === 0) {
      return 'Hoy vence';
    }
    
    if (this.ticket.diasRestantes === 1) {
      return '1 día';
    }
    
    return `${this.ticket.diasRestantes} días`;
  }

  getDiasRestantesClass(): string {
    if (this.ticket.vencido) {
      return 'dias-vencido';
    }
    
    if (this.ticket.diasRestantes === null) {
      return 'dias-sin-fecha';
    }
    
    if (this.ticket.diasRestantes === 0) {
      return 'dias-hoy';
    }
    
    if (this.ticket.diasRestantes <= 3) {
      return 'dias-urgente';
    }
    
    if (this.ticket.diasRestantes <= 7) {
      return 'dias-proximo';
    }
    
    return 'dias-normal';
  }

  volver() {
    this.router.navigate(['/admin/tickets']);
  }

  cambiarEstatus(nuevoEstatus: string) {
    if (nuevoEstatus === this.ticket.estatus) {
      return;
    }

    this.confirmationService.confirm({
      message: `¿Estás seguro de cambiar el estatus a "${nuevoEstatus}"?`,
      header: 'Confirmar cambio de estatus',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, cambiar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-success',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.confirmarCambioEstatus(nuevoEstatus);
      }
    });
  }

  cargarHistorialCambiosEstatus() {
    if (!this.ticket.historialCambiosEstatus) {
      this.historialModificaciones = [];
      return;
    }
    
    this.historialModificaciones = this.ticket.historialCambiosEstatus
      .map((cambio: any) => ({
        ...cambio,
        fechaFormatted: this.formatFecha(cambio.fecha),
        icono: cambio.estatusNuevo === 'Cancelado' ? 'pi pi-times-circle' : 'pi pi-refresh',
        color: cambio.estatusNuevo === 'Cancelado' ? 'text-red-500' : 'text-blue-500'
      }))
      .sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }

  async confirmarCambioEstatus(nuevoEstatus: string) {
    this.procesando = true;
    
    try {
      const fechaKey = `fecha${nuevoEstatus.replace(/\s+/g, '')}`;
      const hoy = new Date();
      
      const fechasEstatusActualizadas = { ...this.ticket.fechasEstatus };
      fechasEstatusActualizadas[fechaKey] = hoy;

      const registroCambio = {
        fecha: hoy,
        estatusAnterior: this.ticket.estatus,
        estatusNuevo: nuevoEstatus,
        realizadoPor: {
          id: this.usuario?.id || 'admin',
          nombre: this.usuario?.nombreCompleto || this.usuario?.nombre || 'Administrador',
          tipo: 'admin'
        }
      };
      
      const historialExistente = this.ticket.historialCambiosEstatus || [];
      const historialActualizado = [...historialExistente, registroCambio];
      
      const datosActualizacion = {
        estatus: nuevoEstatus,
        fechasEstatus: fechasEstatusActualizadas,
        fechaModificacion: hoy,
        ultimoCambioEstatus: registroCambio,
        historialCambiosEstatus: historialActualizado 
      };
      
      await this.ticketService.updateTicket(
        this.ticketId,
        datosActualizacion
      );
      
      this.ticket.estatus = nuevoEstatus;
      this.ticket.fechasEstatus = fechasEstatusActualizadas;
      this.ticket.fechaModificacion = hoy;
      this.ticket.ultimoCambioEstatus = registroCambio;
      this.ticket.historialCambiosEstatus = historialActualizado;
      
      this.cargarHistorialEstatus();
      
      this.handleAlertType('SUCCESS', `Ticket actualizado a "${nuevoEstatus}" por ${registroCambio.realizadoPor.nombre}`);
      
    } catch (error) {
      console.error('Error al actualizar estatus:', error);
      this.handleAlertType('ERROR', 'Error al actualizar el ticket');
    } finally {
      this.procesando = false;
    }
  }

  toggleFormAsignacion() {
    this.mostrarFormAsignacion = !this.mostrarFormAsignacion;
    if (this.mostrarFormAsignacion && this.ticket.asignadoA?.id) {
      const tecnicoAsignado = this.tecnicos.find(t => t.empleadoId === this.ticket.asignadoA.id);
      this.formAsignacion.patchValue({
        tecnicoId: tecnicoAsignado ? tecnicoAsignado.empleadoId : null
      });
    }
  }

  async asignarTicket() {
    if (this.formAsignacion.invalid) {
      this.formAsignacion.markAllAsTouched();
      return;
    }

    const tecnicoId = this.formAsignacion.get('tecnicoId')?.value;
    const tecnico = this.tecnicos.find(t => t.empleadoId === tecnicoId);
    
    if (!tecnico) {
      this.handleAlertType('ERROR', 'Técnico no encontrado');
      return;
    }

    const esReasignacion = this.ticket.asignadoA?.id && this.ticket.asignadoA.id !== tecnicoId;
    const esMismoTecnico = this.ticket.asignadoA?.id && this.ticket.asignadoA.id === tecnicoId;

    if (esMismoTecnico) {
      this.handleAlertType('WARNING', 'Este ticket ya está asignado al mismo técnico');
      return;
    }

    const mensajeConfirmacion = esReasignacion 
      ? `¿Estás seguro de REASIGNAR este ticket de ${this.ticket.asignadoA?.nombre || 'sin asignar'} a ${tecnico.nombre}?`
      : `¿Estás seguro de asignar este ticket a ${tecnico.nombre}?`;

    this.confirmationService.confirm({
      message: mensajeConfirmacion,
      header: esReasignacion ? 'Confirmar reasignación' : 'Confirmar asignación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: esReasignacion ? 'Sí, reasignar' : 'Sí, asignar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: esReasignacion ? 'p-button-warning' : 'p-button-success',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.confirmarAsignacion(tecnico, esReasignacion);
      }
    });
  }

  async confirmarAsignacion(tecnico: Tecnico, esReasignacion: boolean = false) {
    this.procesando = true;
    
    try {
      if (esReasignacion && this.ticket.asignadoA?.id) {
        await this.registrarReasignacionEnHistorial(tecnico);
      }

      const tecnicoParaAsignacion = {
        empleadoId: tecnico.empleadoId,
        nombre: tecnico.nombre,
        tipo: tecnico.tipo,
        tecnicoId: tecnico.tecnicoId,
        numeroConsecutivo: tecnico.numeroConsecutivo
      };

      const asignado = await this.ticketService.asignarTicket(this.ticketId, tecnicoParaAsignacion);
      
      if (asignado) {
        const tecnicoAsignado = {
          id: tecnico.empleadoId,
          nombre: tecnico.nombre,
          categoria: tecnico.tipo,
          tecnicoId: tecnico.tecnicoId,
          numeroConsecutivo: tecnico.numeroConsecutivo
        };

        this.ticket.asignadoA = tecnicoAsignado;
        this.ticket.estatus = 'Asignado';
        this.ticket.fechaModificacion = new Date();
        
        const fechasEstatusActualizadas = { ...this.ticket.fechasEstatus };
        fechasEstatusActualizadas['fechaAsignado'] = new Date();
        this.ticket.fechasEstatus = fechasEstatusActualizadas;
        
        this.mostrarFormAsignacion = false;
        
        this.cargarHistorialEstatus();
        this.cargarHistorialReasignaciones();
        
        const mensaje = esReasignacion 
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
      this.procesando = false;
    }
  }

  async registrarReasignacionEnHistorial(nuevoTecnico: Tecnico) {
    try {
      const historialActual = this.ticket.historialReasignaciones || [];
      const historialActualizado = [
        ...historialActual,
        {
          fecha: new Date(),
          tecnicoIdAnterior: this.ticket.asignadoA?.id,
          tecnicoNombreAnterior: this.ticket.asignadoA?.nombre,
          tecnicoIdNuevo: nuevoTecnico.empleadoId,
          tecnicoNombreNuevo: nuevoTecnico.nombre,
          accion: 'reasignado',
          asignadoPor: {
            id: this.usuario?.id || 'admin',
            nombre: this.usuario?.nombreCompleto || this.usuario?.nombre || 'Administrador',
          }
        }
      ];

      const intentosActualizados = (this.ticket.intentosReasignacion || 0) + 1;

      await this.ticketService.updateTicket(this.ticketId, {
        historialReasignaciones: historialActualizado,
        intentosReasignacion: intentosActualizados,
        fueReasignado: true
      });

    } catch (error) {
      console.error('Error al registrar reasignación:', error);
    }
  }

  cancelarTicket() {
    this.confirmationService.confirm({
      message: `¿Estás seguro de cancelar este ticket?<br>
               <small class="text-red-500">Esta acción no se puede deshacer</small>`,
      header: 'Confirmar cancelación',
      icon: 'pi pi-exclamation-triangle text-red-500',
      acceptLabel: 'Sí, cancelar',
      rejectLabel: 'No, mantener',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.confirmarCancelacion();
      }
    });
  }

  async confirmarCancelacion() {
    this.procesando = true;
    
    try {
      const hoy = new Date();
      const fechasEstatusActualizadas = { ...this.ticket.fechasEstatus };
      fechasEstatusActualizadas['fechaCancelado'] = hoy;
      
      const registroCancelacion = {
        fecha: hoy,
        estatusAnterior: this.ticket.estatus,
        estatusNuevo: 'Cancelado',
        realizadoPor: {
          id: this.usuario?.id || 'admin',
          nombre: this.usuario?.nombreCompleto || this.usuario?.nombre || 'Administrador',
          tipo: 'admin'
        },
        motivo: 'Cancelado por el administrador'
      };
      
      const historialExistente = this.ticket.historialCambiosEstatus || [];
      const historialActualizado = [...historialExistente, registroCancelacion];
      
      const datosActualizacion = {
        estatus: 'Cancelado',
        fechasEstatus: fechasEstatusActualizadas,
        fechaModificacion: hoy,
        motivoCancelacion: 'Cancelado por el administrador',
        canceladoPor: registroCancelacion.realizadoPor,
        fechaCancelacion: hoy,
        ultimoCambioEstatus: registroCancelacion,
        historialCambiosEstatus: historialActualizado  
      };
      
      await this.ticketService.updateTicket(
        this.ticketId,
        datosActualizacion
      );
      
      this.ticket.estatus = 'Cancelado';
      this.ticket.fechasEstatus = fechasEstatusActualizadas;
      this.ticket.fechaModificacion = hoy;
      this.ticket.motivoCancelacion = 'Cancelado por el administrador';
      this.ticket.canceladoPor = registroCancelacion.realizadoPor;
      this.ticket.fechaCancelacion = hoy;
      this.ticket.ultimoCambioEstatus = registroCancelacion;
      this.ticket.historialCambiosEstatus = historialActualizado;
      
      this.cargarHistorialEstatus();
      
      this.handleAlertType('WARNING', `Ticket cancelado por ${registroCancelacion.realizadoPor.nombre}`);
      
    } catch (error) {
      console.error('Error al cancelar ticket:', error);
      this.handleAlertType('ERROR', 'Error al cancelar el ticket');
    } finally {
      this.procesando = false;
    }
  }

  toggleFormComentario() {
    this.mostrarFormComentario = !this.mostrarFormComentario;
    if (!this.mostrarFormComentario) {
      this.formComentario.reset();
    }
  }

  async agregarComentario() {
    if (this.formComentario.invalid) {
      this.formComentario.markAllAsTouched();
      return;
    }

    this.procesando = true;
    
    try {
      const comentario = this.formComentario.get('comentario')?.value;
      
      const commentData = {
        texto: comentario,
        usuarioId: this.usuario?.id || 'admin',
        usuarioNombre: this.usuario?.nombreCompleto || this.usuario?.nombre || 'Administrador',
        tipo: 'admin'
      };
      
      await this.ticketService.addCommentToTicket(this.ticketId, commentData);
      
      this.handleAlertType('SUCCESS', 'Comentario agregado correctamente');
      this.formComentario.reset();
      this.mostrarFormComentario = false;
      
      await this.cargarTicket();
      
    } catch (error) {
      console.error('Error al agregar comentario:', error);
      this.handleAlertType('ERROR', 'Error al agregar el comentario');
    } finally {
      this.procesando = false;
    }
  }

  onFileSelect(event: any) {
    const files = event.target.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        this.archivosEvidencia.push(files[i]);
      }
    }
  }

  removeFile(index: number) {
    this.archivosEvidencia.splice(index, 1);
  }

  async subirEvidencias() {
    if (this.archivosEvidencia.length === 0) {
      this.handleAlertType('WARNING', 'No hay archivos seleccionados');
      return;
    }

    this.subiendoEvidencias = true;
    
    try {
      for (const archivo of this.archivosEvidencia) {
        try {
          const downloadURL = await this.ticketService.uploadEvidenceFile(archivo, this.ticketId);
          
          const evidenceData = {
            url: downloadURL,
            nombre: archivo.name,
            tipo: archivo.type,
            tamaño: archivo.size
          };
          
          await this.ticketService.addEvidenceToTicket(this.ticketId, evidenceData);
        } catch (error) {
          console.error('Error al subir evidencia:', error);
          this.handleAlertType("WARNING", `No se pudo subir el archivo: ${archivo.name}`);
        }
      }
      
      this.handleAlertType('SUCCESS', 'Evidencias subidas correctamente');
      this.archivosEvidencia = [];
      
      await this.cargarTicket();
      
    } catch (error) {
      console.error('Error al subir evidencias:', error);
      this.handleAlertType('ERROR', 'Error al subir las evidencias');
    } finally {
      this.subiendoEvidencias = false;
    }
  }

  getFileIcon(file: any): string {
    let extension = '';
    let type = '';
    
    if (file instanceof File) {
      extension = file.name.split('.').pop()?.toLowerCase() || '';
      type = file.type;
    } else if (file.url) {
      const urlParts = file.url.split('.');
      extension = urlParts.length > 1 ? urlParts.pop()?.toLowerCase() || '' : '';
      type = file.tipo || '';
    }
    
    if (type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(extension)) {
      return 'pi pi-image text-primary';
    }
    
    switch (extension) {
      case 'pdf':
        return 'pi pi-file-pdf text-red-500';
      case 'doc':
      case 'docx':
        return 'pi pi-file-word text-blue-500';
      case 'xls':
      case 'xlsx':
        return 'pi pi-file-excel text-green-500';
      case 'zip':
      case 'rar':
        return 'pi pi-file-archive text-orange-500';
      default:
        return 'pi pi-file text-gray-500';
    }
  }

  verEvidencia(url: string) {
    window.open(url, '_blank');
  }

  getSiguienteEstatus(): string {
    const secuencia = ['Nuevo', 'Asignado', 'En proceso', 'Resuelto', 'Cerrado'];
    const indiceActual = secuencia.indexOf(this.ticket.estatus);
    
    if (indiceActual === -1 || indiceActual >= secuencia.length - 1) {
      return '';
    }
    
    return secuencia[indiceActual + 1];
  }

  getTextoBotonEstatus(): string {
    const siguienteEstatus = this.getSiguienteEstatus();
    
    if (!siguienteEstatus) {
      return 'Completado';
    }
    
    const textos: {[key: string]: string} = {
      'Nuevo': 'Asignar Ticket',
      'Asignado': 'Comenzar Trabajo',
      'En proceso': 'Marcar como Resuelto',
      'Resuelto': 'Cerrar Ticket'
    };
    
    return textos[this.ticket.estatus] || `Cambiar a ${siguienteEstatus}`;
  }

  puedeAsignar(): boolean {
    return this.ticket.estatus === 'Nuevo';
  }

  puedeCambiarEstatus(): boolean {
    return !['Cancelado', 'Cerrado'].includes(this.ticket.estatus);
  }

  puedeCancelar(): boolean {
    return !['Cancelado', 'Cerrado'].includes(this.ticket.estatus);
  }

// ==================== MÉTODOS PARA INSUMOS ====================

  async abrirDialogInsumos() {
    this.mostrarDialogInsumos = true;
    this.filtroInsumoNombre = '';
    this.filtroInsumoMarca = '';
    this.insumosSeleccionados = [];
    await this.cargarInsumos();
  }

  async cargarInsumos() {
    this.cargandoInsumos = true;
    try {
      const todosInsumos = await this.insumosService.getAllInsumos();
      this.insumosDisponibles = todosInsumos.filter(i => i.activo !== false && i.cantidad > 0);
      this.aplicarFiltroInsumos();
    } catch (error) {
      console.error('Error al cargar insumos:', error);
      this.handleAlertType('ERROR', 'Error al cargar los insumos');
    } finally {
      this.cargandoInsumos = false;
    }
  }

  aplicarFiltroInsumos() {
    let filtrados = [...this.insumosDisponibles];
    
    if (this.filtroInsumoNombre) {
      filtrados = filtrados.filter(i => 
        i.nombre.toLowerCase().includes(this.filtroInsumoNombre.toLowerCase())
      );
    }
    
    if (this.filtroInsumoMarca) {
      filtrados = filtrados.filter(i => 
        i.marca.toLowerCase().includes(this.filtroInsumoMarca.toLowerCase())
      );
    }
    
    this.insumosFiltrados = filtrados;
  }

  agregarInsumoSeleccionado(insumo: Insumo) {
    const existente = this.insumosSeleccionados.find(s => s.insumo.firestoreId === insumo.firestoreId);
    if (existente) {
      existente.cantidad++;
    } else {
      this.insumosSeleccionados.push({ 
        insumo, 
        cantidad: 1,
        tipoDescuento: insumo.unidadesPorEmpaque ? 'UNIDADES' : 'EMPAQUES'
      });
    }
  }

  cambiarTipoDescuento(index: number, tipo: 'UNIDADES' | 'EMPAQUES') {
    const item = this.insumosSeleccionados[index];
    if (!item) return;
    
    item.tipoDescuento = tipo;
    item.cantidad = 1; 
  }

  quitarInsumoSeleccionado(index: number) {
    this.insumosSeleccionados.splice(index, 1);
  }

  obtenerUnidadesDisponibles(insumo: Insumo): number {
    if (!insumo.unidadesPorEmpaque) return insumo.cantidad;
    return insumo.cantidadUnidades || (insumo.cantidad * insumo.unidadesPorEmpaque);
  }

  obtenerMaxCantidad(item: { insumo: Insumo, cantidad: number, tipoDescuento: 'UNIDADES' | 'EMPAQUES' }): number {
    if (item.tipoDescuento === 'UNIDADES' && item.insumo.unidadesPorEmpaque) {
      return this.obtenerUnidadesDisponibles(item.insumo);
    } else {
      return item.insumo.cantidad;
    }
  }

  actualizarCantidadSeleccionada(index: number, cantidad: number) {
    const item = this.insumosSeleccionados[index];
    if (!item) return;
    
    const maxCantidad = this.obtenerMaxCantidad(item);
    
    if (cantidad <= 0) {
      this.insumosSeleccionados.splice(index, 1);
      return;
    }
    
    if (cantidad > maxCantidad) {
      const tipoTexto = item.tipoDescuento === 'UNIDADES' 
        ? (item.insumo.tipoContenido === 'METROS' ? 'metros' : 'piezas')
        : `${item.insumo.tipoEmpaque}s`;
      this.handleAlertType('WARNING', `No hay suficientes ${tipoTexto}. Disponibles: ${maxCantidad}`);
      item.cantidad = maxCantidad;
      return;
    }
    
    item.cantidad = cantidad;
  }

  async confirmarDescuentoInsumos() {
    if (this.insumosSeleccionados.length === 0) {
      this.handleAlertType('WARNING', 'No has seleccionado ningún insumo');
      return;
    }

    this.confirmationService.confirm({
      message: `¿Estás seguro de descontar los insumos seleccionados?<br>
               <small>Se registrará en el historial del ticket y en cada insumo.</small>`,
      header: 'Confirmar descuento de insumos',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, descontar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-success',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.realizarDescuentoInsumos();
      }
    });
  }

  async realizarDescuentoInsumos() {
    this.procesando = true;
    const errores: string[] = [];
    const exitos: string[] = [];

    for (const item of this.insumosSeleccionados) {
      try {
        if (item.tipoDescuento === 'UNIDADES' && item.insumo.unidadesPorEmpaque) {
          // Descuento por unidades (piezas/metros)
          const resultado = await this.insumosService.decrementarPorUnidades(
            item.insumo.firestoreId!,
            item.cantidad,
            { id: this.usuario.id, nombre: this.usuario.nombreCompleto || this.usuario.nombre },
            `Uso en ticket #${this.ticket.folio} - ${this.ticket.titulo}`,
            `Ticket #${this.ticket.folio}`,
            this.ticketId
          );
          const tipoTexto = item.insumo.tipoContenido === 'METROS' ? 'metros' : 'piezas';
          exitos.push(`${item.insumo.nombre}: ${item.cantidad} ${tipoTexto} ✓`);
        } else {
          // Descuento tradicional por empaques
          await this.insumosService.decrementarCantidad(
            item.insumo.firestoreId!,
            item.cantidad,
            { id: this.usuario.id, nombre: this.usuario.nombreCompleto || this.usuario.nombre },
            `Uso en ticket #${this.ticket.folio} - ${this.ticket.titulo}`,
            `Ticket #${this.ticket.folio}`,
            this.ticketId
          );
          exitos.push(`${item.insumo.nombre}: ${item.cantidad} ${item.insumo.tipoEmpaque}(s) ✓`);
        }
      } catch (error: any) {
        console.error(`Error al descontar ${item.insumo.nombre}:`, error);
        errores.push(`${item.insumo.nombre}: ${error.message || 'Error desconocido'}`);
      }
    }

    if (exitos.length > 0) {
      this.handleAlertType('SUCCESS', `Insumos descontados correctamente:<br>${exitos.join('<br>')}`);
    }
    
    if (errores.length > 0) {
      this.handleAlertType('ERROR', `Errores al descontar:<br>${errores.join('<br>')}`);
    }

    this.mostrarDialogInsumos = false;
    this.procesando = false;
  }

  obtenerTextoStock(insumo: Insumo): string {
    if (insumo.unidadesPorEmpaque && insumo.unidadesPorEmpaque > 0) {
      const unidadesTotales = insumo.cantidadUnidades || (insumo.cantidad * insumo.unidadesPorEmpaque);
      const tipoUnidad = insumo.tipoContenido === 'METROS' ? 'metros' : 'piezas';
      
      if (unidadesTotales === 0) {
        return `0 ${tipoUnidad}`;
      }
      
      if (insumo.cantidad === 0 && unidadesTotales > 0) {
        return `1 ${insumo.tipoEmpaque} (${unidadesTotales} ${tipoUnidad})`;
      }
      
      return `${insumo.cantidad} ${insumo.tipoEmpaque}${insumo.cantidad !== 1 ? 's' : ''} (${unidadesTotales} ${tipoUnidad})`;
    } else {
      return `${insumo.cantidad} ${insumo.tipoEmpaque}${insumo.cantidad !== 1 ? 's' : ''}`;
    }
  }

  getStockClassGrid(insumo: Insumo): string {
    if (insumo.activo === false) return 'stock-desactivado';
    
    let cantidadParaValidar = insumo.cantidad;
    if (insumo.unidadesPorEmpaque && insumo.unidadesPorEmpaque > 0) {
      cantidadParaValidar = insumo.cantidadUnidades || (insumo.cantidad * insumo.unidadesPorEmpaque);
    }
    
    const minimo = insumo.stockMinimo || 5;
    if (cantidadParaValidar === 0) return 'stock-critico';
    if (cantidadParaValidar <= minimo) return 'stock-bajo';
    return 'stock-normal';
  }

  async cargarInsumosGastados() {
    this.cargandoInsumosGastados = true;
    try {
      this.insumosGastados = await this.insumosService.getInsumosPorTicket(this.ticketId);
    } catch (error) {
      console.error('Error al cargar insumos gastados:', error);
    } finally {
      this.cargandoInsumosGastados = false;
    }
  }



}