import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { catchError, Observable, of } from 'rxjs';
import { BaseComponent } from 'src/app/shared/base/base.component';
import { v4 as uuidv4 } from 'uuid';
import { TicketsService } from '../tickets.service';
import { UserService } from 'src/app/shared/service/user.service';
import { TicketService } from '../../../general-ti/tickets/tickets.service';

@Component({
  selector: 'app-crear-ticket-tecnico',
  templateUrl: './crear-ticket-tecnico.component.html',
  styleUrls: ['./crear-ticket-tecnico.component.css']
})

export class CrearTicketTecnicoComponent extends BaseComponent implements OnInit {
  usuario: any;

  formTicket!: FormGroup;

  titulo: string = 'Crear Ticket';
  cargando: boolean = false;

  tipos: any[] = [
    { label: 'Sistema', value: 'Sistema' },
    { label: 'Equipo', value: 'Equipo' },
  ];

  prioridades: any[] = [
    { label: 'Baja', value: 'Baja' },
    { label: 'Mediana', value: 'Mediana' },
    { label: 'Alta', value: 'Alta' },
    { label: 'Crítica', value: 'Crítica' } 
  ];

  categoriaAutomatica: string = 'campo';

  archivosEvidencia: File[] = [];

  constructor(
    protected override messageService: MessageService,
    private fb: FormBuilder,
    private router: Router,
    private ticketService: TicketService,
    private userSrv: UserService
  ) {
    super(messageService);
  }

  isMobileView: boolean = false;

  ngOnInit() {
    this.cargando = true;
    
    this.initForm().then(() => {
      this.getUsuario().pipe(
        catchError((error) => {
          this.handleAlertType('ERROR', 'Error al consultar el usuario');
          return of(null);
        })
      ).subscribe((data) => {
        if (data) {
          this.usuario = data;
          this.formTicket.patchValue({
            creadoPor: {
              id: data.id,
              nombre: data.nombreCompleto || `${data.nombre} ${data.apellidoPaterno} ${data.apellidoMaterno}`
            },
            asignadoA: {
              id: data.id,
              nombre: data.nombreCompleto || `${data.nombre} ${data.apellidoPaterno} ${data.apellidoMaterno}`
            }
          });
        }
        this.cargando = false;
      });
    });

    this.formTicket.get('tipo')?.valueChanges.subscribe(tipo => {
      this.actualizarCategoriaAutomatica(tipo);
    });

    this.checkScreenSize();
    window.addEventListener('resize', () => {
      this.checkScreenSize();
    });
  }

  checkScreenSize() {
    this.isMobileView = window.innerWidth <= 768;
  }
  
  ngOnDestroy() {
    window.removeEventListener('resize', () => this.checkScreenSize());
  }

  initForm(): Promise<boolean> {
    return new Promise((resolve) => {
      this.formTicket = this.fb.group({
        id: [uuidv4()],
        titulo: ['', Validators.required],
        descripcion: ['', Validators.required],
        tipo: ['Sistema', Validators.required],
        categoria: [{ value: 'campo', disabled: false }],
        prioridad: ['Mediana', Validators.required],
        estatus: ['Nuevo'],
        creadoPor: [null, Validators.required],
        asignadoA: [null, Validators.required]
      });
      resolve(true);
    });
  }

  getUsuario(): Observable<any> {
    return this.userSrv.consultarEmpleado();
  }

  actualizarCategoriaAutomatica(tipo: string) {
    if (tipo === 'sistema') {
      this.categoriaAutomatica = 'oficina';
      this.formTicket.patchValue({ categoria: 'oficina' });
      this.formTicket.get('categoria')?.disable();
    } else {
      this.categoriaAutomatica = 'campo';
      this.formTicket.patchValue({ categoria: 'campo' });
      this.formTicket.get('categoria')?.enable();
    }
  }

  onTipoChange() {
    const tipo = this.formTicket.get('tipo')?.value;
    this.actualizarCategoriaAutomatica(tipo);
  }

