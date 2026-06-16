import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService, ConfirmationService } from 'primeng/api';
import { BaseComponent } from 'src/app/shared/base/base.component';
import { LugaresTrabajoService } from '../../empleados/lugares-trabajo.service';
import { Subalmacen } from '../models/activo.model';
import { ActivosService } from '../activos.service';

@Component({
  selector: 'app-gestion-subalmacenes',
  templateUrl: './gestion-subalmacenes.component.html',
  styleUrls: ['./gestion-subalmacenes.component.css'],
  providers: [ConfirmationService]
})
export class GestionSubalmacenesComponent extends BaseComponent implements OnInit {
  
  itemsParaTabla: any[] = [];
  lugaresTrabajo: any[] = [];
  subalmacenSeleccionado: Subalmacen | null = null;
  
  formSubalmacen!: FormGroup;
  mostrarDialog: boolean = false;
  cargando: boolean = false;
  
  filtroGlobal: string = '';
  first: number = 0;

  constructor(
    protected override messageService: MessageService,
    private fb: FormBuilder,
    private router: Router,
    private subalmacenesService: ActivosService,
    private lugaresTrabajoService: LugaresTrabajoService,
    private confirmationService: ConfirmationService
  ) {
    super(messageService);
  }

  ngOnInit() {
    this.initForm();
    this.cargarLugaresTrabajo();
  }

  initForm() {
    this.formSubalmacen = this.fb.group({
      nombre: ['', Validators.required],
      descripcion: [''],
      lugarDeTrabajoId: ['', Validators.required]
    });
  }

  async cargarLugaresTrabajo() {
    try {
      this.cargando = true;
      this.lugaresTrabajo = await this.lugaresTrabajoService.getLugaresTrabajo().toPromise() || [];
      
      await this.cargarItemsParaTabla();
      
    } catch (error) {
      console.error('Error al cargar lugares:', error);
      this.handleAlertType('ERROR', 'Error al cargar sucursales');
      this.cargando = false;
    }
  }

  async cargarItemsParaTabla() {
    try {
      const todosSubalmacenes = await this.subalmacenesService.getSubalmacenes(false);
      
      this.itemsParaTabla = todosSubalmacenes.map(sub => {
        const lugar = this.lugaresTrabajo.find(l => l.id === sub.lugarDeTrabajoId);
        return {
          id: sub.id,
          nombre: sub.nombre,
          descripcion: sub.descripcion || '',
          lugarDeTrabajoId: sub.lugarDeTrabajoId,
          lugarDeTrabajoNombre: lugar?.nombre || 'Sucursal no encontrada',
          activo: sub.activo,
          fechaCreacion: sub.fechaCreacion,
          subalmacenOriginal: sub
        };
      });
    } catch (error) {
      console.error('Error al cargar items para tabla:', error);
      this.handleAlertType('ERROR', 'Error al cargar los datos');
    } finally {
      this.cargando = false;
    }
  }

  abrirNuevoSubalmacen() {
    this.subalmacenSeleccionado = null;
    this.formSubalmacen.reset();
    this.mostrarDialog = true;
  }

  abrirEditarSubalmacen(subalmacen: Subalmacen) {
    this.subalmacenSeleccionado = subalmacen;
    this.formSubalmacen.patchValue({
      nombre: subalmacen.nombre,
      descripcion: subalmacen.descripcion,
      lugarDeTrabajoId: subalmacen.lugarDeTrabajoId
    });
    this.mostrarDialog = true;
  }

  async guardarSubalmacen() {
    if (this.formSubalmacen.invalid) {
      this.formSubalmacen.markAllAsTouched();
      return;
    }

    this.cargando = true;
    try {
      const formValue = this.formSubalmacen.value;
      
      if (this.subalmacenSeleccionado) {
        await this.subalmacenesService.updateSubalmacen(
          this.subalmacenSeleccionado.id,
          formValue
        );
        this.handleAlertType('SUCCESS', 'Subalmacén actualizado correctamente');
      } else {
        await this.subalmacenesService.createSubalmacen(formValue);
        this.handleAlertType('SUCCESS', 'Subalmacén creado correctamente');
      }
      
      this.mostrarDialog = false;
      await this.cargarItemsParaTabla();
      
    } catch (error: any) {
      console.error('Error al guardar subalmacén:', error);
      this.handleAlertType('ERROR', error.message || 'Error al guardar el subalmacén');
    } finally {
      this.cargando = false;
    }
  }

  async eliminarSubalmacen(subalmacen: Subalmacen) {
    const confirmado = window.confirm(`¿ELIMINAR PERMANENTEMENTE "${subalmacen.nombre}"?\n\n⚠️ Esta acción NO se puede deshacer.`);
    
    if (confirmado) {
      this.cargando = true;
      try {
        await this.subalmacenesService.deleteSubalmacen(subalmacen.id);
        window.alert('✅ Subalmacén eliminado');
        await this.cargarItemsParaTabla();
      } catch (error: any) {
        window.alert('❌ Error: ' + error.message);
      } finally {
        this.cargando = false;
      }
    }
  }

  async desactivarSubalmacen(subalmacen: Subalmacen) {
    const confirmado = window.confirm(`¿DESACTIVAR el subalmacén "${subalmacen.nombre}"?\n\nEsta acción cambiará el estado a inactivo.`);
    
    if (confirmado) {
      
      this.cargando = true;
      try {
        await this.subalmacenesService.desactivarSubalmacen(subalmacen.id);
        
        window.alert('Subalmacén desactivado correctamente');
        
        await this.cargarItemsParaTabla();
        
      } catch (error: any) {
        console.error('Error:', error);
        window.alert('ERROR: ' + (error.message || 'Error desconocido'));
      } finally {
        this.cargando = false;
      }
    } else {
      console.log('Usuario dijo NO');
    }
  }

  async activarSubalmacen(subalmacen: Subalmacen) {
    this.confirmationService.confirm({
      message: `¿Activar el subalmacén "${subalmacen.nombre}"?`,
      header: 'Confirmar activación',
      icon: 'pi pi-info-circle',
      acceptLabel: 'Sí, activar',
      rejectLabel: 'Cancelar',
      accept: async () => {
        this.cargando = true;
        try {
          await this.subalmacenesService.activarSubalmacen(subalmacen.id);
          this.handleAlertType('SUCCESS', 'Subalmacén activado correctamente');
          await this.cargarItemsParaTabla();
        } catch (error) {
          console.error('Error al activar subalmacén:', error);
          this.handleAlertType('ERROR', 'Error al activar el subalmacén');
        } finally {
          this.cargando = false;
        }
      }
    });
  }

  volver() {
    this.router.navigate(['/admin/activos']);
  }
}