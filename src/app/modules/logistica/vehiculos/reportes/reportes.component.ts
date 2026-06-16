import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { BaseComponent } from 'src/app/shared/base/base.component';
import { VehiculosService } from '../vehiculos.service';
import { Vehiculo } from '../models/vehiculo.model';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-reportes',
  templateUrl: './reportes.component.html',
  styleUrls: ['./reportes.component.css']
})
export class ReportesComponent extends BaseComponent implements OnInit {
  
  formReporteEstado!: FormGroup;
  formReporteMarca!: FormGroup;
  formReporteGeneral!: FormGroup;
  
  cargando: boolean = false;
  tipoReporte: string = 'estado';
  
  vehiculosPorEstado: Vehiculo[] = [];
  vehiculosPorMarca: Vehiculo[] = [];
  reporteGeneralData: Vehiculo[] = [];
  
  opcionesEstado: any[] = [
    { label: 'Disponible', value: 'DISPONIBLE' },
    { label: 'Seguro vencido', value: 'SEGURO_VENCIDO' },
    { label: 'Asignado', value: 'ASIGNADO' },
    { label: 'Otro', value: 'OTRO' }
  ];
  
  opcionesMarca: any[] = [];
  fechaActual: Date = new Date();

  constructor(
    protected override messageService: MessageService,
    private fb: FormBuilder,
    private router: Router,
    private vehiculosService: VehiculosService
  ) {
    super(messageService);
  }

  ngOnInit() {
    this.initForms();
    this.cargarMarcas();
  }

  initForms() {
    this.formReporteEstado = this.fb.group({
      estado: ['', Validators.required]
    });

    this.formReporteMarca = this.fb.group({
      marca: ['', Validators.required]
    });

    this.formReporteGeneral = this.fb.group({});
  }

  async cargarMarcas() {
    try {
      const marcas = await this.vehiculosService.getMarcasVehiculos();
      this.opcionesMarca = marcas
        .filter(m => m.nombre !== 'Otro')
        .map(m => ({ label: m.nombre, value: m.nombre }));
    } catch (error) {
      console.error('Error al cargar marcas:', error);
      this.opcionesMarca = [
        { label: 'Nissan', value: 'Nissan' },
        { label: 'Toyota', value: 'Toyota' },
        { label: 'Ford', value: 'Ford' },
        { label: 'Volkswagen', value: 'Volkswagen' },
        { label: 'Chevrolet', value: 'Chevrolet' },
        { label: 'Honda', value: 'Honda' },
        { label: 'Mazda', value: 'Mazda' },
        { label: 'Hyundai', value: 'Hyundai' },
        { label: 'Kia', value: 'Kia' },
        { label: 'Mercedes-Benz', value: 'Mercedes-Benz' },
        { label: 'BMW', value: 'BMW' },
        { label: 'Audi', value: 'Audi' },
        { label: 'Renault', value: 'Renault' },
        { label: 'Peugeot', value: 'Peugeot' }
      ];
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
        return 'pi pi-question';
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

  async consultarPorEstado() {
    if (this.formReporteEstado.invalid) {
      this.formReporteEstado.markAllAsTouched();
      return;
    }

    this.cargando = true;
    try {
      const estado = this.formReporteEstado.get('estado')?.value;
      const todosVehiculos = await this.vehiculosService.getAllVehiculos();
      this.vehiculosPorEstado = todosVehiculos.filter(v => v.estadoVehiculo === estado);
      
      this.handleAlertType('SUCCESS', `Se encontraron ${this.vehiculosPorEstado.length} vehículos en estado ${this.getEstadoLabel(estado)}`);
      
    } catch (error) {
      console.error('Error al consultar por estado:', error);
      this.handleAlertType('ERROR', 'Error al consultar los vehículos');
      this.vehiculosPorEstado = [];
    } finally {
      this.cargando = false;
    }
  }

  async consultarPorMarca() {
    if (this.formReporteMarca.invalid) {
      this.formReporteMarca.markAllAsTouched();
      return;
    }

    this.cargando = true;
    try {
      const marca = this.formReporteMarca.get('marca')?.value;
      const todosVehiculos = await this.vehiculosService.getAllVehiculos();
      this.vehiculosPorMarca = todosVehiculos.filter(v => v.marca === marca);
      
      this.handleAlertType('SUCCESS', `Se encontraron ${this.vehiculosPorMarca.length} vehículos de la marca ${marca}`);
      
    } catch (error) {
      console.error('Error al consultar por marca:', error);
      this.handleAlertType('ERROR', 'Error al consultar los vehículos');
      this.vehiculosPorMarca = [];
    } finally {
      this.cargando = false;
    }
  }

  async consultarGeneral() {
    this.cargando = true;
    try {
      this.reporteGeneralData = await this.vehiculosService.getAllVehiculos();
      
      this.handleAlertType('SUCCESS', `Se encontraron ${this.reporteGeneralData.length} vehículos en total`);
      
    } catch (error) {
      console.error('Error al consultar reporte general:', error);
      this.handleAlertType('ERROR', 'Error al consultar los vehículos');
      this.reporteGeneralData = [];
    } finally {
      this.cargando = false;
    }
  }

  generarReportePDF(vehiculos: Vehiculo[], titulo: string, subtitulo: string): jsPDF {
    const doc = new jsPDF();
    const fecha = new Date().toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    doc.setFontSize(20);
    doc.setTextColor(102, 126, 234);
    doc.text(titulo, 14, 22);
    
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 26, 196, 26);
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.text(subtitulo, 14, 36);
    doc.text(`Fecha: ${fecha}`, 14, 42);
    doc.text(`Total de vehículos: ${vehiculos.length}`, 14, 48);

    if (vehiculos.length > 0) {
      const tableData = vehiculos.map(v => [
        v.folio,
        v.marca,
        v.modelo,
        v.placa,
        v.anio?.toString() || '-',
        `${v.cargaMaxKg} kg`,
        this.getEstadoLabel(v.estadoVehiculo),
        v.asignadoANombre || '-'
      ]);

      autoTable(doc, {
        startY: 55,
        head: [['Folio', 'Marca', 'Modelo', 'Placa', 'Año', 'Carga máx.', 'Estado', 'Asignado a']],
        body: tableData,
        headStyles: { fillColor: [102, 126, 234] },
        styles: { fontSize: 8 },
        margin: { left: 10, right: 10 }
      });

      const finalY = (doc as any).lastAutoTable.finalY + 10;
      
      const disponibles = vehiculos.filter(v => v.estadoVehiculo === 'DISPONIBLE').length;
      const seguroVencido = vehiculos.filter(v => v.estadoVehiculo === 'SEGURO_VENCIDO').length;
      const asignados = vehiculos.filter(v => v.estadoVehiculo === 'ASIGNADO').length;
      const otro = vehiculos.filter(v => v.estadoVehiculo === 'OTRO').length;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Resumen:', 14, finalY);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Disponibles: ${disponibles} | Seguro vencido: ${seguroVencido} | Asignados: ${asignados} | Otro: ${otro}`,
        14,
        finalY + 6
      );
    } else {
      doc.setFontSize(12);
      doc.setTextColor(150, 150, 150);
      doc.text('No hay vehículos que coincidan con los criterios', 14, 60);
    }

    return doc;
  }

