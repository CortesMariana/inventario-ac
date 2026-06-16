import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subject, takeUntil } from 'rxjs';
import { BaseComponent } from 'src/app/shared/base/base.component';
import { SolicitudesAdminService } from '../solicitudes-admin.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TecnicoRH, TecnicosRhService } from '../tecnicos-rh.service';

@Component({
  selector: 'app-detalle-solicitud-admin',
  templateUrl: './detalle-solicitud-admin.component.html',
  styleUrls: ['./detalle-solicitud-admin.component.css']
})
export class DetalleSolicitudAdminComponent extends BaseComponent implements OnInit, OnDestroy {
  solicitud: any = null;
  solicitudId: string = '';
  cargando: boolean = false;
  cargandoAccion: boolean = false;
  
  mostrarCambioEstatus: boolean = false;
  mostrarComentario: boolean = false;
  estatusSeleccionado: string = '';
  formComentario!: FormGroup;
  
  opcionesEstatus: any[] = [
    { label: 'En revisión', value: 'En revision', icon: 'pi pi-hourglass', color: '#ffc107' },
    { label: 'Aprobada', value: 'Aprobada', icon: 'pi pi-check-circle', color: '#28a745' },
    { label: 'Rechazada', value: 'Rechazada', icon: 'pi pi-times-circle', color: '#dc3545' },
    { label: 'Completada', value: 'Completada', icon: 'pi pi-check', color: '#6c757d' },
    { label: 'Cancelada', value: 'Cancelada', icon: 'pi pi-ban', color: '#6c757d' }
  ];

  tecnicos: TecnicoRH[] = [];
  mostrarAsignar: boolean = false;
  tecnicoSeleccionado: string = '';
  cargandoTecnicos: boolean = false;
  
  private destroy$ = new Subject<void>();

  constructor(
    protected override messageService: MessageService,
    private route: ActivatedRoute,
    private router: Router,
    private solicitudesAdminSrv: SolicitudesAdminService,
    private fb: FormBuilder,
    private tecnicosSrv: TecnicosRhService
  ) {
    super(messageService);
  }

  ngOnInit() {
    this.solicitudId = this.route.snapshot.paramMap.get('id') || '';
    this.initForm();
    this.cargarSolicitud();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initForm() {
    this.formComentario = this.fb.group({
      comentario: ['', [Validators.required, Validators.maxLength(500)]]
    });
  }

  async cargarSolicitud() {
    if (!this.solicitudId) return;
    
    this.cargando = true;
    try {
      this.solicitud = await this.solicitudesAdminSrv.getSolicitudDetail(this.solicitudId);
    } catch (error) {
      console.error('Error al cargar solicitud:', error);
      this.handleAlertType('ERROR', 'Error al cargar la solicitud');
      this.router.navigate(['/rh/admin/solicitudes']);
    } finally {
      this.cargando = false;
    }
  }

  abrirCambioEstatus(estatus: string) {
    this.estatusSeleccionado = estatus;
    this.mostrarCambioEstatus = true;
    this.formComentario.reset();
  }

  async confirmarCambioEstatus() {
    if (this.formComentario.invalid) {
      this.formComentario.markAllAsTouched();
      return;
    }

    this.cargandoAccion = true;
    try {
      await this.solicitudesAdminSrv.cambiarEstatus(
        this.solicitudId,
        this.estatusSeleccionado,
        this.formComentario.get('comentario')?.value
      );
      
      this.handleAlertType('SUCCESS', `Solicitud ${this.estatusSeleccionado.toLowerCase()}`);
      this.mostrarCambioEstatus = false;
      await this.cargarSolicitud(); 
      
    } catch (error) {
      console.error('Error al cambiar estatus:', error);
      this.handleAlertType('ERROR', 'Error al cambiar el estatus');
    } finally {
      this.cargandoAccion = false;
    }
  }

  abrirComentario() {
    this.mostrarComentario = true;
    this.formComentario.reset();
  }

  async agregarComentario() {
    if (this.formComentario.invalid) return;

    this.cargandoAccion = true;
    try {
      await this.solicitudesAdminSrv.agregarComentario(
        this.solicitudId,
        this.formComentario.get('comentario')?.value
      );
      
      this.handleAlertType('SUCCESS', 'Comentario agregado');
      this.mostrarComentario = false;
      await this.cargarSolicitud();
      
    } catch (error) {
      console.error('Error al agregar comentario:', error);
      this.handleAlertType('ERROR', 'Error al agregar comentario');
    } finally {
      this.cargandoAccion = false;
    }
  }

  getEstatusIcon(estatus: string): string {
    const icons: Record<string, string> = {
      'Nueva': 'pi pi-plus-circle',
      'En revision': 'pi pi-hourglass',
      'Aprobada': 'pi pi-check-circle',
      'Rechazada': 'pi pi-times-circle',
      'Completada': 'pi pi-check',
      'Cancelada': 'pi pi-ban'
    };
    return icons[estatus] || 'pi pi-question-circle';
  }

  getEstatusColor(estatus: string): string {
    const colors: Record<string, string> = {
      'Nueva': '#17a2b8',
      'En revision': '#ffc107',
      'Aprobada': '#28a745',
      'Rechazada': '#dc3545',
      'Completada': '#6c757d',
      'Cancelada': '#6c757d'
    };
    return colors[estatus] || '#6c757d';
  }

  formatFecha(fecha: any): string {
    if (!fecha) return 'N/A';
    try {
      const date = fecha.toDate ? fecha.toDate() : new Date(fecha);
      return date.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Fecha inválida';
    }
  }

  formatMonto(monto: number): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(monto);
  }

