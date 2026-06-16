import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService, ConfirmationService } from 'primeng/api';
import { BaseComponent } from 'src/app/shared/base/base.component';
import { CategoriaActivo } from '../models/activo.model';
import { ActivosService } from '../activos.service';

@Component({
  selector: 'app-gestion-categorias',
  templateUrl: './gestion-categorias.component.html',
  styleUrls: ['./gestion-categorias.component.css'],
  providers: [ConfirmationService]
})
export class GestionCategoriasComponent extends BaseComponent implements OnInit {
  
  categorias: CategoriaActivo[] = [];
  categoriasFiltradas: CategoriaActivo[] = [];
  categoriaSeleccionada: CategoriaActivo | null = null;
  
  formCategoria!: FormGroup;
  mostrarDialog: boolean = false;
  cargando: boolean = false;

  constructor(
    protected override messageService: MessageService,
    private fb: FormBuilder,
    private router: Router,
    private categoriasService: ActivosService,
    private confirmationService: ConfirmationService
  ) {
    super(messageService);
  }

  ngOnInit() {
    this.initForm();
    this.cargarCategorias();
  }

  initForm() {
    this.formCategoria = this.fb.group({
      nombre: ['', Validators.required],
      descripcion: ['']
    });
  }

  async cargarCategorias() {
    this.cargando = true;
    try {
      this.categorias = await this.categoriasService.getCategorias(false);
      
      this.categorias = this.categorias.map(cat => ({
        ...cat,
        fechaCreacion: this.convertirTimestampADate(cat.fechaCreacion)
      }));
      
      this.categoriasFiltradas = [...this.categorias];
    } catch (error) {
      console.error('Error al cargar categorías:', error);
      this.handleAlertType('ERROR', 'Error al cargar categorías');
    } finally {
      this.cargando = false;
    }
  }

  private convertirTimestampADate(timestamp: any): Date {
    if (!timestamp) return new Date();
    
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    
    if (timestamp.seconds) {
      return new Date(timestamp.seconds * 1000);
    }
    
    return timestamp instanceof Date ? timestamp : new Date(timestamp);
  }

  filtrarCategorias(event: any) {
    const texto = event.target.value.toLowerCase();
    if (!texto) {
      this.categoriasFiltradas = [...this.categorias];
    } else {
      this.categoriasFiltradas = this.categorias.filter(c => 
        c.nombre.toLowerCase().includes(texto) ||
        (c.descripcion && c.descripcion.toLowerCase().includes(texto))
      );
    }
  }

  getColorCategoria(categoria: CategoriaActivo): string {
    const colores = ['#667eea', '#4CAF50', '#FF9800', '#9C27B0', '#F44336', '#00BCD4', '#795548'];
    let hash = 0;
    for (let i = 0; i < categoria.nombre.length; i++) {
      hash = categoria.nombre.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colores[Math.abs(hash) % colores.length];
  }

  abrirNuevaCategoria() {
    this.categoriaSeleccionada = null;
    this.formCategoria.reset();
    this.mostrarDialog = true;
  }

  abrirEditarCategoria(categoria: CategoriaActivo) {
    this.categoriaSeleccionada = categoria;
    this.formCategoria.patchValue({
      nombre: categoria.nombre,
      descripcion: categoria.descripcion
    });
    this.mostrarDialog = true;
  }

  async guardarCategoria() {
    if (this.formCategoria.invalid) {
      this.formCategoria.markAllAsTouched();
      return;
    }

    this.cargando = true;
    try {
      if (this.categoriaSeleccionada) {
        await this.categoriasService.updateCategoria(
          this.categoriaSeleccionada.id,
          this.formCategoria.value
        );
        this.handleAlertType('SUCCESS', 'Categoría actualizada correctamente');
      } else {
        await this.categoriasService.createCategoria(this.formCategoria.value);
        this.handleAlertType('SUCCESS', 'Categoría creada correctamente');
      }
      
      this.mostrarDialog = false;
      await this.cargarCategorias();
      
    } catch (error: any) {
      console.error('Error al guardar categoría:', error);
      this.handleAlertType('ERROR', error.message || 'Error al guardar la categoría');
    } finally {
      this.cargando = false;
    }
  }

  async desactivarCategoria(categoria: CategoriaActivo) {
    const confirmado = window.confirm(`¿DESACTIVAR la categoría "${categoria.nombre}"?\n\nEsta acción cambiará el estado a inactiva.`);
    
    if (confirmado) {
      
      this.cargando = true;
      try {
        await this.categoriasService.desactivarCategoria(categoria.id);
        
        window.alert('Categoría desactivada correctamente');
      
        await this.cargarCategorias();
        
      } catch (error: any) {
        console.error('Error:', error);
        window.alert('ERROR: ' + (error.message || 'Error desconocido'));
      } finally {
        this.cargando = false;
      }
    } else {
    }
  }

  async eliminarCategoria(categoria: CategoriaActivo) {
    const confirmado = window.confirm(`¿ELIMINAR PERMANENTEMENTE la categoría "${categoria.nombre}"?\n\n⚠️ Esta acción NO se puede deshacer.\nSolo se puede eliminar si no tiene activos asociados.`);
    
    if (confirmado) {
      this.cargando = true;
      try {
        await this.categoriasService.deleteCategoria(categoria.id);
        
        window.alert('✅ Categoría eliminada correctamente');
        
        await this.cargarCategorias();
        
      } catch (error: any) {
        console.error('Error al eliminar:', error);
        
        let mensajeError = error.message || 'Error desconocido';
        if (mensajeError.includes('activo(s) usan esta categoría')) {
          window.alert('No se puede eliminar: La categoría tiene activos asociados.\n\nDesactívala en lugar de eliminarla.');
        } else {
          window.alert('ERROR: ' + mensajeError);
        }
        
      } finally {
        this.cargando = false;
      }
    } else {
    }
  }

  async activarCategoria(categoria: CategoriaActivo) {
    const confirmado = window.confirm(`¿ACTIVAR la categoría "${categoria.nombre}"?\n\nLa categoría volverá a estar disponible para usar.`);
    
    if (confirmado) {
      
      this.cargando = true;
      try {
        await this.categoriasService.activarCategoria(categoria.id);
        
        window.alert('✅ Categoría activada correctamente');
        
        await this.cargarCategorias();
        
      } catch (error: any) {
        console.error('Error:', error);
        window.alert('ERROR: ' + (error.message || 'Error desconocido'));
      } finally {
        this.cargando = false;
      }
    } else {
    }
  }

  volver() {
    this.router.navigate(['/admin/activos']);
  }
}