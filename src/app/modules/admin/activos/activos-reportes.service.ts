import { Injectable } from '@angular/core';
import { ActivosService } from './activos.service';
import { ActivoTI } from './models/activo.model';
import { jsPDF } from 'jspdf'; 
import autoTable from 'jspdf-autotable'; 
import { Firestore, collection, query, where, getDocs } from '@angular/fire/firestore';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ActivosReportesService {

  constructor(
    private activosService: ActivosService,
    private subalmacenesService: ActivosService,
    private categoriasService: ActivosService,
    private firestore: Firestore
  ) { }

  async getActivosPorCategoria(categoriaId: string): Promise<ActivoTI[]> {
    try {
      const activosRef = collection(this.firestore, environment.collections.activos);
      const q = query(activosRef, where('categoriaId', '==', categoriaId));
      const querySnapshot = await getDocs(q);
      
      const activos: ActivoTI[] = [];
      querySnapshot.forEach((doc) => {
        activos.push({
          firestoreId: doc.id,
          ...doc.data() as ActivoTI
        });
      });
      
      return activos;
    } catch (error) {
      console.error('Error al obtener activos por categoría:', error);
      throw error;
    }
  }

  async generarReporteSubalmacen(subalmacenId: string): Promise<jsPDF> {
    console.log('=== INICIO SERVICIO REPORTE SUBALMACÉN ===');
    console.log('1. subalmacenId recibido:', subalmacenId);
    
    const doc = new jsPDF();
    
    try {
      if (!subalmacenId) {
        throw new Error('subalmacenId es undefined o null');
      }

      console.log('2. Intentando obtener subalmacenes...');
      let subalmacenes;
      try {
        subalmacenes = await this.subalmacenesService.getSubalmacenes();
        console.log('subalmacenes obtenidos:', subalmacenes?.length || 0);
      } catch (error) {
        console.error('Error en getSubalmacenes:', error);
        throw new Error(`Error al obtener subalmacenes: ${error}`);
      }

      console.log('3. Buscando subalmacen por ID...');
      const subalmacen = subalmacenes?.find(s => s.id === subalmacenId);
      console.log('subalmacen encontrado:', subalmacen);

      console.log('4. Intentando obtener activos...');
      let todosActivos = [];
      try {
        todosActivos = await this.activosService.getActivosPorUbicacion(subalmacenId);
        console.log('activos obtenidos:', todosActivos?.length || 0);
        console.log('primer activo:', todosActivos[0]);
      } catch (error) {
        console.error('Error en getActivosPorUbicacion:', error);
        throw new Error(`Error al obtener activos: ${error}`);
      }

      console.log('5. Filtrando activos no asignados...');
      const activosNoAsignados = (todosActivos || []).filter(activo => 
        activo.estadoTecnico !== 'ASIGNADO' && 
        (activo.usuarioAsignadoId === null || activo.usuarioAsignadoId === undefined)
      );
      console.log('activos no asignados:', activosNoAsignados.length);

      console.log('6. Generando PDF...');
      
      doc.setFontSize(20);
      doc.setTextColor(102, 126, 234);
      doc.text('REPORTE DE ACTIVOS POR SUBALMACÉN', 14, 22);
      
      doc.setDrawColor(200, 200, 200);
      doc.line(14, 26, 196, 26);
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.text(`Subalmacén: ${subalmacen?.nombre || 'No especificado'}`, 14, 36);
      doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 42);
      doc.text(`Total de activos no asignados: ${activosNoAsignados.length}`, 14, 48);

      if (activosNoAsignados.length > 0) {
        const tableData = activosNoAsignados.map(a => [
          a.nombre || 'N/A',
          a.categoriaNombre || 'Sin categoría',
          a.numeroSerie || 'N/A',
          a.estadoTecnico || 'N/A'
        ]);

        autoTable(doc, {
          startY: 55,
          head: [['Nombre', 'Categoría', 'N° Serie', 'Estado']],
          body: tableData,
          headStyles: { fillColor: [102, 126, 234] }
        });
      }

      console.log('=== PDF GENERADO EXITOSAMENTE ===');
      return doc;
      
    } catch (error) {
      console.error('=== ERROR DETALLADO ===');
      console.error('Error message:', error);
      console.error('Error stack:', error);
      console.error('Error completo:', error);
      
      doc.setFontSize(20);
      doc.setTextColor(244, 67, 54);
      doc.text('ERROR AL GENERAR REPORTE', 14, 22);
      
      doc.setDrawColor(200, 200, 200);
      doc.line(14, 26, 196, 26);
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.text(`Error: ${error || 'Error desconocido'}`, 14, 36);
      doc.text(`Tipo: ${error || 'N/A'}`, 14, 42);
      doc.text(`Timestamp: ${new Date().toLocaleString()}`, 14, 48);
    
      
      return doc;
    }
  }


  async generarReportePorCategoria(categoriaId: string, incluirTodos: boolean = true): Promise<jsPDF> {
    const doc = new jsPDF();
    const categorias = await this.categoriasService.getCategorias();
    const categoria = categorias.find(c => c.id === categoriaId);
    const todosActivos = await this.getActivosPorCategoria(categoriaId);

    const activosCategoria = incluirTodos 
      ? todosActivos 
      : todosActivos.filter(a => a.estadoTecnico !== 'ASIGNADO' && !a.usuarioAsignadoId);

    const activosPorAlmacen = new Map<string, { almacen: string, activos: ActivoTI[] }>();

    for (const activo of activosCategoria) {
      if (!activo.ubicacionId) continue;
      
      if (!activosPorAlmacen.has(activo.ubicacionId)) {
        activosPorAlmacen.set(activo.ubicacionId, {
          almacen: activo.ubicacionNombre || 'Sin nombre',
          activos: []
        });
      }
      activosPorAlmacen.get(activo.ubicacionId)!.activos.push(activo);
    }

    const fecha = new Date().toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    doc.setFontSize(20);
    doc.setTextColor(102, 126, 234);
    doc.text('REPORTE DE ACTIVOS POR CATEGORÍA', 14, 22);
    
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 26, 196, 26);
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.text(`Categoría: ${categoria?.nombre || 'Categoría'}`, 14, 36);
    doc.text(`Fecha: ${fecha}`, 14, 42);
    doc.text(`Total de activos: ${activosCategoria.length}`, 14, 48);
    doc.text(`Filtro: ${incluirTodos ? 'Todos los activos' : 'Solo no asignados'}`, 14, 54);

    if (activosCategoria.length > 0) {
      let yPos = 60;

      const almacenesArray = Array.from(activosPorAlmacen.entries());

      for (const [almacenId, data] of almacenesArray) {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(44, 62, 80);
        doc.text(`${data.almacen} (${data.activos.length} activos)`, 14, yPos);
        yPos += 6;

        const tableData = data.activos.map(a => [
          a.nombre,
          a.numeroSerie || '-',
          a.modelo || '-',
          this.getEstadoLabel(a.estadoTecnico),
          a.usuarioAsignadoNombre || 'No asignado'
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['Nombre', 'N° Serie', 'Modelo', 'Estado', 'Asignado a']],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: [102, 126, 234] },
          styles: { fontSize: 8 },
          margin: { left: 14, right: 14 }
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;
      }

      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      const disponibles = activosCategoria.filter(a => a.estadoTecnico === 'DISPONIBLE').length;
      const asignados = activosCategoria.filter(a => a.estadoTecnico === 'ASIGNADO').length;
      const reparacion = activosCategoria.filter(a => a.estadoTecnico === 'EN_REPARACION').length;
      const baja = activosCategoria.filter(a => a.estadoTecnico === 'BAJA_TECNICA').length;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Resumen General:', 14, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(`Disponibles: ${disponibles} | Asignados: ${asignados} | En Reparación: ${reparacion} | Baja: ${baja}`, 14, yPos + 6);
      doc.text(`Total almacenes con activos: ${activosPorAlmacen.size}`, 14, yPos + 12);

    } else {
      doc.setFontSize(12);
      doc.setTextColor(150, 150, 150);
      doc.text('No hay activos en esta categoría', 14, 60);
    }

    return doc;
  }

  async generarReporteTodosAlmacenes(filtro: 'todos' | 'asignados' | 'noAsignados' = 'todos'): Promise<jsPDF> {
    const doc = new jsPDF();
    const jerarquia = await this.subalmacenesService.getJerarquiaCompleta();
    const fecha = new Date().toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    doc.setFontSize(20);
    doc.setTextColor(102, 126, 234);
    doc.text('REPORTE GENERAL DE ALMACENES', 14, 22);
    
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 26, 196, 26);
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.text(`Fecha: ${fecha}`, 14, 36);
    
    let filtroTexto = '';
    if (filtro === 'asignados') filtroTexto = 'Solo activos asignados';
    else if (filtro === 'noAsignados') filtroTexto = 'Solo activos no asignados';
    else filtroTexto = 'Todos los activos';
    
    doc.text(`Filtro: ${filtroTexto}`, 14, 42);

    let yPos = 50;
    let totalGeneral = 0;
    
    for (const lugar of jerarquia) {
      if (!lugar.activo) continue;
      
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(44, 62, 80);
      doc.text(`${lugar.nombre}`, 14, yPos);
      yPos += 8;
      
      let totalLugar = 0;
      
      for (const sub of lugar.subalmacenes) {
        if (!sub.activo) continue;
        
        const todosActivos = await this.activosService.getActivosPorUbicacion(sub.id);

        let activos = todosActivos;
        if (filtro === 'asignados') {
          activos = todosActivos.filter(a => a.estadoTecnico === 'ASIGNADO' && a.usuarioAsignadoId);
        } else if (filtro === 'noAsignados') {
          activos = todosActivos.filter(a => a.estadoTecnico !== 'ASIGNADO' && !a.usuarioAsignadoId);
        }
        
        if (activos.length === 0) continue;
        
        totalLugar += activos.length;
        
        if (yPos > 230) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(102, 126, 234);
        doc.text(`${sub.nombre} (${activos.length} activos)`, 14, yPos);
        yPos += 6;
        
        if (activos.length > 0) {
          const tableData = activos.map(a => [
            a.categoriaNombre || '-',
            a.nombre,
            a.numeroSerie || '-',
            a.modelo || '-',
            this.getEstadoLabel(a.estadoTecnico),
            a.usuarioAsignadoNombre || '-'
          ]);

          autoTable(doc, {
            startY: yPos,
            head: [['Categoría', 'Nombre', 'Serie', 'Modelo', 'Estado', 'Asignado a']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [102, 126, 234] },
            styles: { fontSize: 8 },
            margin: { left: 20, right: 14 }
          });
          
          yPos = (doc as any).lastAutoTable.finalY + 8;
        }
      }
      
      if (totalLugar > 0) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(44, 62, 80);
        doc.text(`Total ${lugar.nombre}: ${totalLugar} activos`, 14, yPos);
        yPos += 10;
        totalGeneral += totalLugar;
      }
    }

    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setDrawColor(102, 126, 234);
    doc.line(14, yPos, 196, yPos);
    yPos += 6;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(44, 62, 80);
    doc.text(`TOTAL GENERAL: ${totalGeneral} activos`, 14, yPos);

    return doc;
  }

  generarFormatoAlta(activo: ActivoTI, usuario: string): jsPDF {
    const doc = new jsPDF();
    const fecha = new Date().toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    doc.setFontSize(20);
    doc.setTextColor(102, 126, 234);
    doc.text('FORMATO DE ALTA DE ACTIVO', 14, 22);
    
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 26, 196, 26);
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.text(`Fecha: ${fecha}`, 14, 36);
    doc.text(`Usuario que registra: ${usuario}`, 14, 42);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Datos del Activo', 14, 54);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    
    const datos = [
      ['Nombre:', activo.nombre],
      ['Categoría:', activo.categoriaNombre || '-'],
      ['Marca:', activo.marca || '-'],
      ['Modelo:', activo.modelo || '-'],
      ['Número de Serie:', activo.numeroSerie || '-'],
      ['Almacén:', activo.ubicacionNombre || '-']
    ];
    
    let yPos = 62;
    datos.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, 14, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(value, 60, yPos);
      yPos += 6;
    });
    
    yPos = 180;
    doc.line(14, yPos, 90, yPos);
    doc.text('Firma del Responsable', 30, yPos + 5);
    
    doc.line(120, yPos, 196, yPos);
    doc.text('Firma de Recibido', 140, yPos + 5);
    
    return doc;
  }

  generarFormatoTransferencia(
    activo: ActivoTI,
    origen: string,
    destino: string,
    usuario: string,
    observaciones?: string
  ): jsPDF {
    const doc = new jsPDF();
    const fecha = new Date().toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    doc.setFontSize(20);
    doc.setTextColor(102, 126, 234);
    doc.text('FORMATO DE TRANSFERENCIA DE ACTIVO', 14, 22);
    
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 26, 196, 26);
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.text(`Fecha: ${fecha}`, 14, 36);
    doc.text(`Usuario que registra: ${usuario}`, 14, 42);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Datos del Activo', 14, 54);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Activo:', 14, 62);
    doc.setFont('helvetica', 'normal');
    doc.text(activo.nombre, 60, 62);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Serie:', 14, 68);
    doc.setFont('helvetica', 'normal');
    doc.text(activo.numeroSerie || '-', 60, 68);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Datos de Transferencia', 14, 84);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Almacén Origen:', 14, 92);
    doc.setFont('helvetica', 'normal');
    doc.text(origen, 60, 92);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Almacén Destino:', 14, 98);
    doc.setFont('helvetica', 'normal');
    doc.text(destino, 60, 98);
    
    if (observaciones) {
      doc.setFont('helvetica', 'bold');
      doc.text('Observaciones:', 14, 110);
      doc.setFont('helvetica', 'normal');
      
      const lines = doc.splitTextToSize(observaciones, 160);
      doc.text(lines, 14, 116);
    }
    
    let yPos = 160;
    doc.line(14, yPos, 90, yPos);
    doc.text('Entrega', 40, yPos + 5);
    
    doc.line(120, yPos, 196, yPos);
    doc.text('Recibe', 150, yPos + 5);
    
    return doc;
  }

  generarFormatoBaja(
    activo: ActivoTI,
    motivo: string,
    usuario: string,
    observaciones?: string,
    autorizadoPor?: string
  ): jsPDF {
    const doc = new jsPDF();
    const fecha = new Date().toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    doc.setFontSize(20);
    doc.setTextColor(244, 67, 54); 
    doc.text('FORMATO DE BAJA DE ACTIVO', 14, 22);
    
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 26, 196, 26);
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.text(`Fecha: ${fecha}`, 14, 36);
    doc.text(`Usuario que registra: ${usuario}`, 14, 42);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Datos del Activo', 14, 54);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    
    const datos = [
      ['Nombre:', activo.nombre],
      ['Categoría:', activo.categoriaNombre || '-'],
      ['Número de Serie:', activo.numeroSerie || '-']
    ];
    
    let yPos = 62;
    datos.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(label, 14, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(value, 60, yPos);
      yPos += 6;
    });
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Motivo de Baja', 14, 84);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    
    doc.text(motivo, 14, 92);
    
    if (observaciones) {
      doc.setFont('helvetica', 'bold');
      doc.text('Observaciones:', 14, 104);
      doc.setFont('helvetica', 'normal');
      
      const lines = doc.splitTextToSize(observaciones, 160);
      doc.text(lines, 14, 110);
    }
    
    if (autorizadoPor) {
      doc.setFont('helvetica', 'bold');
      doc.text('Autorizado por:', 14, 130);
      doc.setFont('helvetica', 'normal');
      doc.text(autorizadoPor, 60, 130);
    }
    
    yPos = 160;
    doc.line(14, yPos, 90, yPos);
    doc.text('Firma Responsable', 30, yPos + 5);
    
    doc.line(120, yPos, 196, yPos);
    doc.text('Firma Autorización', 130, yPos + 5);
    
    return doc;
  }

  private getEstadoLabel(estado: string): string {
    const estados: { [key: string]: string } = {
      'DISPONIBLE': 'Disponible',
      'ASIGNADO': 'Asignado',
      'EN_REPARACION': 'En Reparación',
      'FUERA_DE_SERVICIO': 'Fuera de Servicio',
      'BAJA_TECNICA': 'Baja Técnica',
      'RESGUARDADO': 'Resguardado'
    };
    return estados[estado] || estado;
  }
}