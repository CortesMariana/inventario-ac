import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { BaseComponent } from 'src/app/shared/base/base.component';
import { ActivosService } from '../activos.service';
import { ActivosReportesService } from '../activos-reportes.service';
import { UserService } from 'src/app/shared/service/user.service';

@Component({
  selector: 'app-formato-transferencia',
  template: `
    <div class="formato-container">
      <div class="loading" *ngIf="cargando">
        <i class="pi pi-spinner pi-spin"></i>
        <p>Generando formato de transferencia...</p>
      </div>
    </div>
  `,
  styles: [`
    .formato-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: #f8f9fa;
    }
    .loading {
      text-align: center;
      color: #667eea;
    }
    .loading i {
      font-size: 3rem;
      margin-bottom: 1rem;
    }
  `]
})
export class FormatoTransferenciaComponent extends BaseComponent implements OnInit {
  
  movimientoId: string = '';
  cargando: boolean = true;

  constructor(
    protected override messageService: MessageService,
    private route: ActivatedRoute,
    private router: Router,
    private activosService: ActivosService,
    private reportesService: ActivosReportesService,
    private userSrv: UserService,
    private subalmacenesService: ActivosService
  ) {
    super(messageService);
  }

  async ngOnInit() {
    this.movimientoId = this.route.snapshot.paramMap.get('movimientoId') || '';
    
    if (!this.movimientoId) {
      this.handleAlertType('ERROR', 'No se especificó el movimiento');
      this.router.navigate(['/admin/activos']);
      return;
    }

    await this.generarFormato();
  }

  async generarFormato() {
    try {
      const usuario = await this.userSrv.consultarEmpleado().toPromise();
      const nombreUsuario = usuario?.nombreCompleto || 'Sistema';

      const activo = await this.activosService.getActivo('algun-id');
      if (!activo) throw new Error('Activo no encontrado');

      const doc = this.reportesService.generarFormatoTransferencia(
        activo,
        'Almacén Origen',
        'Almacén Destino',
        nombreUsuario,
        'Transferencia por cambio de ubicación'
      );
      
      doc.save(`formato-transferencia-${new Date().getTime()}.pdf`);
      
      this.handleAlertType('SUCCESS', 'Formato generado correctamente');
      
      setTimeout(() => {
        this.router.navigate(['/admin/activos']);
      }, 2000);

    } catch (error) {
      console.error('Error al generar formato:', error);
      this.handleAlertType('ERROR', 'Error al generar el formato');
      this.router.navigate(['/admin/activos']);
    }
  }
}