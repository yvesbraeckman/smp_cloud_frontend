import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Auth } from '../services/auth';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(Auth);
  const token = authService.getToken();

  // 1. Koppel het token vast als we er een hebben
  let modifiedReq = req;
  if (token) {
    modifiedReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  // 2. Stuur het verzoek door en LUISTER naar het antwoord
  return next(modifiedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      
      // Als de server zegt: "Ho, stop, je token is ongeldig of verlopen!"
      if (error.status === 401) {
        console.warn('Sessie is ongeldig of verlopen. Je wordt uitgelogd.');
        
        // Roep direct de logout functie van je Auth service aan
        // (Deze gooit je localstorage leeg en navigeert naar /login)
        authService.logout();
      }

      // Geef de error netjes door voor eventuele andere foutafhandeling
      return throwError(() => error);
    })
  );
};