import { ChangeDetectorRef, Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Auth } from '../../services/auth';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-reset-password',
  imports: [CommonModule, FormsModule],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss',
})
export class ResetPassword {
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
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Haal de ?token=... uit de URL
    this.token = this.route.snapshot.queryParamMap.get('token');
    
    if (!this.token) {
      this.errorMessage = 'Geen geldige reset-link gevonden. Vraag een nieuwe aan via de login pagina.';
    }
  }

  togglePasswordVisibility(): void {
    this.isPasswordVisible = !this.isPasswordVisible;
  }

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
        this.cdr.detectChanges()
        // Stuur na 3 seconden terug naar login
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 3000);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.detail || 'Er is een fout opgetreden bij het resetten.';
        this.cdr.detectChanges()
      }
    });
  }
}
