import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { BaseComponent } from 'src/app/shared/base/base.component';
import { ActivosReportesService } from '../activos-reportes.service';
import { LugaresTrabajoService } from '../../empleados/lugares-trabajo.service';
import { jsPDF } from 'jspdf';
import { ActivosService } from '../activos.service';

@Component({
  selector: 'app-reportes-activos',
  templateUrl: './reportes-activos.component.html',
  styleUrls: ['./reportes-activos.component.css']
})
export class ReportesActivosComponent extends BaseComponent implements OnInit {
  
  lugaresTrabajo: any[] = [];
  subalmacenes: any[] = [];
  subalmacenesAgrupados: any[] = [];
  categorias: any[] = [];
  
  formReporteAlmacen!: FormGroup;
  formReporteCategoria!: FormGroup;
  formReporteGeneral!: FormGroup;
  
  cargando: boolean = false;
  tipoReporte: string = 'almacen';
  
  activosSubalmacen: any[] = [];
  activosPorCategoria: any[] = [];
  reporteGeneralData: any[] = [];
  
  filtroEstadoGeneral: string = 'todos';

  constructor(
    protected override messageService: MessageService,
    private fb: FormBuilder,
    private router: Router,
    private reportesService: ActivosReportesService,
    private subalmacenesService: ActivosService,
    private categoriasService: ActivosService,
    private lugaresTrabajoService: LugaresTrabajoService
  ) {
    super(messageService);
  }

  ngOnInit() {
    this.initForms();
    this.cargarDatos();
  }

  initForms() {
    this.formReporteAlmacen = this.fb.group({
      subalmacenId: ['', Validators.required]
    });

    this.formReporteCategoria = this.fb.group({
      categoriaId: ['', Validators.required],
      filtroEstado: ['noAsignados']
    });

    this.formReporteGeneral = this.fb.group({
      filtroEstado: ['todos'] 
    });
  }

  async cargarDatos() {
    this.cargando = true;
    try {
      this.lugaresTrabajo = await this.lugaresTrabajoService.getLugaresTrabajo().toPromise() || [];
      
      const jerarquia = await this.subalmacenesService.getJerarquiaCompleta();
      
      this.subalmacenesAgrupados = jerarquia.map(lugar => ({
        label: lugar.nombre,
        value: lugar.id,
        items: lugar.subalmacenes?.map((s: any) => ({
          label: s.nombre,
          value: s.id
        })) || []
      }));
      
      this.subalmacenes = jerarquia.flatMap((l: any) => l.subalmacenes || []);
      
      this.categorias = await this.categoriasService.getCategorias();
      
    } catch (error) {
      console.error('Error al cargar datos:', error);
      this.handleAlertType('ERROR', 'Error al cargar datos');
    } finally {
      this.cargando = false;
    }
  }

