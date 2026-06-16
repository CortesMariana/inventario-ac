import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { Observable, from, of } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';
import { user } from '@angular/fire/auth';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {

  constructor(
    private auth: Auth,
    private firestore: Firestore,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    return user(this.auth).pipe(
      switchMap(u => {
        if (!u) {
          this.router.navigate(['/auth']);
          return of(false);
        }
        // Verifica que esté activo en Firestore
        const ref = doc(this.firestore, `${environment.collections.usuarios}/${u.uid}`);
        return from(getDoc(ref)).pipe(
          map(snap => {
            if (!snap.exists() || !snap.data()['activo']) {
              this.router.navigate(['/auth']);
              return false;
            }
            return true;
          })
        );
      }),
      catchError(() => {
        this.router.navigate(['/auth']);
        return of(false);
      })
    );
  }
}