import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { LoginService } from '../demo/components/auth/login/login.service';
import { DepartamentoService } from '../shared/service/departamento.service';

export const AuthGuard: CanActivateFn = async (route, state) => {
    const authService = inject(LoginService);
    const router = inject(Router);
    const deptoSrv = inject(DepartamentoService);
    
    const acquired = await authService.ensureTokenAcquired();
    
    if (acquired && authService.isAuthenticated()) {
        authService.refreshToken();
        
        const departamento = deptoSrv.getDepartamento();
        
        if (!departamento && !state.url.includes('/seleccionar-departamento')) {
            console.log('No ha seleccionado departamento, redirigiendo...');
            router.navigate(['/seleccionar-departamento']);
            return false;
        }
        
        return true;
    } else {
        router.navigate(['auth/login']);
        return false;
    }
};