  getColorCategoria(categoria: any): string {
    const colores = ['#667eea', '#4CAF50', '#FF9800', '#9C27B0', '#F44336', '#00BCD4'];
    let hash = 0;
    for (let i = 0; i < categoria.nombre.length; i++) {
      hash = categoria.nombre.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colores[Math.abs(hash) % colores.length];
  }

  getEstadoClass(estado: string): string {
    const clases: any = {
      'DISPONIBLE': 'estado-disponible',
      'ASIGNADO': 'estado-asignado',
      'EN_REPARACION': 'estado-reparacion',
      'BAJA_TECNICA': 'estado-baja',
      'RESGUARDADO': 'estado-resguardado'
    };
    return clases[estado] || '';
  }

  getEstadoIcon(estado: string): string {
    const iconos: any = {
      'DISPONIBLE': 'pi pi-check-circle',
      'ASIGNADO': 'pi pi-user',
      'EN_REPARACION': 'pi pi-wrench',
      'BAJA_TECNICA': 'pi pi-trash',
      'RESGUARDADO': 'pi pi-lock'
    };
    return iconos[estado] || 'pi pi-question';
  }

  async consultarSubalmacen() {
    if (this.formReporteAlmacen.invalid) {
      this.formReporteAlmacen.markAllAsTouched();
      return;
    }

    this.cargando = true;
    try {
      const subalmacenId = this.formReporteAlmacen.get('subalmacenId')?.value;
      const subalmacen = this.subalmacenes.find(s => s.id === subalmacenId);
      
      const todosActivos = await this.subalmacenesService.getActivosPorUbicacion(subalmacenId);
      this.activosSubalmacen = todosActivos.filter(activo => 
        activo.estadoTecnico !== 'ASIGNADO' && 
        activo.usuarioAsignadoId === null
      );
      
      this.handleAlertType('SUCCESS', `Se encontraron ${this.activosSubalmacen.length} activos no asignados en ${subalmacen?.nombre}`);
      
    } catch (error) {
      console.error('Error al consultar subalmacén:', error);
      this.handleAlertType('ERROR', 'Error al consultar los activos');
      this.activosSubalmacen = [];
    } finally {
      this.cargando = false;
    }
  }

  async consultarCategoria() {
    if (this.formReporteCategoria.invalid) {
      this.formReporteCategoria.markAllAsTouched();
      return;
    }

    this.cargando = true;
    try {
      const categoriaId = this.formReporteCategoria.get('categoriaId')?.value;
      const filtro = this.formReporteCategoria.get('filtroEstado')?.value;
      const categoria = this.categorias.find(c => c.id === categoriaId);
      const todosActivos = await this.reportesService.getActivosPorCategoria(categoriaId);
      
      if (filtro === 'noAsignados') {
        this.activosPorCategoria = todosActivos.filter(activo => 
          activo.estadoTecnico !== 'ASIGNADO' && 
          activo.usuarioAsignadoId === null
        );
      } else {
        this.activosPorCategoria = todosActivos;
      }
      
      this.handleAlertType('SUCCESS', `Se encontraron ${this.activosPorCategoria.length} activos en ${categoria?.nombre}`);
      
    } catch (error) {
      console.error('Error al consultar categoría:', error);
      this.handleAlertType('ERROR', 'Error al consultar los activos');
      this.activosPorCategoria = [];
    } finally {
      this.cargando = false;
    }
  }

  async consultarGeneral() {
    this.cargando = true;
    try {
      const filtro = this.formReporteGeneral.get('filtroEstado')?.value;
      
      const todosActivos = await this.subalmacenesService.getAllActivos();
      
      if (filtro === 'asignados') {
        this.reporteGeneralData = todosActivos.filter(activo => 
          activo.estadoTecnico === 'ASIGNADO' && 
          activo.usuarioAsignadoId !== null
        );
      } else if (filtro === 'noAsignados') {
        this.reporteGeneralData = todosActivos.filter(activo => 
          activo.estadoTecnico !== 'ASIGNADO' && 
          activo.usuarioAsignadoId === null
        );
      } else {
        this.reporteGeneralData = todosActivos;
      }
      
      this.handleAlertType('SUCCESS', `Se encontraron ${this.reporteGeneralData.length} activos`);
      
    } catch (error) {
      console.error('Error al consultar reporte general:', error);
      this.handleAlertType('ERROR', 'Error al consultar los activos');
      this.reporteGeneralData = [];
    } finally {
      this.cargando = false;
    }
  }

  async descargarReporteAlmacen() {
    if (this.formReporteAlmacen.invalid) {
      this.formReporteAlmacen.markAllAsTouched();
      return;
    }

    this.cargando = true;
    console.log('1. Iniciando descarga de reporte de almacén');
    
    try {
      const subalmacenId = this.formReporteAlmacen.get('subalmacenId')?.value;
      console.log('2. Subalmacen ID:', subalmacenId);
      
      console.log('3. Servicio reportesService:', this.reportesService);
      
      if (!this.reportesService) {
        throw new Error('Servicio de reportes no disponible');
      }
      
      const doc = await this.reportesService.generarReporteSubalmacen(subalmacenId);
      console.log('4. PDF generado:', doc);
      
      if (!doc) {
        throw new Error('No se pudo generar el PDF');
      }
      
      const subalmacen = this.subalmacenes.find(s => s.id === subalmacenId);
      const nombreArchivo = `reporte-subalmacen-${subalmacen?.nombre || 'sin-nombre'}-${new Date().getTime()}.pdf`;
      
      console.log('5. Guardando archivo:', nombreArchivo);
      doc.save(nombreArchivo);
      
      this.handleAlertType('SUCCESS', 'Reporte descargado correctamente');
      console.log('6. Descarga completada');
      
    } catch (error) {
      console.error('ERROR en descarga:', error);
      this.handleAlertType('ERROR', 'Error al descargar el reporte: ' + ('Error desconocido'));
    } finally {
      this.cargando = false;
      console.log('7. Proceso finalizado');
    }
  }

  async descargarReporteCategoria() {
    if (this.formReporteCategoria.invalid) {
      this.formReporteCategoria.markAllAsTouched();
      return;
    }

    this.cargando = true;
    try {
      const categoriaId = this.formReporteCategoria.get('categoriaId')?.value;
      const filtro = this.formReporteCategoria.get('filtroEstado')?.value;
      const incluirTodos = filtro === 'todos'; 
      
      const doc = await this.reportesService.generarReportePorCategoria(categoriaId, incluirTodos);
      
      const nombreArchivo = `reporte-categoria-${new Date().getTime()}.pdf`;
      doc.save(nombreArchivo);
      
      this.handleAlertType('SUCCESS', 'Reporte descargado correctamente');
      
    } catch (error) {
      console.error('Error al descargar reporte:', error);
      this.handleAlertType('ERROR', 'Error al descargar el reporte');
    } finally {
      this.cargando = false;
    }
  }

  async descargarReporteGeneral() {
    this.cargando = true;
    try {
      const filtro = this.formReporteGeneral.get('filtroEstado')?.value;
      const doc = await this.reportesService.generarReporteTodosAlmacenes(filtro);
      
      const nombreArchivo = `reporte-general-${new Date().getTime()}.pdf`;
      doc.save(nombreArchivo);
      
      this.handleAlertType('SUCCESS', 'Reporte general descargado correctamente');
      
    } catch (error) {
      console.error('Error al descargar reporte general:', error);
      this.handleAlertType('ERROR', 'Error al descargar el reporte general');
    } finally {
      this.cargando = false;
    }
  }

  volver() {
    this.router.navigate(['/admin/activos']);
  }
}