  volver() {
    this.router.navigate(['/rh/admin/solicitudes']);
  }

  getIconoTipo(tipo: string): string {
    const icons: Record<string, string> = {
        'vacaciones': 'pi pi-sun',
        'permiso': 'pi pi-calendar-plus',
        'incapacidad': 'pi pi-heart',
        'prestamo': 'pi pi-credit-card',
        'constancia': 'pi pi-file-pdf',
        'cambio-datos': 'pi pi-pencil',
        'otro': 'pi pi-file'
    };
    return icons[tipo] || 'pi pi-file';
    }

  getColorPrioridad(prioridad: string): string {
    const colors: Record<string, string> = {
        'urgente': '#dc3545',
        'alta': '#fd7e14',
        'media': '#ffc107',
        'baja': '#28a745'
    };
    return colors[prioridad] || '#6c757d';
  }

  async cargarTecnicos() {
    this.cargandoTecnicos = true;
    try {
      this.tecnicos = await this.tecnicosSrv.getTecnicosActivos();
    } catch (error) {
      console.error('Error al cargar técnicos:', error);
      this.handleAlertType('ERROR', 'Error al cargar técnicos');
    } finally {
      this.cargandoTecnicos = false;
    }
  }

  abrirAsignar() {
    this.cargarTecnicos();
    this.tecnicoSeleccionado = this.solicitud?.asignadoA?.id || '';
    this.mostrarAsignar = true;
  }

  async asignarSolicitud() {
    if (!this.tecnicoSeleccionado) {
      this.handleAlertType('WARNING', 'Seleccione un técnico');
      return;
    }

    this.cargandoAccion = true;
    try {
      const tecnico = this.tecnicos.find(t => t.id === this.tecnicoSeleccionado);
      
      await this.solicitudesAdminSrv.asignarSolicitud(this.solicitudId, {
        id: tecnico!.id,
        nombre: tecnico!.nombre,
        fechaAsignacion: new Date()
      });
      
      await this.solicitudesAdminSrv.agregarComentario(
        this.solicitudId,
        `Solicitud asignada a ${tecnico!.nombre}`,
        'sistema'
      );
      
      this.handleAlertType('SUCCESS', `Solicitud asignada a ${tecnico!.nombre}`);
      this.mostrarAsignar = false;
      await this.cargarSolicitud();
      
    } catch (error) {
      console.error('Error al asignar solicitud:', error);
      this.handleAlertType('ERROR', 'Error al asignar la solicitud');
    } finally {
      this.cargandoAccion = false;
    }
  }

}