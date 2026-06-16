import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { MessageService } from 'primeng/api';
import { BaseComponent } from 'src/app/shared/base/base.component';
import { CampoService } from '../campo.service';
import { Recorrido } from '../models/recorrido.model';
import * as L from 'leaflet';

@Component({
  selector: 'app-recorridos',
  templateUrl: './recorridos.component.html',
  styleUrls: ['./recorridos.component.css']
})
export class RecorridosComponent extends BaseComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef;
  
  recorridos: Recorrido[] = [];
  recorridosFiltrados: Recorrido[] = [];
  cargando: boolean = false;
  
  recorridoSeleccionado: Recorrido | null = null;
  showDetallesSidebar: boolean = false;
  
  private map: any;
  private mapInitialized: boolean = false;
  private markersLayer: any;
  private polylinesLayer: any;
  private recorridoMarkers: Map<string, any> = new Map();
  
  filtroEstado: string = 'todos';
  filtroUsuario: string = 'todos';
  filtroBusqueda: string = '';
  filtroFecha: Date[] = [];
  
  opcionesEstado: any[] = [
    { label: 'Todos', value: 'todos' },
    { label: 'En curso', value: 'en curso' },
    { label: 'Finalizado', value: 'finalizado' },
    { label: 'Cancelado', value: 'cancelado' }
  ];
  
  usuariosUnicos: any[] = [{ label: 'Todos', value: 'todos' }];
  
  estadisticas: any = {
    total: 0,
    esteMes: 0,
    enCurso: 0,
    finalizados: 0,
    totalDistancia: 0,
    totalTiempo: 0
  };
  
  vista: 'lista' | 'mapa' = 'lista';
  
  private defaultCenter: [number, number] = [21.1470026, -101.709504];
  private defaultZoom: number = 13;
  private tileLayerUrl: string = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  
  private recorridoColors: string[] = [
    '#667eea', '#764ba2', '#2196F3', '#4CAF50', '#FF9800',
    '#F44336', '#9C27B0', '#00BCD4', '#8BC34A', '#FFC107',
    '#795548', '#607D8B', '#E91E63', '#3F51B5', '#009688'
  ];
  
  constructor(
    protected override messageService: MessageService,
    private campoService: CampoService
  ) {
    super(messageService);
  }
  
  ngOnInit() {
    this.cargarDatos();
  }
  
  ngAfterViewInit() {
    if (this.vista === 'mapa') {
      setTimeout(() => this.initializeMap(), 100);
    }
  }
  
  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
  }
  
  async cargarDatos() {
    this.cargando = true;
    
    try {
      const [recorridos, estadisticas] = await Promise.all([
        this.campoService.getAllRecorridos(),
        this.campoService.getEstadisticasRecorridos()
      ]);
      
      this.recorridos = (recorridos || []).map(recorrido => ({
        ...recorrido,
        puntos: recorrido.puntos || [] 
      }));
      
      this.estadisticas = estadisticas || {};
      
      this.obtenerUsuariosUnicos();
      
      this.aplicarFiltros();
      
      if (this.vista === 'mapa' && this.mapInitialized) {
        this.actualizarMapa();
      }
      
    } catch (error) {
      console.error('Error al cargar recorridos:', error);
      this.handleAlertType('ERROR', 'Error al cargar los recorridos');
    } finally {
      this.cargando = false;
    }
  }
  
  obtenerUsuariosUnicos() {
    const usuariosSet = new Set<string>();
    const usuariosMap = new Map<string, string>();
    
    this.recorridos.forEach(recorrido => {
      if (recorrido.usuarioId) {
        usuariosSet.add(recorrido.usuarioId);
        usuariosMap.set(recorrido.usuarioId, recorrido.usuarioNombre);
      }
    });
    
    this.usuariosUnicos = [
      { label: 'Todos', value: 'todos' },
      ...Array.from(usuariosSet).map(usuarioId => ({
        label: usuariosMap.get(usuarioId) || usuarioId,
        value: usuarioId
      }))
    ];
  }
  
  aplicarFiltros() {
    let filtrados = [...this.recorridos];
    
    if (this.filtroEstado !== 'todos') {
      filtrados = filtrados.filter(recorrido => recorrido.estado === this.filtroEstado);
    }
    
    if (this.filtroUsuario !== 'todos') {
      filtrados = filtrados.filter(recorrido => recorrido.usuarioId === this.filtroUsuario);
    }
    
    if (this.filtroFecha && this.filtroFecha.length === 2) {
      const fechaInicio = this.filtroFecha[0];
      const fechaFin = this.filtroFecha[1];
      
      if (fechaInicio && fechaFin) {
        fechaInicio.setHours(0, 0, 0, 0);
        fechaFin.setHours(23, 59, 59, 999);
        
        filtrados = filtrados.filter(recorrido => {
          const fechaRecorrido = this.getFecha(recorrido.fechaInicio);
          return fechaRecorrido >= fechaInicio && fechaRecorrido <= fechaFin;
        });
      }
    }
    
    if (this.filtroBusqueda.trim()) {
      const busqueda = this.filtroBusqueda.toLowerCase();
      filtrados = filtrados.filter(recorrido => {
        return (
          (recorrido.usuarioNombre && recorrido.usuarioNombre.toLowerCase().includes(busqueda)) ||
          (recorrido.id && recorrido.id.toLowerCase().includes(busqueda))
        );
      });
    }
    
    this.recorridosFiltrados = filtrados;
    
    if (this.vista === 'mapa' && this.mapInitialized) {
      this.actualizarMapa();
    }
  }
  
  limpiarFiltros() {
    this.filtroEstado = 'todos';
    this.filtroUsuario = 'todos';
    this.filtroBusqueda = '';
    this.filtroFecha = [];
    this.aplicarFiltros();
  }
  
  verDetalles(recorrido: Recorrido) {
    this.recorridoSeleccionado = recorrido;
    this.showDetallesSidebar = true;
  }
  
  cerrarDetalles() {
    this.showDetallesSidebar = false;
    this.recorridoSeleccionado = null;
  }
  
  cambiarVista(nuevaVista: 'lista' | 'mapa') {
    this.vista = nuevaVista;
    
    if (nuevaVista === 'mapa') {
      setTimeout(() => {
        if (!this.mapInitialized) {
          this.initializeMap();
        } else {
          this.actualizarMapa();
        }
      }, 100);
    }
  }
  
  private initializeMap() {
    if (!this.mapContainer?.nativeElement || this.mapInitialized) {
      return;
    }
    
    try {
      if (typeof L === 'undefined') {
        console.error('Leaflet no está disponible');
        this.handleAlertType('ERROR', 'Error al cargar el mapa: Leaflet no está disponible');
        return;
      }
      
      this.map = L.map(this.mapContainer.nativeElement).setView(this.defaultCenter, this.defaultZoom);
      
      L.tileLayer(this.tileLayerUrl, {
        maxZoom: 19
      }).addTo(this.map);
    
      this.markersLayer = L.layerGroup().addTo(this.map);
      this.polylinesLayer = L.layerGroup().addTo(this.map);
      
      const baseLayers = {
        "OpenStreetMap": L.tileLayer(this.tileLayerUrl, {
          maxZoom: 19
        })
      };
      
      const overlayLayers = {
        "Marcadores": this.markersLayer,
        "Rutas": this.polylinesLayer
      };
      
      L.control.layers(baseLayers, overlayLayers).addTo(this.map);
      
      this.mapInitialized = true;
      
      this.actualizarMapa();
      
    } catch (error) {
      console.error('Error al inicializar el mapa:', error);
      this.handleAlertType('ERROR', 'Error al cargar el mapa');
    }
  }
  
  private actualizarMapa() {
    if (!this.mapInitialized || !this.map) return;
    
    this.markersLayer.clearLayers();
    this.polylinesLayer.clearLayers();
    this.recorridoMarkers.clear();
    
    if (this.recorridosFiltrados.length === 0) {
      this.map.setView(this.defaultCenter, this.defaultZoom);
      return;
    }
    
    const bounds = L.latLngBounds([]);
    let hasValidPoints = false;
    
    this.recorridosFiltrados.forEach((recorrido, index) => {
      if (this.dibujarRecorridoEnMapa(recorrido, index)) {
        hasValidPoints = true;
        
        recorrido.puntos?.forEach(punto => {
          if (punto && punto.latitud && punto.longitud) {
            bounds.extend([punto.latitud, punto.longitud]);
          }
        });
      }
    });

    if (hasValidPoints && bounds.isValid()) {
      this.map.fitBounds(bounds, { padding: [50, 50] });
    }
  }
  
  private dibujarRecorridoEnMapa(recorrido: Recorrido, index: number): boolean {
    if (!recorrido.puntos || !Array.isArray(recorrido.puntos) || recorrido.puntos.length === 0) {
      console.warn(`Recorrido ${recorrido.id} no tiene puntos válidos`);
      return false;
    }
    
    const puntosValidos = recorrido.puntos.filter(punto => 
      punto && 
      typeof punto.latitud === 'number' && 
      typeof punto.longitud === 'number' &&
      !isNaN(punto.latitud) && 
      !isNaN(punto.longitud)
    );
    
    if (puntosValidos.length === 0) {
      console.warn(`Recorrido ${recorrido.id} no tiene puntos con coordenadas válidas`);
      return false;
    }
    
    const color = this.getColorForIndex(index);
    const puntosLatLng: L.LatLng[] = [];
    
    puntosValidos.forEach(punto => {
      const latLng = L.latLng(punto.latitud, punto.longitud);
      puntosLatLng.push(latLng);
    });
    
    if (puntosLatLng.length > 1) {
      const polyline = L.polyline(puntosLatLng, {
        color: color,
        weight: 3,
        opacity: 0.7,
        smoothFactor: 1
      }).addTo(this.polylinesLayer);
      
      const popupContent = this.crearPopupRecorrido(recorrido);
      polyline.bindPopup(popupContent);
      
      polyline.on('click', () => {
        this.verDetalles(recorrido);
      });
    }
    
    if (puntosLatLng.length >= 2) {
      const inicioIcon = this.crearIconoMarcador('inicio', color);
      const inicioMarker = L.marker(puntosLatLng[0], { icon: inicioIcon })
        .addTo(this.markersLayer)
        .bindPopup(`<b>Inicio</b><br>${this.crearPopupRecorrido(recorrido)}`);
      
      inicioMarker.on('click', () => {
        this.verDetalles(recorrido);
      });
      
      const finIcon = this.crearIconoMarcador('fin', color);
      const finMarker = L.marker(puntosLatLng[puntosLatLng.length - 1], { icon: finIcon })
        .addTo(this.markersLayer)
        .bindPopup(`<b>Fin</b><br>${this.crearPopupRecorrido(recorrido)}`);
      
      finMarker.on('click', () => {
        this.verDetalles(recorrido);
      });
      
      this.recorridoMarkers.set(`${recorrido.id}-inicio`, inicioMarker);
      this.recorridoMarkers.set(`${recorrido.id}-fin`, finMarker);
    } else if (puntosLatLng.length === 1) {
      const icon = this.crearIconoMarcador('punto', color);
      const marker = L.marker(puntosLatLng[0], { icon })
        .addTo(this.markersLayer)
        .bindPopup(this.crearPopupRecorrido(recorrido));
      
      marker.on('click', () => {
        this.verDetalles(recorrido);
      });
      
      this.recorridoMarkers.set(`${recorrido.id}-punto`, marker);
    }
    
    return true;
  }
  
  private crearIconoMarcador(tipo: 'inicio' | 'fin' | 'punto' | 'intermedio', color: string): L.DivIcon {
    let html = '';
    
    switch (tipo) {
      case 'inicio':
        html = '<i class="pi pi-play" style="color: white; font-size: 12px;"></i>';
        break;
      case 'fin':
        html = '<i class="pi pi-stop" style="color: white; font-size: 12px;"></i>';
        break;
      case 'punto':
        html = '<i class="pi pi-circle" style="color: white; font-size: 8px;"></i>';
        break;
      case 'intermedio':
        html = '<i class="pi pi-circle-fill" style="color: white; font-size: 6px;"></i>';
        break;
    }
    
    return L.divIcon({
      html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">${html}</div>`,
      className: `custom-marker`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12]
    });
  }
  
  private crearPopupRecorrido(recorrido: Recorrido): string {
    const puntosCount = recorrido.puntos?.length || 0;
    
    return `
      <div style="min-width: 200px;">
        <h4 style="margin: 0 0 8px 0; color: #333; font-size: 14px;">${recorrido.usuarioNombre || 'Sin nombre'}</h4>
        <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">
          <strong>Estado:</strong> ${recorrido.estado || 'Desconocido'}
        </p>
        <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">
          <strong>Distancia:</strong> ${this.formatDistancia(recorrido.distancia || 0)}
        </p>
        <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">
          <strong>Duración:</strong> ${this.formatDuracion(recorrido.duracionSegundos || 0)}
        </p>
        <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">
          <strong>Puntos:</strong> ${puntosCount}
        </p>
        <button onclick="angularComponentRef?.verDetallesDesdePopup && angularComponentRef.verDetallesDesdePopup('${recorrido.id}')" 
                style="margin-top: 8px; padding: 4px 12px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
          Ver Detalles
        </button>
      </div>
    `;
  }
  
  verDetallesDesdePopup(recorridoId: string) {
    const recorrido = this.recorridosFiltrados.find(r => r.id === recorridoId);
    if (recorrido) {
      this.verDetalles(recorrido);
    }
  }

  getColorForIndex(index: number): string {
    return this.recorridoColors[index % this.recorridoColors.length];
  }
  
  formatDuracion(segundos: number): string {
    return this.campoService.formatDuracion(segundos);
  }
  
  formatDistancia(metros: number): string {
    return this.campoService.formatDistancia(metros);
  }
  
  formatFecha(fecha: Date): string {
    return this.campoService.formatFecha(fecha);
  }
  
  formatHora(fecha: Date): string {
    return this.campoService.formatHora(fecha);
  }
  
  getColorEstado(estado: string): string {
    switch ((estado || '').toLowerCase()) {
      case 'en curso':
        return '#2196F3';
      case 'finalizado':
        return '#4CAF50';
      case 'cancelado':
        return '#F44336';
      default:
        return '#757575';
    }
  }
  
  getIconoEstado(estado: string): string {
    switch ((estado || '').toLowerCase()) {
      case 'en curso':
        return 'pi pi-spinner';
      case 'finalizado':
        return 'pi pi-check-circle';
      case 'cancelado':
        return 'pi pi-times-circle';
      default:
        return 'pi pi-question-circle';
    }
  }
  
  getEstadoClass(estado: string): string {
    switch ((estado || '').toLowerCase()) {
      case 'en curso':
        return 'estado-en-curso';
      case 'finalizado':
        return 'estado-finalizado';
      case 'cancelado':
        return 'estado-cancelado';
      default:
        return 'estado-desconocido';
    }
  }
  
  getDistanciaTotal(): string {
    return this.formatDistancia(this.estadisticas.totalDistancia || 0);
  }
  
  getTiempoTotal(): string {
    return this.formatDuracion(this.estadisticas.totalTiempo || 0);
  }
  
  centrarEnRecorrido(recorrido: Recorrido | null) {
    if (!recorrido || !this.map) {
        console.warn('Intento de centrar en recorrido nulo o mapa no disponible');
        return;
    }
    
    if (!recorrido.puntos || !Array.isArray(recorrido.puntos) || recorrido.puntos.length === 0) {
        console.warn(`Recorrido ${recorrido.id} no tiene puntos válidos para centrar`);
        return;
    }
    
    const bounds = L.latLngBounds([]);
    let hasValidPoints = false;
    
    recorrido.puntos.forEach(punto => {
        if (punto && typeof punto.latitud === 'number' && typeof punto.longitud === 'number' &&
            !isNaN(punto.latitud) && !isNaN(punto.longitud)) {
        bounds.extend([punto.latitud, punto.longitud]);
        hasValidPoints = true;
        }
    });
    
    if (hasValidPoints && bounds.isValid()) {
        this.map.fitBounds(bounds, { padding: [50, 50] });
    } else {
        console.warn('No se pudieron establecer límites válidos para el recorrido');
    }
  }
  
  centrarEnRecorridos() {
    if (!this.map || this.recorridosFiltrados.length === 0) return;
    
    const bounds = L.latLngBounds([]);
    let hasValidPoints = false;
    
    this.recorridosFiltrados.forEach(recorrido => {
      recorrido.puntos?.forEach(punto => {
        if (punto && punto.latitud && punto.longitud) {
          bounds.extend([punto.latitud, punto.longitud]);
          hasValidPoints = true;
        }
      });
    });
    
    if (hasValidPoints && bounds.isValid()) {
      this.map.fitBounds(bounds, { padding: [50, 50] });
    }
  }
  
  verEnMapaCompleto() {
    if (!this.recorridoSeleccionado) {
        console.warn('No hay recorrido seleccionado para ver en mapa');
        return;
    }
    
    this.cambiarVista('mapa');
    this.cerrarDetalles();
    
    setTimeout(() => {
        if (this.recorridoSeleccionado) {
        this.centrarEnRecorrido(this.recorridoSeleccionado);
        }
    }, 500);
  }
  
  refrescar() {
    this.cargarDatos();
  }
  
  private getFecha(fecha: any): Date {
    if (!fecha) return new Date();
    
    if (fecha.toDate) {
      return fecha.toDate();
    } else if (fecha instanceof Date) {
      return fecha;
    } else if (typeof fecha === 'string') {
      return new Date(fecha);
    } else if (fecha && typeof fecha === 'object' && fecha.seconds) {
      return new Date(fecha.seconds * 1000);
    }
    
    return new Date();
  }
}