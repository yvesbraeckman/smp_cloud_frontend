import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private apiUrl = '/api/auth'; // Of je volledige URL

  // Hiermee kunnen we live checken of een gebruiker is ingelogd
  private loggedInSubject = new BehaviorSubject<boolean>(this.hasToken());
  public isLoggedIn$ = this.loggedInSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) { }

  login(credentials: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, credentials).pipe(
      tap((response: any) => {
        // Sla het token en de user info op in de browser
        localStorage.setItem('access_token', response.access_token);
        localStorage.setItem('user', JSON.stringify(response.user));
        this.loggedInSubject.next(true);
      })
    );
  }

  logout(): void {
    // Wis alles en ga naar login
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    this.loggedInSubject.next(false);
    this.router.navigate(['/login']);

  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  private hasToken(): boolean {
    return !!this.getToken();
  }

  isLoggedIn(): boolean {
    return this.hasToken();
  }

  forgotPassword(email: string) {
    return this.http.post(`${this.apiUrl}/forgot-password`, { email });
  }

  resetPassword(token: string, newPassword: string) {
  // Let op dat het pad klopt met jouw setup (waarschijnlijk /auth/reset-password)
  return this.http.post(`${this.apiUrl}/reset-password`, { 
    token: token, 
    new_password: newPassword 
  });
}
}
