import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { BaseComponent } from 'src/app/shared/base/base.component';
import { TicketsService } from '../tickets.service';
import { UserService } from 'src/app/shared/service/user.service';
import { catchError, of } from 'rxjs';
import { ConfirmationService } from 'primeng/api';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { InsumosService } from '../../../admin/insumos/insumos.service'
import { Insumo } from '../../../admin/insumos/models/insumo.model';

interface InsumoSeleccionado {
  insumo: Insumo;
  cantidad: number;
  tipoDescuento: 'UNIDADES' | 'EMPAQUES';
}

@Component({
  selector: 'app-detalle-ticket-tecnico',
  templateUrl: './detalle-ticket-tecnico.component.html',
  styleUrls: ['./detalle-ticket-tecnico.component.css'],
  providers: [ConfirmationService]
})
export class DetalleTicketTecnicoComponent extends BaseComponent implements OnInit {
  usuario: any;

  ticket: any = null;
  ticketId: string = '';
  cargando: boolean = false;
  procesando: boolean = false;

  formComentario!: FormGroup;
  mostrarFormComentario: boolean = false;

  archivosEvidencia: File[] = [];
  subiendoEvidencias: boolean = false;

  historialEstatus: any[] = [];

  puedeEditar: boolean = false;
  puedeCancelar: boolean = false;

  mostrarDialogInsumos: boolean = false;
  insumosDisponibles: Insumo[] = [];
  insumosFiltrados: Insumo[] = [];
  insumosSeleccionados: InsumoSeleccionado[] = [];
  cargandoInsumos: boolean = false;
  filtroInsumoNombre: string = '';
  filtroInsumoMarca: string = '';

  insumosGastados: any[] = [];
  cargandoInsumosGastados: boolean = false;

  opcionesEstatus: any[] = [
    { label: 'Nuevo', value: 'Nuevo' },
    { label: 'Asignado', value: 'Asignado' },
    { label: 'En proceso', value: 'En proceso' },
    { label: 'Resuelto', value: 'Resuelto' },
    { label: 'Cerrado', value: 'Cerrado' },
    { label: 'Cancelado', value: 'Cancelado' }
  ];

  constructor(
    protected override messageService: MessageService,
    private route: ActivatedRoute,
    private router: Router,
    private ticketsService: TicketsService,
    private userSrv: UserService,
    private insumosService: InsumosService,
    private confirmationService: ConfirmationService,
    private fb: FormBuilder
  ) {
    super(messageService);
  }

  ngOnInit() {
    this.cargando = true;
    this.initFormComentario();
    this.ticketId = this.route.snapshot.paramMap.get('firestoreId') || '';
    
    if (!this.ticketId) {
      this.handleAlertType('ERROR', 'No se especificó el ticket');
      this.router.navigate(['/tecnico/tickets']);
      return;
    }

    this.cargarDatos();
  }

  initFormComentario() {
    this.formComentario = this.fb.group({
      comentario: ['', [Validators.required, Validators.minLength(5)]]
    });
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
        this.handleAlertType('ERROR', 'No se pudo obtener información del usuario');
        this.router.navigate(['/tecnico/tickets']);
        return;
      }

