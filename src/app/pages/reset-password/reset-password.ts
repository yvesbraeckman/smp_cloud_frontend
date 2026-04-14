import { ChangeDetectorRef, Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Auth } from '../../services/auth';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

/**
 * Reset-password page component that handles the password reset flow.
 *
 * Expects a `token` query parameter in the URL (provided by the backend
 * via the password-reset email). The component validates the token, the
 * new password length, and that the confirmation matches before submitting.
 * On success the user is automatically redirected to the login page after
 * a short delay.
 */
@Component({
  selector: 'app-reset-password',
  imports: [CommonModule, FormsModule],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss',
})
export class ResetPassword {
  /** One-time reset token extracted from the URL query parameters. */
  token: string | null = null;

  newPassword = '';
  confirmPassword = '';

  errorMessage = '';
  successMessage = '';
  isLoading = false;
  isPasswordVisible = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: Auth,
    private cdr: ChangeDetectorRef,
  ) {}

  /** Extract the reset token from the URL on component initialisation. */
  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token');

    if (!this.token) {
      this.errorMessage =
        'Geen geldige reset-link gevonden. Vraag een nieuwe aan via de login pagina.';
    }
  }

  /** Toggle the password field between plain text and masked input. */
  togglePasswordVisibility(): void {
    this.isPasswordVisible = !this.isPasswordVisible;
  }

  /**
   * Submit the new password after validating token presence, field
   * completeness, password match, and minimum length (6 characters).
   * Redirects to login on success after a 3-second delay.
   */
  onSubmit(): void {
    this.errorMessage = '';

    if (!this.token) {
      this.errorMessage = 'Ongeldige link.';
      return;
    }

    if (!this.newPassword || !this.confirmPassword) {
      this.errorMessage = 'Vul beide velden in.';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'De wachtwoorden komen niet overeen.';
      return;
    }

    if (this.newPassword.length < 6) {
      this.errorMessage = 'Het wachtwoord moet minimaal 6 tekens lang zijn.';
      return;
    }

    this.isLoading = true;
    this.authService.resetPassword(this.token, this.newPassword).subscribe({
      next: () => {
        this.isLoading = false;
        this.successMessage = 'Je wachtwoord is succesvol gewijzigd! Je wordt nu doorgestuurd...';
        this.cdr.detectChanges();
        // Redirect back to login after a short delay
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 3000);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.detail || 'Er is een fout opgetreden bij het resetten.';
        this.cdr.detectChanges();
      },
    });
  }
}