  async descargarReporteEstado() {
    if (this.formReporteEstado.invalid) {
      this.formReporteEstado.markAllAsTouched();
      return;
    }

    this.cargando = true;
    try {
      const estado = this.formReporteEstado.get('estado')?.value;
      const titulo = 'REPORTE DE VEHÍCULOS POR ESTADO';
      const subtitulo = `Estado: ${this.getEstadoLabel(estado)}`;
      
      const doc = this.generarReportePDF(this.vehiculosPorEstado, titulo, subtitulo);
      const nombreArchivo = `reporte-vehiculos-estado-${estado.toLowerCase()}-${new Date().getTime()}.pdf`;
      doc.save(nombreArchivo);
      
      this.handleAlertType('SUCCESS', 'Reporte descargado correctamente');
      
    } catch (error) {
      console.error('Error al descargar reporte:', error);
      this.handleAlertType('ERROR', 'Error al descargar el reporte');
    } finally {
      this.cargando = false;
    }
  }

  async descargarReporteMarca() {
    if (this.formReporteMarca.invalid) {
      this.formReporteMarca.markAllAsTouched();
      return;
    }

    this.cargando = true;
    try {
      const marca = this.formReporteMarca.get('marca')?.value;
      const titulo = 'REPORTE DE VEHÍCULOS POR MARCA';
      const subtitulo = `Marca: ${marca}`;
      
      const doc = this.generarReportePDF(this.vehiculosPorMarca, titulo, subtitulo);
      const nombreArchivo = `reporte-vehiculos-marca-${marca.toLowerCase().replace(/\s/g, '-')}-${new Date().getTime()}.pdf`;
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
      const titulo = 'REPORTE GENERAL DE VEHÍCULOS';
      const subtitulo = 'Inventario completo de vehículos';
      
      const doc = this.generarReportePDF(this.reporteGeneralData, titulo, subtitulo);
      const nombreArchivo = `reporte-vehiculos-general-${new Date().getTime()}.pdf`;
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
    this.router.navigate(['/logistica/vehiculos/grid']);
  }

  getEstadoColor(estado: string): string {
    switch (estado) {
        case 'DISPONIBLE':
        return '#4CAF50';
        case 'SEGURO_VENCIDO':
        return '#FF9800';
        case 'ASIGNADO':
        return '#2196F3';
        case 'OTRO':
        return '#9C27B0';
        default:
        return '#6c757d';
    }
  }
}