      await this.cargarTicket();

    } catch (error) {
      console.error('Error al cargar datos:', error);
      this.handleAlertType('ERROR', 'Error al cargar los datos del ticket');
      this.cargando = false;
    }
  }

  async cargarTicket() {
    try {
      this.ticket = await this.ticketsService.getTicket(this.ticketId);
      
      if (!this.ticket) {
        this.handleAlertType('ERROR', 'Ticket no encontrado');
        this.router.navigate(['/tecnico/tickets']);
        return;
      }

      this.verificarPermisos();
      this.procesarTicket();
      this.cargarHistorialEstatus();
      this.procesarEvidencias();
      this.cargando = false;

      await this.cargarInsumosGastados();

    } catch (error) {
      console.error('Error al cargar ticket:', error);
      this.handleAlertType('ERROR', 'Error al cargar el ticket');
      this.cargando = false;
    }
  }

  verificarPermisos() {
    if (!this.usuario || !this.usuario.id || !this.ticket) {
      this.puedeEditar = false;
      this.puedeCancelar = false;
      return;
    }

    const esCreador = this.ticket.creadoPor?.id === this.usuario.id;
    const esAsignado = this.ticket.asignadoA?.id === this.usuario.id;
    
    this.puedeEditar = esCreador || esAsignado;
    this.puedeCancelar = this.puedeEditar && 
                        this.ticket.estatus !== 'Cancelado' && 
                        this.ticket.estatus !== 'Cerrado';
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
          fecha: new Date(),
          subidoPor: this.usuario.id
        };
      }
      
      if (!evidencia.fecha) {
        evidencia.fecha = new Date();
      }
      
      return evidencia;
    });
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
    switch (prioridad?.toLowerCase()) {
      case 'crítica':
      case 'critica': return '#F44336';
      case 'alta': return '#FF9800';
      case 'mediana': return '#FFC107';
      case 'baja': return '#4CAF50';
      default: return '#607D8B';
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
    this.router.navigate(['/tecnico/tickets']);
  }

  cambiarEstatus(nuevoEstatus: string) {
    if (!this.puedeEditar) {
      this.handleAlertType('ERROR', 'No tienes permiso para modificar este ticket');
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
          id: this.usuario?.id || 'tecnico',
          nombre: this.usuario?.nombreCompleto || this.usuario?.nombre || 'Técnico',
          tipo: 'tecnico'
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
      
      const actualizado = await this.ticketsService.actualizarTicket(
        this.ticketId,
        datosActualizacion
      );
      
      if (actualizado) {
        this.ticket.estatus = nuevoEstatus;
        this.ticket.fechasEstatus = fechasEstatusActualizadas;
        this.ticket.fechaModificacion = hoy;
        this.ticket.ultimoCambioEstatus = registroCambio;
        this.ticket.historialCambiosEstatus = historialActualizado;
        
        this.cargarHistorialEstatus();
        this.verificarPermisos();

        this.handleAlertType('SUCCESS', `Ticket actualizado a "${nuevoEstatus}" por ${registroCambio.realizadoPor.nombre}`);
      } else {
        this.handleAlertType('ERROR', 'No se pudo actualizar el ticket');
      }
    } catch (error) {
      console.error('Error al actualizar estatus:', error);
      this.handleAlertType('ERROR', 'Error al actualizar el ticket');
    } finally {
      this.procesando = false;
    }
  }

  cancelarTicket() {
    if (!this.puedeCancelar) {
      this.handleAlertType('ERROR', 'No puedes cancelar este ticket');
      return;
    }

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
          id: this.usuario?.id || 'tecnico',
          nombre: this.usuario?.nombreCompleto || this.usuario?.nombre || 'Técnico',
          tipo: 'tecnico'
        },
        motivo: 'Cancelado por el técnico asignado'
      };
      
      const historialExistente = this.ticket.historialCambiosEstatus || [];
      const historialActualizado = [...historialExistente, registroCancelacion];
      
      const datosActualizacion = {
        estatus: 'Cancelado',
        fechasEstatus: fechasEstatusActualizadas,
        fechaModificacion: hoy,
        motivoCancelacion: 'Cancelado por el técnico asignado',
        canceladoPor: registroCancelacion.realizadoPor,
        fechaCancelacion: hoy,
        ultimoCambioEstatus: registroCancelacion,
        historialCambiosEstatus: historialActualizado  
      };
      
      const actualizado = await this.ticketsService.actualizarTicket(
        this.ticketId,
        datosActualizacion
      );
      
      if (actualizado) {
        this.ticket.estatus = 'Cancelado';
        this.ticket.fechasEstatus = fechasEstatusActualizadas;
        this.ticket.fechaModificacion = hoy;
        this.ticket.motivoCancelacion = 'Cancelado por el técnico asignado';
        this.ticket.canceladoPor = registroCancelacion.realizadoPor;
        this.ticket.fechaCancelacion = hoy;
        this.ticket.ultimoCambioEstatus = registroCancelacion;
        this.ticket.historialCambiosEstatus = historialActualizado;
        
        this.cargarHistorialEstatus();
        this.verificarPermisos();
        
        this.handleAlertType('WARNING', `Ticket cancelado por ${registroCancelacion.realizadoPor.nombre}`);
      } else {
        this.handleAlertType('ERROR', 'No se pudo cancelar el ticket');
      }
    } catch (error) {
      console.error('Error al cancelar ticket:', error);
      this.handleAlertType('ERROR', 'Error al cancelar el ticket');
    } finally {
      this.procesando = false;
    }
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

  quitarInsumoSeleccionado(index: number) {
    this.insumosSeleccionados.splice(index, 1);
  }

  actualizarCantidadSeleccionada(index: number, cantidad: number) {
    const item = this.insumosSeleccionados[index];
    if (!item) return;
    
    if (cantidad <= 0) {
      this.insumosSeleccionados.splice(index, 1);
      return;
    }
    
    if (item.tipoDescuento === 'UNIDADES' && item.insumo.unidadesPorEmpaque) {
      const maxUnidades = item.insumo.cantidadUnidades || (item.insumo.cantidad * item.insumo.unidadesPorEmpaque);
      if (cantidad > maxUnidades) {
        this.handleAlertType('WARNING', `No hay suficientes ${item.insumo.tipoContenido === 'METROS' ? 'metros' : 'piezas'}. Disponibles: ${maxUnidades}`);
        item.cantidad = maxUnidades;
        return;
      }
    } else {
      if (cantidad > item.insumo.cantidad) {
        this.handleAlertType('WARNING', `No hay suficiente stock de ${item.insumo.nombre}. Stock: ${item.insumo.cantidad} ${item.insumo.tipoEmpaque}(s)`);
        item.cantidad = item.insumo.cantidad;
        return;
      }
    }
    
    item.cantidad = cantidad;
  }

  cambiarTipoDescuento(index: number, tipo: 'UNIDADES' | 'EMPAQUES') {
    const item = this.insumosSeleccionados[index];
    if (!item) return;
    
    item.tipoDescuento = tipo;
    item.cantidad = 1;
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
          const resultado = await this.insumosService.decrementarPorUnidades(
            item.insumo.firestoreId!,
            item.cantidad,
            { id: this.usuario.id, nombre: this.usuario.nombreCompleto || this.usuario.nombre },
            `Uso en ticket #${this.ticket.folio} - ${this.ticket.titulo}`,
            `Ticket #${this.ticket.folio}`,
            this.ticketId
          );
          exitos.push(`${item.insumo.nombre}: ${item.cantidad} ${item.insumo.tipoContenido === 'METROS' ? 'metros' : 'piezas'} ${resultado.success ? '✓' : '✗'}`);
        } else {
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

    if (!this.puedeEditar) {
      this.handleAlertType('ERROR', 'No tienes permiso para comentar en este ticket');
      return;
    }

    this.procesando = true;
    
    try {
      const comentario = this.formComentario.get('comentario')?.value;
      
      const agregado = await this.ticketsService.addCommentToTicket(
        this.ticketId,
        this.usuario.id,
        comentario,
        this.usuario.nombreCompleto || `${this.usuario.nombre} ${this.usuario.apellidoPaterno}`
      );
      
      if (agregado) {
        this.handleAlertType('SUCCESS', 'Comentario agregado correctamente');
        this.formComentario.reset();
        this.mostrarFormComentario = false;
        
        await this.cargarTicket();
      } else {
        this.handleAlertType('ERROR', 'No se pudo agregar el comentario');
      }
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

    if (!this.puedeEditar) {
      this.handleAlertType('ERROR', 'No tienes permiso para agregar evidencias');
      return;
    }

    this.subiendoEvidencias = true;
    
    try {
      for (const archivo of this.archivosEvidencia) {
        try {
          const downloadURL = await this.ticketsService.uploadEvidenceFile(archivo, this.ticketId);
          
          const evidenceData = {
            url: downloadURL,
            nombre: archivo.name,
            tipo: archivo.type,
            tamaño: archivo.size,
            subidoPor: this.usuario.id
          };
          
          await this.ticketsService.addEvidenceToTicket(
            this.ticketId,
            this.usuario.id,
            evidenceData
          );
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
}