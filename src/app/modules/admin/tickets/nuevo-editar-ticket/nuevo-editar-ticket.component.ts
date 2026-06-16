import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { catchError, Observable, of, Subject, takeUntil, firstValueFrom, distinctUntilChanged } from 'rxjs';
import { BaseComponent } from 'src/app/shared/base/base.component';
import { v4 as uuidv4 } from 'uuid';
import { TicketService } from '../tickets.service';
import { UserService } from 'src/app/shared/service/user.service';
import { LugaresTrabajoService } from 'src/app/modules/admin/empleados/lugares-trabajo.service';
import { TecnicoService } from 'src/app/modules/admin/tecnicos/tecnicos.service';

@Component({
  selector: 'app-nuevo-editar-ticket',
  templateUrl: './nuevo-editar-ticket.component.html',
  styleUrls: ['./nuevo-editar-ticket.component.css']
})
export class NuevoEditarTicketComponent extends BaseComponent implements OnInit, OnDestroy {
  usuario: any;

  formTicket!: FormGroup;

  tituloCard!: string;
  titulo: string = 'Nuevo Ticket';
  cargando: boolean = false;
  isNew!: boolean;
  private destroy$ = new Subject<void>();

  minDate: Date = new Date();

  tipoProblema: any[] = [
    { label: 'Sistema (Errores en apps, cambios en datos, etc.)', value: 'sistema' },
    { label: 'Equipo (Entrega, cambio o fallos en dispositivos, etc.)', value: 'equipo' }
  ];

  tipos: any[] = [
    { label: 'Mantenimiento', value: 'mantenimiento' },
    { label: 'Incidente', value: 'incidente' },
    { label: 'Requerimiento', value: 'requerimiento' },
    { label: 'Asignación Activo/Dispositivo', value: 'asignacion activo/dispositivo' }
  ];

  prioridades: any[] = [
    { label: 'Baja', value: 'baja' },
    { label: 'Mediana', value: 'Mediana' },
    { label: 'Alta', value: 'Alta' },
    { label: 'Crítica', value: 'Critica' }
  ];

  estatus: any[] = [
    { label: 'Nuevo', value: 'Nuevo' },
    { label: 'Asignado', value: 'Asignado' },
    { label: 'En proceso', value: 'En proceso' },
    { label: 'Resuelto', value: 'Resuelto' },
    { label: 'Cerrado', value: 'Cerrado' },
    { label: 'Cancelado', value: 'Cancelado' }
  ];

  sucursales: any[] = [];
  sucursalesCargando: boolean = false;

  mostrarCampoActivos: boolean = false;
  categoriaAutomatica: string = 'campo';

  archivosEvidencia: File[] = [];

  tecnicosCampo: any[] = [];
  tecnicosOficina: any[] = [];

  constructor(
    protected override messageService: MessageService,
    private fb: FormBuilder,
    private router: Router,
    private activeRoute: ActivatedRoute,
    private ticketService: TicketService,
    private userSrv: UserService,
    private lugaresTrabajoSrv: LugaresTrabajoService,
    private tecnicoService: TecnicoService 
  ) {
    super(messageService);
  }

  isMobileView: boolean = false;

