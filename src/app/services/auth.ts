import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

/**
 * Authentication service responsible for login/logout flows, JWT token management,
 * and exposing the current login state as an observable.
 *
 * Tokens and user info are persisted in localStorage so the session survives
 * page reloads. The HTTP auth interceptor (auth.interceptor.ts) reads the token
 * via {@link getToken} and attaches it to every outgoing request.
 */
@Injectable({
  providedIn: 'root',
})
export class Auth {
  private apiUrl = '/api/auth';

  /** Observable that tracks whether the user is currently authenticated. */
  private loggedInSubject = new BehaviorSubject<boolean>(this.hasToken());
  public isLoggedIn$ = this.loggedInSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {}

  /**
   * Authenticate the user against the backend and store the resulting JWT
   * token and user object in localStorage.
   *
   * @param credentials - Object containing `email` and `password`.
   * @returns An observable that emits the backend login response.
   */
  login(credentials: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, credentials).pipe(
      tap((response: any) => {
        localStorage.setItem('access_token', response.access_token);
        localStorage.setItem('user', JSON.stringify(response.user));
        this.loggedInSubject.next(true);
      }),
    );
  }

  /**
   * Clear all session data from localStorage, emit the logged-out state,
   * and navigate the user back to the login page.
   */
  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    this.loggedInSubject.next(false);
    this.router.navigate(['/login']);
  }

  /**
   * Retrieve the stored JWT access token, if any.
   *
   * @returns The token string, or `null` when no session exists.
   */
  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  /** Check whether a token is present in localStorage. */
  private hasToken(): boolean {
    return !!this.getToken();
  }

  /** Synchronous check for whether the user is currently authenticated. */
  isLoggedIn(): boolean {
    return this.hasToken();
  }

  /**
   * Request a password-reset email for the given address.
   *
   * @param email - The email address to send the reset link to.
   */
  forgotPassword(email: string) {
    return this.http.post(`${this.apiUrl}/forgot-password`, { email });
  }

  /**
   * Submit a new password using the token received via the reset email.
   *
   * Ensure this path matches the backend reset-password endpoint.
   *
   * @param token       - The one-time reset token from the email link.
   * @param newPassword - The new password chosen by the user.
   */
  resetPassword(token: string, newPassword: string) {
    return this.http.post(`${this.apiUrl}/reset-password`, {
      token: token,
      new_password: newPassword,
    });
  }
}
