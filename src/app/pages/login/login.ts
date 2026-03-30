import { ChangeDetectorRef, Component } from '@angular/core';
import { Auth } from '../../services/auth';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

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
    private cdr: ChangeDetectorRef // <-- Deze is nieuw!
  ) { }

  togglePasswordVisibility(): void {
    this.isPasswordVisible = !this.isPasswordVisible;
  }

  onSubmit(): void {
    this.errorMessage = '';

    if (!this.email || !this.password) {
      this.errorMessage = 'Vul aub zowel e-mail als wachtwoord in.';
      return;
    }

    this.isLoading = true;

    // --- NIEUW: Maak de e-mail veilig (kleine letters + spaties weghalen) ---
    const safeEmail = this.email.trim().toLowerCase();

    // Gebruik nu safeEmail in plaats van this.email
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
      }
    });
  }

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
        // We tonen altijd een succesmelding, zelfs als het emailadres niet bestaat (uit veiligheidsoverwegingen)
        this.forgotPasswordMessage = `Als ${safeEmail} bij ons bekend is, hebben we een reset-link gestuurd.`;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = 'Er is een fout opgetreden bij het aanvragen van de reset-link.';
        console.error('Forgot password error:', err);
        this.cdr.detectChanges();
      }
    });
  }
}
