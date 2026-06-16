import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { DepartamentoService } from '../../shared/service/departamento.service';

@Component({
  selector: 'app-seleccion-departamento',
  template: `
    <div class="flex flex-column align-items-center justify-content-center min-h-screen">
      <div class="card p-5 shadow-4" style="width: 400px; border-radius: 20px;">
        <div class="text-center mb-5">
          <img src="assets/enermax/favicon.png" alt="Logo" height="80" class="mb-3">
          <h2 class="text-2xl font-bold mb-1">Bienvenido</h2>
          <p class="text-color-secondary">Selecciona tu departamento para continuar</p>
        </div>
        
        <div class="flex flex-column gap-3">
          <button 
            pButton 
            type="button" 
            label="TI - Tecnologías de la Información" 
            icon="pi pi-desktop" 
            class="p-button-outlined p-button-lg w-full"
            style="justify-content: flex-start; padding: 1.5rem;"
            (click)="seleccionar('TI')">
          </button>
          
          <button 
            pButton 
            type="button" 
            label="RH - Recursos Humanos" 
            icon="pi pi-users" 
            class="p-button-outlined p-button-lg w-full"
            style="justify-content: flex-start; padding: 1.5rem;"
            (click)="seleccionar('RH')">
          </button>
          
          <button 
            pButton 
            type="button" 
            label="LOGÍSTICA - Logística" 
            icon="pi pi-truck" 
            class="p-button-outlined p-button-lg w-full"
            style="justify-content: flex-start; padding: 1.5rem;"
            (click)="seleccionar('LOGISTICA')">
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
    }
    .card {
      background: white;
      border-radius: 20px;
    }
    button {
      transition: all 0.3s ease;
    }
    button:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(0,0,0,0.1);
    }
  `]
})
export class SeleccionDepartamentoComponent {
  constructor(
    private deptoSrv: DepartamentoService,
    private router: Router
  ) {}

  seleccionar(depto: 'TI' | 'RH' | 'LOGISTICA') {
    console.log('Departamento seleccionado:', depto);
    this.deptoSrv.setDepartamento(depto);
    
    if (depto === 'TI') {
      this.router.navigate(['/']);
    } else if (depto === 'RH') {
      this.router.navigate(['/rh']);
    } else if (depto === 'LOGISTICA') {
      this.router.navigate(['/logistica']);
    }
  }

  cerrarSesion(event: Event) {
    event.preventDefault();
    this.deptoSrv.clearDepartamento();
    this.router.navigate(['/auth/login']);
  }
}