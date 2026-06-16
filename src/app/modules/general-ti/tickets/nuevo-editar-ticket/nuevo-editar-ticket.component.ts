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

  origenes: any[] = [
    { label: 'RH', value: 'rh' },
    { label: 'Comunidad', value: 'comunidad' },
    { label: 'Tickets', value: 'tickets' }
  ];

  tipos: any[] = [
    { label: 'Incidente', value: 'incidente' },
    { label: 'Mantenimiento', value: 'mantenimiento' },
    { label: 'Requerimiento', value: 'requerimiento' },
    { label: 'Asignación Activo/Dispositivo', value: 'asignacion activo/dispositivo' }
  ];

  tipoProblema: any[] = [
    { label: 'Sistema (Errores en apps, cambios en datos, etc.)', value: 'sistema' },
    { label: 'Equipo (Entrega, cambio o fallos en dispositivos, etc.)', value: 'equipo' }
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

    /*this.formTicket.get('tipo')?.valueChanges.subscribe(tipo => {
      this.actualizarCategoriaAutomatica(tipo);
    });

    this.formTicket.get('tipo')?.valueChanges.subscribe(tipo => {
      this.mostrarCampoActivos = tipo === 'asignacion activo/dispositivo';
    });*/

    this.formTicket.get('tipoProblema')?.valueChanges.pipe(
      takeUntil(this.destroy$),
      distinctUntilChanged() 
    ).subscribe(tipoProblema => {
      console.log('tipoProblema cambiado a:', tipoProblema);
      setTimeout(() => {
        this.actualizarCategoriaAutomatica(tipoProblema);
      });
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
        //origen: ['tickets', Validators.required],
        tipoProblema: ['equipo', Validators.required],
        tipo: ['mantenimiento', Validators.required],
        categoria: [{ value: 'campo', disabled: false }],
        prioridad: ['Mediana', Validators.required],
        estatus: ['Nuevo', Validators.required],
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
        const tecnicosActivos = tecnicos.filter(t => t.activo !== false);
        
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
            //origen: ticket.origen,
            tipoProblema: tipoProblemaValue, 
            //tipo: ticket.tipo,
            categoria: ticket.categoria,
            prioridad: ticket.prioridad,
            estatus: ticket.estatus,
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

  onTipoChange(): void {
    const tipo = this.formTicket.get('tipo')?.value;
    this.actualizarCategoriaAutomatica(tipo);
    this.mostrarCampoActivos = tipo === 'asignacion activo/dispositivo';
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
    console.log('actualizarCategoriaAutomatica llamado con:', tipoProblema);
    
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
      console.log('Actualizando valores:', { nuevaCategoria, nuevoTipo });
      
      this.formTicket.patchValue({
        categoria: nuevaCategoria,
        tipo: nuevoTipo
      }, { emitEvent: false });
      
      this.categoriaAutomatica = nuevaCategoria;
      this.mostrarCampoActivos = nuevoTipo === 'asignacion activo/dispositivo';
    }
  }

  encontrarTecnicoConMenorNumero(tecnicos: any[]): any {
    if (tecnicos.length === 0) return null;
    
    const tecnicosOrdenados = tecnicos
      .filter(t => t.activo !== false) 
      .sort((a, b) => {
        const numA = a.numeroConsecutivo || 999999;
        const numB = b.numeroConsecutivo || 999999;
        return numA - numB;
      });
    
    return tecnicosOrdenados[0]; 
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
    this.router.navigate(['/mis-tickets'], { replaceUrl: true });
  }

  async guardarTicket() {
    this.cargando = true;
    this.formTicket.markAllAsTouched();
    
    if (this.formTicket.valid) {
      try {
        console.log('Iniciando guardado de ticket...');
        
        const formValue = this.formTicket.getRawValue();
        console.log('Valores del formulario:', {
          tipoProblema: formValue.tipoProblema,
          tipo: formValue.tipo,
          categoria: formValue.categoria,
          isNew: this.isNew
        });
        
        if (this.isNew) {
          console.log('Ticket nuevo, asignando técnico automáticamente...');
          
          const categoriaTicket = formValue.categoria;
          console.log('Categoría para asignación:', categoriaTicket);
          
          console.log('Técnicos disponibles:', {
            campo: this.tecnicosCampo?.length || 0,
            oficina: this.tecnicosOficina?.length || 0
          });
          
          try {
            const tecnicoAsignado = await this.asignarTecnicoAutomaticamente(categoriaTicket);
            console.log('Resultado asignación:', tecnicoAsignado);
            
            if (tecnicoAsignado) {
              console.log('Técnico asignado exitosamente:', tecnicoAsignado.nombre);
              
              this.formTicket.patchValue({
                asignadoA: tecnicoAsignado,
                estatus: 'Asignado'
              });
              
              this.handleAlertType('SUCCESS', 'Técnico asignado automáticamente', 
                  `Se asignó al técnico ${tecnicoAsignado.nombre}`);
            } else {
              console.warn('No se pudo asignar técnico, manteniendo como Nuevo');
              this.formTicket.patchValue({
                estatus: 'Nuevo'
              });
            }
          } catch (errorAsignacion) {
            console.error('Error en asignación automática:', errorAsignacion);
            this.formTicket.patchValue({
              estatus: 'Nuevo'
            });
          }
        } else {
          console.log('Ticket existente, no se asigna técnico automáticamente');
        }
        
        const ticketData = this.prepararDatosTicket();
        console.log('Datos del ticket a guardar:', ticketData);
        
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
      console.log('Formulario inválido');
      this.handleAlertType("WARNING", "Formulario incompleto", "Complete los campos requeridos");
      this.cargando = false;
      this.marcarCamposInvalidos(this.formTicket);
    }
  }

  async asignarTecnicoAutomaticamente(categoriaTicket: string): Promise<any> {
    console.log('asignarTecnicoAutomaticamente llamado con categoría:', categoriaTicket);
    
    let tecnicosDisponibles: any[] = [];
    
    if (categoriaTicket === 'campo') {
      console.log('Buscando técnicos de campo...');
      tecnicosDisponibles = this.tecnicosCampo || [];
      console.log('Técnicos de campo disponibles:', tecnicosDisponibles.length);
    } else if (categoriaTicket === 'oficina') {
      console.log('Buscando técnicos de oficina...');
      tecnicosDisponibles = this.tecnicosOficina || [];
      console.log('Técnicos de oficina disponibles:', tecnicosDisponibles.length);
    } else {
      console.error('Categoría desconocida:', categoriaTicket);
      this.handleAlertType('WARNING', 'Categoría inválida', 
        `La categoría "${categoriaTicket}" no es válida`);
      return null;
    }
    
    if (tecnicosDisponibles.length === 0) {
      console.warn('No hay técnicos disponibles para asignar');
      console.log('Técnicos de campo:', this.tecnicosCampo);
      console.log('Técnicos de oficina:', this.tecnicosOficina);
      
      this.handleAlertType('WARNING', 'No hay técnicos disponibles', 
        `No hay técnicos de ${categoriaTicket === 'campo' ? 'campo' : 'oficina'} disponibles en este momento`);
      return null;
    }
    
    console.log('Técnicos disponibles para asignación:', tecnicosDisponibles.map(t => ({
      nombre: t.nombre,
      numeroConsecutivo: t.numeroConsecutivo,
      activo: t.activo,
      tipo: t.tipo
    })));
    
    const tecnicoSeleccionado = this.encontrarTecnicoConMenorNumero(tecnicosDisponibles);
    
    if (!tecnicoSeleccionado) {
      console.warn('No se pudo encontrar técnico con número consecutivo');
      console.log('Técnicos procesados:', tecnicosDisponibles);
      this.handleAlertType('WARNING', 'Error al asignar técnico', 
        'No se pudo encontrar un técnico disponible');
      return null;
    }
    
    console.log('Técnico seleccionado:', {
      nombre: tecnicoSeleccionado.nombre,
      numeroConsecutivo: tecnicoSeleccionado.numeroConsecutivo,
      empleadoId: tecnicoSeleccionado.empleadoId,
      tipo: tecnicoSeleccionado.tipo
    });
    
    return {
      id: tecnicoSeleccionado.empleadoId || tecnicoSeleccionado.id,
      nombre: tecnicoSeleccionado.nombre,
      categoria: tecnicoSeleccionado.tipo || categoriaTicket,
      tecnicoId: tecnicoSeleccionado.tecnicoId,
      numeroConsecutivo: tecnicoSeleccionado.numeroConsecutivo
    };
  }

  prepararDatosTicket(): any {
    const formValue = this.formTicket.getRawValue();
    
    console.log('prepararDatosTicket - valores del formulario:', {
      asignadoA: formValue.asignadoA,
      estatus: formValue.estatus
    });
    
    if (!formValue.sucursalId || !formValue.sucursalNombre) {
      throw new Error('La sucursal es requerida');
    }

    const fechasEstatus: any = {};
    const estatusActual = formValue.estatus;
    
    if (this.isNew) {
      fechasEstatus.fechaNuevo = new Date();
    }
    
    if (formValue.asignadoA?.id && estatusActual === 'Asignado') {
      const fechaKey = `fecha${estatusActual.replace(/\s+/g, '')}`;
      fechasEstatus[fechaKey] = new Date();
      console.log('Agregando fecha de asignación:', fechaKey);
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
      ticketData.asignadoA = formValue.asignadoA;
      console.log('Agregando asignadoA al ticket:', formValue.asignadoA);
    } else {
      console.log('No hay asignadoA en el formulario');
    }

    if (formValue.fechaLimite) {
      ticketData.fechaLimite = formValue.fechaLimite;
    }

    if (formValue.activos && formValue.activos.length > 0) {
      ticketData.activos = formValue.activos;
    }

    console.log('Ticket data preparado:', ticketData);
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
      
      this.cargarTecnicos();
      
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
    const usuarioActual = this.formTicket.get('creadoPor')?.value;
  
    this.formTicket.reset({
      id: uuidv4(),
      origen: 'tickets',
      tipo: 'mantenimiento',
      categoria: 'campo',
      prioridad: 'Mediana',
      estatus: 'Nuevo',
      asignadoA: {
        id: '',
        nombre: '',
        categoria: ''
      }
    });
    
    if (usuarioActual) {
      this.formTicket.patchValue({
        creadoPor: usuarioActual
      });
    }
    
    this.archivosEvidencia = [];
    this.mostrarCampoActivos = false;
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