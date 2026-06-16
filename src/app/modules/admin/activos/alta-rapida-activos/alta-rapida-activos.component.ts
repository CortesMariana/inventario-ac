import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService, ConfirmationService } from 'primeng/api';
import { BaseComponent } from 'src/app/shared/base/base.component';
import { ActivosService } from '../activos.service';
import { UserService } from 'src/app/shared/service/user.service';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-alta-rapida-activos',
  templateUrl: './alta-rapida-activos.component.html',
  styleUrls: ['./alta-rapida-activos.component.css'],
  providers: [ConfirmationService]
})
export class AltaRapidaActivosComponent extends BaseComponent implements OnInit {
  
  formAltaRapida!: FormGroup;
  categorias: any[] = [];
  subalmacenes: any[] = [];
  subalmacenesAgrupados: any[] = [];
  
  cargando: boolean = false;
  usuario: any;

  constructor(
    protected override messageService: MessageService,
    private fb: FormBuilder,
    private router: Router,
    private activosService: ActivosService,
    private categoriasService: ActivosService,
    private subalmacenesService: ActivosService,
    private userSrv: UserService,
    private confirmationService: ConfirmationService
  ) {
    super(messageService);
  }

  ngOnInit() {
    this.initForm();
    this.cargarUsuario();
    this.cargarCategorias();
    this.cargarSubalmacenes();
  }

  initForm() {
    this.formAltaRapida = this.fb.group({
      id: [uuidv4()],
      nombre: ['', Validators.required],
      categoriaId: ['', Validators.required],
      ubicacionId: ['', Validators.required],
      numeroSerie: [''],
      marca: [''],
      modelo: [''],
      descripcion: [''],
      estadoTecnico: ['DISPONIBLE']
    });
  }

  async cargarUsuario() {
    try {
      this.usuario = await this.userSrv.consultarEmpleado().toPromise();
    } catch (error) {
      console.error('Error al cargar usuario:', error);
    }
  }

  async cargarCategorias() {
    try {
      this.categorias = await this.categoriasService.getCategorias();
    } catch (error) {
      console.error('Error al cargar categorías:', error);
      this.handleAlertType('ERROR', 'Error al cargar categorías');
    }
  }

  async cargarSubalmacenes() {
    try {
      const jerarquia = await this.subalmacenesService.getJerarquiaCompleta();
      
      this.subalmacenesAgrupados = jerarquia.map(lugar => ({
        label: lugar.nombre,
        value: lugar.id,
        items: lugar.subalmacenes?.map((s: any) => ({
          label: s.nombre,
          value: s.id,
          lugarId: lugar.id,
          lugarNombre: lugar.nombre
        })) || []
      }));
      
      this.subalmacenes = jerarquia.flatMap((l: any) => 
        l.subalmacenes?.map((s: any) => ({
          ...s,
          lugarNombre: l.nombre
        })) || []
      );
      
    } catch (error) {
      console.error('Error al cargar subalmacenes:', error);
      this.handleAlertType('ERROR', 'Error al cargar ubicaciones');
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

  getCategoriaNombre(): string {
    const categoriaId = this.formAltaRapida.get('categoriaId')?.value;
    const categoria = this.categorias.find(c => c.id === categoriaId);
    return categoria?.nombre || '';
  }

  async guardar() {
    if (this.formAltaRapida.invalid) {
      this.formAltaRapida.markAllAsTouched();
      return;
    }

    this.cargando = true;
    
    try {
      const formValue = this.formAltaRapida.value;
      
      const categoria = this.categorias.find(c => c.id === formValue.categoriaId);
      const subalmacen = this.subalmacenes.find(s => s.id === formValue.ubicacionId); 
      
      const activoData = {
        nombre: formValue.nombre,
        categoriaId: formValue.categoriaId,
        categoriaNombre: categoria?.nombre,
        
        ubicacionId: formValue.ubicacionId,
        ubicacionNombre: subalmacen?.nombre,
        lugarTrabajoId: subalmacen?.lugarDeTrabajoId,
        lugarTrabajoNombre: subalmacen?.lugarNombre,

        numeroSerie: formValue.numeroSerie,
        marca: formValue.marca,
        modelo: formValue.modelo,
        descripcion: formValue.descripcion,
        
        estadoTecnico: formValue.estadoTecnico, 

        esAltaRapida: true
      };

      const usuarioMovimiento = {
        id: this.usuario?.empleadoId || 'sistema',
        nombre: this.usuario?.nombreCompleto || 'Alta Rápida'
      };

      const activoId = await this.activosService.createActivo(activoData, usuarioMovimiento);
      
      this.handleAlertType('SUCCESS', 'Activo creado correctamente'); 
      this.router.navigate(['/admin/activos']);

    } catch (error: any) {
      console.error('Error al guardar:', error);
      this.handleAlertType('ERROR', error.message || 'Error al guardar el activo');
    } finally {
      this.cargando = false;
    }
  }

  getUbicacionNombre(): string {
    const ubicacionId = this.formAltaRapida.get('ubicacionId')?.value;
    const ubicacion = this.subalmacenes.find(s => s.id === ubicacionId);
    return ubicacion ? `${ubicacion.lugarNombre} - ${ubicacion.nombre}` : '';
  }

  cancelar() {
    this.router.navigate(['/admin/activos']);
  }

  limpiar() {
    this.formAltaRapida.reset({
      id: uuidv4(),
      estadoTecnico: 'DISPONIBLE'
    });
  }
}