  onFileSelect(event: any) {
    const files = event.target.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        this.archivosEvidencia.push(files[i]);
      }
    }
  }

  removeFile(index: number) {
    this.archivosEvidencia.splice(index, 1);
  }

  cancelar() {
    this.router.navigate(['/tecnico/tickets'], { replaceUrl: true });
  }

  async guardarTicket() {
    this.cargando = true;
    this.formTicket.markAllAsTouched();
    
    if (this.formTicket.valid) {
      try {
        const ticketData = this.prepararDatosTicket();
        
        const ticketId = await this.ticketService.addTicket(ticketData);
        
        if (this.archivosEvidencia.length > 0) {
          await this.subirEvidencias(ticketId);
        }
        
        this.cargando = false;
        this.handleAlertType("SUCCESS", "Ticket creado correctamente");
        this.resetForm();
        this.router.navigate(['/tecnico/tickets'], { replaceUrl: true });
      } catch (error) {
        console.error('Error al crear ticket:', error);
        this.cargando = false;
        this.handleAlertType("ERROR", "Error al crear el ticket");
      }
    } else {
      this.handleAlertType("WARNING", "Formulario incompleto", "Complete los campos requeridos");
      this.cargando = false;
      this.marcarCamposInvalidos(this.formTicket);
    }
  }

  prepararDatosTicket(): any {
    const formValue = this.formTicket.getRawValue();
    
    const fechasEstatus = {
      fechaNuevo: new Date()
    };

    const ticketData: any = {
      id: formValue.id,
      titulo: formValue.titulo,
      descripcion: formValue.descripcion,
      origen: 'tecnico',
      tipo: formValue.tipo,
      categoria: formValue.categoria,
      prioridad: formValue.prioridad,
      estatus: 'Nuevo',
      fechasEstatus: fechasEstatus,
      creadoPor: formValue.creadoPor,
      asignadoA: formValue.asignadoA,
      fechaCreacion: new Date()
    };

    return ticketData;
  }

  async subirEvidencias(ticketId: string) {
    for (const archivo of this.archivosEvidencia) {
      try {
        const downloadURL = await this.ticketService.uploadEvidenceFile(archivo, ticketId);
        
        const evidenceData = {
          url: downloadURL,
          nombre: archivo.name,
          tipo: archivo.type,
          tamaño: archivo.size,
          subidoPor: this.usuario.id
        };
        
        await this.ticketService.addEvidenceToTicket(ticketId, evidenceData);
      } catch (error) {
        console.error('Error al subir evidencia:', error);
        this.handleAlertType("WARNING", `No se pudo subir el archivo: ${archivo.name}`);
      }
    }
  }

  override resetForm(): void {
    this.formTicket.reset({
      id: uuidv4(),
      tipo: 'Sistema',
      categoria: 'Oficina',
      prioridad: 'Mediana',
      estatus: 'Nuevo'
    });
    
    if (this.usuario) {
      this.formTicket.patchValue({
        creadoPor: {
          id: this.usuario.id,
          nombre: this.usuario.nombreCompleto || `${this.usuario.nombre} ${this.usuario.apellidoPaterno} ${this.usuario.apellidoMaterno}`
        },
        asignadoA: {
          id: this.usuario.id,
          nombre: this.usuario.nombreCompleto || `${this.usuario.nombre} ${this.usuario.apellidoPaterno} ${this.usuario.apellidoMaterno}`
        }
      });
    }
    
    this.archivosEvidencia = [];
  }

  getNombreCompleto(empleado: any): string {
    if (!empleado) return 'Nombre no disponible';
    
    if (empleado.nombreCompleto) {
      return empleado.nombreCompleto;
    }
    
    if (empleado.nombre || empleado.apellidoPaterno || empleado.apellidoMaterno) {
      return `${empleado.nombre || ''} ${empleado.apellidoPaterno || ''} ${empleado.apellidoMaterno || ''}`.trim();
    }
    
    return empleado.nombre || 'Nombre no disponible';
  }

  getPrioridadIcon(prioridad: string): string {
    switch (prioridad?.toLowerCase()) {
      case 'crítica':
      case 'critica': return 'pi pi-exclamation-triangle';
      case 'alta': return 'pi pi-exclamation-circle';
      case 'mediana': return 'pi pi-info-circle';
      case 'baja': return 'pi pi-flag';
      default: return 'pi pi-flag';
    }
  }

  getPrioridadDesc(prioridad: string): string {
    switch (prioridad?.toLowerCase()) {
      case 'crítica':
      case 'critica': return 'Crítica: Requiere atención inmediata';
      case 'alta': return 'Alta: Resolver en las próximas horas';
      case 'mediana': return 'Media: Resolver en 24-48 horas';
      case 'baja': return 'Baja: Resolver cuando sea posible';
      default: return 'Prioridad normal';
    }
  }

  getColorPrioridad(prioridad: string): string {
    switch (prioridad?.toLowerCase()) {
      case 'crítica':
      case 'critica': return '#F44336';
      case 'alta': return '#FF9800';
      case 'mediana': return '#FFC107';
      case 'baja': return '#4CAF50';
      default: return '#607D8B';
    }
  }

  getPrioridadLabel(prioridad: string): string {
    const opcion = this.prioridades.find(p => p.value === prioridad);
    return opcion ? opcion.label : 'Mediana';
  }

  getTipoLabel(tipo: string): string {
    const opcion = this.tipos.find(t => t.value === tipo);
    return opcion ? opcion.label : 'Sistema';
  }


  getFileIcon(file: File): string {
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const type = file.type;
    
    if (type.startsWith('image/')) {
      return 'pi pi-image text-primary';
    }
    
    switch (extension) {
      case 'pdf':
        return 'pi pi-file-pdf text-red-500';
      case 'doc':
      case 'docx':
        return 'pi pi-file-word text-blue-500';
      case 'xls':
      case 'xlsx':
        return 'pi pi-file-excel text-green-500';
      case 'zip':
      case 'rar':
        return 'pi pi-file-archive text-orange-500';
      default:
        return 'pi pi-file text-gray-500';
    }
  }
}