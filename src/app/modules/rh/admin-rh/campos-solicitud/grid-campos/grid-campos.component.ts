import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subject, takeUntil } from 'rxjs';
import { BaseComponent } from 'src/app/shared/base/base.component';
import { CamposSolicitudService } from '../campos-solicitud.service';
import { CampoConfiguracion } from '../models/campo-solicitud.model';

@Component({
  selector: 'app-grid-campos',
  templateUrl: './grid-campos.component.html',
  styleUrls: ['./grid-campos.component.css']
})
export class GridCamposComponent extends BaseComponent implements OnInit, OnDestroy {
  campos: CampoConfiguracion[] = [];
  camposFiltrados: CampoConfiguracion[] = [];
  cargando: boolean = false;
  
  filtroTipoSolicitud: string = 'todos';
  filtroActivo: boolean = true;
  
  tiposSolicitud: any[] = [];
  
  campoSeleccionado: CampoConfiguracion | null = null;
  mostrarModalDuplicar: boolean = false;
  campoDuplicar: Partial<CampoConfiguracion> = {};
  
  private destroy$ = new Subject<void>();

  constructor(
    protected override messageService: MessageService,
    private camposSrv: CamposSolicitudService,
    private router: Router
  ) {
    super(messageService);
  }

  async ngOnInit() {
    await this.cargarTiposSolicitud(); 
    this.cargarCampos();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async cargarCampos() {
    this.cargando = true;
    try {
      this.campos = await this.camposSrv.getCampos();
      this.aplicarFiltros();
    } catch (error) {
      console.error('Error al cargar campos:', error);
      this.handleAlertType('ERROR', 'Error al cargar la configuración de campos');
    } finally {
      this.cargando = false;
    }
  }

  async cargarTiposSolicitud() {
    try {
      this.tiposSolicitud = await this.camposSrv.getTiposSolicitudParaDropdown();
      console.log('Tipos cargados en grid-campos:', this.tiposSolicitud);
    } catch (error) {
      console.error('Error al cargar tipos de solicitud:', error);
      this.tiposSolicitud = [
        { label: 'Todos los tipos', value: 'todos', icon: 'pi pi-globe' },
        { label: 'Vacaciones', value: 'vacaciones', icon: 'pi pi-sun' },
        { label: 'Permiso', value: 'permiso', icon: 'pi pi-calendar-plus' },
        { label: 'Incapacidad', value: 'incapacidad', icon: 'pi pi-heart' },
        { label: 'Préstamo', value: 'prestamo', icon: 'pi pi-credit-card' },
        { label: 'Constancia', value: 'constancia', icon: 'pi pi-file-pdf' },
        { label: 'Cambio de datos', value: 'cambio-datos', icon: 'pi pi-pencil' },
        { label: 'Otro', value: 'otro', icon: 'pi pi-file' }
      ];
    }
  }

  aplicarFiltros() {
    let filtrados = [...this.campos];
    
    if (this.filtroTipoSolicitud !== 'todos') {
      filtrados = filtrados.filter(c => 
        c.tipoSolicitud === this.filtroTipoSolicitud || c.tipoSolicitud === 'todos'
      );
    }
    
    filtrados = filtrados.filter(c => c.activo === this.filtroActivo);
    
    this.camposFiltrados = filtrados;
  }

  limpiarFiltros() {
    this.filtroTipoSolicitud = 'todos';
    this.filtroActivo = true;
    this.aplicarFiltros();
  }

  getTipoSolicitudLabel(tipo: string): string {
    if (!this.tiposSolicitud || this.tiposSolicitud.length === 0) return tipo;
    const found = this.tiposSolicitud.find(t => t.value === tipo);
    return found ? found.label : tipo;
  }

  getTipoCampoIcon(tipo: string): string {
    const tipos: any = {
      'texto': 'pi pi-pencil',
      'textarea': 'pi pi-align-left',
      'numero': 'pi pi-sort-numeric',
      'fecha': 'pi pi-calendar',
      'select': 'pi pi-caret-down',
      'radio': 'pi pi-circle',
      'checkbox': 'pi pi-check-square',
      'archivo': 'pi pi-file'
    };
    return tipos[tipo] || 'pi pi-tag';
  }

  getTipoCampoLabel(tipo: string): string {
    const tipos: any = {
      'texto': 'Texto',
      'textarea': 'Área texto',
      'numero': 'Número',
      'fecha': 'Fecha',
      'select': 'Lista',
      'radio': 'Radio',
      'checkbox': 'Checkbox',
      'archivo': 'Archivo'
    };
    return tipos[tipo] || tipo;
  }

  getCategoriaLabel(categoria: string): string {
    const categorias: any = {
      'basico': 'Básico',
      'contacto': 'Contacto',
      'fechas': 'Fechas',
      'economico': 'Económico',
      'documentos': 'Documentos',
      'otro': 'Otro'
    };
    return categorias[categoria] || categoria;
  }

  getCategoriaColor(categoria: string): string {
    const colores: any = {
      'basico': '#667eea',
      'contacto': '#38a169',
      'fechas': '#ed8936',
      'economico': '#9f7aea',
      'documentos': '#f56565',
      'otro': '#a0aec0'
    };
    return colores[categoria] || '#a0aec0';
  }

  nuevoCampo() {
    this.router.navigate(['/rh/admin/campos/nuevo']);
  }

  editarCampo(campo: CampoConfiguracion) {
    this.router.navigate(['/rh/admin/campos/editar', campo.firestoreId]);
  }

  async toggleActivo(campo: CampoConfiguracion, event: any) {
    event.stopPropagation();
    try {
      await this.camposSrv.actualizarCampo(campo.firestoreId!, {
        activo: !campo.activo
      });
      campo.activo = !campo.activo;
      this.aplicarFiltros();
      this.handleAlertType('SUCCESS', 
        campo.activo ? 'Campo activado' : 'Campo desactivado'
      );
    } catch (error) {
      this.handleAlertType('ERROR', 'Error al cambiar estado del campo');
    }
  }

  abrirDuplicar(campo: CampoConfiguracion, event: any) {
    event.stopPropagation();
    this.campoSeleccionado = campo;
    this.campoDuplicar = {
      ...campo,
      nombre: `${campo.nombre}_copia`,
      etiqueta: `${campo.etiqueta} (copia)`
    };
    delete this.campoDuplicar.firestoreId;
    this.mostrarModalDuplicar = true;
  }

  async duplicarCampo() {
    if (!this.campoSeleccionado) return;
    
    try {
      await this.camposSrv.duplicarCampo(this.campoSeleccionado);
      this.handleAlertType('SUCCESS', 'Campo duplicado correctamente');
      this.mostrarModalDuplicar = false;
      this.cargarCampos();
    } catch (error) {
      this.handleAlertType('ERROR', 'Error al duplicar campo');
    }
  }

  async eliminarCampo(campo: CampoConfiguracion, event: any) {
    event.stopPropagation();
    
    if (!confirm(`¿Está seguro de eliminar el campo "${campo.etiqueta}"?`)) return;
    
    try {
      await this.camposSrv.eliminarCampo(campo.firestoreId!);
      this.handleAlertType('SUCCESS', 'Campo eliminado correctamente');
      this.cargarCampos();
    } catch (error) {
      this.handleAlertType('ERROR', 'Error al eliminar campo');
    }
  }

  async moverArriba(campo: CampoConfiguracion, event: any) {
    event.stopPropagation();
    const index = this.camposFiltrados.findIndex(c => c.firestoreId === campo.firestoreId);
    if (index > 0) {
      const campoAnterior = this.camposFiltrados[index - 1];
      await this.intercambiarOrden(campo, campoAnterior);
    }
  }

  async moverAbajo(campo: CampoConfiguracion, event: any) {
    event.stopPropagation();
    const index = this.camposFiltrados.findIndex(c => c.firestoreId === campo.firestoreId);
    if (index < this.camposFiltrados.length - 1) {
      const campoSiguiente = this.camposFiltrados[index + 1];
      await this.intercambiarOrden(campo, campoSiguiente);
    }
  }

  private async intercambiarOrden(campo1: CampoConfiguracion, campo2: CampoConfiguracion) {
    const orden1 = campo1.orden;
    const orden2 = campo2.orden;
    
    try {
      await Promise.all([
        this.camposSrv.actualizarCampo(campo1.firestoreId!, { orden: orden2 }),
        this.camposSrv.actualizarCampo(campo2.firestoreId!, { orden: orden1 })
      ]);
      
      campo1.orden = orden2;
      campo2.orden = orden1;
      
      this.camposFiltrados.sort((a, b) => a.orden - b.orden);
    } catch (error) {
      this.handleAlertType('ERROR', 'Error al reordenar campos');
    }
  }
}