  ngOnInit() {
    this.cargando = true;
    if (this.router.url.includes('')) {
      this.titulo = 'Nuevo Ticket';
      this.tituloCard = 'Nuevo Ticket';
      this.isNew = true;
    } else {
      this.titulo = 'Editar Ticket';
      this.tituloCard = 'Editar Ticket';
      this.isNew = false;
    }
    
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
            }
          });
        }
        this.cargando = false;
      });
     });

    this.formTicket.get('tipoProblema')?.valueChanges.pipe(
      takeUntil(this.destroy$),
      distinctUntilChanged()
    ).subscribe(tipoProblema => {
      console.log('tipoProblema cambiado a:', tipoProblema);
      setTimeout(() => {
        this.actualizarCategoriaAutomatica(tipoProblema);
      });
    });

    this.formTicket.get('tipo')?.valueChanges.pipe(
      takeUntil(this.destroy$),
      distinctUntilChanged()
    ).subscribe(tipo => {
      this.mostrarCampoActivos = tipo === 'asignacion activo/dispositivo';
    });

    this.cargarSucursales();

    this.cargarTecnicos();

    if (!this.isNew) {
      this.cargarTicketExistente();
    }

    this.checkScreenSize();
    window.addEventListener('resize', () => {
      this.checkScreenSize();
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    window.removeEventListener('resize', () => this.checkScreenSize());
  }

  checkScreenSize() {
    this.isMobileView = window.innerWidth <= 768;
  }

  initForm(): Promise<boolean> {
    return new Promise((resolve) => {
      this.formTicket = this.fb.group({
        id: [uuidv4()],
        titulo: ['', Validators.required],
        descripcion: ['', Validators.required],
        correo: ['', [Validators.required, Validators.email]],
        telefono: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
        tipoProblema: ['equipo', Validators.required], 
        tipo: ['mantenimiento', Validators.required],
        categoria: ['campo'], 
        prioridad: ['Mediana', Validators.required],
        //estatus: ['Nuevo', Validators.required],
        creadoPor: [null, Validators.required],
        fechaLimite: [null],
        sucursalId: ['', Validators.required],
        sucursalNombre: ['', Validators.required],
        asignadoA: this.fb.group({
          id: [''],
          nombre: [''],
          categoria: ['']
        }),
        activos: [[]]
      });
      resolve(true);
    });
  }

  getUsuario(): Observable<any> {
    return this.userSrv.consultarEmpleado();
  }

  cargarSucursales(): void {
    this.sucursalesCargando = true;
    this.lugaresTrabajoSrv.getLugaresTrabajo()
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          console.error('Error al cargar sucursales:', error);
          this.handleAlertType('WARNING', 'Error al cargar sucursales', 'Por favor, intente nuevamente más tarde');
          this.sucursalesCargando = false;
          return of([]);
        })
      )
      .subscribe((data) => {
        this.sucursales = data.map((sucursal: any) => ({
          label: sucursal.nombre || 'Sucursal sin nombre',
          value: sucursal.id,
          data: sucursal 
        }));

        this.sucursales.sort((a, b) => a.label.localeCompare(b.label));
        
        this.sucursales.unshift({
          label: 'Seleccione una sucursal',
          value: null,
          data: null
        });
        
        this.sucursalesCargando = false;
      });
  }

  cargarTecnicos(): void {
    this.tecnicoService.getTecnicos()
    .pipe(
      takeUntil(this.destroy$),
      catchError((error) => {
        console.error('Error al cargar técnicos:', error);
        this.handleAlertType('WARNING', 'Error al cargar técnicos', 'No se podrá asignar automáticamente');
        return of([]);
      })
    )
    .subscribe((tecnicos) => {
      const tecnicosActivos = tecnicos.filter(t => t.activo);

      const tecnicosOrdenados = tecnicosActivos.sort((a, b) => {
        const numA = a.numeroConsecutivo || 999999;
        const numB = b.numeroConsecutivo || 999999;
        return numA - numB;
      });
      
      this.tecnicosCampo = tecnicosOrdenados.filter(t => t.tipo === 'campo');
      this.tecnicosOficina = tecnicosOrdenados.filter(t => t.tipo === 'oficina');
      
      console.log('Técnicos cargados y ordenados por número consecutivo:', {
        campo: this.tecnicosCampo.map(t => ({ 
          nombre: t.nombre, 
          numero: t.numeroConsecutivo,
          tecnicoId: t.tecnicoId 
        })),
        oficina: this.tecnicosOficina.map(t => ({ 
          nombre: t.nombre, 
          numero: t.numeroConsecutivo,
          tecnicoId: t.tecnicoId 
        }))
      });
    });
  }

  cargarTicketExistente(): void {
    const firestoreId = this.activeRoute.snapshot.paramMap.get('firestoreId');
    if (firestoreId) {
      this.cargando = true;
      this.ticketService.getTicket(firestoreId)
        .then((ticket) => {
          let tipoProblemaValue = 'equipo';
          if (ticket.categoria === 'oficina') {
            tipoProblemaValue = 'sistema';
          }
          
          this.formTicket.patchValue({
            id: ticket.id,
            titulo: ticket.titulo,
            descripcion: ticket.descripcion,
            correo: ticket.correo,
            telefono: ticket.telefono,
            tipoProblema: tipoProblemaValue, 
            tipo: ticket.tipo,
            categoria: ticket.categoria,
            prioridad: ticket.prioridad,
            //estatus: ticket.estatus,
            creadoPor: ticket.creadoPor,
            fechaLimite: ticket.fechaLimite ? new Date(ticket.fechaLimite) : null,
            activos: ticket.activos || [],
            folio: ticket.folio || ''
          });

          if (ticket.sucursal) {
            this.formTicket.patchValue({
              sucursalId: ticket.sucursal.id || ticket.sucursalId || '',
              sucursalNombre: ticket.sucursal.nombre || ticket.sucursalNombre || ''
            });
          }

          if (ticket.asignadoA) {
            this.formTicket.patchValue({
              asignadoA: ticket.asignadoA
            });
          }
          
          this.cargando = false;
        })
        .catch((error) => {
          console.error('Error al cargar ticket:', error);
          this.handleAlertType('ERROR', 'Error al cargar el ticket');
          this.cargando = false;
        });
    }
  }

  onSucursalSelect(event: any): void {
    const sucursalSeleccionada = this.sucursales.find(s => s.value === event.value);
    
    if (sucursalSeleccionada && sucursalSeleccionada.value) {
      this.formTicket.patchValue({
        sucursalId: sucursalSeleccionada.value,
        sucursalNombre: sucursalSeleccionada.label
      });
    } else {
      this.formTicket.patchValue({
        sucursalId: '',
        sucursalNombre: ''
      });
    }
  }

  getSucursalLabel(value: string): string {
    if (!value) return 'Seleccione una sucursal';
    const sucursal = this.sucursales.find(s => s.value === value);
    return sucursal ? sucursal.label : value;
  }

  actualizarCategoriaAutomatica(tipoProblema: string) {
    if (!tipoProblema) return;
    
    const categoriaActual = this.formTicket.get('categoria')?.value;
    const tipoActual = this.formTicket.get('tipo')?.value;
    
    let nuevaCategoria = 'campo';
    let nuevoTipo = 'mantenimiento';
    
    if (tipoProblema === 'sistema') {
      nuevaCategoria = 'oficina';
      nuevoTipo = 'incidente';
    } else if (tipoProblema === 'equipo') {
      nuevaCategoria = 'campo';
      nuevoTipo = 'mantenimiento';
    }
    
    if (categoriaActual !== nuevaCategoria || tipoActual !== nuevoTipo) {
      this.formTicket.patchValue({
        categoria: nuevaCategoria,
        tipo: nuevoTipo
      }, { emitEvent: false });
      
      this.categoriaAutomatica = nuevaCategoria;
      this.mostrarCampoActivos = nuevoTipo === 'asignacion activo/dispositivo';
    }
  }

  async asignarTecnicoAutomaticamente(categoriaTicket: string): Promise<any> {
    let tecnicosDisponibles: any[] = [];

    if (categoriaTicket === 'campo') {
      tecnicosDisponibles = this.tecnicosCampo;
    } else if (categoriaTicket === 'oficina') {
      tecnicosDisponibles = this.tecnicosOficina;
    }
    
    if (tecnicosDisponibles.length === 0) {
      this.handleAlertType('WARNING', 'No hay técnicos disponibles', 
        `No hay técnicos de ${categoriaTicket} disponibles en este momento`);
      return null;
    }

    const tecnicoSeleccionado = tecnicosDisponibles[0]; 
    
    if (!tecnicoSeleccionado) {
      console.warn('No se pudo encontrar técnico con número consecutivo');
      this.handleAlertType('WARNING', 'Error al asignar técnico', 
        'No se pudo encontrar un técnico disponible');
      return null;
    }
    
    return {
      id: tecnicoSeleccionado.empleadoId,
      nombre: tecnicoSeleccionado.nombre,
      categoria: tecnicoSeleccionado.tipo,
      tecnicoId: tecnicoSeleccionado.tecnicoId,
      numeroConsecutivo: tecnicoSeleccionado.numeroConsecutivo
    };
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

  cancelar() {}

  async guardarTicket() {
    this.cargando = true;
    this.formTicket.markAllAsTouched();
    
    if (this.formTicket.valid) {
      try {
        let estatusFinal = 'Nuevo';
        
        if (this.isNew) {
          const categoriaTicket = this.formTicket.get('categoria')?.value;
          const tecnicoAsignado = await this.asignarTecnicoAutomaticamente(categoriaTicket);
          
          if (tecnicoAsignado) {
            this.formTicket.patchValue({
              asignadoA: tecnicoAsignado
            }, { emitEvent: false });
            
            estatusFinal = 'Asignado'; 
            
            this.handleAlertType('SUCCESS', 'Técnico asignado automáticamente', 
              `Se asignó al técnico ${tecnicoAsignado.nombre} (${tecnicoAsignado.tecnicoId || tecnicoAsignado.id})`);
          } else {
            estatusFinal = 'Nuevo'; 
          }
        } else {
          const ticketExistente = await this.ticketService.getTicket(
            this.activeRoute.snapshot.paramMap.get('firestoreId')!
          );
          estatusFinal = ticketExistente.estatus || 'Nuevo';
        }
        
        const ticketData = this.prepararDatosTicket(estatusFinal);
        
        if (this.isNew) {
          await this.crearTicket(ticketData);
        } else {
          await this.actualizarTicket(ticketData);
        }
      } catch (error: any) {
        console.error('Error al guardar el ticket:', error);
        this.handleAlertType("ERROR", error.message || "Error al guardar el ticket");
        this.cargando = false;
      }
    } else {
      this.handleAlertType("WARNING", "Formulario incompleto", "Complete los campos requeridos");
      this.cargando = false;
      this.marcarCamposInvalidos(this.formTicket);
    }
  }

  prepararDatosTicket(estatus: string): any {
    const formValue = this.formTicket.getRawValue();
    
    if (!formValue.sucursalId || !formValue.sucursalNombre) {
      throw new Error('La sucursal es requerida');
    }

    const fechasEstatus: any = {};
    const estatusActual = estatus; 
    
    if (this.isNew) {
      fechasEstatus.fechaNuevo = new Date();
    }
    
    if (formValue.asignadoA?.id && estatusActual === 'Asignado') {
      fechasEstatus.fechaAsignado = new Date();
    }

    let categoria = 'campo';
    if (formValue.tipoProblema === 'sistema') {
      categoria = 'oficina';
    }

    const ticketData: any = {
      id: formValue.id,
      titulo: formValue.titulo,
      descripcion: formValue.descripcion,
      correo: formValue.correo,
      telefono: formValue.telefono,
      origen: 'tickets', 
      tipo: formValue.tipo,
      tipoProblema: formValue.tipoProblema,
      categoria: categoria,
      prioridad: formValue.prioridad,
      estatus: estatusActual, 
      fechasEstatus: fechasEstatus,
      creadoPor: formValue.creadoPor,
      fechaCreacion: new Date(),
      sucursal: {
        id: formValue.sucursalId,
        nombre: formValue.sucursalNombre
      }
    };

    if (formValue.asignadoA?.id) {
      ticketData.asignadoA = {
        id: formValue.asignadoA.id,
        nombre: formValue.asignadoA.nombre,
        categoria: formValue.asignadoA.categoria,
        ...(formValue.asignadoA.tecnicoId && { tecnicoId: formValue.asignadoA.tecnicoId }),
        ...(formValue.asignadoA.numeroConsecutivo && { numeroConsecutivo: formValue.asignadoA.numeroConsecutivo })
      };
    }

    if (formValue.fechaLimite) {
      ticketData.fechaLimite = formValue.fechaLimite;
    }

    if (formValue.activos && formValue.activos.length > 0) {
      ticketData.activos = formValue.activos;
    }

    return ticketData;
  }


  async crearTicket(ticketData: any) {
    try {
      const ticketId = await this.ticketService.addTicket(ticketData);

      if (this.archivosEvidencia.length > 0) {
        await this.subirEvidencias(ticketId);
      }
      
      this.cargando = false;
      this.handleAlertType("SUCCESS", "Ticket creado correctamente");
      this.resetForm();
    } catch (error) {
      console.error('Error al crear ticket:', error);
      this.cargando = false;
      this.handleAlertType("ERROR", "Error al crear el ticket");
    }
  }

  async actualizarTicket(ticketData: any) {
    try {
      const firestoreId = this.activeRoute.snapshot.paramMap.get('firestoreId');
      if (firestoreId) {
        const ticketExistente = await this.ticketService.getTicket(firestoreId);
        
        if (ticketExistente.fechasEstatus) {
          ticketData.fechasEstatus = {
            ...ticketExistente.fechasEstatus,
            ...ticketData.fechasEstatus
          };
        }

        ticketData.fechaModificacion = new Date();

        await this.ticketService.updateTicket(firestoreId, ticketData);
        
        if (this.archivosEvidencia.length > 0) {
          await this.subirEvidencias(firestoreId);
        }
        
        this.cargando = false;
        this.handleAlertType("SUCCESS", "Ticket actualizado correctamente");
      }
    } catch (error) {
      console.error('Error al actualizar ticket:', error);
      this.cargando = false;
      this.handleAlertType("ERROR", "Error al actualizar el ticket");
    }
  }

  async subirEvidencias(ticketId: string) {
    for (const archivo of this.archivosEvidencia) {
      try {
        const downloadURL = await this.ticketService.uploadEvidenceFile(archivo, ticketId);
        
        const evidenceData = {
          url: downloadURL,
          nombre: archivo.name,
          tipo: archivo.type,
          tamaño: archivo.size
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
      tipoProblema: 'equipo',
      tipo: 'mantenimiento',
      categoria: 'campo',
      prioridad: 'Mediana',
      estatus: 'Nuevo',
      asignadoA: {
        id: '',
        nombre: '',
        categoria: ''
      }
    }, { emitEvent: false });
    this.archivosEvidencia = [];
    this.mostrarCampoActivos = false;
    this.categoriaAutomatica = 'campo';
  }

  getFileIcon(file: File): string {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return 'pi pi-file-pdf text-red-500';
      case 'doc':
      case 'docx':
        return 'pi pi-file-word text-blue-500';
      case 'xls':
      case 'xlsx':
        return 'pi pi-file-excel text-green-500';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return 'pi pi-image text-purple-500';
      default:
        return 'pi pi-file text-gray-500';
    }
  }

  override marcarCamposInvalidos(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      if (control?.invalid) {
        control.markAsTouched();
      }
      if (control instanceof FormGroup) {
        this.marcarCamposInvalidos(control);
      }
    });
  }
}