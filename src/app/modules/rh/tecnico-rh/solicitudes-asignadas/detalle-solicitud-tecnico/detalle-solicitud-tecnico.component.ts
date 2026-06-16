import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BaseComponent } from 'src/app/shared/base/base.component';
import { SolicitudesAsignadasService } from '../solicitudes-asignadas.service';

@Component({
  selector: 'app-detalle-solicitud-tecnico',
  templateUrl: './detalle-solicitud-tecnico.component.html',
  styleUrls: ['./detalle-solicitud-tecnico.component.css']
})
export class DetalleSolicitudTecnicoComponent extends BaseComponent implements OnInit {
  solicitud: any = null;
  solicitudId: string = '';
  cargando: boolean = false;
  cargandoAccion: boolean = false;
  
  mostrarCompletar: boolean = false;
  mostrarComentario: boolean = false;
  formComentario!: FormGroup;

  constructor(
    protected override messageService: MessageService,
    private route: ActivatedRoute,
    private router: Router,
    private solicitudesSrv: SolicitudesAsignadasService,
    private fb: FormBuilder
  ) {
    super(messageService);
  }

  ngOnInit() {
    this.solicitudId = this.route.snapshot.paramMap.get('id') || '';
    this.initForm();
    this.cargarSolicitud();
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
      this.solicitud = await this.solicitudesSrv.getSolicitudDetail(this.solicitudId);
    } catch (error) {
      console.error('Error al cargar solicitud:', error);
      this.handleAlertType('ERROR', 'Error al cargar la solicitud');
      this.router.navigate(['/rh/tecnico/solicitudes']);
    } finally {
      this.cargando = false;
    }
  }

  abrirCompletar() {
    this.mostrarCompletar = true;
    this.formComentario.reset();
  }

  async completarSolicitud() {
    if (this.formComentario.invalid) {
      this.formComentario.markAllAsTouched();
      return;
    }

    this.cargandoAccion = true;
    try {
      await this.solicitudesSrv.completarSolicitud(
        this.solicitudId,
        this.formComentario.get('comentario')?.value
      );
      
      this.handleAlertType('SUCCESS', 'Solicitud marcada como completada');
      this.mostrarCompletar = false;
      await this.cargarSolicitud();
      
    } catch (error) {
      console.error('Error al completar solicitud:', error);
      this.handleAlertType('ERROR', 'Error al completar la solicitud');
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
      await this.solicitudesSrv.agregarComentario(
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
    this.router.navigate(['/rh/tecnico/solicitudes']);
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
}