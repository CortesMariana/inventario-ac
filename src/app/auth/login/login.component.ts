import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth, signInWithEmailAndPassword } from '@angular/fire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { MessageService } from 'primeng/api';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  form!: FormGroup;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private auth: Auth,
    private firestore: Firestore,
    private router: Router,
    private messageSrv: MessageService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      email:    ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  get f() { return this.form.controls; }

  async login(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    try {
      const cred = await signInWithEmailAndPassword(
        this.auth,
        this.form.value.email,
        this.form.value.password
      );

      // Verifica que el usuario exista en Firestore y esté activo
      const ref = doc(this.firestore, `${environment.collections.usuarios}/${cred.user.uid}`);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        throw new Error('Usuario no encontrado en el sistema');
      }

      const usuario = snap.data();
      if (!usuario['activo']) {
        throw new Error('Tu cuenta está desactivada. Contacta al administrador');
      }

      this.router.navigate(['/admin']);

    } catch (err: any) {
      const msg = this.getErrorMsg(err.code ?? err.message);
      this.messageSrv.add({ severity: 'error', summary: 'Error', detail: msg });
    } finally {
      this.loading = false;
    }
  }

  private getErrorMsg(code: string): string {
    const map: Record<string, string> = {
      'auth/user-not-found':      'Usuario no encontrado',
      'auth/wrong-password':      'Contraseña incorrecta',
      'auth/invalid-credential':  'Credenciales inválidas',
      'auth/too-many-requests':   'Demasiados intentos. Intenta más tarde',
      'auth/invalid-email':       'Correo inválido',
    };
    return map[code] ?? code;
  }
}