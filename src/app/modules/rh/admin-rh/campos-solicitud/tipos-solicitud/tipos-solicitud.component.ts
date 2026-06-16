import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { BaseComponent } from 'src/app/shared/base/base.component';
import { TiposSolicitudService } from '../tipos-solicitud.service';
import { TipoSolicitud } from '../models/tipo-solicitud.model';

@Component({
  selector: 'app-tipos-solicitud',
  templateUrl: './tipos-solicitud.component.html',
  styleUrls: ['./tipos-solicitud.component.css']
})
export class TiposSolicitudComponent extends BaseComponent implements OnInit {
  tipos: TipoSolicitud[] = [];
  tipoForm: FormGroup;
  mostrarModal: boolean = false;
  editando: boolean = false;
  tipoSeleccionado: TipoSolicitud | null = null;
  cargando: boolean = false;

  iconosDisponibles: string[] = [
    'pi pi-sun', 'pi pi-calendar-plus', 'pi pi-heart', 'pi pi-credit-card',
    'pi pi-file-pdf', 'pi pi-pencil', 'pi pi-file', 'pi pi-user',
    'pi pi-briefcase', 'pi pi-clock', 'pi pi-dollar', 'pi pi-chart-line'
  ];

  coloresDisponibles: string[] = [
    '#4299e1', '#48bb78', '#f56565', '#9f7aea', '#ed8936', '#667eea',
    '#a0aec0', '#38a169', '#e53e3e', '#805ad5', '#dd6b20', '#3182ce'
  ];

  constructor(
    protected override messageService: MessageService,
    private tiposSrv: TiposSolicitudService,
    private fb: FormBuilder
  ) {
    super(messageService);
    
    this.tipoForm = this.fb.group({
      valor: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
      etiqueta: ['', Validators.required],
      descripcion: [''],
      icono: ['pi pi-file', Validators.required],
      color: ['#4299e1'],
      orden: [0, Validators.required],
      activo: [true],
      requiereAprobacion: [true],
      diasMaximos: [null],
      montoMaximo: [null]
    });
  }

  ngOnInit() {
    this.cargarTipos();
  }

  async cargarTipos() {
    this.cargando = true;
    try {
      this.tipos = await this.tiposSrv.getTodosLosTipos();
    } catch (error) {
      this.handleAlertType('ERROR', 'Error al cargar tipos');
    } finally {
      this.cargando = false;
    }
  }

  abrirNuevo() {
    this.editando = false;
    this.tipoSeleccionado = null;
    this.tipoForm.reset({
      icono: 'pi pi-file',
      color: '#4299e1',
      orden: this.tipos.length,
      activo: true,
      requiereAprobacion: true
    });
    this.mostrarModal = true;
  }

  abrirEditar(tipo: TipoSolicitud) {
    this.editando = true;
    this.tipoSeleccionado = tipo;
    this.tipoForm.patchValue(tipo);
    this.mostrarModal = true;
  }

  async guardar() {
    if (this.tipoForm.invalid) {
      this.tipoForm.markAllAsTouched();
      this.handleAlertType('WARNING', 'Formulario incompleto');
      return;
    }

    this.cargando = true;
    try {
      if (this.editando && this.tipoSeleccionado?.firestoreId) {
        await this.tiposSrv.actualizarTipo(
          this.tipoSeleccionado.firestoreId, 
          this.tipoForm.value
        );
        this.handleAlertType('SUCCESS', 'Tipo actualizado');
      } else {
        await this.tiposSrv.guardarTipo(this.tipoForm.value);
        this.handleAlertType('SUCCESS', 'Tipo creado');
      }
      this.mostrarModal = false;
      this.cargarTipos();
    } catch (error) {
      this.handleAlertType('ERROR', 'Error al guardar');
    } finally {
      this.cargando = false;
    }
  }

  async eliminar(tipo: TipoSolicitud) {
    if (confirm(`¿Eliminar el tipo "${tipo.etiqueta}"?`)) {
      try {
        await this.tiposSrv.eliminarTipo(tipo.firestoreId!);
        this.handleAlertType('SUCCESS', 'Tipo desactivado');
        this.cargarTipos();
      } catch (error) {
        this.handleAlertType('ERROR', 'Error al eliminar');
      }
    }
  }
}