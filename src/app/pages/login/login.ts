import { ChangeDetectorRef, Component } from '@angular/core';
import { Auth } from '../../services/auth';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

/**
 * Login page component responsible for authenticating administrators
 * and handling the "forgot password" flow.
 *
 * On successful login the user is redirected to the fleet overview.
 * Error and success messages are displayed inline with Apple-style
 * status banners.
 */
@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  email = '';
  password = '';
  errorMessage = '';
  isLoading = false;
  isPasswordVisible = false;
  forgotPasswordMessage = '';

  constructor(
    private authService: Auth,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  /** Toggle the password field between plain text and masked input. */
  togglePasswordVisibility(): void {
    this.isPasswordVisible = !this.isPasswordVisible;
  }

  /**
   * Submit the login form.
   *
   * Normalises the email address (trims whitespace, lowercases) before
   * sending it to the backend. On success the user is navigated to the
   * fleet-overview page. On a 401 response a localised error message is
   * shown; any other server error displays a generic fallback message.
   */
  onSubmit(): void {
    this.errorMessage = '';

    if (!this.email || !this.password) {
      this.errorMessage = 'Vul aub zowel e-mail als wachtwoord in.';
      return;
    }

    this.isLoading = true;

    // Sanitise the email address before sending to the backend
    const safeEmail = this.email.trim().toLowerCase();

    this.authService.login({ email: safeEmail, password: this.password }).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/fleet-overview']);
      },
      error: (err) => {
        this.isLoading = false;
        if (err.status === 401) {
          this.errorMessage = 'E-mailadres of wachtwoord onjuist.';
        } else {
          this.errorMessage = 'Er is een serverfout opgetreden. Probeer het later opnieuw.';
        }
        console.error('Login error:', err);
      },
    });
  }

  /**
   * Trigger the "forgot password" flow.
   *
   * Always shows a generic success message after the request, even when
   * the email is not registered — this prevents email-enumeration attacks.
   */
  forgotPassword(): void {
    this.errorMessage = '';
    this.forgotPasswordMessage = '';

    const safeEmail = this.email.trim().toLowerCase();

    if (!safeEmail) {
      this.errorMessage = 'Vul eerst je e-mailadres in om je wachtwoord te resetten.';
      return;
    }

    this.isLoading = true;
    this.authService.forgotPassword(safeEmail).subscribe({
      next: () => {
        this.isLoading = false;
        // Always show a success message to prevent email enumeration
        this.forgotPasswordMessage = `Als ${safeEmail} bij ons bekend is, hebben we een reset-link gestuurd.`;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = 'Er is een fout opgetreden bij het aanvragen van de reset-link.';
        console.error('Forgot password error:', err);
        this.cdr.detectChanges();
      },
    });
  }
}
